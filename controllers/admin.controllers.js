import { sendNewLoginEmail, sendPasswordOtpEmail } from "../middleware/mailTemplate/mailService/mailTemplate"
import { generateOtp, sendResponse, stringToNumberArray } from "../middleware/utils"
import AdminModel from "../models/Admin.js"
import RefreshTokenModel from "../models/RefreshToken.js"
import moment from "moment";
import crypto from 'crypto'
import { sendForgotPasswordEmail, sendNewLoginEmail, sendOtpEmail, sendPasswordOtpEmail, sendWelcomeEmail } from "../middleware/mailTemplate/mailService/mailTemplate.js";
import { generateOtp, generateUniqueCode, maskEmail, sendResponse, stringToNumberArray, validatePassword } from "../middleware/utils.js"
import OtpModel from "../models/Otp.js";
import AdminNotificationModel from "../models/AdminNotification.js";

const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

const MAX_LOGIN_ATTEMPTS = 4
const SUSPENSION_TIME = 6 * 60 * 60 * 1000
const roleOptions = ['Admin', 'Manager', 'Staff']

//create admin user
export async function createAdminUser(req, res) {
    const { adminId: aId, name: aName, role: aRole } = req.user
    const { email, name, role, permissions, mobileNumber, roleDescription } = req.body

    if(!email) return sendResponse(res, 400, false, null, 'Email address is required')
    if(!name) return sendResponse(res, 400, false, null, 'User name is required')
    if(!role) return sendResponse(res, 400, false, null, 'User role is required')
    if(!emailRegex.test(email)) return sendResponse(res, 400, false, null, 'Invalid email address')
    if(!roleOptions.includes(role)) return sendResponse(res, 400, false, null, 'Invalid role option')

    if (
        !Array.isArray(permissions) ||                 // must be an array
        permissions.length === 0 ||                    // must not be empty
        !permissions.every((p) => typeof p === 'string' && p.trim() !== '') // all must be non-empty strings
    ) {
        return sendResponse(res, 400, false, null, 'Permission must be a non-empty array of strings');
    }

    try {
        const generateUserId = await generateUniqueCode(9)
        const adminId = `TRD${generateUserId}ADIM`
        const getCode = await generateUniqueCode(4)
        
        const staffExist = await AdminModel.findOne({ email })
        if(staffExist) return sendResponse(res, 409, false, null, 'User with this email already exist')
        const newPassword = `${userId}&${getCode}`

        const newAdminUser = await AdminModel.create({
            adminId,
            name,
            mobileNumber,
            email,
            password: newPassword,
        })

        //sendEmail to admin
        await sendNewStaffEmail({
            email,
            name,
            title: `Admin Account created | Treadah`,
            profile: { userId, password: newPassword },
            store: 'Admin Portal'
        })

        await AdminNotificationModel.create({
            adminId: newAdminUser?.adminId,
            notification: 'Admin Account created: Welcome to Tredah Admin Portal',
        })

        await AdminNotificationModel.create({
            notification: `New admin user ${name} created by ${aName} (${aRole})`,
        })

        sendResponse(res, 201, true, null, 'Admin user created successfully')
    } catch (error) {
        console.log('UNABLE TO CREATE ADMIN USER', error)
        sendResponse(res, 500, false, null, 'Unable to create admin user')
    }
}

//request otp
export async function requestOtp(req, res) {
    const { adminId } = req.user

    try {
        let getUser = null
        getUser = await AdminModel.findOne({ adminId: adminId })
        if(!getUser) return sendResponse(res, 404, false, null, 'User with this id does not exist')

        //create otp and send to user
        const getOtpCode = await generateOtp({  mobileNumber: getUser?.mobileNumber, email: getUser?.email, length: 4, accountType: 'user' })
        const codeArray = stringToNumberArray(getOtpCode)
        sendPasswordOtpEmail({
            email: getUser?.email,
            name: getUser?.name || 'Admin',
            code: codeArray
        })

        //mask email address
        const hideEmail = maskEmail(getUser?.email)
        sendResponse(res, 200, true, hideEmail, `Enter the OTP sent to. ${hideEmail}8 to continue. The code will expire in 15min ${process.env.BUILD_MODE === 'DEV' ? `CODE: ${getOtpCode}` : ``}`)
    } catch (error) {
        console.log('UNABLE TO REQUEST OTP CODE', error)
        sendResponse(res, 500, false, null, 'Unable to request otp code')
    }
}

