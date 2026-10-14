import hashlib
import json
import os
from typing import Literal

import firebase_admin
from firebase_admin import auth, credentials, firestore
from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field


app = FastAPI(
    title="Inclura AI Backend",
    version="1.1.0",
)

# CORS allows the frontend to call this API.
# Authentication is still required for creator scoring.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


# --------------------------------------------------
# FIREBASE ADMIN INITIALIZATION
# --------------------------------------------------

def get_firebase_admin():
    if firebase_admin._apps:
        return firebase_admin.get_app()

    service_account_json = os.environ.get(
        "FIREBASE_SERVICE_ACCOUNT_JSON"
    )

    if not service_account_json:
        raise HTTPException(
            status_code=503,
            detail="Firebase Admin is not configured.",
        )

    try:
        service_account = json.loads(service_account_json)

        required_fields = (
            "project_id",
            "client_email",
            "private_key",
        )

        if not all(service_account.get(key) for key in required_fields):
            raise ValueError("Required service-account fields are missing.")

        service_account["private_key"] = (
            service_account["private_key"].replace("\\n", "\n")
        )

        firebase_credential = credentials.Certificate(service_account)

        return firebase_admin.initialize_app(firebase_credential)

    except Exception as error:
        print(
            "Firebase Admin initialization failed:",
            type(error).__name__,
        )

        raise HTTPException(
            status_code=503,
            detail="Firebase Admin initialization failed.",
        ) from error


def get_firestore():
    get_firebase_admin()
    return firestore.client()


# --------------------------------------------------
# HEALTH CHECK
# --------------------------------------------------

@app.get("/")
def home():
    return {
        "status": "Inclura AI Backend Running",
        "creatorScoring": "available",
    }


# --------------------------------------------------
# CREATOR-SCORE REQUEST MODEL
# --------------------------------------------------

class CreatorScoreRequest(BaseModel):
    activityType: Literal[
        "video_post",
        "text_post",
        "cross_post",
        "comment",
    ]

    activityId: str = Field(
        min_length=1,
        max_length=200,
    )


ACTIVITY_POINTS = {
    "video_post": 4,
    "text_post": 2,
    "cross_post": 5,
    "comment": 2,
}

ACTIVITY_COLLECTIONS = {
    "video_post": ("posts",),
    "text_post": ("posts",),
    "cross_post": ("crossPosts", "crossPostRequests"),
    "comment": ("comments",),
}

OWNER_FIELDS = (
    "uid",
    "userId",
    "authorId",
    "ownerId",
    "createdBy",
)


# --------------------------------------------------
# ACTIVITY OWNERSHIP AND VALIDATION
# --------------------------------------------------

def find_activity_owner(data):
    for field in OWNER_FIELDS:
        value = data.get(field)

        if isinstance(value, str) and value.strip():
            return value.strip()

    return None


def activity_matches_type(data, activity_type):
    if activity_type == "video_post":
        return (
            bool(data.get("videoUrl"))
            or str(data.get("mediaType", "")).lower() == "video"
            or str(data.get("type", "")).lower() == "video"
        )

    if activity_type == "text_post":
        has_video = (
            bool(data.get("videoUrl"))
            or str(data.get("mediaType", "")).lower() == "video"
            or str(data.get("type", "")).lower() == "video"
        )

        return isinstance(data.get("text"), str) and not has_video

    return True


def get_owned_activity(db, uid, activity_type, activity_id):
    for collection_name in ACTIVITY_COLLECTIONS[activity_type]:
        snapshot = (
            db.collection(collection_name)
            .document(activity_id)
            .get()
        )

        if not snapshot.exists:
            continue

        data = snapshot.to_dict() or {}

        if find_activity_owner(data) != uid:
            raise HTTPException(
                status_code=403,
                detail="You are not authorized to earn points for this activity.",
            )

        if not activity_matches_type(data, activity_type):
            raise HTTPException(
                status_code=400,
                detail="The activity does not match the requested activity type.",
            )

        return collection_name

    raise HTTPException(
        status_code=404,
        detail="The activity could not be found.",
    )


# --------------------------------------------------
# CREATOR-SCORE ENDPOINT
# --------------------------------------------------

