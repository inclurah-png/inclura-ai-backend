const express = require("express");
const { getFirestore } = require("./firebaseAdmin");
const firebaseAuthMiddleware = require("./firebaseAuth.middleware");

const router = express.Router();

function resolveRuleId(emergencyData) {
  const type = String(emergencyData?.emergencyType || "").trim().toLowerCase();
  const description = String(emergencyData?.description || "").trim().toLowerCase();
  const text = `${type} ${description}`.trim();

  if (/medical|injury|injured|unconscious|bleeding|heart attack|stroke|ambulance|illness|overdose|pregnan/i.test(text)) return "MEDICAL";
  if (/fire|smoke|burning|flame|explosion|building fire/i.test(text)) return "FIRE";
  if (/flood|flooding|landslide|earthquake|building collapse|collapse|natural disaster|storm|disaster/i.test(text)) return "FLOOD";
  if (/police|missing person|theft|robbery|burglary|crime|assault|domestic violence|violent crime/i.test(text)) return "POLICE";
  if (/kidnap|kidnapping|hostage|armed|weapon|gun|shooting|terror|terrorist|attack|armed intrusion|security threat|violent attack|invasion/i.test(text)) return "ARMED_ATTACK";
  return "POLICE";
}

async function resolveAgency(db, identifier) {
  const requested = String(identifier || "").trim();
  if (!requested) return null;

  let snap = await db.collection("ifseAgencyRegistry")
    .where("agencyCode", "==", requested).limit(1).get();

  if (snap.empty) {
    snap = await db.collection("ifseAgencyRegistry")
      .where("agencyName", "==", requested).limit(1).get();
  }

  if (snap.empty) {
    throw new Error(`IFSE agency "${requested}" was not found.`);
  }

  const data = snap.docs[0].data();

  if (data.active !== true) {
    throw new Error(`IFSE agency "${requested}" is inactive.`);
  }
  if (data.governmentAuthorized !== true) {
    throw new Error(`IFSE agency "${requested}" is not government authorized.`);
  }
  if (!data.responderCollection) {
    throw new Error(`IFSE agency "${requested}" has no responderCollection configured.`);
  }

  return {
    id: snap.docs[0].id,
    agencyName: data.agencyName || "",
    agencyCode: data.agencyCode || "",
    responderCollection: data.responderCollection,
    agencyType: data.agencyType || "",
    ifseVerifiedRequired: data.ifseVerifiedRequired === true,
  };
}

