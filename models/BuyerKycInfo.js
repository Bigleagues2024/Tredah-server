import mongoose from "mongoose";

const BuyerKycInfoSchema = new mongoose.Schema({
    accountId: {
        type: String,
        required: [ true, 'Account Id is required' ],
        unique: [ true, 'Account Id already exist' ]
    },
    buyerAccountType: {
        type: String,
        enum: ['business', 'personal']
    },
    address: {
        type: String
    },
    companyName: {
        type: String,
    },
    businessType: {
        type: String,
    },
    businessRegistrationNumber: {
        type: String,
    },
    businessAddress: {
        type: String
    },
    businessCategory: {
        type: String
    },
    businessImage: {
        type: String
    },
    socialLink: {
        type: String
    },
    isActive: {
        type: Boolean,
        default: false
    }
},
{ timestamps: true}
)

const BuyerKycInfoModel = mongoose.model('buyerKycInfo', BuyerKycInfoSchema)
export default BuyerKycInfoModel