import mongoose from "mongoose";

const WithdrawalRequestSchema = new mongoose.Schema({
    userId: {
        type: String,
        
    },
    amount: {
        type: Number,
        default: 0
    }
},
{
    timestamps: true
}
)

const WithdrawalRequestModel = mongoose.model('withdrawalRequest', WithdrawalRequestSchema)
export default WithdrawalRequestModel