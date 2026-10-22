
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
    version="1.2.0",
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
    """Return the existing Firebase app or initialize it once."""
    try:
        return firebase_admin.get_app()
    except ValueError:
        pass

    service_account_json = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")

    if not service_account_json:
        raise RuntimeError(
            "FIREBASE_SERVICE_ACCOUNT_JSON is not configured."
        )

    try:
        service_account_info = json.loads(service_account_json)

        required_fields = (
            "project_id",
            "client_email",
            "private_key",
        )

        missing_fields = [
            field
            for field in required_fields
            if not service_account_info.get(field)
        ]

        if missing_fields:
            raise RuntimeError(
                "Firebase service account is missing required fields: "
                + ", ".join(missing_fields)
            )

        service_account_info["private_key"] = (
            service_account_info["private_key"].replace("\\n", "\n")
        )

        certificate = credentials.Certificate(service_account_info)

        return firebase_admin.initialize_app(certificate)

    except Exception as exc:
        print(
            "Firebase Admin initialization failed:",
            type(exc).__name__,
            str(exc),
        )
        raise RuntimeError(
            "Firebase Admin could not be initialized."
        ) from exc


def get_firestore():
    """Return a Firestore client associated with the initialized app."""
    firebase_app = get_firebase_admin()
    return firestore.client(app=firebase_app)


def verify_bearer_token(authorization):
    """Validate a Firebase ID token and return its authenticated UID."""
    if (
        not authorization
        or not authorization.startswith("Bearer ")
    ):
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
        firebase_app = get_firebase_admin()

        decoded_token = auth.verify_id_token(
            id_token,
            app=firebase_app,
        )

        uid = decoded_token.get("uid")

        if not uid:
            raise HTTPException(
                status_code=401,
                detail="Invalid authentication token.",
            )

        return uid

    except HTTPException:
        raise

    except Exception as exc:
        print(
            "Firebase token verification failed:",
            type(exc).__name__,
            str(exc),
        )
        raise HTTPException(
            status_code=401,
            detail="Please sign in again.",
        ) from exc


# --------------------------------------------------
# HEALTH CHECK
# --------------------------------------------------

@app.get("/")
def home():
    return {
        "status": "Inclura AI Backend Running",
        "version": "1.2.0",
        "creatorScoring": "available",
        "postReactions": "available",
    }


# --------------------------------------------------
# CREATOR ACTIVITY SCORING
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
    media_type = str(data.get("mediaType", "")).lower()
    post_type = str(data.get("type", "")).lower()

    has_video = (
        bool(data.get("videoUrl"))
        or media_type == "video"
        or post_type == "video"
    )

    if activity_type == "video_post":
        return has_video

    if activity_type == "text_post":
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
                detail=(
                    "You are not authorized to earn points "
                    "for this activity."
                ),
            )

        if not activity_matches_type(data, activity_type):
            raise HTTPException(
                status_code=400,
                detail=(
                    "The activity does not match the requested "
                    "activity type."
                ),
            )

        return collection_name

    raise HTTPException(
        status_code=404,
        detail="The activity could not be found.",
    )


