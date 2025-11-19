import { subDays } from "date-fns";
import { sendResponse } from "../middleware/utils.js";
import RevenueModel from "../models/Revenue.js";


//get revenue stats compare to last previous period
export async function getRevenueStats(req, res) {
    const { period = "30days" } = req.query;

    // Period mapping
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

        let startDate = days ? subDays(new Date(), days) : null;
        let previousStartDate = days ? subDays(startDate, days) : null;
        let endDate = new Date();
        let previousEndDate = startDate;

        const currentFilter = startDate
            ? { createdAt: { $gte: startDate, $lte: endDate } }
            : {};

        const previousFilter = previousStartDate
            ? { createdAt: { $gte: previousStartDate, $lte: previousEndDate } }
            : {};

        // % change helper
        const calcPercentage = (curr, prev) => {
            if (prev === 0) return curr > 0 ? 100 : 0;
            return Number((((curr - prev) / prev) * 100).toFixed(2));
        };

        // -----------------------------------------------------
        // GET OVERALL REVENUE COUNT
        // -----------------------------------------------------
        const overallCurrentCount = await RevenueModel.countDocuments(currentFilter);
        const overallPreviousCount = await RevenueModel.countDocuments(previousFilter);

        // -----------------------------------------------------
        // GET OVERALL REVENUE AMOUNT
        // -----------------------------------------------------
        const overallCurrentAgg = await RevenueModel.aggregate([
            { $match: currentFilter },
            { $group: { _id: null, total: { $sum: "$amount" } } },
        ]);

        const overallPreviousAgg = await RevenueModel.aggregate([
            { $match: previousFilter },
            { $group: { _id: null, total: { $sum: "$amount" } } },
        ]);

        const overallCurrentAmount = overallCurrentAgg[0]?.total || 0;
        const overallPreviousAmount = overallPreviousAgg[0]?.total || 0;

        const results = [];

        // -----------------------------------------------------
        // 1) OVERALL
        // -----------------------------------------------------
        results.push({
            source: "All Revenue",
            currentCount: overallCurrentCount,
            previousCount: overallPreviousCount,
            countChange: calcPercentage(overallCurrentCount, overallPreviousCount),
            countIndicator: overallCurrentCount >= overallPreviousCount ? "+" : "-",

            currentAmount: overallCurrentAmount,
            previousAmount: overallPreviousAmount,
            amountChange: calcPercentage(overallCurrentAmount, overallPreviousAmount),
            amountIndicator: overallCurrentAmount >= overallPreviousAmount ? "+" : "-",
        });

        // -----------------------------------------------------
        // 2) BREAKDOWN BY SOURCE
        // -----------------------------------------------------
        const sources = ["subscription", "sales"];

        for (const src of sources) {
            const currCount = await RevenueModel.countDocuments({
                source: src,
                ...currentFilter,
            });
            const prevCount = await RevenueModel.countDocuments({
                source: src,
                ...previousFilter,
            });

            const currAmountAgg = await RevenueModel.aggregate([
                { $match: { source: src, ...currentFilter } },
                { $group: { _id: null, total: { $sum: "$amount" } } },
            ]);

            const prevAmountAgg = await RevenueModel.aggregate([
                { $match: { source: src, ...previousFilter } },
                { $group: { _id: null, total: { $sum: "$amount" } } },
            ]);

            const currAmount = currAmountAgg[0]?.total || 0;
            const prevAmount = prevAmountAgg[0]?.total || 0;

            results.push({
                source: src,
                currentCount: currCount,
                previousCount: prevCount,
                countChange: calcPercentage(currCount, prevCount),
                countIndicator: currCount >= prevCount ? "+" : "-",

                currentAmount: currAmount,
                previousAmount: prevAmount,
                amountChange: calcPercentage(currAmount, prevAmount),
                amountIndicator: currAmount >= prevAmount ? "+" : "-",
            });
        }

        // SEND RESPONSE
        sendResponse(res, 200, true, results, "Revenue statistics retrieved successfully");
    } catch (error) {
        console.log("UNABLE TO GET REVENUE STATS", error);
        sendResponse(res, 500, false, null, "Unable to get revenue stats");
    }
}

//get all revenue with filter and pagination options
export async function getRevenues(req, res) {
    const { page = 1, limit = 10, source, search } = req.query;

    try {
        const query = {};

        // Filter by source (optional)
        if (source) {
            query.source = source;
        }

        // Search on userId, sourceId, source
        if (search) {
            const regex = new RegExp(search, "i");
            query.$or = [
                { userId: regex },
                { sourceId: regex },
                { source: regex }
            ];
        }

        const skip = (Number(page) - 1) * Number(limit);

        const [revenues, total] = await Promise.all([
            RevenueModel.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(Number(limit)),

            RevenueModel.countDocuments(query)
        ]);

        return res.status(200).json({
            success: true,
            total,
            page: Number(page),
            limit: Number(limit),
            pages: Math.ceil(total / Number(limit)),
            data: revenues
        });

    } catch (error) {
        console.log("UNABLE TO GET REVENUE", error);
        return res.status(500).json({
            success: false,
            message: "Unable to get revenue"
        });
    }
}
