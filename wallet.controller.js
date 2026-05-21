/* =========================================================
   INCLURA WALLET CONTROLLER
   Enterprise Financial Business Logic
   ========================================================= */

const Wallet = require("../models/Wallet");

const Transaction =
    require("../models/Transaction");

const User = require("../models/User");

/* =========================================================
   CREATE WALLET
========================================================= */

exports.createWallet =
    async (req, res) => {

        try {

            const existingWallet =
                await Wallet.findOne({

                    user: req.user.id

                });

            if (existingWallet) {

                return res.status(400).json({

                    success: false,

                    accessible: true,

                    message:

                        "Wallet already exists."

                });

            }

            const wallet =
                await Wallet.create({

                    user: req.user.id

                });

            return res.status(201).json({

                success: true,

                accessible: true,

                message:

                    "Wallet created successfully.",

                wallet

            });

        } catch (error) {

            return res.status(500).json({

                success: false,

                accessible: true,

                message:

                    "Wallet creation failed.",

                error: error.message

            });

        }

    };

/* =========================================================
   GET WALLET
========================================================= */

exports.getWallet =
    async (req, res) => {

        try {

            const wallet =
                await Wallet.findOne({

                    user: req.user.id

                });

            if (!wallet) {

                return res.status(404).json({

                    success: false,

                    accessible: true,

                    message:

                        "Wallet not found."

                });

            }

            return res.status(200).json({

                success: true,

                accessible: true,

                wallet

            });

        } catch (error) {

            return res.status(500).json({

                success: false,

                accessible: true,

                message:

                    "Failed to fetch wallet.",

                error: error.message

            });

        }

    };

/* =========================================================
   GET WALLET BALANCE
========================================================= */

exports.getWalletBalance =
    async (req, res) => {

        try {

            const wallet =
                await Wallet.findOne({

                    user: req.user.id

                });

            if (!wallet) {

                return res.status(404).json({

                    success: false,

                    accessible: true,

                    message:

                        "Wallet not found."

                });

            }

            return res.status(200).json({

                success: true,

                accessible: true,

                balance: wallet.balance,

                currency: wallet.currency

            });

        } catch (error) {

            return res.status(500).json({

                success: false,

                accessible: true,

                message:

                    "Failed to fetch wallet balance.",

                error: error.message

            });

        }

    };

/* =========================================================
   DEPOSIT FUNDS
========================================================= */

exports.depositFunds =
    async (req, res) => {

        try {

            const {

                amount,

                currency

            } = req.body;

            if (!amount || amount <= 0) {

                return res.status(400).json({

                    success: false,

                    accessible: true,

                    message:

                        "Valid amount required."

                });

            }

            const wallet =
                await Wallet.findOne({

                    user: req.user.id

                });

            if (!wallet) {

                return res.status(404).json({

                    success: false,

                    accessible: true,

                    message:

                        "Wallet not found."

                });

            }

            wallet.balance += amount;

            await wallet.save();

            const transaction =
                await Transaction.create({

                    user: req.user.id,

                    wallet: wallet._id,

                    type: "deposit",

                    amount,

                    currency,

                    status: "successful"

                });

            return res.status(200).json({

                success: true,

                accessible: true,

                message:

                    "Deposit successful.",

                wallet,

                transaction

            });

        } catch (error) {

            return res.status(500).json({

                success: false,

                accessible: true,

                message:

                    "Deposit failed.",

                error: error.message

            });

        }

    };

/* =========================================================
   WITHDRAW FUNDS
========================================================= */

exports.withdrawFunds =
    async (req, res) => {

        try {

            const {

                amount,

                currency

            } = req.body;

            const wallet =
                await Wallet.findOne({

                    user: req.user.id

                });

            if (!wallet) {

                return res.status(404).json({

                    success: false,

                    accessible: true,

                    message:

                        "Wallet not found."

                });

            }

            if (wallet.balance < amount) {

                return res.status(400).json({

                    success: false,

                    accessible: true,

                    message:

                        "Insufficient balance."

                });

            }

            wallet.balance -= amount;

            await wallet.save();

            const transaction =
                await Transaction.create({

                    user: req.user.id,

                    wallet: wallet._id,

                    type: "withdrawal",

                    amount,

                    currency,

                    status: "successful"

                });

            return res.status(200).json({

                success: true,

                accessible: true,

                message:

                    "Withdrawal successful.",

                wallet,

                transaction

            });

        } catch (error) {

            return res.status(500).json({

                success: false,

                accessible: true,

                message:

                    "Withdrawal failed.",

                error: error.message

            });

        }

    };

/* =========================================================
   TRANSFER FUNDS
========================================================= */

