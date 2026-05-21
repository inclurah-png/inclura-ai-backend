/* =========================================================
   INCLURA MARKETPLACE ROUTES
   Enterprise Commerce Infrastructure
   ========================================================= */

const express = require("express");

const router = express.Router();

/* =========================================================
   CONTROLLERS
========================================================= */

const {

    createListing,

    getAllListings,

    getSingleListing,

    updateListing,

    deleteListing,

    buyProduct,

    addReview,

    saveProduct,

    unsaveProduct,

    shareProduct,

    getTrendingProducts,

    getExploreMarketplace,

    getCategoryListings,

    getSellerListings

} = require("../controllers/marketplace.controller");

/* =========================================================
   MIDDLEWARES
========================================================= */

const authMiddleware =
    require("../middlewares/auth.middleware");

/* =========================================================
   MARKETPLACE ROUTES
========================================================= */

/* =========================================
   CREATE LISTING
========================================= */

router.post(

    "/create",

    authMiddleware,

    createListing

);

/* =========================================
   GET ALL LISTINGS
========================================= */

router.get(

    "/",

    authMiddleware,

    getAllListings

);

/* =========================================
   GET SINGLE LISTING
========================================= */

router.get(

    "/:listingId",

    authMiddleware,

    getSingleListing

);

/* =========================================
   UPDATE LISTING
========================================= */

router.put(

    "/:listingId",

    authMiddleware,

    updateListing

);

/* =========================================
   DELETE LISTING
========================================= */

router.delete(

    "/:listingId",

    authMiddleware,

    deleteListing

);

/* =========================================================
   COMMERCE ROUTES
========================================================= */

/* =========================================
   BUY PRODUCT
========================================= */

router.post(

    "/buy/:listingId",

    authMiddleware,

    buyProduct

);

/* =========================================
   ADD REVIEW
========================================= */

router.post(

    "/review/:listingId",

    authMiddleware,

    addReview

);

/* =========================================
   SAVE PRODUCT
========================================= */

router.put(

    "/save/:listingId",

    authMiddleware,

    saveProduct

);

/* =========================================
   UNSAVE PRODUCT
========================================= */

router.put(

    "/unsave/:listingId",

    authMiddleware,

    unsaveProduct

);

/* =========================================
   SHARE PRODUCT
========================================= */

router.post(

    "/share/:listingId",

    authMiddleware,

    shareProduct

);

/* =========================================================
   DISCOVERY ROUTES
========================================================= */

/* =========================================
   TRENDING PRODUCTS
========================================= */

router.get(

    "/feed/trending",

    authMiddleware,

    getTrendingProducts

);

/* =========================================
   EXPLORE MARKETPLACE
========================================= */

router.get(

    "/feed/explore",

    authMiddleware,

    getExploreMarketplace

);

/* =========================================
   CATEGORY LISTINGS
========================================= */

router.get(

    "/category/:categoryName",

    authMiddleware,

    getCategoryListings

);

/* =========================================
   SELLER LISTINGS
========================================= */

router.get(

    "/seller/:sellerId",

    authMiddleware,

    getSellerListings

);

/* =========================================================
   MULTI-CURRENCY STATUS
========================================================= */

router.get(

    "/currency/status",

    async (req, res) => {

        return res.status(200).json({

            success: true,

            supportedCurrencies: [

                {

                    code: "NGN",

                    symbol: "₦",

                    name: "Nigerian Naira"

                },

                {

                    code: "USD",

                    symbol: "$",

                    name: "US Dollar"

                },

                {

                    code: "EUR",

                    symbol: "€",

                    name: "Euro"

                },

                {

                    code: "GBP",

                    symbol: "£",

                    name: "British Pound"

                }

            ],

            message:

                "Multi-currency marketplace system active."

        });

    }

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

                voiceReadableProducts: true,

                screenReaderOptimized: true,

                accessibleShoppingFlow: true

            },

            message:

                "Marketplace accessibility services are active."

        });

    }

);

/* =========================================================
   EXPORT ROUTER
========================================================= */

module.exports = router;
