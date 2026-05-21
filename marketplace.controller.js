/* =========================================================
   INCLURA MARKETPLACE CONTROLLER
   Enterprise Commerce Business Logic
   ========================================================= */

const Marketplace =
    require("../models/Marketplace");

const Wallet =
    require("../models/Wallet");

const Transaction =
    require("../models/Transaction");

const User =
    require("../models/User");

/* =========================================================
   SUPPORTED CURRENCIES
========================================================= */

const SUPPORTED_CURRENCIES = [

    "NGN",

    "USD",

    "EUR",

    "GBP"

];

/* =========================================================
   CREATE LISTING
========================================================= */

exports.createListing =
    async (req, res) => {

        try {

            const {

                title,

                description,

                price,

                currency,

                category,

                images,

                stock,

                accessibility

            } = req.body;

            /* =========================
               VALIDATE CURRENCY
            ========================= */

            if (

                !SUPPORTED_CURRENCIES.includes(
                    currency
                )

            ) {

                return res.status(400).json({

                    success: false,

                    accessible: true,

                    message:

                        "Unsupported currency."

                });

            }

            /* =========================
               CREATE LISTING
            ========================= */

            const listing =
                await Marketplace.create({

                    seller: req.user.id,

                    title,

                    description,

                    price,

                    currency,

                    category,

                    images,

                    stock,

                    accessibility

                });

            return res.status(201).json({

                success: true,

                accessible: true,

                message:

                    "Marketplace listing created successfully.",

                listing

            });

        } catch (error) {

            return res.status(500).json({

                success: false,

                accessible: true,

                message:

                    "Failed to create listing.",

                error: error.message

            });

        }

    };

/* =========================================================
   GET ALL LISTINGS
========================================================= */

exports.getAllListings =
    async (req, res) => {

        try {

            const listings =
                await Marketplace.find({

                    isActive: true

                })

                .populate(

                    "seller",

                    "fullName username profilePhoto verified"

                )

                .sort({

                    createdAt: -1

                });

            return res.status(200).json({

                success: true,

                accessible: true,

                listings

            });

        } catch (error) {

            return res.status(500).json({

                success: false,

                accessible: true,

                message:

                    "Failed to fetch listings.",

                error: error.message

            });

        }

    };

/* =========================================================
   GET SINGLE LISTING
========================================================= */

exports.getSingleListing =
    async (req, res) => {

        try {

            const listing =
                await Marketplace.findById(

                    req.params.listingId

                )

                .populate(

                    "seller",

                    "fullName username profilePhoto verified"

                );

            if (!listing) {

                return res.status(404).json({

                    success: false,

                    accessible: true,

                    message:

                        "Listing not found."

                });

            }

            return res.status(200).json({

                success: true,

                accessible: true,

                listing

            });

        } catch (error) {

            return res.status(500).json({

                success: false,

                accessible: true,

                message:

                    "Failed to fetch listing.",

                error: error.message

            });

        }

    };

/* =========================================================
   UPDATE LISTING
========================================================= */

exports.updateListing =
    async (req, res) => {

        try {

            const listing =
                await Marketplace.findById(

                    req.params.listingId

                );

            if (!listing) {

                return res.status(404).json({

                    success: false,

                    accessible: true,

                    message:

                        "Listing not found."

                });

            }

            if (

                listing.seller.toString() !==
                req.user.id

            ) {

                return res.status(403).json({

                    success: false,

                    accessible: true,

                    message:

                        "Unauthorized."

                });

            }

            Object.assign(

                listing,

                req.body

            );

            await listing.save();

            return res.status(200).json({

                success: true,

                accessible: true,

                message:

                    "Listing updated successfully.",

                listing

            });

        } catch (error) {

            return res.status(500).json({

                success: false,

                accessible: true,

                message:

                    "Failed to update listing.",

                error: error.message

            });

        }

    };

/* =========================================================
   DELETE LISTING
========================================================= */

exports.deleteListing =
    async (req, res) => {

        try {

            const listing =
                await Marketplace.findById(

                    req.params.listingId

                );

            if (!listing) {

                return res.status(404).json({

                    success: false,

                    accessible: true,

                    message:

                        "Listing not found."

                });

            }

            await listing.deleteOne();

            return res.status(200).json({

                success: true,

                accessible: true,

                message:

                    "Listing deleted successfully."

            });

        } catch (error) {

            return res.status(500).json({

                success: false,

                accessible: true,

                message:

                    "Failed to delete listing.",

                error: error.message

            });

        }

    };

/* =========================================================
   BUY PRODUCT
========================================================= */