//login
export async function login(req, res) {
    const { email, password }  = req.body
    const { country, region, city, deviceType, deviceInfo } = req.location || {}
    if(!email) return sendResponse(res, 400, false, null, 'Email address is required')
    if(!emailRegex.test(email)) return sendResponse(res, 400, null, 'Invalid email address')
    if(!password) return sendResponse(res, 400, false, null, 'Password is required')
        
    try {
        let getUser = null
        getUser = await AdminModel.findOne({ email })
        
        if(!getUser) return sendResponse(res, 404, false, null, 'Invalid Credentials')

        if(!getUser?.verified){
            //create cookies tredahadminid
            res.cookie('tredahadminid', getUser?.adminId, {
                httpOnly: true,
                sameSite: 'None',
                secure: true,
                maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
            });
            sendResponse(res, 403, false, { verified: getUser?.verified }, 'Account is not yet verified')
            return
        }
        if(getUser?.isBlocked){
            sendResponse(res, 403, false, null, 'Account has been blocked')
            return
        }

        //check if user is still in the six hours of suspension
        if (getUser.accountSuspended && getUser.temporaryAccountBlockTime) {
            const timeDiff = Date.now() - new Date(getUser.temporaryAccountBlockTime).getTime();
            if (timeDiff < SUSPENSION_TIME) {
                const remainingTime = Math.ceil((SUSPENSION_TIME - timeDiff) / (60 * 1000)); // in minutes
                return sendResponse(res, 403, false, null, `Account temporarily blocked. Try again in ${remainingTime} minutes.`);
            } else {
                // Reset suspension if time has passed
                getUser.accountSuspended = false;
                getUser.temporaryAccountBlockTime = null;
                getUser.noOfLoginAttempts = 0;
                await getUser.save();
            }
        } else {
            // Reset suspension if time has passed
            getUser.accountSuspended = false;
            getUser.temporaryAccountBlockTime = null;
            getUser.noOfLoginAttempts = 0;
            await getUser.save();
        }

        //validate password
        const validatePassword = await getUser.matchPassword(password)
        //console.log('validatePassword', validatePassword)
        if(!validatePassword){
            getUser.noOfLoginAttempts += 1
            await getUser.save()
            if(getUser.noOfLoginAttempts >= MAX_LOGIN_ATTEMPTS){
                getUser.accountSuspended = true
                getUser.temporaryAccountBlockTime = new Date(); // Set suspension start time
                await getUser.save();
                return sendResponse(res, 403, false, null, `Too many failed attempts. Your account is blocked for 6 hours.`);
            } else {
                return sendResponse(res, 403, false, null, 'Wrong email or password', `${MAX_LOGIN_ATTEMPTS - getUser.noOfLoginAttempts} login attempts left`)
            }

        } else {
            getUser.accountSuspended = false
            getUser.noOfLoginAttempts = 0
            getUser.temporaryAccountBlockTime = null
            getUser.lastLogin = Date.now()
            await getUser.save();
        }

        //save user latest info
        getUser.lastLoginInfo.unshift({
            device: deviceInfo,
            location: `${city} ${region} ${country}`,
            deviceType: deviceType
        });

        // Limit history to the last 5 logins
        getUser.lastLoginInfo = getUser.lastLoginInfo.slice(0, 5);
        await getUser.save();

        //send login email notification
        const loginTime = moment(getUser.lastLogin, 'x'); // Convert timestamp to Moment.js date
        
        sendNewLoginEmail({
            email: getUser?.email,
            name: `${getUser?.name}`,
            time: loginTime.format('YYYY-MM-DD HH:mm:ss'),
            device: getUser.lastLoginInfo[0]
        });

        //set auth cookie
        const accessToken = getUser.getAccessToken()
        const refreshToken = getUser.getRefreshToken()
        //refresh token
        const refreshTokenExist = await RefreshTokenModel.findOne({ accountId: getUser.adminId })
        if(refreshTokenExist){
            refreshTokenExist.refreshToken = refreshToken
            await refreshTokenExist.save()
        } else {
            await RefreshTokenModel.create({
                accountId: getUser?.adminId,
                refreshToken,
                userType: getUser?.userType,
                accountType: getUser?.accountType
            })
        }
        ///set and send cookies
        res.cookie('tredahoneadmintoken', accessToken, {
            httpOnly: true,
            sameSite: 'None',
            secure: true,
            maxAge: 3 * 24 * 60 * 60 * 1000, // 3 days
        });
        res.cookie('trdahoneadminauthid', getUser?.adminId, {
            httpOnly: true,
            sameSite: 'None',
            secure: true,
            maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        });
        //send user data
        const { password: userPassword, verified, isBlocked, accountSuspended, noOfLoginAttempts, temporaryAccountBlockTime, resetPasswordToken, resetPasswordExpire, _id, ...userData } = getUser._doc;

        const data = {
            ...userData,
        }
        sendResponse(res, 201, true, data, 'Login Successful')
    } catch (error) {
        console.log('UNABLE TO LOGIN USER', error)
        sendResponse(res, 500, false, null, 'Unable to process login request')
    }
}

