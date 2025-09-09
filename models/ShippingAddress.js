import mongoose from "mongoose";

const ShippingAddressSchema = new mongoose.Schema({
    userId:{
        type: String,
        required: [ true, 'User id is required']
    },
    name: {
        type: String
    },
    phoneNumber: {
        type: String
    },
    addressLine:  {
        type: String
    },
    addressLineTwo: {
        type: String
    },
    country: {
        type: String
    },
    state: {
        type: String
    },
    city: {
        type: String
    },
    postalCode: {
        type: String
    }
},
{ timestamps: true }
)

const ShippingAddressModel = mongoose.model('shippingAddress', ShippingAddressSchema)
export default ShippingAddressModel