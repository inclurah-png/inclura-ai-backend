"""FastAPI-native IFSE responder and agency dispatch workflows.

This module is mounted by app.py. It does not introduce an agency SDK or
allow external agencies to execute code inside Inclura.
"""
import hashlib
import hmac
import json
import os
import re
import time
import urllib.error
import urllib.request
from datetime import datetime, timedelta, timezone
from urllib.parse import urlparse

from fastapi import APIRouter, Header, HTTPException
from firebase_admin import firestore

from app import get_firestore, resolve_ifse_agency, verify_bearer_token

router = APIRouter()


def _valid_id(value):
    value = str(value or "").strip()
    if not value or "/" in value or len(value) > 150:
        raise HTTPException(status_code=400, detail="Invalid emergency reference.")
    return value


def _linked_uid(data):
    return str(
        data.get("firebaseUid") or data.get("firebaseUID")
        or data.get("userId") or data.get("uid") or ""
    ).strip()


def _current_assignment(db, emergency_id, responder_id):
    if not responder_id:
        return None
    docs = (
        db.collection("emergencyAssignments")
        .where("emergencyId", "==", emergency_id)
        .get()
    )
    for doc in docs:
        data = doc.to_dict() or {}
        if (
            str(data.get("responderId") or "") == str(responder_id)
            and data.get("cancelled") is not True
            and data.get("completed") is not True
        ):
            return doc
    return None


def _verify_responder_identity(db, assignment, uid):
    responder_id = str(assignment.get("responderId") or "")
    collection_name = str(assignment.get("responderCollection") or "")
    if not responder_id or not collection_name:
        raise HTTPException(status_code=403, detail="Responder identity could not be verified.")
    responder = db.collection(collection_name).document(responder_id).get()
    data = responder.to_dict() or {} if responder.exists else {}
    if not responder.exists or _linked_uid(data) != uid:
        raise HTTPException(status_code=403, detail="This responder is not authorised for the assignment.")
    return responder_id