exports.buyProduct =
    async (req, res) => {

        try {

            const listing =
                await Marketplace.findById(

                    req.params.listingId

                );

            if (!listing) {

                return res.status(404).json({

                    success: false,

                    accessible: true,

                    message:

                        "Product not found."

                });

            }

            if (listing.stock <= 0) {

                return res.status(400).json({

                    success: false,

                    accessible: true,

                    message:

                        "Product out of stock."

                });

            }

            const buyerWallet =
                await Wallet.findOne({

                    user: req.user.id

                });

            const sellerWallet =
                await Wallet.findOne({

                    user: listing.seller

                });

            if (

                !buyerWallet ||

                !sellerWallet

            ) {

                return res.status(404).json({

                    success: false,

                    accessible: true,

                    message:

                        "Wallet not found."

                });

            }

            if (

                buyerWallet.balance <
                listing.price

            ) {

                return res.status(400).json({

                    success: false,

                    accessible: true,

                    message:

                        "Insufficient balance."

                });

            }

            /* =========================
               PROCESS PAYMENT
            ========================= */

            buyerWallet.balance -=
                listing.price;

            sellerWallet.balance +=
                listing.price;

            listing.stock -= 1;

            listing.salesCount += 1;

            await buyerWallet.save();

            await sellerWallet.save();

            await listing.save();

            /* =========================
               CREATE TRANSACTION
            ========================= */

            const transaction =
                await Transaction.create({

                    user: req.user.id,

                    type:
                        "marketplace-payment",

                    amount:
                        listing.price,

                    currency:
                        listing.currency,

                    status:
                        "successful"

                });

            return res.status(200).json({

                success: true,

                accessible: true,

                message:

                    "Product purchased successfully.",

                transaction

            });

        } catch (error) {

            return res.status(500).json({

                success: false,

                accessible: true,

                message:

                    "Purchase failed.",

                error: error.message

            });

        }

    };

/* =========================================================
   ADD REVIEW
========================================================= */

exports.addReview =
    async (req, res) => {

        try {

            const listing =
                await Marketplace.findById(

                    req.params.listingId

                );

            if (!listing) {

                return res.status(404).json({

                    success: false,

                    accessible: true,

                    message:

                        "Listing not found."

                });

            }

            const review = {

                user: req.user.id,

                rating:
                    req.body.rating,

                comment:
                    req.body.comment,

                createdAt:
                    Date.now()

            };

            listing.reviews.push(
                review
            );

            await listing.save();

            return res.status(201).json({

                success: true,

                accessible: true,

                message:

                    "Review added successfully.",

                reviews:
                    listing.reviews

            });

        } catch (error) {

            return res.status(500).json({

                success: false,

                accessible: true,

                message:

                    "Failed to add review.",

                error: error.message

            });

        }

    };

/* =========================================================
   SAVE PRODUCT
========================================================= */

exports.saveProduct =
    async (req, res) => {

        try {

            const user =
                await User.findById(

                    req.user.id

                );

            if (

                !user.savedMarketplace.includes(
                    req.params.listingId
                )

            ) {

                user.savedMarketplace.push(

                    req.params.listingId

                );

                await user.save();

            }

            return res.status(200).json({

                success: true,

                accessible: true,

                message:

                    "Product saved successfully."

            });

        } catch (error) {

            return res.status(500).json({

                success: false,

                accessible: true,

                message:

                    "Failed to save product.",

                error: error.message

            });

        }

    };

/* =========================================================
   UNSAVE PRODUCT
========================================================= */

exports.unsaveProduct =
    async (req, res) => {

        try {

            const user =
                await User.findById(

                    req.user.id

                );

            user.savedMarketplace =
                user.savedMarketplace.filter(

                    (id) =>

                        id.toString() !==
                        req.params.listingId

                );

            await user.save();

            return res.status(200).json({

                success: true,

                accessible: true,

                message:

                    "Product unsaved successfully."

            });

        } catch (error) {

            return res.status(500).json({

                success: false,

                accessible: true,

                message:

                    "Failed to unsave product.",

                error: error.message

            });

        }

    };

/* =========================================================
   SHARE PRODUCT
========================================================= */

exports.shareProduct =
    async (req, res) => {

        try {

            const listing =
                await Marketplace.findById(

                    req.params.listingId

                );

            listing.shareCount += 1;

            await listing.save();

            return res.status(200).json({

                success: true,

                accessible: true,

                message:

                    "Product shared successfully.",

                shareCount:
                    listing.shareCount

            });

        } catch (error) {

            return res.status(500).json({

                success: false,

                accessible: true,

                message:

                    "Failed to share product.",

                error: error.message

            });

        }

    };

/* =========================================================
   GET TRENDING PRODUCTS
========================================================= */

exports.getTrendingProducts =
    async (req, res) => {

        try {

            const products =
                await Marketplace.find({

                    isActive: true

                })

                .sort({

                    salesCount: -1

                })

                .limit(20);

            return res.status(200).json({

                success: true,

                accessible: true,

                products

            });

        } catch (error) {

            return res.status(500).json({

                success: false,

                accessible: true,

                message:

                    "Failed to fetch trending products.",

                error: error.message

            });

        }

    };

/* =========================================================
   GET EXPLORE MARKETPLACE
========================================================= */

exports.getExploreMarketplace =
    async
