import OrderModel from "../models/Order.js";
import { generateUniqueCode, sendResponse } from "../middleware/utils.js";
import ProductModel from "../models/Product.js";
import UserModel from "../models/User.js";
import SellerKycInfoModel from "../models/SellerKycInfo.js";
import NotificationModel from "../models/Notification.js";
import { subDays } from "date-fns";

//new order
export async function newOrder(req, res) {
    const { userId, storeId, name } = req.user
    const { buyerEmail, amount, productId, quantity } = req.body
    if(!buyerEmail) return sendResponse(res, 400, false, null, 'Buyer Email address is required')
    if(!amount) return sendResponse(res, 400, false, null, 'Amount is required')
    if(typeof amount !== 'number') return sendResponse(res, 400, false, null, 'Amount must be a number')
    if(!productId) return sendResponse(res, 400, false, null, 'Product Id is required')
    if(!quantity) return sendResponse(res, 400, false, null, 'Quantity is required')
    if(typeof quantity !== 'number') return sendResponse(res, 400, false, null, 'Quantity must be a number')

    const sellerId = storeId || userId
    try {
        //check if product exist
        const productExist = await ProductModel.findOne({ productId })
        if(!productExist) return sendResponse(res, 404, false, null, 'Product does not exist')
        
        //check if buyer email is valid and exist
        const getUser = await UserModel.findOne({ email: buyerEmail })
        if(!getUser) return sendResponse(res, 404, false, null, 'Buyer Email does not exist')
        if(getUser.userType !== 'buyer') return sendResponse(res, 400, false, null, 'This email belongs to a non-buyer account. Please use a buyer account.')
        
        //get seller info
        const getSellerInfo = await SellerKycInfoModel.findOne({ accountId: sellerId })

        const newOrderId = await generateUniqueCode(9)
        const orderId = `TRH${newOrderId}ORD`

        const order = await OrderModel.create({
            orderId,
            sellerId,
            buyerId: getUser.userId,
            buyerEmail,
            amountAtPurchase: amount,
            companyNameAtPurchase: getSellerInfo?.companyName || name,
            productId,
            quantity,
        })

        //notify buyer
        await NotificationModel.create({ 
            userId: getUser.userId,
            notification: `A new order invoice has been sent to you by ${getSellerInfo?.companyName || name}. Order Id: ${orderId}`
        })
        //notify seller
        await NotificationModel.create({
            userId: sellerId,
            notification: `Order Invoice ${orderId} has been created and sent to ${getUser?.name}.`
        })

        sendResponse(res, 201, true, order, 'Order Invoice created successful')
    } catch (error) {
        console.log('UNABLE TO CREATE A NEW ORDER', error)
        sendResponse(res, 500, false, null, 'Unable to create new order')
    }
}

//edit order only before payment is made
export async function editOrder(req, res) {
    const { userId, storeId, name } = req.user
    const { orderId, buyerEmail, amount, productId, quantity } = req.body
    if(!orderId) return sendResponse(res, 400, false, null, 'Order is required')
    if(amount) {
        if(typeof amount !== 'number') return sendResponse(res, 400, false, null, 'Amount must be a number')
    }
    if(quantity) {
        if(typeof quantity !== 'number') return sendResponse(res, 400, false, null, 'Quantity must be a number')
    }
    const sellerId = storeId || userId

    try {
        const getOrder = await OrderModel.findOne({ orderId })
        if(!getOrder) return sendResponse(res, 404, false, null, 'Order with this Id not found')
        if(getOrder.isPaid) return sendResponse(res, 400, false, null, 'This order has already been paid for and cannot be edited.')

        if(productId) {
            //check if product exist
            const productExist = await ProductModel.findOne({ productId })
            if(!productExist) return sendResponse(res, 404, false, null, 'Product does not exist')    
        }
        
        if(buyerEmail) {
            //check if buyer email is valid and exist
            const getUser = await UserModel.findOne({ email: buyerEmail })
            if(!getUser) return sendResponse(res, 404, false, null, 'Buyer Email does not exist')
            if(getUser.userType !== 'buyer') return sendResponse(res, 400, false, null, 'This email belongs to a non-buyer account. Please use a buyer account.')
        }
        //get seller info
        const getSellerInfo = await SellerKycInfoModel.findOne({ accountId: sellerId })

        if(buyerEmail) getOrder.buyerId = getUser.userId
        if(buyerEmail) getOrder.buyerEmail = buyerEmail
        if(amount) getOrder.amount = amountAtPurchase
        getOrder.companyNameAtPurchase = getSellerInfo?.companyName || name
        if(productId) getOrder.productId = productId
        if(quantity) getOrder.quantity = quantity
        
        await getOrder.save()

        //notify buyer
        await NotificationModel.create({ 
            userId: getUser.userId,
            notification: `Order ${orderId} has been updated by ${getSellerInfo?.companyName || name}.`
        })
        //notify seller
        await NotificationModel.create({
            userId: sellerId,
            notification: `Order Invoice ${orderId} has been updated and sent to ${getUser?.name}.`
        })

        sendResponse(res, 201, true, getOrder, 'Order Invoice updated successful')
    } catch (error) {
        console.log('UNABLE TO UPDATE ORDER', error)
        sendResponse(res, 500, false, null, 'Unable to update order')
    }
}

