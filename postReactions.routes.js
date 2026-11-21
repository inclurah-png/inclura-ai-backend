/*
 * Inclura Firestore post reactions.
 * Firebase ID tokens are verified server-side; the authenticated UID,
 * not a client-supplied user ID, owns the reaction.
 */
const express = require("express");
const { getFirestore } = require("./firebaseAdmin");
const firebaseAuthMiddleware = require("./firebaseAuth.middleware");

const router = express.Router();

const REACTION_POINTS = Object.freeze({
  "❤️": 4,
  "👏": 3,
  "😊": 3,
  "👍": 2,
  "😂": 2,
  "😮": 2,
  "😢": 2,
  "👎": -3
});

router.post("/:postId/react", firebaseAuthMiddleware, async (req, res) => {
  try {
    const uid = req.firebaseUser?.uid;
    const emoji = req.body?.emoji;
    const postId = req.params.postId;

    if (!uid) {
      return res.status(401).json({ success: false, message: "Sign in to react." });
    }
    if (req.firebaseUser.emailVerified !== true) {
      return res.status(403).json({ success: false, message: "Verify your email before reacting." });
    }
    if (!postId || postId.includes("/") || postId.length > 150) {
      return res.status(400).json({ success: false, message: "Invalid post." });
    }
    if (!Object.prototype.hasOwnProperty.call(REACTION_POINTS, emoji)) {
      return res.status(400).json({ success: false, message: "Unsupported reaction." });
    }

    const db = getFirestore();
    const postRef = db.collection("posts").doc(postId);

    const result = await db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(postRef);
      if (!snapshot.exists) {
        const error = new Error("Post not found.");
        error.status = 404;
        throw error;
      }

      const post = snapshot.data() || {};
      const userReactions = { ...(post.userReactions || {}) };
      const reactions = { ...(post.reactions || {}) };
      const previousEmoji = userReactions[uid] || null;

      if (previousEmoji === emoji) {
        delete userReactions[uid];
        reactions[emoji] = Math.max(0, Number(reactions[emoji] || 0) - 1);
      } else {
        if (previousEmoji && Object.prototype.hasOwnProperty.call(REACTION_POINTS, previousEmoji)) {
          reactions[previousEmoji] = Math.max(0, Number(reactions[previousEmoji] || 0) - 1);
        }
        userReactions[uid] = emoji;
        reactions[emoji] = Math.max(0, Number(reactions[emoji] || 0)) + 1;
      }

      transaction.update(postRef, { userReactions, reactions });
      return {
        reactions,
        userReactions,
        postCreatorScore: typeof post.creatorScore === "number" ? post.creatorScore : 0
      };
    });

    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    const status = Number.isInteger(error.status) ? error.status : 500;
    if (status >= 500) {
      console.error("Firestore post reaction failed:", error.code || error.message);
    }
    return res.status(status).json({
      success: false,
      message: status === 500 ? "The reaction could not be saved. Please try again." : error.message
    });
  }
});

module.exports = router;
