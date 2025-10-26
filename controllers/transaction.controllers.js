import { sendResponse } from "../middleware/utils.js";
import TransactionModel from "../models/Transaction.js";
import { Parser as Json2csvParser } from "json2csv";
import PDFDocument from "pdfkit";
import { Readable } from "stream";
import archiver from "archiver";

export async function getTransactionsSummary(req, res) {
    const { userId: ownerId, storeId, userType } = req.user;
    const isSeller = userType.toLowerCase() === "seller";
    const { period = 'month' } = req.params; // today, week, month, year, all, custom
    const { start, end, days } = req.query;
    const userId = storeId || ownerId

    try {
        const query = {
            transactionStatus: "Completed"
        };

        // filter by user type
        if (isSeller) {
            query.sellerId = userId;
        } else {
            query.buyerId = userId;
        }

        // date filter
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

        // aggregate totals
        const summary = await TransactionModel.aggregate([
            { $match: query },
            {
                $group: {
                    _id: "$paymentStatus",
                    totalAmount: { $sum: "$amount" },
                    count: { $sum: 1 }
                }
            },
            {
                $project: {
                    _id: 0,
                    name: "$_id",
                    totalAmount: 1,
                    count: 1
                }
            }
        ]);

        return sendResponse(res, 200, true, summary, "Transactions summary fetched successfully");

    } catch (error) {
        console.error("UNABLE TO FETCH TRANSACTIONS SUMMARY", error);
        return sendResponse(res, 500, false, null, "Unable to fetch transactions summary");
    }
}

//get all transactions histroy of a user
export async function getTransactionsHistroy(req, res) {
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
            query.paymentStatus = status;
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

        const [transactions, total] = await Promise.all([
            TransactionModel.find(query)
                .select('-_id -__v')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit)),
            TransactionModel.countDocuments(query)
        ]);

        const data = {
            transactions,
            total,
            page: parseInt(page),
            pages: Math.ceil(total / limit)
        }
        return sendResponse(res, 200, true, data, "Transactions history fetched successfully");

    } catch (error) {
        console.log('UNABLE TO GET TRANSACTION HISTROY', error);
        return sendResponse(res, 500, false, null, 'Unable to get transaction history');
    }
}

//get all transactions (admin)
export async function getAllTransactionsHistroy(req, res) {
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
            query.paymentStatus = status;
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

        const [transactions, total] = await Promise.all([
            TransactionModel.find(query)
                .select('-_id -__v')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit)),
            TransactionModel.countDocuments(query)
        ]);

        const data = {
            transactions,
            total,
            page: parseInt(page),
            pages: Math.ceil(total / limit)
        };

        return sendResponse(res, 200, true, data, "All transactions fetched successfully");

    } catch (error) {
        console.error("UNABLE TO GET ALL TRANSACTION HISTORY", error);
        return sendResponse(res, 500, false, null, "Unable to get all transaction history");
    }
}

//get a transaction histroy
export async function getTransaction(req, res) {
    const { transactionId } = req.params
    if(!transactionId) return sendResponse(res, 400, false, null, 'Transaction Id is required')

    try {
        const transaction = await TransactionModel.findOne({ transactionId }).select('-_id -__v')
        if(!transaction) return sendResponse(res, 404, false, null, 'No transaction found')

        sendResponse(res, 200, true, transaction, 'Transaction detail fetched success')
    } catch (error) {
        console.log('UNABLE TO GET TRANSACTION DATA', error)
        sendResponse(res, 500, false, null, 'Unable to get transaction histroy detail')
    }
}