//get all orders of a (buyer or seller)
export async function getordersHistory(req, res) {
    const { userId: ownerId, storeId, userType } = req.user;
    const isSeller = userType.toLowerCase() === "seller";

    const userId = storeId || ownerId

    const {
        limit = 10,
        page = 1,
        status,
        period,
        start, 
        end, 
        days
    } = req.query;

    try {
        const query = {};

        // filter by user type
        if (isSeller) {
            query.sellerId = userId;
        } else {
            query.buyerId = userId;
        }

        //  filter by paymentStatus if provided
        if (status) {
            query.status = status;
        }

        // ✅ date filtering
        let dateFilter = {};
        const now = new Date();

        switch (period) {
            case "today":
                dateFilter = {
                    $gte: new Date(now.setHours(0, 0, 0, 0)),
                    $lte: new Date()
                };
                break;
            case "week":
                const weekAgo = new Date();
                weekAgo.setDate(weekAgo.getDate() - 7);
                dateFilter = { $gte: weekAgo, $lte: new Date() };
                break;
            case "month":
                const monthAgo = new Date();
                monthAgo.setMonth(monthAgo.getMonth() - 1);
                dateFilter = { $gte: monthAgo, $lte: new Date() };
                break;
            case "year":
                const yearAgo = new Date();
                yearAgo.setFullYear(yearAgo.getFullYear() - 1);
                dateFilter = { $gte: yearAgo, $lte: new Date() };
                break;
            case "custom":
                if (days) {
                    const from = new Date();
                    from.setDate(from.getDate() - parseInt(days));
                    dateFilter = { $gte: from, $lte: new Date() };
                } else if (start && end) {
                    dateFilter = {
                        $gte: new Date(start),
                        $lte: new Date(end)
                    };
                }
                break;
            case "all":
            default:
                break;
        }

        if (Object.keys(dateFilter).length > 0) {
            query.createdAt = dateFilter;
        }

        // ✅ pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [orders, total] = await Promise.all([
            OrderModel.find(query)
                .select('-_id -__v')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit)),
            OrderModel.countDocuments(query)
        ]);

        const data = {
            orders,
            total,
            page: parseInt(page),
            pages: Math.ceil(total / limit)
        }
        return sendResponse(res, 200, true, data, "Orders history fetched successfully");

    } catch (error) {
        console.log('UNABLE TO GET USER ORDERS HISTORY', error)
        sendResponse(res, 500, false, null, 'Unable to get user order history')
    }
}