router.post("/:emergencyId/dispatch", firebaseAuthMiddleware, async (req, res) => {
  const db = getFirestore();
  const uid = req.firebaseUser?.uid;
  const emergencyId = String(req.params.emergencyId || "").trim();

  if (!uid || !emergencyId) {
    return res.status(400).json({ success: false, message: "Authenticated user and emergency ID are required." });
  }

  try {
    const emergencyRef = db.collection("emergencySOS").doc(emergencyId);
    const emergencySnap = await emergencyRef.get();

    if (!emergencySnap.exists) {
      return res.status(404).json({ success: false, message: "Emergency record was not found." });
    }

    const emergency = emergencySnap.data();

    if (emergency.userId !== uid) {
      return res.status(403).json({ success: false, message: "You are not authorized to dispatch this emergency." });
    }

    const ruleId = resolveRuleId(emergency);
    const ruleSnap = await db.collection("emergencyResponseRules").doc(ruleId).get();

    if (!ruleSnap.exists) {
      throw new Error(`IFSE authoritative rule "${ruleId}" was not found.`);
    }

    const rule = ruleSnap.data();
    if (rule.active !== true) {
      throw new Error(`IFSE authoritative rule "${ruleId}" is inactive.`);
    }
    if (!rule.primaryAgency) {
      throw new Error("IFSE authoritative rule has no primary agency.");
    }

    const primaryAgency = await resolveAgency(db, rule.primaryAgency);
    const responderSnap = await db.collection(primaryAgency.responderCollection).get();

    const eligible = responderSnap.docs.filter((doc) => {
      const data = doc.data();
      const verificationSatisfied =
        primaryAgency.ifseVerifiedRequired ? data.ifseVerified === true : true;

      return (
        data.available === true &&
        data.onDuty === true &&
        data.verified === true &&
        verificationSatisfied &&
        data.suspended !== true
      );
    });

    if (eligible.length === 0) {
      throw new Error(`No eligible responder found in ${primaryAgency.responderCollection}.`);
    }

    const responder = eligible[0];
    const responderData = responder.data();
    const responderName =
      responderData.fullName ||
      responderData.displayName ||
      responderData.name ||
      responderData.username ||
      "Emergency Response Team";

    const assignmentRef = db.collection("emergencyAssignments").doc();
    const now = new Date();

    const assignment = {
      assignmentId: `${emergencyId}_${responder.id}`,
      emergencyId,
      responderId: responder.id,
      responderName,
      responderAgency: primaryAgency.agencyName,
      responderAgencyCode: primaryAgency.agencyCode,
      responderAgencyType: primaryAgency.agencyType,
      responderCollection: primaryAgency.responderCollection,
      responderType: responderData.responderType || "Government",
      assignedBy: "IFSE Auto Dispatch",
      assignmentStatus: "Pending",
      accepted: false,
      acceptedAt: null,
      arrived: false,
      arrivedAt: null,
      completed: false,
      completedAt: null,
      cancelled: false,
      cancellationReason: "",
      escalationLevel: 0,
      dispatchPriority: emergency.priority || rule.priority || "Low",
      estimatedArrivalMinutes: Number(rule.estimatedArrivalMinutes) || 0,
      actualArrivalMinutes: 0,
      satelliteDispatch: false,
      automaticAssignment: true,
      manualOverride: false,
      createdAt: now,
      updatedAt: now,
    };

    const escalationQuery = await db.collection("emergencyEscalationQueue")
      .where("emergencyId", "==", emergencyId).limit(1).get();

    let escalationId = "";
    if (!escalationQuery.empty) {
      escalationId = escalationQuery.docs[0].id;
    } else {
      const escalationRef = await db.collection("emergencyEscalationQueue").add({
        emergencyId,
        emergencyType: emergency.emergencyType || "",
        priority: emergency.priority || rule.priority || "Low",
        ruleDocumentId: ruleId,
        primaryAgency: rule.primaryAgency || "",
        secondaryAgency: rule.secondaryAgency || "",
        tertiaryAgency: rule.tertiaryAgency || "",
        escalationMinutes: Number(rule.escalationMinutes) || 0,
        escalationLevel: 0,
        waitingForAcceptance: true,
        accepted: false,
        acceptedAt: null,
        governmentEscalated: false,
        paramilitaryEscalated: false,
        militaryEscalated: false,
        satelliteActivated: false,
        status: "Waiting",
        createdAt: now,
        updatedAt: now,
      });
      escalationId = escalationRef.id;
    }

    const batch = db.batch();

    batch.set(assignmentRef, assignment);

    batch.update(emergencyRef, {
      status: "assigned",
      assignedResponder: responderName,
      assignedResponderId: responder.id,
      assignedAgency: primaryAgency.agencyName,
      assignedAgencyCode: primaryAgency.agencyCode,
      assignedAgencyType: primaryAgency.agencyType,
      responderCollection: primaryAgency.responderCollection,
      responseStatus: "Awaiting Responder Acceptance",
      assignmentStatus: "Pending",
      incidentStatus: "Responder Assigned",
      ifseClassification: ruleId,
      updatedAt: now,
    });

    const timelineRef = db.collection("emergencyTimeline").doc();
    batch.set(timelineRef, {
      timelineId: `${emergencyId}_001`,
      emergencyId,
      eventType: "Responder Assigned",
      eventDescription: `${primaryAgency.agencyName || "Authorized agency"} responder assigned automatically by IFSE.`,
      performedBy: "IFSE Dispatch Engine",
      performerType: "System",
      responderId: responder.id,
      responderAgency: primaryAgency.agencyName,
      responderAgencyCode: primaryAgency.agencyCode,
      responderAgencyType: primaryAgency.agencyType,
      responderName,
      responderCollection: primaryAgency.responderCollection,
      eventStatus: "Completed",
      latitude: Number(emergency.gpsLatitude) || 0,
      longitude: Number(emergency.gpsLongitude) || 0,
      satelliteMode: false,
      networkAvailable: true,
      offlineRecorded: false,
      severity: emergency.priority || "Low",
      ifseThreatScore: 0,
      ifseClassification: ruleId,
      eventOrder: 1,
      visibleToFamily: true,
      visibleToGovernment: true,
      visibleToResponders: true,
      createdAt: now,
      updatedAt: now,
    });

    await batch.commit();

    return res.status(200).json({
      success: true,
      emergencyId,
      escalationId,
      ruleDocumentId: ruleId,
      agency: primaryAgency.agencyName,
      agencyCode: primaryAgency.agencyCode,
      responderName,
      responderId: responder.id,
      assignmentStatus: "Pending",
      message: "IFSE responder assignment created. Responder acceptance and arrival are not yet confirmed.",
    });
  } catch (error) {
    console.error("IFSE server dispatch failed:", error);
    return res.status(500).json({
      success: false,
      message: error?.message || "IFSE dispatch failed.",
    });
  }
});

module.exports = router;
