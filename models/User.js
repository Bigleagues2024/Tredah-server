import mongoose from 'mongoose'
import bcryptjs from 'bcryptjs'
import jsonwebtoken from 'jsonwebtoken'
import crypto from 'crypto'

const UserSchema = new mongoose.Schema({
    /**GENERAL */
    name: {
        type: String,
    },
    email: {
        type: String,
        required: [ true, 'Email address is required' ]
    },
    mobileNumber: {
        type: String,
        //required: [ true, 'Mobile number is required' ]
    },
    accountType: {
        type: String,
        default: 'user'
    },
    userType: {
        type: String,
        enum: ['seller', 'buyer']
    },
    userId: {
        type: String,
        required: [true, 'User id is required'],
        unique: [ true, 'User Id must be unique' ]
    },
    lastLoginInfo: [{
        device: {
            type: String,
        },
        location: {
            type: String
        },
        deviceType: {
            type: String
        }
    }],
    lastLogin: {
        type: Date
    },
    dob: {
        type: String
    },
    profileImg: {
        type: String
    },
    accountNumber: {
        type: String,
    },
    accountName: {
        type: String
    },
    bankName: {
        type: String
    },
    isStoreActive: {
        type: Boolean,
        default: false
    },
    productCount: {
        type: Number,
        default: 0
    },
    savedProducts: {
        type: Array,
        default: []
    },
    savedSeller: {
        type: Array,
        default: []
    },
    /**WALLET */
    wallet: {
        type: Number,
        default: 0
    },
    

    /**SERVER ONLY */
    password: {
        type: String
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

    /**SUB */
    subscriptionType: {
        type: String, //free or sub teirs
        default: 'free'
    },
    subscriptionId: {
        type: String
    },
    subscriptionTier: {
        type: Number,
        default: 1,
    },
    subscriptionPriceId: {
        type: String
    },
    subscriptionStartDate: {
        type: Date
    },
    subscriptionEndDate: {
        type: Date
    },
    customerCode: {
        type: String
    },
    subscriptionCode: {
        type: String
    },

    /**PASSWORD REQ TOKENS */
    resetPasswordToken: String,
    resetPasswordExpire: Date,
},
{ timestamps: true }
)

UserSchema.pre('save', async function(next) {
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

UserSchema.methods.matchPassword = async function(password) {
    return await bcryptjs.compare(password, this.password)
}

UserSchema.methods.getAccessToken = function(){
    return jsonwebtoken.sign({ id: this.userId, accountType: this?.accountType }, process.env.JWT_ACCESS_TOKEN_SECRET, { expiresIn: process.env.JWT_ACCESS_TOKEN_EXPIRE})
}

UserSchema.methods.getRefreshToken = function(){
    return jsonwebtoken.sign({ id: this._id, email: this.email, mobileNumber: this.mobileNumber }, process.env.JWT_REFRESH_TOKEN_SECRET, { expiresIn: process.env.JWT_REFRESH_TOKEN_EXPIRE})
}

UserSchema.methods.getPasswordToken = function(){
    const resetToken = crypto.randomBytes(20).toString('hex');

    this.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex')
    this.resetPasswordExpire = Date.now() + 15 * ( 60 * 1000 )

    return resetToken
}

const UserModel = mongoose.model('user', UserSchema)
export default UserModel