@router.post("/api/responder-response/{emergency_id}/accept")
def accept_responder_assignment(
    emergency_id: str,
    authorization: str | None = Header(default=None),
):
    uid = verify_bearer_token(authorization, require_registered=True)
    emergency_id = _valid_id(emergency_id)
    db = get_firestore()
    emergency_ref = db.collection("emergencySOS").document(emergency_id)
    emergency_snap = emergency_ref.get()
    if not emergency_snap.exists:
        raise HTTPException(status_code=404, detail="Emergency record was not found.")
    emergency = emergency_snap.to_dict() or {}
    assignment_doc = _current_assignment(db, emergency_id, emergency.get("assignedResponderId"))
    if not assignment_doc:
        raise HTTPException(status_code=404, detail="Current responder assignment was not found.")
    assignment = assignment_doc.to_dict() or {}
    responder_id = _verify_responder_identity(db, assignment, uid)
    if assignment.get("cancelled") is True or assignment.get("completed") is True:
        raise HTTPException(status_code=409, detail="This assignment is no longer accepting responses.")
    if assignment.get("accepted") is True or assignment.get("assignmentStatus") == "Accepted":
        return {"success": True, "emergencyId": emergency_id, "assignmentStatus": "Accepted",
                "responseStatus": "Responder Accepted", "message": "Acceptance was already recorded."}
    if assignment.get("assignmentStatus") != "Pending":
        raise HTTPException(status_code=409, detail="Only a pending assignment can be accepted.")

    queues = (
        db.collection("emergencyEscalationQueue")
        .where("emergencyId", "==", emergency_id).limit(1).get()
    )
    queue_ref = queues[0].reference if queues else None
    timeline_ref = db.collection("emergencyTimeline").document()
    now = datetime.now(timezone.utc)
    transaction = db.transaction()

    @firestore.transactional
    def apply(tx):
        fresh_emergency = emergency_ref.get(transaction=tx)
        fresh_assignment = assignment_doc.reference.get(transaction=tx)
        fresh_queue = queue_ref.get(transaction=tx) if queue_ref else None
        if not fresh_emergency.exists or not fresh_assignment.exists:
            return "missing"
        e = fresh_emergency.to_dict() or {}
        a = fresh_assignment.to_dict() or {}
        if str(e.get("assignedResponderId") or "") != responder_id or str(a.get("responderId") or "") != responder_id:
            return "superseded"
        if a.get("cancelled") is True or a.get("completed") is True:
            return "inactive"
        if a.get("accepted") is True or a.get("assignmentStatus") == "Accepted":
            return "already-accepted"
        if a.get("assignmentStatus") != "Pending":
            return "not-pending"
        tx.update(assignment_doc.reference, {
            "assignmentStatus": "Accepted", "accepted": True,
            "acceptedAt": now, "updatedAt": now,
        })
        tx.update(emergency_ref, {
            "responseStatus": "Responder Accepted", "assignmentStatus": "Accepted",
            "incidentStatus": "Responder Accepted", "updatedAt": now,
        })
        if fresh_queue and fresh_queue.exists:
            tx.update(queue_ref, {
                "accepted": True, "acceptedAt": now, "waitingForAcceptance": False,
                "status": "Accepted", "escalationLeaseToken": "",
                "escalationLeaseUntil": datetime(1970, 1, 1, tzinfo=timezone.utc),
                "updatedAt": now,
            })
        tx.set(timeline_ref, {
            "timelineId": emergency_id + "_accept_" + str(int(now.timestamp() * 1000)),
            "emergencyId": emergency_id, "eventType": "Responder Accepted",
            "eventDescription": "Assigned responder accepted through the authenticated responder channel.",
            "performedBy": responder_id, "performerType": "Responder",
            "responderId": responder_id, "responderName": a.get("responderName") or "",
            "responderAgency": a.get("responderAgency") or "",
            "responderAgencyCode": a.get("responderAgencyCode") or "",
            "eventStatus": "Completed", "visibleToFamily": True,
            "visibleToGovernment": True, "visibleToResponders": True,
            "createdAt": now, "updatedAt": now,
        })
        return "accepted"

    result = apply(transaction)
    if result == "already-accepted":
        return {"success": True, "emergencyId": emergency_id, "assignmentStatus": "Accepted",
                "responseStatus": "Responder Accepted", "message": "Acceptance was already recorded."}
    if result != "accepted":
        raise HTTPException(status_code=409, detail="Assignment is no longer eligible for acceptance.")
    return {"success": True, "emergencyId": emergency_id, "assignmentStatus": "Accepted",
            "responseStatus": "Responder Accepted", "message": "Responder acceptance recorded securely."}


