const express = require("express");
const { getFirestore, getFirebaseAuth } = require("./firebaseAdmin");
const firebaseAuthMiddleware = require("./firebaseAuth.middleware");
const { createAgencyDispatchRecord } = require("./agencyDispatch.service");

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

async function alertAdministrators(db, emergencyId, emergency, ruleId) {
  const now = new Date();
  const auditRef = db.collection("ifseAuditLogs").doc("sos_received_" + emergencyId);
  let administratorsAlerted = 0;
  let auditRecorded = false;
  let alertError = "";

  // Archive failure or administrator-notification failure must never block dispatch.
  try {
    await auditRef.set({
      module: "SOS",
      ifseGenerated: true,
      action: "SOS_RECEIVED",
      emergencyId,
      actor: "IFSE System",
      description: "A member submitted an SOS. Administrator alert generated automatically; no approval is required.",
      emergencyType: emergency.emergencyType || "",
      priority: emergency.priority || "Unspecified",
      gpsLatitude: Number(emergency.gpsLatitude) || 0,
      gpsLongitude: Number(emergency.gpsLongitude) || 0,
      dispatchStatus: "Dispatch attempt pending",
      ruleDocumentId: ruleId || "",
      createdAt: now,
      updatedAt: now
    }, { merge: true });
    auditRecorded = true;
  } catch (error) {
    console.error("SOS receipt audit could not be recorded:", error.message);
  }

  try {
    const auth = getFirebaseAuth();
    const admins = [];
    let pageToken;
    do {
      const page = await auth.listUsers(1000, pageToken);
      for (const user of page.users) {
        if (user.customClaims && (user.customClaims.admin === true || user.customClaims.sosNotificationOnly === true)) admins.push(user.uid);
      }
      pageToken = page.pageToken;
    } while (pageToken);

    const batch = db.batch();
    for (const adminUid of admins) {
      const notificationRef = db.collection("notifications").doc(emergencyId + "_admin_" + adminUid);
      batch.set(notificationRef, {
        receiverId: adminUid,
        senderId: "system",
        type: "emergency_sos",
        category: "SOS",
        title: "New emergency SOS received",
        message: "An SOS request has been recorded. Emergency ID: " + emergencyId + ". Priority: " + String(emergency.priority || "Unspecified") + ". Review the emergency record; no approval action is required.",
        emergencyId,
        read: false,
        createdAt: now
      }, { merge: true });
    }
    if (admins.length) await batch.commit();
    administratorsAlerted = admins.length;
  } catch (error) {
    alertError = "Administrator in-app alert could not be delivered.";
    console.error("SOS administrator alert failed:", error.message);
  }

  return { auditId: auditRef.id, auditRecorded, administratorsAlerted, alertError };
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
  const uid = req.firebaseUser?.uid;
  const emergencyId = String(req.params.emergencyId || "").trim();

  if (!uid || !emergencyId) {
    return res.status(400).json({ success: false, message: "Authenticated user and emergency ID are required." });
  }

  // Anonymous Firebase guests may subscribe to community alerts, but
  // must never initiate responder dispatch or administrator SOS alerts.
  if (!req.firebaseUser?.signInProvider || req.firebaseUser.signInProvider === "anonymous") {
    return res.status(403).json({
      success: false,
      message: "A registered Inclura account is required to dispatch an SOS."
    });
  }

  try {
    const db = getFirestore();
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
    const adminAlert = await alertAdministrators(db, emergencyId, emergency, ruleId);
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

    const assignmentRef = db.collection("emergencyAssignments").doc(`${emergencyId}_${responder.id}`);
    const existingAssignment = await assignmentRef.get();
    if (existingAssignment.exists) {
      return res.status(200).json({
        success: true,
        emergencyId,
        escalationId: "",
        agency: existingAssignment.data().responderAgency || primaryAgency.agencyName,
        responderName: existingAssignment.data().responderName || "Assigned responder",
        responderId: responder.id,
        assignmentStatus: existingAssignment.data().assignmentStatus || "Pending",
        administratorAlert: adminAlert,
        message: "An IFSE responder assignment already exists. No duplicate assignment was created."
      });
    }
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
    const agencyDispatch = await createAgencyDispatchRecord(db, emergency, assignment, primaryAgency);

    await db.collection("ifseAuditLogs").add({
      module: "SOS",
      ifseGenerated: true,
      action: "RESPONDER_ASSIGNED",
      emergencyId,
      actor: "IFSE System",
      description: "An eligible responder was assigned automatically. Acceptance and arrival remain unconfirmed.",
      assignedAgency: primaryAgency.agencyName,
      responderName,
      escalationLevel: 0,
      escalationStatus: "Waiting for responder acceptance",
      gpsLatitude: Number(emergency.gpsLatitude) || 0,
      gpsLongitude: Number(emergency.gpsLongitude) || 0,
      createdAt: now,
      updatedAt: now
    });

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
      agencyDispatchStatus: agencyDispatch.status,
      agencyDispatchNotificationId: agencyDispatch.notificationId,
      administratorAlert: adminAlert,
      message: "IFSE responder assignment created. Responder acceptance and arrival are not yet confirmed.",
    });
  } catch (error) {
    console.error("IFSE server dispatch failed:", error);
    try {
      const db = getFirestore();
      await db.collection("ifseAuditLogs").add({
        module: "SOS",
        ifseGenerated: true,
        action: "DISPATCH_FAILED",
        emergencyId,
        actor: "IFSE System",
        description: String(error?.message || "Automatic dispatch failed.").slice(0, 500),
        dispatchStatus: "Failed",
        createdAt: new Date(),
        updatedAt: new Date()
      });
    } catch (auditError) {
      console.error("IFSE dispatch failure audit could not be saved:", auditError.message);
    }
    return res.status(500).json({
      success: false,
      emergencyRecorded: true,
      administratorAlertAttempted: true,
      message: error?.message || "IFSE dispatch failed.",
    });
  }
});

module.exports = router;
