
/* =========================================================
   INCLURA CREATOR SCORE ROUTES
   Firebase-authenticated creator activity scoring
   ========================================================= */

const express = require("express");
const crypto = require("crypto");
const admin = require("firebase-admin");

const { getFirestore } = require("./firebaseAdmin");
const firebaseAuthMiddleware =
    require("./firebaseAuth.middleware");

const router = express.Router();

/*
 * Points are controlled exclusively by the backend.
 * A client cannot submit its own point value.
 */
const ACTIVITY_POINTS = Object.freeze({
    video_post: 4,
    text_post: 2,
    cross_post: 5,
    comment: 2
});

/*
 * These are candidate collections based on the existing
 * Inclura feature structure. Verify the actual document
 * schema before enabling awards in production.
 */
const ACTIVITY_COLLECTIONS = Object.freeze({
    video_post: ["posts"],
    text_post: ["posts"],
    cross_post: ["crossPosts", "crossPostRequests"],
    comment: ["comments"]
});

const OWNER_FIELDS = Object.freeze([
    "uid",
    "userId",
    "authorId",
    "ownerId",
    "createdBy"
]);

function findOwner(data) {
    for (const field of OWNER_FIELDS) {
        if (
            typeof data[field] === "string" &&
            data[field].trim()
        ) {
            return data[field].trim();
        }
    }

    return null;
}

function isMatchingPostType(data, activityType) {
    const declaredType = String(
        data.type ||
        data.postType ||
        data.mediaType ||
        data.contentType ||
        ""
    ).toLowerCase();

    const hasVideo = Boolean(
        data.videoUrl ||
        data.videoURL ||
        data.video ||
        data.videoPath
    );

    if (activityType === "video_post") {
        return declaredType
            ? declaredType.includes("video")
            : hasVideo;
    }

    if (activityType === "text_post") {
        if (declaredType) {
            return (
                declaredType.includes("text") ||
                declaredType.includes("article")
            ) && !declaredType.includes("video");
        }

        return Boolean(
            data.text ||
            data.content ||
            data.caption ||
            data.body
        ) && !hasVideo;
    }

    return true;
}

/*
 * POST /api/creator-score/award
 *
 * Body:
 * {
 *   "activityType": "text_post",
 *   "activityId": "Firestore document ID"
 * }
 *
 * The server determines the points and the authenticated UID.
 */
router.post(
    "/award",
    firebaseAuthMiddleware,
    async (req, res) => {
        try {
            const uid = req.firebaseUser.uid;
            const { activityType, activityId } = req.body || {};

            if (
                typeof activityType !== "string" ||
                !Object.prototype.hasOwnProperty.call(
                    ACTIVITY_POINTS,
                    activityType
                )
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Unsupported creator activity type."
                });
            }

            if (
                typeof activityId !== "string" ||
                !activityId.trim() ||
                activityId.includes("/")
            ) {
                return res.status(400).json({
                    success: false,
                    message: "A valid activity ID is required."
                });
            }

            const cleanActivityId = activityId.trim();
            const db = getFirestore();

            let activityData = null;

            for (const collectionName of
                ACTIVITY_COLLECTIONS[activityType]) {
                const snapshot = await db
                    .collection(collectionName)
                    .doc(cleanActivityId)
                    .get();

                if (snapshot.exists) {
                    activityData = snapshot.data();
                    break;
                }
            }

            if (!activityData) {
                return res.status(404).json({
                    success: false,
                    message: "The activity could not be verified."
                });
            }

            if (findOwner(activityData) !== uid) {
                return res.status(403).json({
                    success: false,
                    message:
                        "You cannot receive points for another user's activity."
                });
            }

            if (
                (activityType === "video_post" ||
                    activityType === "text_post") &&
                !isMatchingPostType(activityData, activityType)
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "The post does not match the requested activity type."
                });
            }

            const awardId = crypto
                .createHash("sha256")
                .update(`${uid}:${activityType}:${cleanActivityId}`)
                .digest("hex");

            const userRef = db.collection("users").doc(uid);
            const awardRef = db
                .collection("creatorActivityAwards")
                .doc(awardId);

            const points = ACTIVITY_POINTS[activityType];

            const result = await db.runTransaction(
                async (transaction) => {
                    const awardSnapshot =
                        await transaction.get(awardRef);

                    if (awardSnapshot.exists) {
                        return { duplicate: true };
                    }

                    const userSnapshot =
                        await transaction.get(userRef);

                    const userData = userSnapshot.exists
                        ? userSnapshot.data()
                        : {};

                    const currentScore =
                        userData.creatorEconomy ?? 0;

                    if (
                        typeof currentScore !== "number" ||
                        !Number.isFinite(currentScore)
                    ) {
                        throw new Error(
                            "The stored creator score is invalid."
                        );
                    }

                    const updates = {
                        creatorEconomy: currentScore + points
                    };

                    const counters = {
                        video_post: "monthlyVideoPosts",
                        text_post: "monthlyTextPosts",
                        cross_post: "monthlyCrossPosts"
                    };

                    const counterField = counters[activityType];

                    if (counterField) {
                        const currentCount =
                            userData[counterField] ?? 0;

                        if (
                            typeof currentCount !== "number" ||
                            !Number.isFinite(currentCount)
                        ) {
                            throw new Error(
                                `Invalid counter: ${counterField}`
                            );
                        }

                        updates[counterField] = currentCount + 1;
                    }

                    if (activityType === "comment") {
                        const currentTrust =
                            userData.communityTrust ?? 0;

                        if (
                            typeof currentTrust !== "number" ||
                            !Number.isFinite(currentTrust)
                        ) {
                            throw new Error(
                                "The stored community trust value is invalid."
                            );
                        }

                        updates.communityTrust =
                            currentTrust + points;
                    }

                    transaction.set(
                        userRef,
                        updates,
                        { merge: true }
                    );

                    transaction.create(awardRef, {
                        uid,
                        activityType,
                        activityId: cleanActivityId,
                        points,
                        createdAt:
                            admin.firestore.FieldValue.serverTimestamp()
                    });

                    return {
                        duplicate: false,
                        points,
                        creatorEconomy: currentScore + points
                    };
                }
            );

            if (result.duplicate) {
                return res.status(200).json({
                    success: true,
                    duplicate: true,
                    pointsAwarded: 0,
                    message:
                        "This activity has already been scored."
                });
            }

            return res.status(200).json({
                success: true,
                duplicate: false,
                activityType,
                pointsAwarded: result.points,
                creatorEconomy: result.creatorEconomy
            });
        } catch (error) {
            console.error(
                "Creator scoring error:",
                error.message
            );

            return res.status(500).json({
                success: false,
                message:
                    "Creator activity could not be scored."
            });
        }
    }
);

module.exports = router;
