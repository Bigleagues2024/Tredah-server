import mongoose from "mongoose";

const EscrowReleaseSchema = new mongoose.Schema({
    orderId: {
        type: String,
        required: [ true, 'Order Id is required' ]
    },
    buyerId: {
        type: String,
        required: [ true, 'Buyer Id is required' ]
    }
},
{ 
    timestamps: true
 }
)

const EscrowReleaseModel = mongoose.model('escrowRelease', EscrowReleaseSchema)
export default EscrowReleaseModel