@app.post("/api/creator-score/award")
def award_creator_activity(
    payload: CreatorScoreRequest,
    authorization: str | None = Header(default=None),
):
    # Authenticate the user with a Firebase ID token.
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="Please sign in to continue.",
        )

    id_token = authorization[7:].strip()

    if not id_token:
        raise HTTPException(
            status_code=401,
            detail="A valid sign-in token is required.",
        )

    try:
        decoded_token = auth.verify_id_token(id_token)
        uid = decoded_token.get("uid")

        if not uid:
            raise HTTPException(
                status_code=401,
                detail="The sign-in token is invalid.",
            )

    except HTTPException:
        raise

    except Exception as error:
        print(
            "Creator-score authentication failed:",
            type(error).__name__,
        )

        raise HTTPException(
            status_code=401,
            detail="Your session is invalid or has expired. Please sign in again.",
        ) from error

    activity_id = payload.activityId.strip()

    if not activity_id:
        raise HTTPException(
            status_code=400,
            detail="A valid activity ID is required.",
        )

    activity_type = payload.activityType
    points = ACTIVITY_POINTS[activity_type]

    try:
        db = get_firestore()

        # Verify the activity exists and belongs to the
        # authenticated user before awarding points.
        get_owned_activity(
            db,
            uid,
            activity_type,
            activity_id,
        )

        user_ref = db.collection("users").document(uid)

        # A deterministic ID prevents awarding the same
        # activity more than once.
        award_id = hashlib.sha256(
            f"{uid}:{activity_type}:{activity_id}".encode("utf-8")
        ).hexdigest()

        award_ref = (
            db.collection("creatorActivityAwards")
            .document(award_id)
        )

        user_snapshot = user_ref.get()

        if not user_snapshot.exists:
            raise HTTPException(
                status_code=404,
                detail="Your Inclura user profile could not be found.",
            )

        transaction = db.transaction()

        @firestore.transactional
        def apply_award(transaction):
            existing_award = award_ref.get(
                transaction=transaction
            )

            current_user = user_ref.get(
                transaction=transaction
            )

            if not current_user.exists:
                raise ValueError("User profile no longer exists.")

            user_data = current_user.to_dict() or {}
            economy = user_data.get("creatorEconomy") or {}

            if not isinstance(economy, dict):
                economy = {}

            current_score = economy.get("score", 0)

            if not isinstance(current_score, (int, float)):
                current_score = 0

            if existing_award.exists:
                return {
                    "duplicate": True,
                    "score": current_score,
                }

            updates = {
                "creatorEconomy.score": (
                    current_score + points
                ),
            }

            if activity_type == "video_post":
                updates["monthlyVideoPosts"] = (
                    firestore.Increment(1)
                )

            elif activity_type == "text_post":
                updates["monthlyTextPosts"] = (
                    firestore.Increment(1)
                )

            elif activity_type == "cross_post":
                updates["monthlyCrossPosts"] = (
                    firestore.Increment(1)
                )

            elif activity_type == "comment":
                updates["communityTrust"] = (
                    firestore.Increment(points)
                )

            transaction.update(user_ref, updates)

            transaction.create(
                award_ref,
                {
                    "userId": uid,
                    "activityType": activity_type,
                    "activityId": activity_id,
                    "points": points,
                    "createdAt": firestore.SERVER_TIMESTAMP,
                },
            )

            return {
                "duplicate": False,
                "score": current_score + points,
            }

        result = apply_award(transaction)

        return {
            "success": True,
            "message": (
                "This activity has already been recorded."
                if result["duplicate"]
                else "Creator activity recorded successfully."
            ),
            "activityType": activity_type,
            "activityId": activity_id,
            "pointsAwarded": (
                0 if result["duplicate"] else points
            ),
            "score": result["score"],
            "duplicate": result["duplicate"],
        }

    except HTTPException:
        raise

    except Exception as error:
        print(
            "Creator-score processing failed:",
            type(error).__name__,
            str(error),
        )

        raise HTTPException(
            status_code=500,
            detail="Creator scoring could not be recorded. Please try again later.",
        ) from error
