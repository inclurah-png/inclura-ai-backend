/* =========================================================
   INCLURA WALLET ROUTES
   Enterprise Financial Infrastructure
   ========================================================= */

const express = require("express");

const router = express.Router();

/* =========================================================
   CONTROLLERS
========================================================= */

const {

    createWallet,

    getWallet,

    depositFunds,

    withdrawFunds,

    transferFunds,

    getTransactionHistory,

    getWalletBalance,

    verifyTransaction,

    getCreatorEarnings,

    getMarketplacePayments,

    getMentorshipPayments,

    freezeWallet,

    unfreezeWallet

} = require("../controllers/wallet.controller");

/* =========================================================
   MIDDLEWARES
========================================================= */

const authMiddleware =
    require("../middlewares/auth.middleware");

/* =========================================================
   WALLET ROUTES
========================================================= */

/* =========================================
   CREATE WALLET
========================================= */

router.post(

    "/create",

    authMiddleware,

    createWallet

);

/* =========================================
   GET WALLET
========================================= */

router.get(

    "/",

    authMiddleware,

    getWallet

);

/* =========================================
   GET WALLET BALANCE
========================================= */

router.get(

    "/balance",

    authMiddleware,

    getWalletBalance

);

/* =========================================================
   FINANCIAL TRANSACTIONS
========================================================= */

/* =========================================
   DEPOSIT FUNDS
========================================= */

router.post(

    "/deposit",

    authMiddleware,

    depositFunds

);

/* =========================================
   WITHDRAW FUNDS
========================================= */

router.post(

    "/withdraw",

    authMiddleware,

    withdrawFunds

);

/* =========================================
   TRANSFER FUNDS
========================================= */

router.post(

    "/transfer",

    authMiddleware,

    transferFunds

);

/* =========================================
   VERIFY TRANSACTION
========================================= */

router.get(

    "/verify/:transactionId",

    authMiddleware,

    verifyTransaction

);

/* =========================================================
   TRANSACTION HISTORY
========================================================= */

/* =========================================
   GET TRANSACTION HISTORY
========================================= */

router.get(

    "/transactions",

    authMiddleware,

    getTransactionHistory

);

/* =========================================================
   EARNINGS ROUTES
========================================================= */

/* =========================================
   CREATOR EARNINGS
========================================= */

router.get(

    "/earnings/creator",

    authMiddleware,

    getCreatorEarnings

);

/* =========================================
   MARKETPLACE PAYMENTS
========================================= */

router.get(

    "/payments/marketplace",

    authMiddleware,

    getMarketplacePayments

);

/* =========================================
   MENTORSHIP PAYMENTS
========================================= */

router.get(

    "/payments/mentorship",

    authMiddleware,

    getMentorshipPayments

);

/* =========================================================
   SECURITY ROUTES
========================================================= */

/* =========================================
   FREEZE WALLET
========================================= */

router.put(

    "/freeze",

    authMiddleware,

    freezeWallet

);

/* =========================================
   UNFREEZE WALLET
========================================= */

router.put(

    "/unfreeze",

    authMiddleware,

    unfreezeWallet

);

/* =========================================================
   ACCESSIBILITY STATUS ROUTE
========================================================= */

router.get(

    "/accessibility/status",

    async (req, res) => {

        return res.status(200).json({

            success: true,

            accessibility: {

                voiceReadableBalances: true,

                accessiblePaymentResponses: true,

                screenReaderOptimized: true

            },

            message:

                "Wallet accessibility services are active."

        });

    }

);

/* =========================================================
   EXPORT ROUTER
========================================================= */

module.exports = router;
