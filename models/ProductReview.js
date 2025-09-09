import mongoose from "mongoose";

const ProductReviewSchema = new mongoose.Schema({
    productId: {
        type: String,
        required: [ true, 'Product id is required' ],
        unique: [ true, 'Product Id is unique' ]
    },
    reviews: [
        {
            userId: {
                type: String
            },
            name: {
                type: String,
            },
            profileImg: {
                type: String
            },
            review: {
                type: String
            },
            rating: {
                type: Number,
                min: 0,
                max: 5,
                default: 0
            },
            date: {
                type: Date
            }
        }
    ]
},
{ timestamps: true}
)

const ProductReviewModel = mongoose.model('productReview', ProductReviewSchema)
export default ProductReviewModel