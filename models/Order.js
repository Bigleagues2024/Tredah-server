import mongoose from "mongoose";

const OrderSchema = new mongoose.Schema({
    orderId: {
        type: String,
        required: [ true, 'Order Id is required' ],
        unique: [ true, 'Order Id is unique' ],
    },
    sellerId: {
        type: String,
        required: [ true, 'Seller Id is required'],
    },
    buyerId: {
        type: String,
        required: [ true, 'Buyer Id is required'],
    },
    buyerEmail: {
        type: String
    },
    amountAtPurchase: {
        type: Number
    },
    companyNameAtPurchase: {
        type: String
    },
    totalPayableAmount: {
        type: Number
    },
    productId: {
        type: String,
        required: [ true, 'Product Id is required' ]
    },
    quantity: {
        type: Number,
        required: [ true, 'Quantity is required' ]
    },
    status: {
        type: String,
        default: 'Pending',
        enum: ['Pending', 'Processing', 'Shipment', 'Delivered', 'Cancelled', 'Returned']
    },
    paymentStatus: {
        type: String,
        default: 'Pending',
    },
    isPaid: {
        type: Boolean,
        default: false
    },
    paidAt: {
        type: Date
    },
    completed: {
        type: Boolean,
        default: false
    },
    //shipping status
    //shipping details (object)

},
{ timestamps: true }
)

const OrderModel = mongoose.model('order', OrderSchema)
export default OrderModel