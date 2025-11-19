import mongoose from "mongoose"

const RefundRequestSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: [ true, 'User Id is required' ]
    },
    orderId: {
        type: String,
        required: [ true, 'order Id is required' ]
    },
    message: [{
        message: {
            type: String
        },
        user: {
            type: Boolean,
            default: true
        }
    }],
    status: {
        type: String,
        enum: ['open', 'closed']
    },
    isCompleted: {
        type: Boolean,
        default: false
    }
},
{ 
    timestamps: true
 }
)

const RefundRequestModel = mongoose.model('revenue', RefundRequestSchema)
export default RefundRequestModel