//forgot password
export async function forgotPassword(req, res) {
    const { email } = req.body
    if(!email) return sendResponse(res, 400, false, null, 'Email address is required')
    if(!emailRegex.test(email)) return sendResponse(res, 400, false, null, 'Invalid email address')

    try {
        const getUser = await AdminModel.findOne({ email })
        if(!getUser) return sendResponse(res, 404, false, null, 'Invalid email address')

        //generate  forgot password
        const resetToken = getUser.getPasswordToken()
        await getUser.save()
        console.log('REST', resetToken)

        sendForgotPasswordEmail({
            email: getUser?.email,
            name: getUser?.name,
            buttonLink: `${process.env.DEV_URL_ONE}/admin/reset-password/${resetToken}`,
        })

        //create cookies tredahadminid
        res.cookie('tredahadminid', getUser?.adminId, {
            httpOnly: true,
            sameSite: 'None',
            secure: true,
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });

        //mask email address
        const hideEmail = maskEmail(email)
        sendResponse(res, 200, true, hideEmail, `Reset password link sent to ${hideEmail} Link is valid ${process.env.BUILD_MODE === 'DEV' ? `RESETTOKEN: ${resetToken}` : ``}`)
    } catch (error) {
        console.log('UNALE TO PROCESS FORGOT PASSWORD', error)
        sendResponse(res, 500, false, null, 'Unable to process forgot password request')
    }
}

//reset password
export async function resetPassword(req, res) {
    const { password, confirmPassword } = req.body
    const resetPasswordToken = crypto.createHash('sha256').update(req.params.resetToken).digest('hex')
    const accountId = req.cookies.tredahadminid;

    if(!password) return sendResponse(res, 400, false, null, 'password id required')
    if(!confirmPassword) return sendResponse(res, 400, false, null, 'confirm password is required')
    const verifyPassword = await validatePassword(password)
    if(!verifyPassword.success) return sendResponse(res, 400, false, null, verifyPassword.message)

    if(password !== confirmPassword) return sendResponse(res, 400, false, null, 'Password do not match')

    if(!accountId) return sendResponse(res, 403, false, 'Not Allowed')
    try {
        const getUser = await AdminModel.findOne({
            resetPasswordToken,
            resetPasswordExpire: { $gt: Date.now()}
        })

        if(!getUser) return sendResponse(res, 400, false, null, 'Invalid reset token')
        if(getUser.adminId !== accountId) return sendResponse(res, 400, false, 'Not Allowed')

        const passwordMatch = await getUser.matchPassword(password)
        if(passwordMatch) return sendResponse(res, 400, false, null, 'Old password must not match new password')
        
        getUser.password = password
        getUser.resetPasswordToken = null
        getUser.resetPasswordExpire = null
        await getUser.save()

        res.clearCookie(`tredahadminid`)

        sendResponse(res, 201, true, null, 'Passowrd reset success')
    } catch (error) {
        console.log('UNABLE TO RESET ADMIN PASSWORD', error)
        sendResponse(res, 500, false, null, 'Unable to reset user password')
    }

}

