/* =========================================================
   INCLURA CREATOR SCORING ROUTES
   Server-verified activity awards with duplicate protection
   ========================================================= */

const express = require("express");
const crypto = require("crypto");

const { getFirestore } = require("../firebaseAdmin");
const firebaseAuthMiddleware =
    require("../firebaseAuth.middleware");

const router = express.Router();

const ACTIVITY_POINTS = {
    video_post: 4,
    text_post: 2,
    cross_post: 5,
    comment: 2
};

const ACTIVITY_COLLECTIONS = {
    video_post: ["posts"],
    text_post: ["posts"],
    cross_post: ["crossPosts", "crossPostRequests"],
    comment: ["comments"]
};

const OWNER_FIELDS = [
    "uid",
    "userId",
    "authorId",
    "ownerId",
    "createdBy"
];

function getActivityOwner(data) {
    for (const field of OWNER_FIELDS) {
        if (typeof data[field] === "string" && data[field]) {
            return data[field];
        }
    }

    return null;
}

function matchesPostType(data, activityType) {
    const declaredType = String(
        data.type ||
        data.postType ||
        data.mediaType ||
        data.contentType ||
        ""
    ).toLowerCase();

    const hasVideoMedia = Boolean(
        data.videoUrl ||
        data.videoURL ||
        data.video ||
        data.videoPath
    );

    if (activityType === "video_post") {
        if (declaredType) {
            return declaredType.includes("video");
        }

        return hasVideoMedia;
    }

    if (activityType === "text_post") {
        if (declaredType) {
            return (
                declaredType.includes("text") ||
                declaredType.includes("article")
            ) && !declaredType.includes("video");
        }

        return Boolean(
            (data.text || data.content || data.caption || data.body) &&
            !hasVideoMedia
        );
    }

    return true;
}

router.post(
    "/award",
    firebaseAuthMiddleware,
    async (req, res) => {
        try {
            const uid = req.firebaseUser.uid;
            const { activityType, activityId } = req.body || {};

            if (!Object.prototype.hasOwnProperty.call(
                ACTIVITY_POINTS,
                activityType
            )) {
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

            let activityRef = null;
            let activityData = null;

            for (const collectionName of
                ACTIVITY_COLLECTIONS[activityType]) {
                const candidateRef = db
                    .collection(collectionName)
                    .doc(cleanActivityId);

                const candidate = await candidateRef.get();

                if (candidate.exists) {
                    activityRef = candidateRef;
                    activityData = candidate.data();
                    break;
                }
            }

            if (!activityRef || !activityData) {
                return res.status(404).json({
                    success: false,
                    message: "The activity could not be verified."
                });
            }

            if (getActivityOwner(activityData) !== uid) {
                return res.status(403).json({
                    success: false,
                    message: "You cannot receive points for another user's activity."
                });
            }

            if (
                (activityType === "video_post" ||
                 activityType === "text_post") &&
                !matchesPostType(activityData, activityType)
            ) {
                return res.status(400).json({
                    success: false,
                    message: "The post type does not match the requested activity."
                });
            }

            const awardKey = crypto
                .createHash("sha256")
                .update(`${uid}:${activityType}:${cleanActivityId}`)
                .digest("hex");

            const userRef = db.collection("users").doc(uid);
            const awardRef = db
                .collection("creatorActivityAwards")
                .doc(awardKey);

            const points = ACTIVITY_POINTS[activityType];

            const result = await db.runTransaction(async (transaction) => {
                const awardSnapshot = await transaction.get(awardRef);

                if (awardSnapshot.exists) {
                    return { duplicate: true };
                }

                const userSnapshot = await transaction.get(userRef);
                const userData = userSnapshot.exists
                    ? userSnapshot.data()
                    : {};

                const currentScore = userData.creatorEconomy ?? 0;

                if (
                    typeof currentScore !== "number" ||
                    !Number.isFinite(currentScore)
                ) {
                    throw new Error(
                        "Creator score storage is not a numeric field."
                    );
                }

                const userUpdates = {
                    creatorEconomy: currentScore + points
                };

                const counterFields = {
                    video_post: "monthlyVideoPosts",
                    text_post: "monthlyTextPosts",
                    cross_post: "monthlyCrossPosts"
                };

                const counterField = counterFields[activityType];

                if (counterField) {
                    const currentCount = userData[counterField] ?? 0;

                    if (
                        typeof currentCount !== "number" ||
                        !Number.isFinite(currentCount)
                    ) {
                        throw new Error(
                            `Invalid creator counter: ${counterField}.`
                        );
                    }

                    userUpdates[counterField] = currentCount + 1;
                }

                if (activityType === "comment") {
                    const currentTrust = userData.communityTrust ?? 0;

                    if (
                        typeof currentTrust !== "number" ||
                        !Number.isFinite(currentTrust)
                    ) {
                        throw new Error(
                            "Community trust storage is not numeric."
                        );
                    }

                    userUpdates.communityTrust = currentTrust + points;
                }

                transaction.set(userRef, userUpdates, { merge: true });

                transaction.create(awardRef, {
                    uid,
                    activityType,
                    activityId: cleanActivityId,
                    points,
                    createdAt:
                        require("firebase-admin").firestore.FieldValue
                            .serverTimestamp()
                });

                return {
                    duplicate: false,
                    points,
                    newScore: currentScore + points
                };
            });

            if (result.duplicate) {
                return res.status(200).json({
                    success: true,
                    duplicate: true,
                    pointsAwarded: 0,
                    message: "This activity has already been scored."
                });
            }

            return res.status(200).json({
                success: true,
                duplicate: false,
                activityType,
                pointsAwarded: result.points,
                creatorEconomy: result.newScore
            });
        } catch (error) {
            console.error(
                "Creator scoring failed:",
                error.message
            );

            return res.status(500).json({
                success: false,
                message: "Creator activity could not be scored."
            });
        }
    }
);

module.exports = router;
