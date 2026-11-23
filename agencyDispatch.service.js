const crypto = require("crypto");


function envKeyPart(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function getAgencyChannelConfig(agencyCode) {
  const code = envKeyPart(agencyCode);
  if (!code) return null;
  const prefix = "IFSE_AGENCY_" + code;
  const url = String(process.env[prefix + "_DISPATCH_URL"] || "").trim();
  const secret = String(process.env[prefix + "_DISPATCH_SECRET"] || "").trim();
  if (!url || !secret) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return null;
  } catch {
    return null;
  }
  return { url, secret };
}

function buildAgencyDispatchPayload(emergency, assignment, agency) {
  return {
    schemaVersion: "1.0",
    eventType: "INCLURA_SOS_DISPATCH",
    incident: {
      emergencyId: String(emergency.id || emergency.emergencyId || ""),
      incidentNumber: String(emergency.incidentNumber || ""),
      emergencyType: String(emergency.emergencyType || ""),
      priority: String(emergency.priority || "Unspecified"),
      description: String(emergency.description || "").slice(0, 1000),
      location: String(emergency.location || "").slice(0, 250),
      latitude: Number(emergency.gpsLatitude),
      longitude: Number(emergency.gpsLongitude),
      locationAccuracy: String(emergency.accuracy || ""),
      createdAt: emergency.createdAt || null,
    },
    response: {
      assignmentId: assignment.assignmentId,
      responderId: assignment.responderId,
      responderName: assignment.responderName,
      agencyCode: agency.agencyCode,
      agencyType: agency.agencyType,
      dispatchPriority: assignment.dispatchPriority,
      escalationLevel: assignment.escalationLevel,
    },
  };
}

async function createAgencyDispatchRecord(db, emergency, assignment, agency) {
  const notificationId = assignment.assignmentId + "_agency_dispatch";
  const ref = db.collection("agencyDispatchNotifications").doc(notificationId);
  const existing = await ref.get();
  const now = new Date();

  const record = {
    notificationId,
    emergencyId: assignment.emergencyId,
    assignmentId: assignment.assignmentId,
    agencyCode: agency.agencyCode,
    agencyName: agency.agencyName,
    agencyType: agency.agencyType,
    escalationLevel: assignment.escalationLevel || 0,
    deliveryMethod: "secure-agency-channel",
    status: existing.exists ? (existing.data().status || "queued") : "queued",
    attemptCount: existing.exists ? Number(existing.data().attemptCount || 0) : 0,
    lastAttemptAt: existing.exists ? (existing.data().lastAttemptAt || null) : null,
    updatedAt: now,
    createdAt: existing.exists ? (existing.data().createdAt || now) : now,
  };

  await ref.set(record, { merge: true });

  const config = getAgencyChannelConfig(agency.agencyCode);
  if (!config) {
    await ref.set({
      status: "queued",
      deliveryError: "No authorised HTTPS agency endpoint and signing secret are configured.",
      updatedAt: new Date(),
    }, { merge: true });
    return { status: "queued", notificationId, message: "Agency dispatch queued; no authorised external channel is configured." };
  }

  const payload = buildAgencyDispatchPayload(
    { ...emergency, id: assignment.emergencyId },
    assignment,
    agency
  );
  const body = JSON.stringify(payload);
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = config.secret
    ? crypto.createHmac("sha256", config.secret).update(timestamp + "." + body).digest("hex")
    : "";

  try {
    const response = await fetch(config.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Inclura-Event": "INCLURA_SOS_DISPATCH",
        "X-Inclura-Timestamp": timestamp,
        "X-Inclura-Signature": signature,
        "Idempotency-Key": notificationId,
      },
      body,
      signal: AbortSignal.timeout(10000),
    });
    const responseText = await response.text();
    const accepted = response.ok;

    await ref.set({
      status: accepted ? "accepted" : "failed",
      attemptCount: record.attemptCount + 1,
      lastAttemptAt: new Date(),
      httpStatus: response.status,
      providerResponse: responseText.slice(0, 500),
      deliveryError: accepted ? "" : "Authorised agency channel rejected the dispatch.",
      updatedAt: new Date(),
    }, { merge: true });

    return {
      status: accepted ? "accepted" : "failed",
      notificationId,
      httpStatus: response.status,
    };
  } catch (error) {
    await ref.set({
      status: "failed",
      attemptCount: record.attemptCount + 1,
      lastAttemptAt: new Date(),
      deliveryError: "Authorised agency channel could not be reached.",
      updatedAt: new Date(),
    }, { merge: true });

    console.error("Agency dispatch channel failed:", error.message);
    return { status: "failed", notificationId, message: "Authorised agency channel could not be reached." };
  }
}

module.exports = { createAgencyDispatchRecord };
