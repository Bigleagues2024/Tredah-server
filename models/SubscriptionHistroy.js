import mongoose from "mongoose";

const SubscriptionHistroySchema = new mongoose.Schema({
    userId: {
        type: String,
    },
    email: {
        type: String,
    },
    name: {
        type: String
    },
    mobileNumber: {
        type: String
    },
    price:{
        type: Number
    },
    productName: {
        type: String,
    },
    productId: {
        type: String,
    },
    priceId: {
        type: String
    },
    interval: {
        type: String
    },
    startDate: {
        type: Date
    },
    endDate: {
        type: Date
    },
    status: {
        type: String,
        default: 'Pending',
        enum: [ 'Pending', 'Failed', 'Successful']
    },
    success: {
        type: Boolean,
        default: false
    },
    paymentRefrence: {
        type: String
    },
    channel: {
        type: String
    },
    bank: {
        type: String
    },
    cardType: {
        type: String
    },
},
{ timestamps: true }
)

const SubscriptionHistroyModel = mongoose.model('golden-epics-subscription-histroy', SubscriptionHistroySchema)
export default SubscriptionHistroyModel