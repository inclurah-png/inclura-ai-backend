
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
    version="1.3.0",
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


@app.post("/api/sos-notification-access/activate")
def activate_sos_notification_only_access(
    authorization: str | None = Header(default=None),
):
    """Grant read-only SOS notification access only to a pre-approved email."""
    uid = verify_bearer_token(authorization)
    configured_emails = {
        item.strip().lower()
        for item in os.getenv("SOS_NOTIFICATION_ONLY_EMAILS", "").split(",")
        if item.strip()
    }
    if not configured_emails:
        raise HTTPException(
            status_code=503,
            detail="SOS notification-only account allowlist is not configured.",
        )

    try:
        firebase_app = get_firebase_admin()
        account = auth.get_user(uid, app=firebase_app)
        account_email = (account.email or "").strip().lower()
        if not account_email or account_email not in configured_emails:
            print(
                "SOS notification access mismatch:",
                "project_id=", firebase_app.project_id,
                "account_email=", repr(account_email),
                "configured_email_count=", len(configured_emails),
            )
            raise HTTPException(
                status_code=403,
                detail=(
                    "SOS access check: backend project="
                    + str(firebase_app.project_id)
                    + "; Firebase account email="
                    + (account_email or "(missing)")
                    + "; configured allowlist entries="
                    + str(len(configured_emails))
                    + ". The backend account email did not match the allowlist."
                ),
            )

        claims = dict(account.custom_claims or {})
        if claims.get("admin") is True:
            return {
                "success": True,
                "role": "administrator",
                "message": "Existing administrator access is unchanged.",
            }

        claims["sosNotificationOnly"] = True
        auth.set_custom_user_claims(uid, claims, app=firebase_app)
        return {
            "success": True,
            "role": "sosNotificationOnly",
            "message": "Read-only SOS notification access has been activated. Sign in again to refresh permissions.",
        }
    except HTTPException:
        raise
    except Exception as exc:
        print("SOS notification-only activation failed:", type(exc).__name__, str(exc))
        raise HTTPException(
            status_code=500,
            detail="SOS notification-only access could not be activated.",
        ) from exc


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
        "version": "1.3.0",
        "creatorScoring": "available",
        "postReactions": "available",
        "ifseDispatch": "available",
        "sosAdministratorAlerts": "available",
        "sosAuditLogging": "available",
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



# --------------------------------------------------
# AUTOMATIC IFSE SOS DISPATCH + NOTIFICATION-ONLY ADMIN ALERTS
# --------------------------------------------------

import re


def classify_emergency(emergency):
    text = (
        str(emergency.get("emergencyType") or "")
        + " "
        + str(emergency.get("description") or "")
    ).strip().lower()

    patterns = [
        ("MEDICAL", r"medical|injury|injured|unconscious|bleeding|heart attack|stroke|ambulance|illness|overdose|pregnan"),
        ("FIRE", r"fire|smoke|burning|flame|explosion|building fire"),
        ("FLOOD", r"flood|flooding|landslide|earthquake|building collapse|collapse|natural disaster|storm|disaster"),
        ("POLICE", r"police|missing person|theft|robbery|burglary|crime|assault|domestic violence|violent crime"),
        ("ARMED_ATTACK", r"kidnap|kidnapping|hostage|armed|weapon|gun|shooting|terror|terrorist|attack|armed intrusion|security threat|violent attack|invasion"),
    ]

    for rule_id, pattern in patterns:
        if re.search(pattern, text):
            return rule_id
    return "POLICE"


