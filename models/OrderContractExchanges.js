import mongoose from "mongoose";

const OrderContractExchangesSchema = new mongoose.Schema({
    orderId: {
        type: String,
        required: [ true, 'Order Id is required' ],
        unique: [ true, 'Order Id is unique' ],
    },
    contractId: {
        type: String,
        required: [ true, 'Contract Id is required' ],
        unique: [ true, 'Contract Id is unique' ],
    },
    sellerId: {
        type: String,
        required: [ true, 'Seller Id is required'],
    },
    buyerId: {
        type: String,
        required: [ true, 'Buyer Id is required'],
    },
    chats: [
        {
            message: {
                type: String
            },
            from: {
                type: String
            },
            mediaLink: {
                type: String
            },
            mediaType: {
                type: String
            },
            senderId: {
                type: String
            },
            profileImg: {
                type: String
            },
            name: {
                type: String
            },
            editedAt: {
                type: Date
            }
        }
    ]
},
{ timestamps: true }
)

const OrderContractExchangesModel = mongoose.model('orderContractExchanges', OrderContractExchangesSchema)
export default OrderContractExchangesModel