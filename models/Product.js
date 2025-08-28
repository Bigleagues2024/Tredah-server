import mongoose from "mongoose";

const ProductsSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: [ true, 'User Id is required' ]
    },
    productId: {
        type: String,
        required: [ true, 'Product Id is required' ],
        unique: [ true, 'Product Id must be unique' ]
    },
    title: {
        title: String,
    },
    description: {
        type: String,
    },
    category: {
        type: Array
    },
    subCategory: {
        type: String
    },
    displayPrice: {
        type: Number
    },
    weight: {
        type: String
    },
    weightVaue: {
        type: String
    },
    moq: {
        type: Number
    },
    media: {
        type: Array
    },
    variant: {
        type: Array  //would be an array of object
    },
},
{ timestamps: true }
)

const ProductModel = mongoose.model('product', ProductsSchema)
export default ProductModel