//export transactions (pdf or csv file)
export async function exportTransactionHistroy(req, res) {
    const { userId: ownerId, storeId, userType } = req.user;
    const isSeller = userType.toLowerCase() === "seller";
    const { transactionId, period, start, end, days } = req.body;
    const userId = storeId || ownerId

    try {
        const query = {
            //transactionStatus: "Completed"
        };

        if(transactionId) {
            query.transactionId = transactionId
        }

        // filter by user type
        if (isSeller) {
            query.sellerId = userId;
        } else {
            query.buyerId = userId;
        }


        let transactions;

        // fetch single transaction if transactionId provided
        if (transactionId) {
            const transaction = await TransactionModel.findOne(query).select('-_id -__v');
            if (!transaction) return sendResponse(res, 404, false, null, 'No transaction found');
            transactions = [transaction];
        } else {
            // build query for multiple transactions based on period/dates
            let dateFilter = {};
            const now = new Date();

            switch (period) {
                case "today":
                    dateFilter = { $gte: new Date(now.setHours(0,0,0,0)), $lte: new Date() };
                    break;
                case "week":
                    const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
                    dateFilter = { $gte: weekAgo, $lte: new Date() };
                    break;
                case "month":
                    const monthAgo = new Date(); monthAgo.setMonth(monthAgo.getMonth() - 1);
                    dateFilter = { $gte: monthAgo, $lte: new Date() };
                    break;
                case "year":
                    const yearAgo = new Date(); yearAgo.setFullYear(yearAgo.getFullYear() - 1);
                    dateFilter = { $gte: yearAgo, $lte: new Date() };
                    break;
                case "custom":
                    if (days) {
                        const from = new Date(); from.setDate(from.getDate() - parseInt(days));
                        dateFilter = { $gte: from, $lte: new Date() };
                    } else if (start && end) {
                        dateFilter = { $gte: new Date(start), $lte: new Date(end) };
                    }
                    break;
                case "all":
                default:
                    break;
            }

            if (Object.keys(dateFilter).length > 0) {
                query.createdAt = dateFilter;
            }

            transactions = await TransactionModel.find(query).select('-_id -__v');
            if (!transactions.length) return sendResponse(res, 404, false, null, 'No transactions found for the given period');
        }

        // --- CSV Export ---
        const fields = ["transactionId", "orderId", "buyerId", "sellerId", "amount", "transactionStatus", "paymentStatus", "createdAt", "updatedAt"];
        const json2csvParser = new Json2csvParser({ fields });
        const csvData = json2csvParser.parse(transactions);

        // --- PDF Export ---
        const doc = new PDFDocument({ margin: 30, size: "A4" });
        const pdfStream = new Readable();
        pdfStream._read = () => {};
        doc.pipe(pdfStream);

        doc.fontSize(18).text("Transaction Export", { align: "center" }).moveDown();
        transactions.forEach((tx, i) => {
            doc.fontSize(12).text(`${i+1}. Transaction ID: ${tx.transactionId}`);
            doc.text(`   Order ID: ${tx.orderId}`);
            doc.text(`   Buyer ID: ${tx.buyerId}`);
            doc.text(`   Seller ID: ${tx.sellerId}`);
            doc.text(`   Amount: ${tx.amount}`);
            doc.text(`   Transaction Status: ${tx.transactionStatus}`);
            doc.text(`   Payment Status: ${tx.paymentStatus}`);
            doc.text(`   Created At: ${tx.createdAt}`);
            doc.text(`   Updated At: ${tx.updatedAt}`).moveDown();
        });
        doc.end();

        // --- Send files in response ---
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', 'attachment; filename="transactions_export.zip"');

        // Use `archiver` to send both CSV + PDF in a zip
        const archive = archiver('zip');
        archive.pipe(res);

        archive.append(csvData, { name: 'transactions.csv' });

        // PDF buffer
        const chunks = [];
        pdfStream.on('data', chunk => chunks.push(chunk));
        pdfStream.on('end', () => {
            const pdfBuffer = Buffer.concat(chunks);
            archive.append(pdfBuffer, { name: 'transactions.pdf' });
            archive.finalize();
        });

    } catch (error) {
        console.error('UNABLE TO EXPORT TRANSACTION DATA', error);
        return sendResponse(res, 500, false, null, 'Unable to export transaction data');
    }
}

//request refund on a transaction
export async function requestRefund(params) {
    const { transactionId } = req.body

    try {
        
    } catch (error) {
        
    }
}

//get transaction stats
export async function getTransactionsStats(req, res) {
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
      { id: 'totalTransaction', name: 'Total Transactions', filter: {} },
      { id: 'pendingTransaction', name: 'Pending Transactions', filter: { status: 'Pending' } },
      { id: 'completedTransaction', name: 'Processing Transactions', filter: { status: 'Completed' } },
      { id: 'failedTransaction', name: 'Shipment Transactions', filter: { status: 'Failed' } },
      { id: 'cancelledTransaction', name: 'Delivered Transactions', filter: { status: 'Cancelled' } },
    ];

    // calculate for each status
    const results = await Promise.all(
      statuses.map(async (s) => {
        const current = await TransactionModel.countDocuments({ ...currentFilter, ...s.filter });
        const previous = await TransactionModel.countDocuments({ ...previousFilter, ...s.filter });

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

    sendResponse(res, 200, true, results, 'Transactions statistics retrieved successfully');
  } catch (error) {
    console.log('UNABLE TO GET TRANSACTIONS STATS', error);
    sendResponse(res, 500, false, 'Unable to get Transactions stats');
  }
}