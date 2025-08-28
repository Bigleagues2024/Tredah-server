import mongoose from "mongoose";

const RefreshTokenSchema = new mongoose.Schema({
    accountId: {
        type: String,
        required: [ true, 'Account Id is required' ],
        unique: [ true, 'Account Id already exist' ]
    },
    refreshToken: {
        type: String,
    },
    refreshTokenExpire: {
        type: Date,
        expires: '30d' // Automatically deletes this field after 30 days
    },
    userType: {
        type: String, //available if user value: seller || buyer
    },
    accountType: {
        type: String,
        enum: ['user', 'admin']
    }
},
{ timestamps: true}
)

const RefreshTokenModel = mongoose.model('refreshToken', RefreshTokenSchema)
export default RefreshTokenModel