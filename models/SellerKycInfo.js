import mongoose from "mongoose";

const SellerKycInfoSchema = new mongoose.Schema({
    accountId: {
        type: String,
        required: [ true, 'Account Id is required' ],
        unique: [ true, 'Account Id already exist' ]
    },
    sellerAccountType: {
        type: String,
        enum: ['personal', 'business']
    },
    nin: {
        type: String
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
    businessEmail: {
        type: String
    },
    taxId: {
        type: String
    },
    businessCategory: {
        type: String
    },
    socialLink: {
        type: String
    },
    entityType: {
        type: String
    },
    isActive: {
        type: Boolean,
        default: false
    }
},
{ timestamps: true}
)

const SellerKycInfoModel = mongoose.model('sellerKycInfo', SellerKycInfoSchema)
export default SellerKycInfoModel