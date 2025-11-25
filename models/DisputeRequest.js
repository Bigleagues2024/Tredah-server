import mongoose from "mongoose"

const DisputeRequestSchema = new mongoose.Schema({
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
        default: 'open',
        enum: ['open', 'closed'],
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

const DisputeRequestModel = mongoose.model('disputeRequest', DisputeRequestSchema)
export default DisputeRequestModel