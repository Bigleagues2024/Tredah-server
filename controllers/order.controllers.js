import OrderModel from "../models/OrderModel.js";
import { sendResponse } from "../middleware/utils.js";

//new order

//edit order before payment is made

//get all orders of a (buyer or seller)

//get all orders (admin)

//get an order (buyer or seller or admin)

//pay for order (bank - zenith bank api)

//approve order payment by admin (manual use case)

//fetch order summary
export async function getOrderSummary(req, res) {
    const { userId, userType } = req.user;
    const isSeller = userType.toLowerCase() === "seller";
    const { period = 'month' } = req.params; // today, week, month, year, all, custom
    const { start, end, days } = req.query;

    try {
        let query = {};

        // filter by user type
        if (isSeller) {
            query.sellerId = userId;
        } else {
            query.buyerId = userId;
        }

        /** -------------------------
         * PERIOD FILTER
         --------------------------*/
        let dateFilter = {};
        const now = new Date();

        switch (period?.toLowerCase()) {
            case "today":
                dateFilter = {
                    $gte: new Date(now.setHours(0, 0, 0, 0)),
                    $lte: new Date()
                };
                break;

            case "week":
                const weekAgo = new Date();
                weekAgo.setDate(now.getDate() - 7);
                dateFilter = { $gte: weekAgo, $lte: new Date() };
                break;

            case "month":
                const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                dateFilter = { $gte: startOfMonth, $lte: new Date() };
                break;

            case "year":
                const startOfYear = new Date(now.getFullYear(), 0, 1);
                dateFilter = { $gte: startOfYear, $lte: new Date() };
                break;

            case "custom":
                if (days) {
                    const from = new Date();
                    from.setDate(now.getDate() - parseInt(days));
                    dateFilter = { $gte: from, $lte: new Date() };
                } else if (start && end) {
                    dateFilter = {
                        $gte: new Date(start),
                        $lte: new Date(end)
                    };
                }
                break;

            case "all":
                // no filter
                break;

            default:
                // fallback to today
                dateFilter = {
                    $gte: new Date(now.setHours(0, 0, 0, 0)),
                    $lte: new Date()
                };
                break;
        }

        if (Object.keys(dateFilter).length > 0) {
            query.createdAt = dateFilter;
        }

        /** -------------------------
         * AGGREGATION
         --------------------------*/
        const summary = await OrderModel.aggregate([
            { $match: query },
            {
                $group: {
                    _id: "$status",
                    count: { $sum: 1 }
                }
            }
        ]);

        /** -------------------------
         * FORMAT RESULT
         --------------------------*/
        const statuses = ['Pending', 'Processing', 'Shipment', 'Delivered', 'Cancelled', 'Returned'];

        const formatted = {
            totalOrders: 0,
            statusBreakdown: {}
        };

        // init all statuses with 0
        statuses.forEach(status => {
            formatted.statusBreakdown[status] = 0;
        });

        // apply actual counts
        summary.forEach(item => {
            formatted.statusBreakdown[item._id] = item.count;
            formatted.totalOrders += item.count;
        });

        return sendResponse(res, 200, true, formatted, "Order summary fetched successfully");

    } catch (error) {
        console.log("UNABLE TO FETCH ORDER SUMMARY", error);
        return sendResponse(res, 500, false, null, "Unable to fetch order summary");
    }
}