def record_sos_receipt_and_notify(db, emergency_id, emergency, rule_id):
    """Record SOS and notify designated accounts; never gate or control dispatch."""
    now = firestore.SERVER_TIMESTAMP
    audit_ref = db.collection("ifseAuditLogs").document(
        f"sos_received_{emergency_id}"
    )
    audit_recorded = False
    alert_count = 0
    alert_error = ""

    try:
        audit_ref.set({
            "module": "SOS",
            "ifseGenerated": True,
            "action": "SOS_RECEIVED",
            "emergencyId": emergency_id,
            "actor": "IFSE System",
            "description": (
                "A member submitted an SOS. Administrator notification "
                "was generated automatically; no approval is required."
            ),
            "emergencyType": emergency.get("emergencyType") or "",
            "priority": emergency.get("priority") or "Unspecified",
            "gpsLatitude": float(emergency.get("gpsLatitude") or 0),
            "gpsLongitude": float(emergency.get("gpsLongitude") or 0),
            "dispatchStatus": "Dispatch attempt pending",
            "ruleDocumentId": rule_id or "",
            "createdAt": now,
            "updatedAt": now,
        }, merge=True)
        audit_recorded = True
    except Exception as exc:
        print("SOS receipt audit failed:", type(exc).__name__, str(exc))

    try:
        firebase_app = get_firebase_admin()
        recipients = []
        page_token = None

        while True:
            page = auth.list_users(
                max_results=1000,
                page_token=page_token,
                app=firebase_app,
            )
            for account in page.users:
                claims = account.custom_claims or {}
                if (
                    claims.get("admin") is True
                    or claims.get("sosNotificationOnly") is True
                ):
                    recipients.append(account.uid)
            page_token = page.next_page_token
            if not page_token:
                break

        batch = db.batch()
        for recipient_uid in recipients:
            notification_ref = (
                db.collection("notifications")
                .document(f"{emergency_id}_admin_{recipient_uid}")
            )
            batch.set(notification_ref, {
                "receiverId": recipient_uid,
                "senderId": "system",
                "type": "emergency_sos",
                "category": "SOS",
                "title": "New emergency SOS received",
                "message": (
                    f"An SOS request has been recorded. Emergency ID: "
                    f"{emergency_id}. Priority: "
                    f"{emergency.get('priority') or 'Unspecified'}. "
                    "This is an informational alert; no approval action is required."
                ),
                "emergencyId": emergency_id,
                "read": False,
                "createdAt": now,
            }, merge=True)

        if recipients:
            batch.commit()
        alert_count = len(recipients)
    except Exception as exc:
        alert_error = "Administrator in-app alert could not be delivered."
        print("SOS administrator alert failed:", type(exc).__name__, str(exc))

    return {
        "auditId": audit_ref.id,
        "auditRecorded": audit_recorded,
        "administratorsAlerted": alert_count,
        "alertError": alert_error,
    }


def resolve_ifse_agency(db, identifier):
    requested = str(identifier or "").strip()
    if not requested:
        raise RuntimeError("The IFSE rule has no primary agency.")

    snapshot = (
        db.collection("ifseAgencyRegistry")
        .where("agencyCode", "==", requested)
        .limit(1)
        .get()
    )
    if not snapshot:
        snapshot = (
            db.collection("ifseAgencyRegistry")
            .where("agencyName", "==", requested)
            .limit(1)
            .get()
        )
    if not snapshot:
        raise RuntimeError(f'IFSE agency "{requested}" was not found.')

    agency = snapshot[0].to_dict() or {}
    if agency.get("active") is not True:
        raise RuntimeError(f'IFSE agency "{requested}" is inactive.')
    if agency.get("governmentAuthorized") is not True:
        raise RuntimeError(f'IFSE agency "{requested}" is not government authorized.')
    if not agency.get("responderCollection"):
        raise RuntimeError(f'IFSE agency "{requested}" has no responder collection configured.')

    return {
        "id": snapshot[0].id,
        "agencyName": agency.get("agencyName") or "",
        "agencyCode": agency.get("agencyCode") or "",
        "responderCollection": agency["responderCollection"],
        "agencyType": agency.get("agencyType") or "",
        "ifseVerifiedRequired": agency.get("ifseVerifiedRequired") is True,
    }


