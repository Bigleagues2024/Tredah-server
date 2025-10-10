import mongoose from "mongoose";

const SubscriptionPlanSchema = new mongoose.Schema({
    productName: {
        type: String,
        required: [ true, 'Product name is required']
    },
    productCTA: {
        type: String
    },
    price: {
        type: Number,
        required: [ true, 'Price is required']
    },
    productId: {
        type: String,
        required: [true, 'Product Id is required'],
        unique: [ true, 'Product Id must be unique']
    },
    priceId: {
        type: String,
        required: [true, 'Price Id is required']
    },
    currency: {
        type: String,
        default: 'NGN'
    },
    interval: {
        type: String,
        default: 'monthly'
    },
    type: {
        type: String,
        default: 'paystack'
    },
    trialPeriodDays: {
        type: Date
    },
    features: [
        {
            feature: {
                type: String
            },
            active: {
                type: Boolean,
                default: true
            }
        }
    ],
    disabled: {
        type: Boolean,
        default: false
    },
    toNumberOfSubscription: {
        type: Number,
        default: 0
    },
    relatedSub: {
        type: Array
    },
    subscriptionTier: {
        type: Number,
    },
    slug: {
        type: String
    }
},
{ timestamps: true }
)

const SubscriptionPlanModel = mongoose.model('golden-epics-subscriptionPlan', SubscriptionPlanSchema)
export default SubscriptionPlanModel