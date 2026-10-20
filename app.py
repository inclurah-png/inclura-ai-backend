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
    owners = []

    for field in OWNER_FIELDS:
        value = data.get(field)

        if value is None or value == "":
            continue

        if not isinstance(value, str):
            raise HTTPException(
                status_code=400,
                detail=f"Invalid ownership field: {field}.",
            )

        value = value.strip()

        if value:
            owners.append((field, value))

    if not owners:
        return None

    unique_owners = {value for _, value in owners}

    if len(unique_owners) != 1:
        raise HTTPException(
            status_code=409,
            detail=(
                "Conflicting ownership fields detected. "
                "Creator scoring has been rejected."
            ),
        )

    return owners[0][1]


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
    str(error),
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

        activity_collection = get_owned_activity(
            db,
            uid,
            activity_type,
            activity_id,
        )

        user_ref = db.collection("users").document(uid)

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
                raise HTTPException(
                    status_code=404,
                    detail="Your Inclura user profile could not be found.",
                )

            user_data = current_user.to_dict() or {}
            economy = user_data.get("creatorEconomy")

            if economy is None:
                economy = {}
            elif not isinstance(economy, dict):
                raise HTTPException(
                    status_code=409,
                    detail=(
                        "The stored creator economy data is invalid. "
                        "The score was not changed."
                    ),
                )

            current_score = economy.get("score", 0)

            if (
                isinstance(current_score, bool)
                or not isinstance(current_score, int)
                or current_score < 0
            ):
                raise HTTPException(
                    status_code=409,
                    detail=(
                        "The stored creator score is invalid. "
                        "The score was not changed."
                    ),
                )

            if existing_award.exists:
                return {
                    "duplicate": True,
                    "score": current_score,
                }

            updates = {
                "creatorEconomy.score": current_score + points,
            }

            if activity_type == "video_post":
                updates["monthlyVideoPosts"] = firestore.Increment(1)

            elif activity_type == "text_post":
                updates["monthlyTextPosts"] = firestore.Increment(1)

            elif activity_type == "cross_post":
                updates["monthlyCrossPosts"] = firestore.Increment(1)

            elif activity_type == "comment":
                updates["communityTrust"] = firestore.Increment(points)

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
            "activityCollection": activity_collection,
            "userId": uid,
            "userDocumentPath": f"users/{uid}",
            "pointsAwarded": 0 if result["duplicate"] else points,
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

# --------------------------------------------------
# AUTHENTICATED POST REACTIONS AND CREATOR ENGAGEMENT
# --------------------------------------------------

class PostReactionRequest(BaseModel):
    emoji: Literal[
        "❤️", "👏", "😊", "👍",
        "😂", "😮", "😢", "👎"
    ]


REACTION_POINTS = {
    "❤️": 4,
    "👏": 3,
    "😊": 3,
    "👍": 2,
    "😂": 2,
    "😮": 2,
    "😢": 2,
    "👎": -3,
}