@router.post("/api/responder-response/{emergency_id}/arrived")
def mark_responder_arrival(
    emergency_id: str,
    authorization: str | None = Header(default=None),
):
    uid = verify_bearer_token(authorization, require_registered=True)
    emergency_id = _valid_id(emergency_id)
    db = get_firestore()
    emergency_ref = db.collection("emergencySOS").document(emergency_id)
    emergency_snap = emergency_ref.get()
    if not emergency_snap.exists:
        raise HTTPException(status_code=404, detail="Emergency record was not found.")
    emergency = emergency_snap.to_dict() or {}
    assignment_doc = _current_assignment(db, emergency_id, emergency.get("assignedResponderId"))
    if not assignment_doc:
        raise HTTPException(status_code=404, detail="Current responder assignment was not found.")
    assignment = assignment_doc.to_dict() or {}
    responder_id = _verify_responder_identity(db, assignment, uid)
    if assignment.get("cancelled") is True or assignment.get("completed") is True:
        raise HTTPException(status_code=409, detail="This assignment is no longer active.")
    if assignment.get("accepted") is not True and assignment.get("assignmentStatus") != "Accepted":
        raise HTTPException(status_code=409, detail="The responder must accept before reporting arrival.")
    if assignment.get("arrived") is True:
        return {"success": True, "emergencyId": emergency_id, "assignmentStatus": "Responder On Scene",
                "responseStatus": "Responder On Scene", "message": "Arrival was already recorded."}

    timeline_ref = db.collection("emergencyTimeline").document()
    now = datetime.now(timezone.utc)
    transaction = db.transaction()

    @firestore.transactional
    def apply(tx):
        fresh_emergency = emergency_ref.get(transaction=tx)
        fresh_assignment = assignment_doc.reference.get(transaction=tx)
        if not fresh_emergency.exists or not fresh_assignment.exists:
            return "missing"
        e = fresh_emergency.to_dict() or {}
        a = fresh_assignment.to_dict() or {}
        if str(e.get("assignedResponderId") or "") != responder_id or str(a.get("responderId") or "") != responder_id:
            return "superseded"
        if a.get("cancelled") is True or a.get("completed") is True:
            return "inactive"
        if a.get("accepted") is not True and a.get("assignmentStatus") != "Accepted":
            return "not-accepted"
        if a.get("arrived") is True:
            return "already-arrived"
        tx.update(assignment_doc.reference, {
            "arrived": True, "arrivedAt": now,
            "assignmentStatus": "Responder On Scene", "updatedAt": now,
        })
        tx.update(emergency_ref, {
            "responseStatus": "Responder On Scene",
            "incidentStatus": "Responder On Scene", "updatedAt": now,
        })
        tx.set(timeline_ref, {
            "timelineId": emergency_id + "_arrival_" + str(int(now.timestamp() * 1000)),
            "emergencyId": emergency_id, "eventType": "Responder Arrived",
            "eventDescription": "Assigned responder reported arrival through the authenticated responder channel.",
            "performedBy": responder_id, "performerType": "Responder",
            "responderId": responder_id, "responderName": a.get("responderName") or "",
            "responderAgency": a.get("responderAgency") or "",
            "responderAgencyCode": a.get("responderAgencyCode") or "",
            "eventStatus": "Completed", "visibleToFamily": True,
            "visibleToGovernment": True, "visibleToResponders": True,
            "createdAt": now, "updatedAt": now,
        })
        return "arrived"

    result = apply(transaction)
    if result == "already-arrived":
        return {"success": True, "emergencyId": emergency_id, "assignmentStatus": "Responder On Scene",
                "responseStatus": "Responder On Scene", "message": "Arrival was already recorded."}
    if result != "arrived":
        raise HTTPException(status_code=409, detail="Arrival requires the current accepted assignment.")
    return {"success": True, "emergencyId": emergency_id, "assignmentStatus": "Responder On Scene",
            "responseStatus": "Responder On Scene"}


def _env_key(value):
    return re.sub(r"^_+|_+$", "", re.sub(r"[^A-Z0-9]+", "_", str(value or "").strip().upper()))


