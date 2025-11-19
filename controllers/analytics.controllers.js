import { sendResponse } from "../middleware/utils.js";
import OrderModel from "../models/Order.js";
import ProductModel from "../models/Product.js";
import TransactionModel from "../models/Transaction.js";

//get analytics stats
export async function getAnalyticsStats(req, res) {
    const { period = "30days" } = req.query;
    const { userId, storeId, userType } = req.user;

    // MAIN QUERY FOR ALL MODELS
    const query = {};

    if (userType === "seller" || storeId) {
        query.sellerId = storeId || userId;
    } else {
        query.buyerId = userId;
    }

    // Allowed periods
    const periods = {
        "3days": 3,
        "7days": 7,
        "30days": 30,
        "3mth": 90,
        "6mth": 180,
        "1year": 365,
        "alltime": null,
    };

    if (!periods.hasOwnProperty(period)) {
        return sendResponse(res, 400, false, null, "Invalid period specified");
    }

    try {
        const days = periods[period];

        const now = new Date();
        let startDate = days ? subDays(now, days) : null;
        let previousStartDate = days ? subDays(startDate, days) : null;

        const endDate = now;
        const previousEndDate = startDate;

        // Date filters
        const currentFilter = startDate
            ? { createdAt: { $gte: startDate, $lte: endDate }, ...query }
            : { ...query };

        const previousFilter = previousStartDate
            ? { createdAt: { $gte: previousStartDate, $lte: previousEndDate }, ...query }
            : { ...query };

        // Percentage helper
        const calcPercentage = (curr, prev) => {
            if (prev === 0) return curr > 0 ? 100 : 0;
            return Number((((curr - prev) / prev) * 100).toFixed(2));
        };

        const results = [];

        // -------------------------------------------------------
        // 1️⃣ TOTAL REVENUE (SUCCESSFUL TRANSACTIONS)
        // -------------------------------------------------------
        const currRevenueAgg = await TransactionModel.aggregate([
            { $match: { success: true, ...currentFilter } },
            { $group: { _id: null, total: { $sum: "$amount" } } }
        ]);

        const prevRevenueAgg = await TransactionModel.aggregate([
            { $match: { success: true, ...previousFilter } },
            { $group: { _id: null, total: { $sum: "$amount" } } }
        ]);

        const currentRevenue = currRevenueAgg[0]?.total || 0;
        const previousRevenue = prevRevenueAgg[0]?.total || 0;

        results.push({
            source: "Total Sales Revenue",
            currentCount: currentRevenue,
            previousCount: previousRevenue,
            countChange: calcPercentage(currentRevenue, previousRevenue),
            countIndicator: currentRevenue >= previousRevenue ? "+" : "-",
            currentAmount: currentRevenue,
            previousAmount: previousRevenue,
            amountChange: calcPercentage(currentRevenue, previousRevenue),
            amountIndicator: currentRevenue >= previousRevenue ? "+" : "-"
        });

        // -------------------------------------------------------
        // 2️⃣ TOTAL ORDERS COUNT
        // -------------------------------------------------------
        const currentOrderCount = await OrderModel.countDocuments(currentFilter);
        const previousOrderCount = await OrderModel.countDocuments(previousFilter);

        results.push({
            source: "Number of Orders",
            currentCount: currentOrderCount,
            previousCount: previousOrderCount,
            countChange: calcPercentage(currentOrderCount, previousOrderCount),
            countIndicator: currentOrderCount >= previousOrderCount ? "+" : "-",
            currentAmount: currentOrderCount,
            previousAmount: previousOrderCount,
            amountChange: calcPercentage(currentOrderCount, previousOrderCount),
            amountIndicator: currentOrderCount >= previousOrderCount ? "+" : "-"
        });

        // -------------------------------------------------------
        // 3️⃣ AVERAGE ORDER VALUE (AOV)
        // -------------------------------------------------------
        const currAovAgg = await OrderModel.aggregate([
            { $match: currentFilter },
            { $group: { _id: null, total: { $sum: "$amountAtPurchase" }, count: { $sum: 1 } } }
        ]);

        const prevAovAgg = await OrderModel.aggregate([
            { $match: previousFilter },
            { $group: { _id: null, total: { $sum: "$amountAtPurchase" }, count: { $sum: 1 } } }
        ]);

        const currentAOV = currAovAgg.length ? currAovAgg[0].total / currAovAgg[0].count : 0;
        const previousAOV = prevAovAgg.length ? prevAovAgg[0].total / prevAovAgg[0].count : 0;

        results.push({
            source: "Average Order Value",
            currentCount: Number(currentAOV.toFixed(2)),
            previousCount: Number(previousAOV.toFixed(2)),
            countChange: calcPercentage(currentAOV, previousAOV),
            countIndicator: currentAOV >= previousAOV ? "+" : "-",
            currentAmount: Number(currentAOV.toFixed(2)),
            previousAmount: Number(previousAOV.toFixed(2)),
            amountChange: calcPercentage(currentAOV, previousAOV),
            amountIndicator: currentAOV >= previousAOV ? "+" : "-"
        });

        // RESPONSE
        return sendResponse(res, 200, true, results, "Analytics stats retrieved successfully");

    } catch (error) {
        console.log("UNABLE TO GET ANALYTICS STATS", error);
        return sendResponse(res, 500, false, null, "Unable to get analytics stats");
    }
}