@app.post("/api/posts/{post_id}/react")
def react_to_post(
    post_id: str,
    payload: PostReactionRequest,
    authorization: str | None = Header(default=None),
):
    # 1. Authenticate the reacting user.
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="Please sign in to react to a post.",
        )

    id_token = authorization[7:].strip()

    if not id_token:
        raise HTTPException(
            status_code=401,
            detail="A valid sign-in token is required.",
        )

    try:
        get_firebase_admin()
        decoded_token = auth.verify_id_token(id_token)
        reactor_uid = decoded_token.get("uid")

        if not reactor_uid:
            raise HTTPException(
                status_code=401,
                detail="The sign-in token is invalid.",
            )

    except HTTPException:
        raise
    except Exception as error:
        print("Reaction authentication failed:", type(error).__name__)
        raise HTTPException(
            status_code=401,
            detail="Your session is invalid or has expired.",
        ) from error

    if not post_id or len(post_id) > 200:
        raise HTTPException(
            status_code=400,
            detail="A valid post ID is required.",
        )

    try:
        db = get_firestore()
        post_ref = db.collection("posts").document(post_id)

        transaction = db.transaction()

        @firestore.transactional
        def apply_reaction(transaction):
            # Read the post first to establish its real creator.
            post_snapshot = post_ref.get(transaction=transaction)

            if not post_snapshot.exists:
                raise HTTPException(
                    status_code=404,
                    detail="This post could not be found.",
                )

            post_data = post_snapshot.to_dict() or {}
            creator_uid = post_data.get("userId")

            if not isinstance(creator_uid, str) or not creator_uid.strip():
                raise HTTPException(
                    status_code=400,
                    detail="This post has no valid creator ID.",
                )

            if creator_uid == reactor_uid:
                raise HTTPException(
                    status_code=403,
                    detail="You cannot earn engagement points by reacting to your own post.",
                )

            creator_ref = db.collection("users").document(creator_uid)
            creator_snapshot = creator_ref.get(transaction=transaction)

            if not creator_snapshot.exists:
                raise HTTPException(
                    status_code=404,
                    detail="The creator's user profile could not be found.",
                )

            # Read the existing reaction state.
            user_reactions = post_data.get("userReactions") or {}

            if not isinstance(user_reactions, dict):
                user_reactions = {}

            user_reactions = dict(user_reactions)
            previous_emoji = user_reactions.get(reactor_uid)

            reactions = {
                "👍": 0,
                "❤️": 0,
                "😂": 0,
                "😊": 0,
                "😮": 0,
                "😢": 0,
                "👏": 0,
                "👎": 0,
            }

            stored_reactions = post_data.get("reactions") or {}

            if isinstance(stored_reactions, dict):
                for emoji in reactions:
                    try:
                        reactions[emoji] = max(
                            0, int(stored_reactions.get(emoji, 0))
                        )
                    except (TypeError, ValueError):
                        reactions[emoji] = 0

            # Calculate the post's score from its recorded
            # individual reactions, not from a client-supplied score.
            old_post_score = sum(
                REACTION_POINTS.get(emoji, 0)
                for emoji in user_reactions.values()
            )

            if previous_emoji == payload.emoji:
                # Clicking the same reaction again removes it.
                reactions[payload.emoji] = max(
                    0, reactions[payload.emoji] - 1
                )
                user_reactions.pop(reactor_uid, None)
            else:
                # Replace an existing reaction, if present.
                if previous_emoji in REACTION_POINTS:
                    reactions[previous_emoji] = max(
                        0, reactions[previous_emoji] - 1
                    )

                reactions[payload.emoji] += 1
                user_reactions[reactor_uid] = payload.emoji

            new_post_score = sum(
                REACTION_POINTS.get(emoji, 0)
                for emoji in user_reactions.values()
            )

            score_delta = new_post_score - old_post_score

            creator_data = creator_snapshot.to_dict() or {}
            current_creator_score = creator_data.get("creatorScore", 0)

            if not isinstance(current_creator_score, (int, float)):
                current_creator_score = 0

            new_creator_score = current_creator_score + score_delta

            # Both writes are performed together by the trusted backend.
            transaction.update(
                post_ref,
                {
                    "reactions": reactions,
                    "userReactions": user_reactions,
                    "creatorScore": new_post_score,
                },
            )

            transaction.update(
                creator_ref,
                {
                    "creatorScore": new_creator_score,
                },
            )

            return {
                "reactions": reactions,
                "userReactions": user_reactions,
                "postCreatorScore": new_post_score,
                "creatorScore": new_creator_score,
                "scoreChange": score_delta,
            }

        result = apply_reaction(transaction)

        return {
            "success": True,
            **result,
        }

    except HTTPException:
        raise
    except Exception as error:
        print(
            "Reaction processing failed:",
            type(error).__name__,
            str(error),
        )
        raise HTTPException(
            status_code=500,
            detail="The reaction could not be saved. Please try again.",
        ) from error