def dispatch_agency_notification(db, emergency, assignment, agency):
    """Send a minimal signed payload only to a configured official HTTPS endpoint."""
    notification_id = str(assignment.get("assignmentId") or "") + "_agency_dispatch"
    ref = db.collection("agencyDispatchNotifications").document(notification_id)
    existing = ref.get()
    previous = existing.to_dict() or {}
    now = datetime.now(timezone.utc)
    record = {
        "notificationId": notification_id, "emergencyId": assignment.get("emergencyId"),
        "assignmentId": assignment.get("assignmentId"), "agencyCode": agency.get("agencyCode"),
        "agencyName": agency.get("agencyName"), "agencyType": agency.get("agencyType"),
        "escalationLevel": assignment.get("escalationLevel") or 0,
        "deliveryMethod": "secure-agency-channel",
        "status": previous.get("status") or "queued",
        "attemptCount": int(previous.get("attemptCount") or 0),
        "createdAt": previous.get("createdAt") or now, "updatedAt": now,
    }
    ref.set(record, merge=True)
    prefix = "IFSE_AGENCY_" + _env_key(agency.get("agencyCode"))
    endpoint = str(os.getenv(prefix + "_DISPATCH_URL") or "").strip()
    secret = str(os.getenv(prefix + "_DISPATCH_SECRET") or "").strip()
    parsed = urlparse(endpoint) if endpoint else None
    if not endpoint or not secret or not parsed or parsed.scheme != "https" or not parsed.netloc:
        ref.set({
            "status": "queued",
            "deliveryError": "No authorised HTTPS agency endpoint and signing secret are configured.",
            "updatedAt": now,
        }, merge=True)
        return {"status": "queued", "notificationId": notification_id,
                "message": "Agency dispatch queued; no authorised external channel is configured."}

    payload = {
        "schemaVersion": "1.0", "eventType": "INCLURA_SOS_DISPATCH",
        "incident": {
            "emergencyId": str(assignment.get("emergencyId") or ""),
            "incidentNumber": str(emergency.get("incidentNumber") or ""),
            "emergencyType": str(emergency.get("emergencyType") or ""),
            "priority": str(emergency.get("priority") or "Unspecified"),
            "description": str(emergency.get("description") or "")[:1000],
            "location": str(emergency.get("location") or "")[:250],
            "latitude": emergency.get("gpsLatitude"),
            "longitude": emergency.get("gpsLongitude"),
            "locationAccuracy": str(emergency.get("accuracy") or ""),
            "createdAt": str(emergency.get("createdAt") or ""),
        },
        "response": {
            "assignmentId": assignment.get("assignmentId"),
            "responderId": assignment.get("responderId"),
            "responderName": assignment.get("responderName"),
            "agencyCode": agency.get("agencyCode"), "agencyType": agency.get("agencyType"),
            "dispatchPriority": assignment.get("dispatchPriority"),
            "escalationLevel": assignment.get("escalationLevel") or 0,
        },
    }
    body = json.dumps(payload, separators=(",", ":"), default=str).encode("utf-8")
    timestamp = str(int(time.time()))
    signature = hmac.new(secret.encode("utf-8"), timestamp.encode("ascii") + b"." + body, hashlib.sha256).hexdigest()
    request = urllib.request.Request(endpoint, data=body, method="POST", headers={
        "Content-Type": "application/json", "X-Inclura-Event": "INCLURA_SOS_DISPATCH",
        "X-Inclura-Timestamp": timestamp, "X-Inclura-Signature": signature,
        "Idempotency-Key": notification_id,
    })
    try:
        with urllib.request.urlopen(request, timeout=10) as response:
            response_text = response.read(500).decode("utf-8", errors="replace")
            accepted = 200 <= response.status < 300
            ref.set({
                "status": "accepted" if accepted else "failed",
                "attemptCount": record["attemptCount"] + 1, "lastAttemptAt": now,
                "httpStatus": response.status, "providerResponse": response_text,
                "deliveryError": "" if accepted else "Authorised agency channel rejected the dispatch.",
                "updatedAt": datetime.now(timezone.utc),
            }, merge=True)
            return {"status": "accepted" if accepted else "failed",
                    "notificationId": notification_id, "httpStatus": response.status}
    except Exception as exc:
        ref.set({
            "status": "failed", "attemptCount": record["attemptCount"] + 1,
            "lastAttemptAt": now,
            "deliveryError": "Authorised agency channel could not be reached.",
            "updatedAt": datetime.now(timezone.utc),
        }, merge=True)
        print("IFSE agency dispatch channel failed:", type(exc).__name__, str(exc))
        return {"status": "failed", "notificationId": notification_id,
                "message": "Authorised agency channel could not be reached."}


def _timed_value(value):
    if hasattr(value, "to_datetime"):
        value = value.to_datetime()
    if hasattr(value, "timestamp"):
        try:
            return value.timestamp()
        except Exception:
            pass
    if isinstance(value, datetime):
        return value.timestamp()
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00")).timestamp()
    except Exception:
        return 0


def _eligible_responder(db, agency):
    docs = db.collection(agency["responderCollection"]).get()
    for doc in docs:
        data = doc.to_dict() or {}
        verified = agency.get("ifseVerifiedRequired") is not True or data.get("ifseVerified") is True
        if (
            data.get("available") is True and data.get("onDuty") is True
            and data.get("verified") is True and verified
            and data.get("suspended") is not True and bool(_linked_uid(data))
        ):
            return doc, data
    return None, None


def _agency_for_level(db, queue, level):
    key = "secondaryAgency" if level == 1 else "tertiaryAgency"
    code = str(queue.get(key) or "").strip()
    return resolve_ifse_agency(db, code) if code else None


