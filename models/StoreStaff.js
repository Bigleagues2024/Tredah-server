import mongoose from "mongoose";
import bcryptjs from 'bcryptjs'
import jsonwebtoken from 'jsonwebtoken'
import crypto from 'crypto'

const StoreStaffSchema = new mongoose.Schema({
    storeId: {
        type: String,
        required: [ true, 'Store Id is required' ]
    },
    userId: {
        type: String,
        required: [ true, 'Staff UserId is required' ],
        unique: [ true, 'Staff UserId must be unique' ],
    },
    name: {
        type: String,
        required: [ true, 'Staff name is required' ]
    },
    email: {
        type: String,
        required: [ true, 'Email address is required' ],
        unique: [ true, 'Email address must be unique' ]
    },
    accountType: {
        type: String,
        default: 'storeStaff'
    },
    userType: {
        type: String,
        default: 'seller',
        enum: ['seller'],
    },
    permission: {
        type: Array,
        default: []
    },
    profileImg: {
        type: String
    },
    phoneNumber: {
        type: String
    },


    /**SERVER ONLY */
    password: {
        type: String,
        required: [ true, 'Password is required' ]
    },
    verified: {
        type: Boolean,
        default: false
    },
    isOnBoardingComplete: {
                type: Boolean,
        default: false
    },
    isActive: {
        type: Boolean,
        default: true
    },
    isBlocked: {
        type: Boolean,
        default: false
    },
    accountSuspended: {
        type: Boolean,
        default: false
    },
    noOfLoginAttempts: {
        type: Number,
        default: 0,
    },
    temporaryAccountBlockTime: {
        type: Date,
    },

    /**PASSWORD REQ TOKENS */
    resetPasswordToken: String,
    resetPasswordExpire: Date,
},
{ timestamps: true }
)

StoreStaffSchema.pre('save', async function(next) {
    if(!this.isModified('password')){
        return next();
    }

    try {
        const salt = await bcryptjs.genSalt(10)
        this.password = await bcryptjs.hash(this.password, salt)
        next()
    } catch (error) {
        console.log('UNABLE TO HASH PASSWORD', error)
        next(error)
    }
})

StoreStaffSchema.methods.matchPassword = async function(password) {
    return await bcryptjs.compare(password, this.password)
}

StoreStaffSchema.methods.getAccessToken = function(){
    return jsonwebtoken.sign({ id: this.userId, accountType: this?.accountType }, process.env.JWT_ACCESS_TOKEN_SECRET, { expiresIn: process.env.JWT_ACCESS_TOKEN_EXPIRE})
}

StoreStaffSchema.methods.getRefreshToken = function(){
    return jsonwebtoken.sign({ id: this._id, email: this.email }, process.env.JWT_REFRESH_TOKEN_SECRET, { expiresIn: process.env.JWT_REFRESH_TOKEN_EXPIRE})
}

StoreStaffSchema.methods.getPasswordToken = function(){
    const resetToken = crypto.randomBytes(20).toString('hex');

    this.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex')
    this.resetPasswordExpire = Date.now() + 15 * ( 60 * 1000 )

    return resetToken
}

const StoreStaffModel = mongoose.model('storeStaff', StoreStaffSchema)
export default StoreStaffModel