//verify access token
export async function verifyToken(req, res) {
    const accessToken = req.cookies.tredahoneadmintoken;
    const accountId = req.cookies.trdahoneadminauthid;

    try {
        if (accessToken) {
            try {
                const decoded = jwt.verify(accessToken, process.env.JWT_ACCESS_TOKEN_SECRET);

                if (decoded.accountType !== 'admin') {
                    return sendResponse(res, 403, false, null, 'Unauthorized access');
                }

                const user = await AdminModel.findOne({ adminId: decoded.id });
                if (!user) return sendResponse(res, 404, false, null, 'User not found');

                // Remove sensitive data before sending the response
                const { password, noOfLoginAttempts, temporaryAccountBlockTime, verified, accountSuspended, isBlocked, resetPasswordToken, resetPasswordExpire, _id, ...userData } = user._doc;
                return sendResponse(res, 200, true, userData, accessToken);
            } catch (error) {
                if (error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError') {
                    return handleTokenRefresh(res, accountId);
                }
                return sendResponse(res, 401, false, null, 'Invalid token');
            }
        } else if (accountId) {
            return handleTokenRefresh(res, accountId);
        }

        return sendResponse(res, 401, false, null, 'Unauthenticated');
    } catch (error) {
        console.error('UNABLE TO VERIFY TOKEN', error);
        return sendResponse(res, 500, false, null, 'Unable to verify token');
    }
}

async function handleTokenRefresh(res, accountId) {
    if (!accountId) return sendResponse(res, 401, false, null, 'Unauthenticated');

    const user = await AdminModel.findOne({ adminId: accountId });
    if (!user) return sendResponse(res, 404, false, null, 'User not found');

    const refreshTokenExist = await RefreshTokenModel.findOne({ accountId });
    if (!refreshTokenExist) return sendResponse(res, 401, false, null, 'Invalid refresh token');

    const newAccessToken = user.getAccessToken();
    res.cookie('tredahoneadmintoken', newAccessToken, {
        httpOnly: true,
        sameSite: 'None',
        secure: true,
        maxAge: 15 * 60 * 1000, // 15 minutes
    });

    const { password, noOfLoginAttempts, temporaryAccountBlockTime, verified, accountSuspended, isBlocked, resetPasswordToken, resetPasswordExpire, subscriptionPriceId, subscriptionId, _id, ...userData } = user._doc;
    return sendResponse(res, 200, true, userData, newAccessToken);
}

export async function signout(req, res) {
    const { adminId } = req.user || {}
    try {
        const getRefreshTokenToken = await RefreshTokenModel.findOne({ accountId: adminId })

        if(getRefreshTokenToken){
            const deleteToken = await RefreshTokenModel.findOneAndDelete({ accountId: adminId })
        }
        res.clearCookie(`tredahoneadmintoken`)
        res.clearCookie(`trdahoneadminauthid`)

        return sendResponse(res, 200, true, null, 'Signout success')
    } catch (error) {
        console.log('UNABLE TO SIGNOUT ACCOUNT', error)
        return sendResponse(res, 500, false, null, 'Unable to process signout')
    }
}

//update an admin
export async function updateAdmin(req, res) {
    const { adminId: aId } = req.user
    const { adminId } = req.params
    const { permissions, role, roleDescription, blocked } = req.body
    
    if(blocked && typeof blocked !== 'boolean') return sendResponse(res, 400, false, null, 'blocked value must be boolen')
    if (
        permissions &&
        !Array.isArray(permissions) || 
        !permissions.every((p) => typeof p === 'string' && p.trim() !== '')
    ) {
        return sendResponse(res, 400, false, null, 'Permission must be a non-empty array of strings');
    }

    try {
        const getAdmin = await AdminModel.findOne({ adminId: adminId })
        if(!getAdmin) return sendResponse(res, 404, false, null, 'Admin User not found')
        
        if(permissions) getAdmin.permissions = permissions
        if(role) getAdmin.role = role
        if(roleDescription) getAdmin.roleDescription = roleDescription
        if(blocked !== undefined) getAdmin.isBlocked = blocked

        await getAdmin.save()

        await AdminNotificationModel.create({
            notification: `Admin user ${getUser?.name} updated by ${aName} (${aRole})`,
        })

        const { password: userPassword, temporaryAccountBlockTime, _id, __v, ...userData } = getAdmin._doc;
        sendResponse(res, 200, true, userData, 'Admin user updated successfully')
    } catch (error) {
        console.log('UNABLE TO UPDATE ADMIN', error)
        sendResponse(res, 500, false, null, 'Unable to update admin user')
    }
}

//get all admin user
export async function getAdmins(req, res) {
  const { limit = 10, page = 1 } = req.query;

  try {
    const skip = (page - 1) * limit;

    const admins = await AdminModel.find()
      .select("-password -__v -resetToken") // hide sensitive fields
      .skip(skip)
      .limit(Number(limit))
      .sort({ createdAt: -1 }); // newest first

    const total = await AdminModel.countDocuments();

    sendResponse(res, 200, true, {
      admins,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / limit),
      },
    }, "Admin users fetched successfully");
  } catch (error) {
    console.log("UNABLE TO GET ADMIN USERS", error);
    sendResponse(res, 500, false, null, "Unable to get admin users");
  }
}

