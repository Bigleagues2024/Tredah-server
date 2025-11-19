import mongoose from "mongoose"

const RevenueSchema = new mongoose.Schema({
    amount: {
        type: Number,
        default: 0
    },
    source: {
        type: String,
        enum: [ 'subscription', 'sales' ]
    },
    userId: {
        type: String
    },
    sourceId: {
        type: String
    }
},
{ 
    timestamps: true
 }
)

const RevenueModel = mongoose.model('revenue', RevenueSchema)
export default RevenueModel