@app.post("/api/ifse-dispatch/{emergency_id}/dispatch")
def dispatch_ifse_emergency(
    emergency_id: str,
    authorization: str | None = Header(default=None),
):
    uid = verify_bearer_token(authorization)
    emergency_id = emergency_id.strip()
    if not emergency_id:
        raise HTTPException(status_code=400, detail="An emergency ID is required.")

    db = get_firestore()
    emergency_ref = db.collection("emergencySOS").document(emergency_id)
    emergency_snapshot = emergency_ref.get()

    if not emergency_snapshot.exists:
        raise HTTPException(status_code=404, detail="Emergency record was not found.")

    emergency = emergency_snapshot.to_dict() or {}
    if emergency.get("userId") != uid:
        raise HTTPException(
            status_code=403,
            detail="You are not authorized to dispatch this emergency.",
        )

    rule_id = classify_emergency(emergency)
    admin_alert = record_sos_receipt_and_notify(
        db, emergency_id, emergency, rule_id
    )

    try:
        rule_snapshot = (
            db.collection("emergencyResponseRules")
            .document(rule_id)
            .get()
        )
        if not rule_snapshot.exists:
            raise RuntimeError(f'IFSE authoritative rule "{rule_id}" was not found.')

        rule = rule_snapshot.to_dict() or {}
        if rule.get("active") is not True:
            raise RuntimeError(f'IFSE authoritative rule "{rule_id}" is inactive.')
        if not rule.get("primaryAgency"):
            raise RuntimeError("IFSE authoritative rule has no primary agency.")

        agency = resolve_ifse_agency(db, rule.get("primaryAgency"))
        responder_snapshot = (
            db.collection(agency["responderCollection"]).get()
        )
        eligible = []
        for responder_doc in responder_snapshot:
            responder_data = responder_doc.to_dict() or {}
            verified_for_agency = (
                responder_data.get("ifseVerified") is True
                if agency["ifseVerifiedRequired"]
                else True
            )
            if (
                responder_data.get("available") is True
                and responder_data.get("onDuty") is True
                and responder_data.get("verified") is True
                and verified_for_agency
                and responder_data.get("suspended") is not True
            ):
                eligible.append((responder_doc, responder_data))

        if not eligible:
            raise RuntimeError(
                f"No eligible responder found in {agency['responderCollection']}."
            )

        responder_doc, responder_data = eligible[0]
        responder_name = (
            responder_data.get("fullName")
            or responder_data.get("displayName")
            or responder_data.get("name")
            or responder_data.get("username")
            or "Emergency Response Team"
        )

        assignment_id = f"{emergency_id}_{responder_doc.id}"
        assignment_ref = (
            db.collection("emergencyAssignments").document(assignment_id)
        )
        existing_assignment = assignment_ref.get()
        if existing_assignment.exists:
            existing = existing_assignment.to_dict() or {}
            return {
                "success": True,
                "emergencyId": emergency_id,
                "escalationId": "",
                "agency": existing.get("responderAgency") or agency["agencyName"],
                "responderName": existing.get("responderName") or "Assigned responder",
                "responderId": responder_doc.id,
                "assignmentStatus": existing.get("assignmentStatus") or "Pending",
                "administratorAlert": admin_alert,
                "message": (
                    "An IFSE responder assignment already exists. "
                    "No duplicate assignment was created."
                ),
            }

        now = firestore.SERVER_TIMESTAMP
        escalation_query = (
            db.collection("emergencyEscalationQueue")
            .where("emergencyId", "==", emergency_id)
            .limit(1)
            .get()
        )
        if escalation_query:
            escalation_id = escalation_query[0].id
        else:
            escalation_ref = db.collection("emergencyEscalationQueue").document()
            escalation_ref.set({
                "emergencyId": emergency_id,
                "emergencyType": emergency.get("emergencyType") or "",
                "priority": emergency.get("priority") or rule.get("priority") or "Low",
                "ruleDocumentId": rule_id,
                "primaryAgency": rule.get("primaryAgency") or "",
                "secondaryAgency": rule.get("secondaryAgency") or "",
                "tertiaryAgency": rule.get("tertiaryAgency") or "",
                "escalationMinutes": int(rule.get("escalationMinutes") or 0),
                "escalationLevel": 0,
                "waitingForAcceptance": True,
                "accepted": False,
                "acceptedAt": None,
                "governmentEscalated": False,
                "paramilitaryEscalated": False,
                "militaryEscalated": False,
                "satelliteActivated": False,
                "status": "Waiting",
                "createdAt": now,
                "updatedAt": now,
            })
            escalation_id = escalation_ref.id

        assignment = {
            "assignmentId": assignment_id,
            "emergencyId": emergency_id,
            "responderId": responder_doc.id,
            "responderName": responder_name,
            "responderAgency": agency["agencyName"],
            "responderAgencyCode": agency["agencyCode"],
            "responderAgencyType": agency["agencyType"],
            "responderCollection": agency["responderCollection"],
            "responderType": responder_data.get("responderType") or "Government",
            "assignedBy": "IFSE Auto Dispatch",
            "assignmentStatus": "Pending",
            "accepted": False,
            "acceptedAt": None,
            "arrived": False,
            "arrivedAt": None,
            "completed": False,
            "completedAt": None,
            "cancelled": False,
            "cancellationReason": "",
            "escalationLevel": 0,
            "dispatchPriority": emergency.get("priority") or rule.get("priority") or "Low",
            "estimatedArrivalMinutes": int(rule.get("estimatedArrivalMinutes") or 0),
            "actualArrivalMinutes": 0,
            "satelliteDispatch": False,
            "automaticAssignment": True,
            "manualOverride": False,
            "createdAt": now,
            "updatedAt": now,
        }

        batch = db.batch()
        batch.create(assignment_ref, assignment)
        batch.update(emergency_ref, {
            "status": "assigned",
            "assignedResponder": responder_name,
            "assignedResponderId": responder_doc.id,
            "assignedAgency": agency["agencyName"],
            "assignedAgencyCode": agency["agencyCode"],
            "assignedAgencyType": agency["agencyType"],
            "responderCollection": agency["responderCollection"],
            "responseStatus": "Awaiting Responder Acceptance",
            "assignmentStatus": "Pending",
            "incidentStatus": "Responder Assigned",
            "ifseClassification": rule_id,
            "updatedAt": now,
        })
        timeline_ref = db.collection("emergencyTimeline").document()
        batch.set(timeline_ref, {
            "timelineId": f"{emergency_id}_001",
            "emergencyId": emergency_id,
            "eventType": "Responder Assigned",
            "eventDescription": (
                f"{agency['agencyName'] or 'Authorized agency'} responder "
                "assigned automatically by IFSE."
            ),
            "performedBy": "IFSE Dispatch Engine",
            "performerType": "System",
            "responderId": responder_doc.id,
            "responderAgency": agency["agencyName"],
            "responderAgencyCode": agency["agencyCode"],
            "responderAgencyType": agency["agencyType"],
            "responderName": responder_name,
            "responderCollection": agency["responderCollection"],
            "eventStatus": "Completed",
            "latitude": float(emergency.get("gpsLatitude") or 0),
            "longitude": float(emergency.get("gpsLongitude") or 0),
            "satelliteMode": False,
            "networkAvailable": True,
            "offlineRecorded": False,
            "severity": emergency.get("priority") or "Low",
            "ifseThreatScore": 0,
            "ifseClassification": rule_id,
            "eventOrder": 1,
            "visibleToFamily": True,
            "visibleToGovernment": True,
            "visibleToResponders": True,
            "createdAt": now,
            "updatedAt": now,
        })
        batch.commit()

        db.collection("ifseAuditLogs").add({
            "module": "SOS",
            "ifseGenerated": True,
            "action": "RESPONDER_ASSIGNED",
            "emergencyId": emergency_id,
            "actor": "IFSE System",
            "description": (
                "An eligible responder was assigned automatically. "
                "Acceptance and arrival remain unconfirmed."
            ),
            "assignedAgency": agency["agencyName"],
            "responderName": responder_name,
            "escalationLevel": 0,
            "escalationStatus": "Waiting for responder acceptance",
            "gpsLatitude": float(emergency.get("gpsLatitude") or 0),
            "gpsLongitude": float(emergency.get("gpsLongitude") or 0),
            "createdAt": now,
            "updatedAt": now,
        })

        return {
            "success": True,
            "emergencyId": emergency_id,
            "escalationId": escalation_id,
            "ruleDocumentId": rule_id,
            "agency": agency["agencyName"],
            "agencyCode": agency["agencyCode"],
            "responderName": responder_name,
            "responderId": responder_doc.id,
            "assignmentStatus": "Pending",
            "administratorAlert": admin_alert,
            "message": (
                "IFSE responder assignment created. Responder acceptance "
                "and arrival are not yet confirmed."
            ),
        }

    except HTTPException:
        raise
    except Exception as exc:
        print("IFSE dispatch failed:", type(exc).__name__, str(exc))
        try:
            db.collection("ifseAuditLogs").add({
                "module": "SOS",
                "ifseGenerated": True,
                "action": "DISPATCH_FAILED",
                "emergencyId": emergency_id,
                "actor": "IFSE System",
                "description": str(exc)[:500],
                "dispatchStatus": "Failed",
                "createdAt": firestore.SERVER_TIMESTAMP,
                "updatedAt": firestore.SERVER_TIMESTAMP,
            })
        except Exception as audit_exc:
            print("SOS failure audit failed:", type(audit_exc).__name__, str(audit_exc))

        raise HTTPException(
            status_code=500,
            detail=str(exc) or "IFSE dispatch failed.",
        ) from exc


