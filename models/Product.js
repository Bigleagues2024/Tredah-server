import mongoose from "mongoose";

const ProductSchema = new mongoose.Schema({
    sellerId: {
        type: String,
        required: [ true, 'User Id is required' ]
    },
    productId: {
        type: String,
        required: [ true, 'Product Id is required' ],
        unique: [ true, 'Product Id must be unique' ]
    },
    storeName: {
        type: String
    },
    name: {
        type: String,
    },
    about: {
        type: String
    },
    description: {
        type: String,
    },
    category: {
        type: Array
    },
    subCategory: {
        type: Array
    },
    displayPrice: {
        type: Number
    },
    weight: {
        type: String
    },
    weightValue: {
        type: String
    },
    totalQuantitySold: {
        type: Number
    },
    moq: {
        type: Number
    },
    mainImage:{
        type: String
    },
    media: {
        type: Array
    },
    variant: {
        type: Array  //would be an array of object
    },
    revenueGenerated: {
        type: Number,
        default: 0
    },
    likes: {
        type: Array,
        default: []
    },
    quantityInStock: {
        type: Number,
    },
    noOfSales: {
        type: Number,
        default: 0
    },
    inStock: {
        type: Boolean,
        default: true
    },
    active: {
        type: Boolean,
        default: true
    },
    blocked: {
        type: Boolean,
        default: false
    },
    blockedReason: {
        type: String
    }
},
{ timestamps: true }
)

const ProductModel = mongoose.model('product', ProductSchema)
export default ProductModel