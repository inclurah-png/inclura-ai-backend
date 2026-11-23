const express = require("express");
const { getFirestore } = require("./firebaseAdmin");
const firebaseAuthMiddleware = require("./firebaseAuth.middleware");

const router = express.Router();

function isRegisteredUser(req) {
  return req.firebaseUser?.uid &&
    req.firebaseUser.signInProvider &&
    req.firebaseUser.signInProvider !== "anonymous";
}

async function findAssignment(db, emergencyId, currentResponderId) {
  if (!currentResponderId) return null;
  const snap = await db.collection("emergencyAssignments")
    .where("emergencyId", "==", emergencyId)
    .get();
  return snap.docs.find((doc) =>
    String(doc.data().responderId || "") === String(currentResponderId) &&
    doc.data().cancelled !== true &&
    doc.data().completed !== true
  ) || null;
}

router.post("/:emergencyId/accept", firebaseAuthMiddleware, async (req, res) => {
  if (!isRegisteredUser(req)) {
    return res.status(403).json({ success: false, message: "A registered responder account is required." });
  }

  const emergencyId = String(req.params.emergencyId || "").trim();
  if (!emergencyId || emergencyId.includes("/") || emergencyId.length > 150) {
    return res.status(400).json({ success: false, message: "Invalid emergency reference." });
  }

  try {
    const db = getFirestore();
    const emergencyRef = db.collection("emergencySOS").doc(emergencyId);
    const emergencySnap = await emergencyRef.get();
    if (!emergencySnap.exists) {
      return res.status(404).json({ success: false, message: "Emergency record was not found." });
    }
    const assignmentDoc = await findAssignment(
      db,
      emergencyId,
      emergencySnap.data().assignedResponderId
    );
    if (!assignmentDoc) {
      return res.status(404).json({ success: false, message: "Current responder assignment was not found." });
    }

    const assignment = assignmentDoc.data();
    const responderId = String(assignment.responderId || "");

    // A responder may accept only an assignment whose responder record
    // explicitly maps to the authenticated Firebase UID. No client-supplied
    // responder ID is trusted as proof of identity.
    const collections = [String(assignment.responderCollection || "")].filter(Boolean);
    let responderData = null;
    for (const collectionName of collections) {
      const responderSnap = await db.collection(collectionName).doc(responderId).get();
      if (responderSnap.exists) {
        responderData = responderSnap.data();
        break;
      }
    }

    if (!responderData) {
      return res.status(403).json({ success: false, message: "Responder identity could not be verified." });
    }

    const linkedUid = String(
      responderData.firebaseUid ||
      responderData.firebaseUID ||
      responderData.userId ||
      responderData.uid ||
      ""
    );

    if (!linkedUid || linkedUid !== req.firebaseUser.uid) {
      return res.status(403).json({ success: false, message: "This responder is not authorised for the assignment." });
    }

    if (assignment.cancelled === true || assignment.completed === true) {
      return res.status(409).json({ success: false, message: "This assignment is no longer accepting responses." });
    }
    if (assignment.accepted === true || assignment.assignmentStatus === "Accepted") {
      return res.status(200).json({
        success: true,
        emergencyId,
        assignmentId: assignment.assignmentId,
        assignmentStatus: "Accepted",
        responseStatus: "Responder Accepted",
        message: "This responder acceptance was already recorded."
      });
    }
    if (assignment.assignmentStatus !== "Pending") {
      return res.status(409).json({ success: false, message: "Only a pending assignment can be accepted." });
    }

    const now = new Date();
    const escalationSnap = await db.collection("emergencyEscalationQueue")
      .where("emergencyId", "==", emergencyId).limit(1).get();

    const batch = db.batch();

    batch.update(assignmentDoc.ref, {
      assignmentStatus: "Accepted",
      accepted: true,
      acceptedAt: now,
      updatedAt: now
    });

    batch.update(emergencyRef, {
      responseStatus: "Responder Accepted",
      assignmentStatus: "Accepted",
      incidentStatus: "Responder Accepted",
      updatedAt: now
    });

    if (!escalationSnap.empty) {
      batch.update(escalationSnap.docs[0].ref, {
        accepted: true,
        acceptedAt: now,
        waitingForAcceptance: false,
        status: "Accepted",
        updatedAt: now
      });
    }

    const timelineRef = db.collection("emergencyTimeline").doc();
    batch.set(timelineRef, {
      timelineId: emergencyId + "_accept_" + now.getTime(),
      emergencyId,
      eventType: "Responder Accepted",
      eventDescription: "Assigned responder accepted the SOS through the authenticated responder channel.",
      performedBy: responderId,
      performerType: "Responder",
      responderId,
      responderName: assignment.responderName || "",
      responderAgency: assignment.responderAgency || "",
      responderAgencyCode: assignment.responderAgencyCode || "",
      eventStatus: "Completed",
      visibleToFamily: true,
      visibleToGovernment: true,
      visibleToResponders: true,
      createdAt: now,
      updatedAt: now
    });

    await batch.commit();

    return res.status(200).json({
      success: true,
      emergencyId,
      assignmentId: assignment.assignmentId,
      assignmentStatus: "Accepted",
      responseStatus: "Responder Accepted",
      message: "Responder acceptance recorded securely."
    });
  } catch (error) {
    console.error("Responder acceptance failed:", error.message);
    return res.status(500).json({ success: false, message: "Responder acceptance could not be recorded." });
  }
});