# --------------------------------------------------
# TRUSTED-CONTACT SMS VIA TERMII
# --------------------------------------------------

import urllib.error
import urllib.request


def normalize_nigeria_phone(value):
    raw = str(value or "").strip()
    digits = re.sub(r"[^0-9]", "", raw)
    if not digits:
        return ""
    if raw.startswith("+") or digits.startswith("234"):
        return digits
    if digits.startswith("0") and len(digits) == 11:
        return "234" + digits[1:]
    return ""


def submit_termii_sms(recipient, message):
    api_key = os.getenv("TERMII_API_KEY")
    if not api_key:
        raise RuntimeError("SMS provider is not configured.")

    payload = {
        "to": recipient,
        "from": os.getenv("TERMII_SENDER_ID") or "INCLURA",
        "sms": message,
        "type": "plain",
        "channel": "generic",
        "api_key": api_key,
    }
    request = urllib.request.Request(
        "https://api.ng.termii.com/api/sms/send",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            result = json.loads(response.read().decode("utf-8") or "{}")
            if response.status < 200 or response.status >= 300:
                raise RuntimeError("The SMS provider did not accept this message.")
    except urllib.error.HTTPError as exc:
        raise RuntimeError("The SMS provider did not accept this message.") from exc

    if str(result.get("code", "")).lower() in ("2", "error"):
        raise RuntimeError("The SMS provider did not accept this message.")
    return result


@app.post("/api/sos-notifications/{emergency_id}/send")
def send_sos_trusted_contact_sms(
    emergency_id: str,
    authorization: str | None = Header(default=None),
):
    uid = verify_bearer_token(authorization)
    emergency_id = emergency_id.strip()
    if (
        not emergency_id
        or "/" in emergency_id
        or len(emergency_id) > 150
    ):
        raise HTTPException(status_code=400, detail="Invalid emergency reference.")

    if not os.getenv("TERMII_API_KEY"):
        raise HTTPException(
            status_code=503,
            detail="SMS delivery is not configured yet.",
        )

    try:
        db = get_firestore()
        emergency_ref = db.collection("emergencySOS").document(emergency_id)
        emergency_snapshot = emergency_ref.get()
        if (
            not emergency_snapshot.exists
            or (emergency_snapshot.to_dict() or {}).get("userId") != uid
        ):
            raise HTTPException(
                status_code=404,
                detail="Emergency record not found.",
            )

        emergency = emergency_snapshot.to_dict() or {}
        contacts_snapshot = (
            db.collection("trustedContacts")
            .where("ownerId", "==", uid)
            .get()
        )
        contacts = [
            (doc.id, doc.to_dict() or {})
            for doc in contacts_snapshot
            if (doc.to_dict() or {}).get("status") == "Active"
            and (doc.to_dict() or {}).get("phoneNumber")
        ]

        if not contacts:
            return {
                "success": True,
                "sent": 0,
                "failed": 0,
                "message": "No active trusted contacts have a phone number.",
            }

        location_text = str(emergency.get("location") or "").strip()
        try:
            latitude = float(emergency.get("latitude"))
            longitude = float(emergency.get("longitude"))
        except (TypeError, ValueError):
            latitude = longitude = 0.0

        maps_link = (
            f" https://maps.google.com/?q={latitude},{longitude}"
            if latitude or longitude
            else ""
        )
        message = "\n".join([
            "INCLURA SOS ALERT",
            "Member: " + str(emergency.get("userName") or "Inclura member")[:80],
            "Emergency: " + str(emergency.get("emergencyType") or "Emergency")[:50],
            "Priority: " + str(emergency.get("priority") or "Unspecified")[:20],
            "Location: " + (location_text[:180] if location_text else "Not provided"),
            maps_link,
            "Please contact the member immediately. Ref: " + emergency_id,
        ])[:900]

        sent = 0
        failed = 0
        outcomes = []

        for contact_id, contact in contacts:
            notification_ref = (
                db.collection("emergencyNotifications")
                .document(f"{emergency_id}_{contact_id}_sms")
            )
            previous_snapshot = notification_ref.get()
            previous = previous_snapshot.to_dict() or {}
            if previous_snapshot.exists and previous.get("smsStatus") in (
                "accepted", "delivered"
            ):
                outcomes.append({
                    "contactId": contact_id,
                    "status": previous.get("smsStatus"),
                })
                continue

            recipient = normalize_nigeria_phone(contact.get("phoneNumber"))
            base_record = {
                "emergencyId": emergency_id,
                "recipientType": "Trusted Contact",
                "recipientId": contact_id,
                "recipientName": contact.get("fullName") or "",
                "recipientPhone": contact.get("phoneNumber") or "",
                "deliveryMethod": "SMS",
            }

            if not recipient:
                failed += 1
                notification_ref.set({
                    **base_record,
                    "smsStatus": "failed",
                    "smsError": (
                        "Phone number must include a valid Nigerian "
                        "or international country code."
                    ),
                    "updatedAt": firestore.SERVER_TIMESTAMP,
                }, merge=True)
                outcomes.append({"contactId": contact_id, "status": "failed"})
                continue

            notification_ref.set({
                **base_record,
                "smsStatus": "sending",
                "smsError": "",
                "updatedAt": firestore.SERVER_TIMESTAMP,
            }, merge=True)

            try:
                provider = submit_termii_sms(recipient, message)
                notification_ref.set({
                    "smsStatus": "accepted",
                    "smsProvider": "Termii",
                    "smsMessageId": (
                        provider.get("message_id")
                        or provider.get("messageId")
                        or ""
                    ),
                    "smsProviderResponseCode": provider.get("code") or "",
                    "smsAcceptedAt": firestore.SERVER_TIMESTAMP,
                    "updatedAt": firestore.SERVER_TIMESTAMP,
                }, merge=True)
                sent += 1
                outcomes.append({"contactId": contact_id, "status": "accepted"})
            except Exception as exc:
                print("Termii SOS SMS failed:", type(exc).__name__, str(exc))
                notification_ref.set({
                    "smsStatus": "failed",
                    "smsError": "Provider did not accept the SMS.",
                    "updatedAt": firestore.SERVER_TIMESTAMP,
                }, merge=True)
                failed += 1
                outcomes.append({"contactId": contact_id, "status": "failed"})

        return {
            "success": True,
            "sent": sent,
            "failed": failed,
            "outcomes": outcomes,
            "message": (
                "SMS submission results recorded. "
                "Provider acceptance does not confirm delivery."
            ),
        }

    except HTTPException:
        raise
    except Exception as exc:
        print("SOS trusted-contact SMS failed:", type(exc).__name__, str(exc))
        raise HTTPException(
            status_code=500,
            detail="SOS SMS notifications could not be processed.",
        ) from exc