//get all orders (admin)
export async function getAllorders(req, res) {
    const { adminId } = req.user;

    const {
        limit = 10,
        page = 1,
        status,
        period,
        start, 
        end, 
        days,
        sellerId,
        buyerId,
    } = req.query;

    try {
        const query = {};

        // filter by sellerId or buyerId
        if (sellerId) {
            query.sellerId = sellerId;
        }
        if (buyerId) {
            query.buyerId = buyerId;
        }

        // filter by paymentStatus if provided
        if (status) {
            query.status = status;
        }

        // date filtering
        let dateFilter = {};
        const now = new Date();

        switch (period) {
            case "today":
                dateFilter = {
                    $gte: new Date(now.setHours(0, 0, 0, 0)),
                    $lte: new Date()
                };
                break;
            case "week":
                const weekAgo = new Date();
                weekAgo.setDate(weekAgo.getDate() - 7);
                dateFilter = { $gte: weekAgo, $lte: new Date() };
                break;
            case "month":
                const monthAgo = new Date();
                monthAgo.setMonth(monthAgo.getMonth() - 1);
                dateFilter = { $gte: monthAgo, $lte: new Date() };
                break;
            case "year":
                const yearAgo = new Date();
                yearAgo.setFullYear(yearAgo.getFullYear() - 1);
                dateFilter = { $gte: yearAgo, $lte: new Date() };
                break;
            case "custom":
                if (days) {
                    const from = new Date();
                    from.setDate(from.getDate() - parseInt(days));
                    dateFilter = { $gte: from, $lte: new Date() };
                } else if (start && end) {
                    dateFilter = {
                        $gte: new Date(start),
                        $lte: new Date(end)
                    };
                }
                break;
            case "all":
            default:
                break;
        }

        if (Object.keys(dateFilter).length > 0) {
            query.createdAt = dateFilter;
        }

        // pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [orders, total] = await Promise.all([
            OrderModel.find(query)
                .select('-_id -__v')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit)),
            OrderModel.countDocuments(query)
        ]);

        const data = {
            orders,
            total,
            page: parseInt(page),
            pages: Math.ceil(total / limit)
        };

        return sendResponse(res, 200, true, data, "All orders fetched successfully");

    } catch (error) {
        console.error("UNABLE TO GET ALL ORDERS HISTORY (ADMIN)", error);
        return sendResponse(res, 500, false, null, "Unable to get all orders history");
    }
}

//get an order (buyer or seller or admin)
export async function getOrder(req, res) {
    const { orderId } = req.params
    if(!orderId) return sendResponse(res, 400, false, null, 'Order Id is required')

    try {
        const order = await OrderModel.findOne({ orderId }).select('-_id -__v')
        if(!order) return sendResponse(res, 404, false, null, 'No order found')

        sendResponse(res, 200, true, order, 'Order detail fetched success')
    } catch (error) {
        console.log('UNABLE TO GET ORDER DATA', error)
        sendResponse(res, 500, false, null, 'Unable to get order histroy detail')
    }
}

//pay for order (bank - zenith bank api)
export async function makePayment(req, res) {
    const { userId } = req.body

    try {
        
    } catch (error) {
        
    }
}

//approve order payment by admin (manual use case)

//update order status by admin (manual use case)

//update order (admin)