// ✅ Get a single admin user
export async function getAdmin(req, res) {
  const { adminId } = req.params;

  try {
    if (!adminId) {
      return sendResponse(res, 400, false, null, "Admin ID is required");
    }

    const admin = await AdminModel.findOne({ adminId }).select("-password -__v");

    if (!admin) {
      return sendResponse(res, 404, false, null, "Admin user not found");
    }

    const { password: userPassword, temporaryAccountBlockTime, _id, __v, ...userData } = admin._doc;
    sendResponse(res, 200, true, userData, "Admin user fetched successfully");
  } catch (error) {
    console.log("UNABLE TO GET ADMIN USER", error);
    sendResponse(res, 500, false, null, "Unable to get admin user");
  }
}

//delete admin user
export async function deleteAdmin(req, res) {
    const { adminId: aId, } = req.user
    const { adminId } = req.params

    try {
        const getAdmin = await AdminModel.findOneAndDelete({ adminId })
        if(!getAdmin) return sendResponse(res, 404, false, null, 'Admin user not found')

        sendResponse(res, 200, true, null, 'Admin user deleted')
    } catch (error) {
        console.log('UNABLE TO DELETE ADMIN USER ACCOUNT')
        sendResponse(res, 500, false, null, 'Unable to delete admin user account')
    }
}

/****** */
//get profile
export async function getProfile(req, res) {
    const { adminId } = req.user

    try {
        const getAdmin = await AdminModel.findOne({ adminId })

        const { password: userPassword, verified, isBlocked, accountSuspended, noOfLoginAttempts, temporaryAccountBlockTime, resetPasswordToken, resetPasswordExpire, _id, ...userData } = getAdmin._doc;
        sendResponse(res, 200, true, userData, 'Admin profile fetched')
    } catch (error) {
        console.log('UNABLE TO GET ADMIN USER PROFILE', error)
        sendResponse(res, 500, false, null, 'Unable to get user profile')
    }
}

//update profile
export async function updateProfile(req, res) {
    const { adminId } = req.user
    const { name, phoneNumber, profileImg, dob, timezone, bio, country } = req.body

    try {
        const getAdmin = await AdminModel.findOne({ adminId })

        if(name) getAdmin.name = name
        if(phoneNumber) getAdmin.phoneNumber = phoneNumber
        if(profileImg) getAdmin.profileImg = profileImg
        if(dob) getAdmin.dob = dob
        if(timezone) getAdmin.timezone = timezone
        if(bio) getAdmin.bio = bio
        if(country) getAdmin.country = country
        await getAdmin.save()
        const { password: userPassword, verified, isBlocked, accountSuspended, noOfLoginAttempts, temporaryAccountBlockTime, resetPasswordToken, resetPasswordExpire, _id, ...userData } = getAdmin._doc;
        sendResponse(res, 200, true, userData, 'Admin profile updated')
    } catch (error) {
        console.log('UANBLE TO UPDATE ADMIN PROFILE', error)
        sendResponse(res, 500, false, null, 'Unable to update admin profile')
    }
}

//change password
export async function updatePassword(req, res) {
    const { adminId } = req.user
    const { otp, password } = req.body
    if(!otp) return sendResponse(res, 400, false, null, 'Otp is required')
    if(!password) return sendResponse(res, 400, false, null, 'Password is required')

    try {
        const getOtp = await OtpModel.findOne({ otp })
        if(!getOtp) return sendResponse(res, 400, false, null, 'Invalid Otp')

        const verifyPassword = await validatePassword(password)
        if(!verifyPassword.success) return sendResponse(res, 400, false, null, verifyPassword.message)
        let getUser
        getUser = await AdminModel.findOne({ adminId })
    
        const validateNewPassword = await getUser.matchPassword(password)
        if(validateNewPassword) return sendResponse(res, 400, false, null, 'Please use a different new password')

        getUser.password = password
        await getUser.save()
        
        sendResponse(res, 200, true, null, 'Password updated successful')
    } catch (error) {
        console.log('UNABLE TO UPDATE ADMIN PASSWORD', error)
        sendResponse(res, 500, false, null, 'Unable to update password')
    }
}