router.post("/:emergencyId/arrived", firebaseAuthMiddleware, async (req, res) => {
  if (!isRegisteredUser(req)) {
    return res.status(403).json({ success: false, message: "A registered responder account is required." });
  }

  const emergencyId = String(req.params.emergencyId || "").trim();
  if (!emergencyId || emergencyId.includes("/") || emergencyId.length > 150) {
    return res.status(400).json({ success: false, message: "Invalid emergency reference." });
  }

  try {
    const db = getFirestore();
    const emergencyRef = db.collection("emergencySOS").doc(emergencyId);
    const emergencySnap = await emergencyRef.get();
    if (!emergencySnap.exists) {
      return res.status(404).json({ success: false, message: "Emergency record was not found." });
    }
    const assignmentDoc = await findAssignment(
      db,
      emergencyId,
      emergencySnap.data().assignedResponderId
    );
    if (!assignmentDoc) {
      return res.status(404).json({ success: false, message: "Current responder assignment was not found." });
    }

    const assignment = assignmentDoc.data();
    const responderId = String(assignment.responderId || "");
    const collectionName = String(assignment.responderCollection || "");
    if (!responderId || !collectionName) {
      return res.status(403).json({ success: false, message: "Responder identity could not be verified." });
    }

    const responderSnap = await db.collection(collectionName).doc(responderId).get();
    const responderData = responderSnap.exists ? responderSnap.data() : null;
    const linkedUid = String(responderData?.firebaseUid || responderData?.firebaseUID || responderData?.userId || responderData?.uid || "");

    if (!linkedUid || linkedUid !== req.firebaseUser.uid) {
      return res.status(403).json({ success: false, message: "This responder is not authorised for the assignment." });
    }
    if (assignment.cancelled === true || assignment.completed === true) {
      return res.status(409).json({ success: false, message: "This assignment is no longer active." });
    }
    if (assignment.accepted !== true && assignment.assignmentStatus !== "Accepted") {
      return res.status(409).json({ success: false, message: "The responder must accept the assignment before reporting arrival." });
    }
    if (assignment.arrived === true) {
      return res.status(200).json({
        success: true,
        emergencyId,
        assignmentStatus: "Responder On Scene",
        responseStatus: "Responder On Scene",
        message: "Responder arrival was already recorded."
      });
    }

    const now = new Date();
    const batch = db.batch();

    batch.update(assignmentDoc.ref, {
      arrived: true,
      arrivedAt: now,
      assignmentStatus: "Responder On Scene",
      updatedAt: now
    });

    batch.update(emergencyRef, {
      responseStatus: "Responder On Scene",
      incidentStatus: "Responder On Scene",
      updatedAt: now
    });

    const timelineRef = db.collection("emergencyTimeline").doc();
    batch.set(timelineRef, {
      timelineId: emergencyId + "_arrival_" + now.getTime(),
      emergencyId,
      eventType: "Responder Arrived",
      eventDescription: "Assigned responder reported arrival through the authenticated responder channel.",
      performedBy: responderId,
      performerType: "Responder",
      responderId,
      responderName: assignment.responderName || "",
      responderAgency: assignment.responderAgency || "",
      responderAgencyCode: assignment.responderAgencyCode || "",
      eventStatus: "Completed",
      visibleToFamily: true,
      visibleToGovernment: true,
      visibleToResponders: true,
      createdAt: now,
      updatedAt: now
    });

    await batch.commit();
    return res.status(200).json({
      success: true,
      emergencyId,
      assignmentStatus: "Responder On Scene",
      responseStatus: "Responder On Scene"
    });
  } catch (error) {
    console.error("Responder arrival update failed:", error.message);
    return res.status(500).json({ success: false, message: "Responder arrival could not be recorded." });
  }
});

module.exports = router;