@app.post("/api/creator-score/award")
def award_creator_activity(
    payload: CreatorScoreRequest,
    authorization: str | None = Header(default=None),
):
    uid = verify_bearer_token(authorization)

    activity_type = payload.activityType
    activity_id = payload.activityId
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
                    detail="The stored creator economy data is invalid.",
                )

            current_score = economy.get("score", 0)

            if (
                isinstance(current_score, bool)
                or not isinstance(current_score, int)
                or current_score < 0
            ):
                raise HTTPException(
                    status_code=409,
                    detail="The stored creator economy score is invalid.",
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

    except Exception as exc:
        print(
            "Creator-score processing failed:",
            type(exc).__name__,
            str(exc),
        )
        raise HTTPException(
            status_code=500,
            detail=(
                "Creator scoring could not be recorded. "
                "Please try again later."
            ),
        ) from exc


# --------------------------------------------------
# AUTHENTICATED POST REACTIONS
# --------------------------------------------------

class PostReactionRequest(BaseModel):
    emoji: Literal[
        "❤️",
        "👏",
        "😊",
        "👍",
        "😂",
        "😮",
        "😢",
        "👎",
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
    reactor_uid = verify_bearer_token(authorization)

    try:
        db = get_firestore()

        post_ref = db.collection("posts").document(post_id)
        transaction = db.transaction()

        @firestore.transactional
        def apply_reaction(transaction):
            post_snapshot = post_ref.get(
                transaction=transaction
            )

            if not post_snapshot.exists:
                raise HTTPException(
                    status_code=404,
                    detail="Post not found.",
                )

            post_data = post_snapshot.to_dict() or {}
            creator_uid = post_data.get("userId")

            if not isinstance(creator_uid, str) or not creator_uid:
                raise HTTPException(
                    status_code=400,
                    detail="This post has no valid creator ID.",
                )

            if creator_uid == reactor_uid:
                raise HTTPException(
                    status_code=403,
                    detail=(
                        "You cannot earn engagement points "
                        "by reacting to your own post."
                    ),
                )

            creator_ref = db.collection("users").document(creator_uid)

            creator_snapshot = creator_ref.get(
                transaction=transaction
            )

            if not creator_snapshot.exists:
                raise HTTPException(
                    status_code=404,
                    detail="The post creator's profile was not found.",
                )

            creator_data = creator_snapshot.to_dict() or {}

            stored_user_reactions = post_data.get("userReactions")
            user_reactions = (
                dict(stored_user_reactions)
                if isinstance(stored_user_reactions, dict)
                else {}
            )

            stored_reactions = post_data.get("reactions")
            reactions = (
                dict(stored_reactions)
                if isinstance(stored_reactions, dict)
                else {}
            )

            # Normalize reaction counts without discarding other fields.
            for emoji in REACTION_POINTS:
                try:
                    count = int(reactions.get(emoji, 0))
                    reactions[emoji] = max(0, count)
                except (TypeError, ValueError):
                    reactions[emoji] = 0

            old_emoji = user_reactions.get(reactor_uid)
            new_emoji = payload.emoji
            old_points = REACTION_POINTS.get(old_emoji, 0)

            if old_emoji == new_emoji:
                # Same emoji clicked again: remove this user's reaction.
                user_reactions.pop(reactor_uid, None)
                reactions[new_emoji] = max(
                    0,
                    reactions[new_emoji] - 1,
                )
                score_delta = -old_points
                action = "removed"

            else:
                # Change the user's previous reaction, if there was one.
                if old_emoji in REACTION_POINTS:
                    reactions[old_emoji] = max(
                        0,
                        reactions[old_emoji] - 1,
                    )

                user_reactions[reactor_uid] = new_emoji
                reactions[new_emoji] += 1

                score_delta = (
                    REACTION_POINTS[new_emoji] - old_points
                )

                action = "added" if old_emoji is None else "changed"

            try:
                post_score = int(
                    post_data.get("creatorScore", 0) or 0
                )
                creator_score = int(
                    creator_data.get("creatorScore", 0) or 0
                )
            except (TypeError, ValueError):
                raise HTTPException(
                    status_code=409,
                    detail="The stored engagement score is invalid.",
                )

            updated_post_score = post_score + score_delta
            updated_creator_score = creator_score + score_delta

            # Update post reaction state and creator engagement score
            # atomically, using the authenticated reactor UID.
            transaction.update(
                post_ref,
                {
                    "reactions": reactions,
                    "userReactions": user_reactions,
                    "creatorScore": updated_post_score,
                },
            )

            transaction.update(
                creator_ref,
                {
                    "creatorScore": updated_creator_score,
                },
            )

            return {
                "success": True,
                "action": action,
                "reactions": reactions,
                "userReactions": user_reactions,
                "postCreatorScore": updated_post_score,
                "creatorScore": updated_creator_score,
                "scoreChange": score_delta,
            }

        return apply_reaction(transaction)

    except HTTPException:
        raise

    except Exception as exc:
        print(
            "Reaction processing failed:",
            type(exc).__name__,
            str(exc),
        )
        raise HTTPException(
            status_code=500,
            detail="The reaction could not be saved. Please try again.",
        ) from exc

