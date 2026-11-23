/*
 * Inclura SOS trusted-contact SMS delivery.
 * Firebase ID tokens are verified server-side. The recipient list is
 * always loaded from Firestore using the authenticated member UID.
 */
const express = require("express");
const { getFirestore } = require("./firebaseAdmin");
const firebaseAuthMiddleware = require("./firebaseAuth.middleware");

const router = express.Router();

function normalizeNigeriaPhone(value) {
  const raw = String(value || "").trim();
  const digits = raw.replace(/[^0-9]/g, "");
  if (!digits) return "";
  if (raw.startsWith("+")) return digits;
  if (digits.startsWith("234")) return digits;
  if (digits.startsWith("0") && digits.length === 11) return "234" + digits.slice(1);
  return "";
}

async function sendTermiiSms(to, message) {
  if (!process.env.TERMII_API_KEY) {
    throw new Error("SMS provider is not configured.");
  }
  const response = await fetch("https://api.ng.termii.com/api/sms/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      to,
      from: process.env.TERMII_SENDER_ID || "INCLURA",
      sms: message,
      type: "plain",
      channel: "generic",
      api_key: process.env.TERMII_API_KEY
    })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.code === "2" || data.code === "error") {
    const error = new Error("The SMS provider did not accept this message.");
    error.providerResponse = data;
    throw error;
  }
  return data;
}

router.post("/:emergencyId/send", firebaseAuthMiddleware, async (req, res) => {
  const uid = req.firebaseUser?.uid;
  const emergencyId = String(req.params.emergencyId || "");
  if (!uid) return res.status(401).json({ success: false, message: "Sign in to continue." });
  if (req.firebaseUser?.signInProvider === "anonymous") {
    return res.status(403).json({
      success: false,
      message: "A registered Inclura account is required for SOS notifications."
    });
  }
  if (!emergencyId || emergencyId.includes("/") || emergencyId.length > 150) {
    return res.status(400).json({ success: false, message: "Invalid emergency reference." });
  }
  if (!process.env.TERMII_API_KEY) {
    return res.status(503).json({ success: false, message: "SMS delivery is not configured yet." });
  }

  try {
    const db = getFirestore();
    const emergencyRef = db.collection("emergencySOS").doc(emergencyId);
    const emergencySnap = await emergencyRef.get();
    if (!emergencySnap.exists || emergencySnap.data().userId !== uid) {
      return res.status(404).json({ success: false, message: "Emergency record not found." });
    }

    const emergency = emergencySnap.data();
    const contactsSnap = await db.collection("trustedContacts")
      .where("ownerId", "==", uid)
      .get();

    const contacts = contactsSnap.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .filter((contact) => contact.status === "Active" && contact.phoneNumber);

    if (!contacts.length) {
      return res.status(200).json({ success: true, sent: 0, failed: 0, message: "No active trusted contacts have a phone number." });
    }

    const locationText = String(emergency.location || "").trim();
    const lat = Number(emergency.latitude);
    const lon = Number(emergency.longitude);
    const mapsLink = Number.isFinite(lat) && Number.isFinite(lon) &&
      (lat !== 0 || lon !== 0) ? " https://maps.google.com/?q=" + lat + "," + lon : "";
    const message = [
      "INCLURA SOS ALERT",
      "Member: " + String(emergency.userName || "Inclura member").slice(0, 80),
      "Emergency: " + String(emergency.emergencyType || "Emergency").slice(0, 50),
      "Priority: " + String(emergency.priority || "Unspecified").slice(0, 20),
      locationText ? "Location: " + locationText.slice(0, 180) : "Location: Not provided",
      mapsLink,
      "Please contact the member immediately. Ref: " + emergencyId
    ].join("\n").slice(0, 900);

    let sent = 0;
    let failed = 0;
    const outcomes = [];

    for (const contact of contacts) {
      const to = normalizeNigeriaPhone(contact.phoneNumber);
      const notificationRef = db.collection("emergencyNotifications")
        .doc(emergencyId + "_" + contact.id + "_sms");
      const previous = await notificationRef.get();

      if (previous.exists && ["accepted", "delivered"].includes(previous.data().smsStatus)) {
        outcomes.push({ contactId: contact.id, status: previous.data().smsStatus });
        continue;
      }

      if (!to) {
        failed += 1;
        await notificationRef.set({
          emergencyId, recipientType: "Trusted Contact", recipientId: contact.id,
          recipientName: contact.fullName || "", recipientPhone: contact.phoneNumber || "",
          deliveryMethod: "SMS", smsStatus: "failed", smsError: "Phone number must include a valid Nigerian or international country code.",
          updatedAt: new Date()
        }, { merge: true });
        outcomes.push({ contactId: contact.id, status: "failed" });
        continue;
      }

      await notificationRef.set({
        emergencyId, recipientType: "Trusted Contact", recipientId: contact.id,
        recipientName: contact.fullName || "", recipientPhone: contact.phoneNumber || "",
        deliveryMethod: "SMS", smsStatus: "sending", smsError: "",
        updatedAt: new Date()
      }, { merge: true });

      try {
        const provider = await sendTermiiSms(to, message);
        await notificationRef.set({
          smsStatus: "accepted",
          smsProvider: "Termii",
          smsMessageId: provider.message_id || provider.messageId || "",
          smsProviderResponseCode: provider.code || "",
          smsAcceptedAt: new Date(),
          updatedAt: new Date()
        }, { merge: true });
        sent += 1;
        outcomes.push({ contactId: contact.id, status: "accepted" });
      } catch (error) {
        console.error("Termii SOS SMS failed:", error.providerResponse || error.message);
        await notificationRef.set({
          smsStatus: "failed",
          smsError: "Provider did not accept the SMS.",
          updatedAt: new Date()
        }, { merge: true });
        failed += 1;
        outcomes.push({ contactId: contact.id, status: "failed" });
      }
    }

    return res.status(200).json({
      success: true, sent, failed, outcomes,
      message: "SMS submission results recorded. Accepted does not mean delivered."
    });
  } catch (error) {
    console.error("SOS trusted-contact SMS workflow failed:", error.message);
    return res.status(500).json({ success: false, message: "SOS SMS notifications could not be processed." });
  }
});

module.exports = router;
