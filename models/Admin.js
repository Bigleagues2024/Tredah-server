import mongoose from 'mongoose'
import bcryptjs from 'bcryptjs'
import jsonwebtoken from 'jsonwebtoken'
import crypto from 'crypto'

const AdminSchema = new mongoose.Schema({
    adminId: {
        type: String,
        required: [ true, 'Admin id is required' ],
        unique: [ true, 'Admin Id must be unique' ]
    },
    name: {
        type: String
    },
    mobileNumber: {
        type: String
    },
    email: {
        type: String,
        required: [ true, 'Email address is required' ],
        unique: [ true, 'Email must be unique']
    },
    profileImg: {
        type: String
    },
    accountType: {
        type: String,
        default: 'admin'
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
        },
        date: {
            type: Date
        }
    }],
    lastLogin: {
        type: Date
    },
    status: {
        type: String,
    },
    dob: {
        type: String,
    },
    timezone: {
        type: String,
    },
    bio: {
        type: String,
    },
    country: {
        type: String
    },

    password: {
        type: String
    },
    isBlocked: {
        type: Boolean,
        default: false
    },
    isActive: {
        type: Boolean,
        default: false,
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
    permissions: {
        type: Array
    },//admin superadmin
    role: {
        type: String,
        enum: ['Admin', 'Manager', 'Staff']
    },
    roleDescription: {
        type: String,
    },
    rootAdmin: {
        type: Boolean,
        default: false
    },

    resetPasswordToken: String,
    resetPasswordExpire: Date,
},
{ timestamps: true }
)

AdminSchema.pre('save', async function(next) {
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

AdminSchema.methods.matchPassword = async function(password) {
    return await bcryptjs.compare(password, this.password)
}

AdminSchema.methods.getAccessToken = function(){
    return jsonwebtoken.sign({ id: this.adminId, accountType: this?.accountType }, process.env.JWT_ACCESS_TOKEN_SECRET, { expiresIn: process.env.JWT_ACCESS_TOKEN_EXPIRE})
}

AdminSchema.methods.getRefreshToken = function(){
    return jsonwebtoken.sign({ id: this._id, email: this.email, adminId: this.adminId }, process.env.JWT_REFRESH_TOKEN_SECRET, { expiresIn: process.env.JWT_REFRESH_TOKEN_EXPIRE})
}

AdminSchema.methods.getPasswordToken = function(){
    const resetToken = crypto.randomBytes(20).toString('hex');

    this.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex')
    this.resetPasswordExpire = Date.now() + 15 * ( 60 * 1000 )

    return resetToken
}

const AdminModel = mongoose.model('admin', AdminSchema)
export default AdminModel