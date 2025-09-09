import mongoose from "mongoose";

const StoreSchema = new mongoose.Schema({
    sellerId: {
        type: String, //vendor id,
        required: [ true, 'Seller Id is required' ],
        unique: [ true, 'Seller Id already exist' ]
    },
    storeImg: {
        type: String,
    },
    name: {
        type: String,
    },
    about: {
        type: String,
    },
    description: {
        type: String,
    },
    businessAddress: {
        type: String
    },
    socialLink: {
        type: String
    },
    active: {
        type: Boolean,
        default: true,
    },

    followers: {
        type: Array,
        default: []
    },
    likes: {
        type: Array,
        default: []
    },
    reviews: [{
        userId: {
            type: String,
        },
        name: {
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
    }]
},
{ timestamps: true }
)

const StoreModel = mongoose.model('store', StoreSchema)
export default StoreModel