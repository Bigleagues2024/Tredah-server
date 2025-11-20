import mongoose from "mongoose";

const TransactionSchema = new mongoose.Schema({
    transactionId: {
        type: String,
        required: [ true, 'Transaction Id is required' ],
        unique: [ true, 'Transaction Id must be unique' ]   
    },
    orderId: {
        type: String,
        required: [ true, 'Order Id is required' ]
    },
    buyerId: {
        type: String,
        required: [ true, 'User Id is required' ]
    },
    sellerId: {
        type: String,
        required: [ true, 'Seller Id is required' ]
    },
    productId: {
        type: String,
        required: [ true, 'Product Id is required' ]
    },
    amount: {
        type: Number,
        required: [ true, 'Amount is required' ]
    },
    totalPayableAmount: {
        type: Number
    },
    transactionStatus: {
        type: String,
        enum: ['Pending', 'Completed', 'Failed', 'Cancelled'],
        default: 'Pending'
    },
    success: {
        type: Boolean,
        default: false,
    },
    paymentMethod: {
        type: String
    },
    transactionReference: {
        type: String
    },
    accessCode: {
        type: String
    },
    paymentMode: {
        type: String
    },
    paidCurrency: {
        type: String,
        default: 'NGN'
    },

    paymentStatus: {
        type: String,
        default: 'Pending',
        enum: ['Pending', 'Escrow', 'Released', 'Requested Refund', 'Refunded'],
    }, //after order has been delivered to buyer
},
{ timestamps: true }
)

const TransactionModel = mongoose.model('transaction', TransactionSchema)
export default TransactionModel