//get total revenue
export async function getTotalRevenueStats(req, res) {
    const { period = "7days" } = req.query;
    const { userId, storeId, userType } = req.user;

    // MAIN QUERY
    const query = {};

    if (userType === "seller" || storeId) {
        query.sellerId = storeId || userId;
    } else {
        query.buyerId = userId;
    }

    // Period map
    const periods = {
        "3days": 3,
        "7days": 7,
        "3mth": 90,
        "6mth": 180,
        "1year": 365,
    };

    if (!periods.hasOwnProperty(period)) {
        return sendResponse(res, 400, false, null, "Invalid period specified");
    }

    try {
        const days = periods[period];
        const endDate = new Date();
        const startDate = subDays(endDate, days);

        // Final match filter
        const matchFilter = {
            ...query,
            success: true,
            createdAt: { $gte: startDate, $lte: endDate }
        };

        // AGGREGATION FOR TOTAL + DAILY DATA
        const agg = await TransactionModel.aggregate([
            { $match: matchFilter },

            // Group by YYYY-MM-DD to avoid time conflicts
            {
                $group: {
                    _id: {
                        year: { $year: "$createdAt" },
                        month: { $month: "$createdAt" },
                        day: { $dayOfMonth: "$createdAt" }
                    },
                    total: { $sum: "$amount" }
                }
            },

            // Convert back to a date
            {
                $project: {
                    date: {
                        $dateFromParts: {
                            year: "$_id.year",
                            month: "$_id.month",
                            day: "$_id.day"
                        }
                    },
                    total: 1,
                    _id: 0
                }
            },

            { $sort: { date: 1 } }
        ]);

        // BUILD PERIOD LABELS (Friendly names)
        const periodsList = [];

        let pointer = new Date(startDate);
        for (let i = 0; i <= days; i++) {
            const label =
                days <= 7
                    ? pointer.toLocaleDateString("en-US", { weekday: "long" }) // Monday, Tuesday...
                    : pointer.toLocaleDateString("en-US", { month: "short", day: "numeric" }); // Jan 3, Jan 4...

            // Find matching amount or return 0
            const match = agg.find(
                item =>
                    item.date.toDateString() === pointer.toDateString()
            );

            periodsList.push({
                name: label,
                value: match ? match.total : 0
            });

            pointer.setDate(pointer.getDate() + 1);
        }

        // TOTAL AMOUNT in entire period
        const totalAmount = agg.reduce((sum, x) => sum + x.total, 0);

        const response = {
            totalAmount,
            periods: periodsList
        };

        return sendResponse(
            res,
            200,
            true,
            response,
            "Total revenue stats retrieved successfully"
        );

    } catch (error) {
        console.log("UNABLE TO GET TOTAL TRANSACTION", error);
        return sendResponse(res, 500, false, null, "Unable to get total revenue");
    }
}

//top selling product
export async function getTopSellingProduct(req, res) {
    const { period = "30days", limit = 10 } = req.query;
    const { userId, storeId, userType } = req.user;

    // Main query
    const query = {};

    if (userType === "seller" || storeId) {
        query.sellerId = storeId || userId;
    }

    // Allowed periods
    const periods = {
        "3days": 3,
        "7days": 7,
        "30days": 30,
        "3mth": 90,
        "6mth": 180,
        "1year": 365,
        "alltime": null,
    };

    if (!periods.hasOwnProperty(period)) {
        return sendResponse(res, 400, false, null, "Invalid period specified");
    }

    try {
        const days = periods[period];
        const endDate = new Date();
        const startDate = days ? subDays(endDate, days) : null;

        // Apply date range if not all-time
        const dateFilter = days
            ? { createdAt: { $gte: startDate, $lte: endDate } }
            : {};

        // FINAL ORDER FILTER
        const finalFilter = {
            ...query,
            ...dateFilter,
            isPaid: true,       // Ensure product is actually purchased
        };

        // STEP 1 — AGGREGATE ORDERS BY PRODUCT
        const topProductsAgg = await OrderModel.aggregate([
            { $match: finalFilter },
            {
                $group: {
                    _id: "$productId",
                    totalQuantitySold: { $sum: "$quantity" },
                    noOfSales: { $sum: 1 }
                }
            },
            { $sort: { totalQuantitySold: -1 } },
            { $limit: Number(limit) }
        ]);

        if (topProductsAgg.length === 0) {
            return sendResponse(res, 200, true, [], "No product sales found");
        }

        // TOTAL quantity sold (for percentage calculation)
        const totalQty = topProductsAgg.reduce((sum, p) => sum + p.totalQuantitySold, 0);

        // STEP 2 — FETCH PRODUCT DETAILS
        const productIds = topProductsAgg.map(p => p._id);

        const products = await ProductModel.find({ productId: { $in: productIds } });

        // Convert to map for fast lookup
        const productMap = {};
        products.forEach(p => {
            productMap[p.productId] = p;
        });

        // STEP 3 — BUILD FINAL RESPONSE
        const results = topProductsAgg.map(item => {
            const product = productMap[item._id];

            const percentage = totalQty === 0
                ? 0
                : Number(((item.totalQuantitySold / totalQty) * 100).toFixed(2));

            return {
                productId: item._id,
                name: product?.name || "Unknown Product",
                mainImage: product?.mainImage || null,
                category: product?.category || [],
                quantitySold: item.totalQuantitySold,
                salesCount: item.noOfSales,
                percentage,             // e.g. 40%
                sellerId: product?.sellerId
            };
        });

        return sendResponse(res, 200, true, results, "Top selling products retrieved");

    } catch (error) {
        console.log("UNABLE TO GET TOP SELLING PRODUCT", error);
        sendResponse(res, 500, false, null, "Unable to get top selling products");
    }
}