//fetch order summary
export async function getOrderSummary(req, res) {
    const { userId: ownerId, storeId, userType } = req.user;
    const isSeller = userType.toLowerCase() === "seller";
    const { period = 'month' } = req.params; // today, week, month, year, all, custom
    const { start, end, days } = req.query;
    const userId = storeId || ownerId
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

//fetch order stats (admin)
export async function getOrderStats(req, res) {
  const { period = '30days' } = req.query;

  const periods = {
    '3days': 3,
    '7days': 7,
    '15days': 15,
    '30days': 30,
    '3mth': 90,
    '6mth': 180,
    '1year': 365,
    'alltime': null
  };

  if (!periods.hasOwnProperty(period)) {
    return sendResponse(res, 400, false, 'Invalid period specified');
  }

  try {
    let startDate = periods[period] ? subDays(new Date(), periods[period]) : null;
    let previousStartDate = periods[period] ? subDays(startDate, periods[period]) : null;
    let endDate = new Date();
    let previousEndDate = startDate;

    const currentFilter = startDate ? { createdAt: { $gte: startDate, $lte: endDate } } : {};
    const previousFilter = previousStartDate ? { createdAt: { $gte: previousStartDate, $lte: previousEndDate } } : {};

    // statuses to calculate
    const statuses = [
      { id: 'totalOrders', name: 'Total Orders', filter: {} },
      { id: 'pendingOrders', name: 'Pending Orders', filter: { status: 'Pending' } },
      { id: 'processingOrders', name: 'Processing Orders', filter: { status: 'Processing' } },
      { id: 'shipmentOrders', name: 'Shipment Orders', filter: { status: 'Shipment' } },
      { id: 'deliveredOrders', name: 'Delivered Orders', filter: { status: 'Delivered' } },
      { id: 'cancelledOrders', name: 'Cancelled Orders', filter: { status: 'Cancelled' } },
      { id: 'returnedOrders', name: 'Returned Orders', filter: { status: 'Returned' } },
    ];

    // calculate for each status
    const results = await Promise.all(
      statuses.map(async (s) => {
        const current = await OrderModel.countDocuments({ ...currentFilter, ...s.filter });
        const previous = await OrderModel.countDocuments({ ...previousFilter, ...s.filter });

        const percentageChange = (currentVal, prevVal) => {
          if (prevVal === 0) return currentVal > 0 ? 100 : 0;
          let change = ((currentVal - prevVal) / prevVal) * 100;
          return Math.abs(change.toFixed(2));
        };

        return {
          id: s.id,
          name: s.name,
          current,
          previous,
          percentage: percentageChange(current, previous),
          percentageChange: current >= previous ? '+' : '-',
        };
      })
    );

    sendResponse(res, 200, true, results, 'Orders statistics retrieved successfully');
  } catch (error) {
    console.log('UNABLE TO GET ORDER STATS', error);
    sendResponse(res, 500, false, 'Unable to get orders stats');
  }
}

//fetch order of a seller (admin and seller and buyer)
export async function getUserOrderStats(req, res) {
  const { period = '30days' } = req.query;
  const { accountId, type } = req.params
  const { userId: ownerId, storeId, userType } = req.user;
  if(!type) return sendResponse(res, 400, false, null, 'Account type is required')
  if(!['buyer', 'seller'].includes(type)) return sendResponse(res, 400, false, null, 'Account type is either buyer or seller')
  const isSeller = userType?.toLowerCase() === 'seller' || type.toLowerCase() === 'seller';
  const userId = storeId || ownerId || accountId
  if(!userId) return sendResponse(res, 400, false, null, 'Account Id is required')

    let query = {};

        // filter by user type
        if (isSeller) {
            query.sellerId = userId;
        } else {
            query.buyerId = userId;
        }

  const periods = {
    '3days': 3,
    '7days': 7,
    '15days': 15,
    '30days': 30,
    '3mth': 90,
    '6mth': 180,
    '1year': 365,
    'alltime': null
  };

  if (!periods.hasOwnProperty(period)) {
    return sendResponse(res, 400, false, 'Invalid period specified');
  }

  try {
    let startDate = periods[period] ? subDays(new Date(), periods[period]) : null;
    let previousStartDate = periods[period] ? subDays(startDate, periods[period]) : null;
    let endDate = new Date();
    let previousEndDate = startDate;

    const currentFilter = startDate ? { createdAt: { $gte: startDate, $lte: endDate } } : {};
    const previousFilter = previousStartDate ? { createdAt: { $gte: previousStartDate, $lte: previousEndDate } } : {};

    // statuses to calculate
    const statuses = [
      { id: 'totalOrders', name: 'Total Orders', filter: {} },
      { id: 'pendingOrders', name: 'Pending Orders', filter: { ...query, status: 'Pending' } },
      { id: 'processingOrders', name: 'Processing Orders', filter: { ...query, status: 'Processing' } },
      { id: 'shipmentOrders', name: 'Shipment Orders', filter: { ...query, status: 'Shipment' } },
      { id: 'deliveredOrders', name: 'Delivered Orders', filter: { ...query, status: 'Delivered' } },
      { id: 'cancelledOrders', name: 'Cancelled Orders', filter: { ...query, status: 'Cancelled' } },
      { id: 'returnedOrders', name: 'Returned Orders', filter: { ...query, status: 'Returned' } },
    ];

    // calculate for each status
    const results = await Promise.all(
      statuses.map(async (s) => {
        const current = await OrderModel.countDocuments({ ...currentFilter, ...s.filter });
        const previous = await OrderModel.countDocuments({ ...previousFilter, ...s.filter });

        const percentageChange = (currentVal, prevVal) => {
          if (prevVal === 0) return currentVal > 0 ? 100 : 0;
          let change = ((currentVal - prevVal) / prevVal) * 100;
          return Math.abs(change.toFixed(2));
        };

        return {
          id: s.id,
          name: s.name,
          current,
          previous,
          percentage: percentageChange(current, previous),
          percentageChange: current >= previous ? '+' : '-',
        };
      })
    );

    sendResponse(res, 200, true, results, 'Orders statistics retrieved successfully');
  } catch (error) {
    console.log('UNABLE TO GET ORDER STATS', error);
    sendResponse(res, 500, false, 'Unable to get orders stats');
  }
}