exports.transferFunds =
    async (req, res) => {

        try {

            const {

                recipientId,

                amount,

                currency

            } = req.body;

            const senderWallet =
                await Wallet.findOne({

                    user: req.user.id

                });

            const recipientWallet =
                await Wallet.findOne({

                    user: recipientId

                });

            if (

                !senderWallet ||

                !recipientWallet

            ) {

                return res.status(404).json({

                    success: false,

                    accessible: true,

                    message:

                        "Wallet not found."

                });

            }

            if (

                senderWallet.balance < amount

            ) {

                return res.status(400).json({

                    success: false,

                    accessible: true,

                    message:

                        "Insufficient balance."

                });

            }

            senderWallet.balance -= amount;

            recipientWallet.balance += amount;

            await senderWallet.save();

            await recipientWallet.save();

            const transaction =
                await Transaction.create({

                    user: req.user.id,

                    wallet: senderWallet._id,

                    type: "transfer",

                    amount,

                    currency,

                    status: "successful"

                });

            return res.status(200).json({

                success: true,

                accessible: true,

                message:

                    "Transfer successful.",

                transaction

            });

        } catch (error) {

            return res.status(500).json({

                success: false,

                accessible: true,

                message:

                    "Transfer failed.",

                error: error.message

            });

        }

    };

/* =========================================================
   GET TRANSACTION HISTORY
========================================================= */

exports.getTransactionHistory =
    async (req, res) => {

        try {

            const transactions =
                await Transaction.find({

                    user: req.user.id

                })

                .sort({

                    createdAt: -1

                });

            return res.status(200).json({

                success: true,

                accessible: true,

                transactions

            });

        } catch (error) {

            return res.status(500).json({

                success: false,

                accessible: true,

                message:

                    "Failed to fetch transactions.",

                error: error.message

            });

        }

    };

/* =========================================================
   VERIFY TRANSACTION
========================================================= */

exports.verifyTransaction =
    async (req, res) => {

        try {

            const transaction =
                await Transaction.findById(

                    req.params.transactionId

                );

            if (!transaction) {

                return res.status(404).json({

                    success: false,

                    accessible: true,

                    message:

                        "Transaction not found."

                });

            }

            return res.status(200).json({

                success: true,

                accessible: true,

                transaction

            });

        } catch (error) {

            return res.status(500).json({

                success: false,

                accessible: true,

                message:

                    "Transaction verification failed.",

                error: error.message

            });

        }

    };

/* =========================================================
   GET CREATOR EARNINGS
========================================================= */

exports.getCreatorEarnings =
    async (req, res) => {

        try {

            const earnings =
                await Transaction.find({

                    user: req.user.id,

                    type: "creator-earning"

                });

            return res.status(200).json({

                success: true,

                accessible: true,

                earnings

            });

        } catch (error) {

            return res.status(500).json({

                success: false,

                accessible: true,

                message:

                    "Failed to fetch creator earnings.",

                error: error.message

            });

        }

    };

/* =========================================================
   GET MARKETPLACE PAYMENTS
========================================================= */

exports.getMarketplacePayments =
    async (req, res) => {

        try {

            const payments =
                await Transaction.find({

                    user: req.user.id,

                    type: "marketplace-payment"

                });

            return res.status(200).json({

                success: true,

                accessible: true,

                payments

            });

        } catch (error) {

            return res.status(500).json({

                success: false,

                accessible: true,

                message:

                    "Failed to fetch marketplace payments.",

                error: error.message

            });

        }

    };

/* =========================================================
   GET MENTORSHIP PAYMENTS
========================================================= */

exports.getMentorshipPayments =
    async (req, res) => {

        try {

            const payments =
                await Transaction.find({

                    user: req.user.id,

                    type: "mentorship-payment"

                });

            return res.status(200).json({

                success: true,

                accessible: true,

                payments

            });

        } catch (error) {

            return res.status(500).json({

                success: false,

                accessible: true,

                message:

                    "Failed to fetch mentorship payments.",

                error: error.message

            });

        }

    };

/* =========================================================
   FREEZE WALLET
========================================================= */

exports.freezeWallet =
    async (req, res) => {

        try {

            const wallet =
                await Wallet.findOne({

                    user: req.user.id

                });

            wallet.isFrozen = true;

            await wallet.save();

            return res.status(200).json({

                success: true,

                accessible: true,

                message:

                    "Wallet frozen successfully."

            });

        } catch (error) {

            return res.status(500).json({

                success: false,

                accessible: true,

                message:

                    "Failed to freeze wallet.",

                error: error.message

            });

        }

    };

/* =========================================================
   UNFREEZE WALLET
========================================================= */

exports.unfreezeWallet =
    async (req, res) => {

        try {

            const wallet =
                await Wallet.findOne({

                    user: req.user.id

                });

            wallet.isFrozen = false;

            await wallet.save();

            return res.status(200).json({

                success: true,

                accessible: true,

                message:

                    "Wallet unfrozen successfully."

            });

        } catch (error) {

            return res.status(500).json({

                success: false,

                accessible: true,

                message:

                    "Failed to unfreeze wallet.",

                error: error.message

            });

        }

    };