@router.post("/api/ifse-dispatch/escalate-due")
def escalate_due_sos(
    x_ifse_escalation_secret: str | None = Header(default=None, alias="X-IFSE-Escalation-Secret"),
):
    expected = str(os.getenv("IFSE_ESCALATION_SECRET") or "").strip()
    supplied = str(x_ifse_escalation_secret or "").strip()
    if not expected or not supplied or not hmac.compare_digest(expected, supplied):
        raise HTTPException(status_code=401, detail="Unauthorised IFSE escalation request.")

    db = get_firestore()
    now = datetime.now(timezone.utc)
    queues = db.collection("emergencyEscalationQueue").get()
    processed = []
    for queue_doc in queues:
        lease_token = os.urandom(24).hex()
        transaction = db.transaction()

        @firestore.transactional
        def claim(tx):
            fresh = queue_doc.reference.get(transaction=tx)
            if not fresh.exists:
                return None
            data = fresh.to_dict() or {}
            if data.get("waitingForAcceptance") is not True or data.get("accepted") is True or data.get("status") != "Waiting":
                return None
            if _timed_value(data.get("escalationLeaseUntil")) > now.timestamp():
                return None
            minutes = data.get("escalationMinutes")
            if isinstance(minutes, bool) or not isinstance(minutes, (int, float)) or minutes <= 0:
                return None
            started = _timed_value(data.get("waitingStartedAt") or data.get("updatedAt") or data.get("createdAt"))
            if not started or now.timestamp() < started + minutes * 60:
                return None
            tx.update(queue_doc.reference, {
                "escalationLeaseToken": lease_token,
                "escalationLeaseUntil": now + timedelta(minutes=10),
                "updatedAt": now,
            })
            return data

        queue = claim(transaction)
        if not queue:
            continue
        try:
            current_level = int(queue.get("escalationLevel") or 0)
            next_level = current_level + 1
            if next_level > 2:
                queue_doc.reference.update({
                    "status": "Escalation Exhausted", "waitingForAcceptance": False,
                    "escalationLeaseToken": "", "escalationLeaseUntil": datetime(1970, 1, 1, tzinfo=timezone.utc),
                    "updatedAt": now,
                })
                processed.append({"emergencyId": queue.get("emergencyId"), "status": "exhausted"})
                continue
            agency = _agency_for_level(db, queue, next_level)
            if not agency:
                queue_doc.reference.update({
                    "status": "Escalation Unavailable", "waitingForAcceptance": False,
                    "escalationLeaseToken": "", "escalationLeaseUntil": datetime(1970, 1, 1, tzinfo=timezone.utc),
                    "updatedAt": now,
                })
                processed.append({"emergencyId": queue.get("emergencyId"), "status": "no-secondary-agency"})
                continue
            responder_doc, responder_data = _eligible_responder(db, agency)
            if not responder_doc:
                raise RuntimeError("No eligible responder is available in the next authorised agency.")
            emergency_id = str(queue.get("emergencyId") or "")
            emergency_ref = db.collection("emergencySOS").document(emergency_id)
            emergency_snap = emergency_ref.get()
            if not emergency_snap.exists:
                raise RuntimeError("Emergency record no longer exists.")
            emergency = emergency_snap.to_dict() or {}
            responder_name = (
                responder_data.get("fullName") or responder_data.get("displayName")
                or responder_data.get("name") or responder_data.get("username")
                or "Emergency Response Team"
            )
            assignment_id = emergency_id + "_" + responder_doc.id
            assignment_ref = db.collection("emergencyAssignments").document(assignment_id)
            assignment = {
                "assignmentId": assignment_id, "emergencyId": emergency_id,
                "responderId": responder_doc.id, "responderName": responder_name,
                "responderAgency": agency["agencyName"], "responderAgencyCode": agency["agencyCode"],
                "responderAgencyType": agency["agencyType"], "responderCollection": agency["responderCollection"],
                "assignedBy": "IFSE Automatic Escalation", "assignmentStatus": "Pending",
                "accepted": False, "acceptedAt": None, "arrived": False, "arrivedAt": None,
                "cancelled": False, "completed": False, "escalationLevel": next_level,
                "dispatchPriority": queue.get("priority") or emergency.get("priority") or "High",
                "automaticAssignment": True, "manualOverride": False, "createdAt": now, "updatedAt": now,
            }
            new_timeline = db.collection("emergencyTimeline").document()
            commit_tx = db.transaction()

            @firestore.transactional
            def commit_escalation(tx):
                latest_queue = queue_doc.reference.get(transaction=tx)
                latest_emergency = emergency_ref.get(transaction=tx)
                latest_assignment = assignment_ref.get(transaction=tx)
                if not latest_queue.exists or not latest_emergency.exists:
                    return "missing"
                q = latest_queue.to_dict() or {}
                if q.get("escalationLeaseToken") != lease_token or q.get("waitingForAcceptance") is not True or q.get("accepted") is True or q.get("status") != "Waiting":
                    return "lease-lost"
                if latest_assignment.exists:
                    return "assignment-exists"
                tx.create(assignment_ref, assignment)
                tx.update(emergency_ref, {
                    "assignedResponder": responder_name, "assignedResponderId": responder_doc.id,
                    "assignedAgency": agency["agencyName"], "assignedAgencyCode": agency["agencyCode"],
                    "assignedAgencyType": agency["agencyType"], "responderCollection": agency["responderCollection"],
                    "responseStatus": "Awaiting Responder Acceptance", "assignmentStatus": "Pending",
                    "incidentStatus": "Responder Reassigned by Escalation", "updatedAt": now,
                })
                tx.update(queue_doc.reference, {
                    "escalationLevel": next_level, "waitingStartedAt": now,
                    "escalationLeaseToken": "", "escalationLeaseUntil": datetime(1970, 1, 1, tzinfo=timezone.utc),
                    "governmentEscalated": q.get("governmentEscalated") is True or "government" in agency["agencyType"].lower(),
                    "paramilitaryEscalated": q.get("paramilitaryEscalated") is True or "paramilitary" in agency["agencyType"].lower(),
                    "militaryEscalated": q.get("militaryEscalated") is True or "military" in agency["agencyType"].lower(),
                    "updatedAt": now,
                })
                tx.set(new_timeline, {
                    "emergencyId": emergency_id, "eventType": "SOS Escalated",
                    "eventDescription": "IFSE escalated the unaccepted SOS to the next authorised response agency.",
                    "performedBy": "IFSE Escalation Engine", "performerType": "System",
                    "responderId": responder_doc.id, "responderName": responder_name,
                    "responderAgency": agency["agencyName"], "responderAgencyCode": agency["agencyCode"],
                    "escalationLevel": next_level, "eventStatus": "Completed",
                    "visibleToFamily": True, "visibleToGovernment": True, "visibleToResponders": True,
                    "createdAt": now, "updatedAt": now,
                })
                return "escalated"

            result = commit_escalation(commit_tx)
            if result == "escalated":
                dispatch_agency_notification(db, emergency, assignment, agency)
                db.collection("ifseAuditLogs").add({
                    "module": "SOS", "ifseGenerated": True, "action": "SOS_ESCALATED",
                    "emergencyId": emergency_id, "actor": "IFSE System",
                    "assignedAgency": agency["agencyName"], "responderName": responder_name,
                    "escalationLevel": next_level, "createdAt": now, "updatedAt": now,
                })
            processed.append({"emergencyId": emergency_id, "status": result, "escalationLevel": next_level})
        except Exception as exc:
            print("IFSE escalation failed:", type(exc).__name__, str(exc))
            # Release only this worker's lease; never overwrite a newer claim.
            release_tx = db.transaction()

            @firestore.transactional
            def release(tx):
                latest = queue_doc.reference.get(transaction=tx)
                if latest.exists and (latest.to_dict() or {}).get("escalationLeaseToken") == lease_token:
                    tx.update(queue_doc.reference, {
                        "escalationLeaseToken": "", "escalationLeaseUntil": datetime(1970, 1, 1, tzinfo=timezone.utc),
                        "lastEscalationError": str(exc)[:300], "updatedAt": datetime.now(timezone.utc),
                    })
            release(release_tx)
            processed.append({"emergencyId": queue.get("emergencyId"), "status": "retryable-failure"})
    return {"success": True, "checked": len(queues), "processed": processed}
