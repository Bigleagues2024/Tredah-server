import { sendForgotPasswordEmail, sendNewLoginEmail, sendOtpEmail, sendPasswordOtpEmail, sendWelcomeEmail } from "../middleware/mailTemplate/mailService/mailTemplate.js";
import { generateOtp, generateUniqueCode, maskEmail, sendResponse, stringToNumberArray, validateAsianNumber, validateNigeriaNumber, validatePassword } from "../middleware/utils.js"
import BuyerKycInfoModel from "../models/BuyerKycInfo.js";
import OtpModel from "../models/Otp.js";
import RefreshTokenModel from "../models/RefreshToken.js";
import SellerKycInfoModel from "../models/SellerKycInfo.js";
import UserModel from "../models/User.js";
import moment from "moment";
import crypto from 'crypto'
import { VASBusinessVerification } from "../middleware/VASBuisnessVerification.js";
import paystack from "../middleware/paystack.js";

const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const userTypeOptions = ['seller', 'buyer']
const sellerAccountTypeOptions = ['personal', 'business']
const buyerAccountTypeOptions = ['business', 'personal']

const MAX_LOGIN_ATTEMPTS = 4
const SUSPENSION_TIME = 6 * 60 * 60 * 1000

//register new user
export async function register(req, res) {
    const { email, password, confirmPassword, mobileNumber, userType, sellerAccountType, buyerAccountType } = req.body
    console.log(req.body)
    if(!email) return sendResponse(res, 400, false, null, 'Email address is required')
    if(!emailRegex.test(email)) return sendResponse(res, 400, false, null, 'Invalid email address')
    if(!mobileNumber) return sendResponse(res, 400, false, null, 'Mobile number is required')
    if(!password) return sendResponse(res, 400, false, null, 'Password is required')
    const verifyPassword = await validatePassword(password)
    if(!verifyPassword.success) return sendResponse(res, 400, false, null, verifyPassword.message)
    if(password != confirmPassword) return sendResponse(res, 400, false, null, 'Password and confirm password do not match')
    if(!userType) return sendResponse(res, 400, false, null, 'Provide a user type')
    if(!userTypeOptions.includes(userType.trim().toLowerCase())) return sendResponse(res, 400, false, null, 'Invalid user type')

    try {
        //check if user email exist or mobile number exist
        const emailExist = await UserModel.findOne({ email })
        if(emailExist) return sendResponse(res, 400, false, null, 'User with the email already exist')
        const numberExist = await UserModel.findOne({ mobileNumber })
        if(numberExist) return sendResponse(res, 400, false, null, 'User with this mobile number already exist')

        let newMobileNumber

        let customerCode
        //handle seller
        if(userType.trim().toLowerCase() === 'seller') {
            if(!sellerAccountTypeOptions.includes(sellerAccountType.trim().toLowerCase())) return sendResponse(res, 400, false, null, 'Invalid seller account type')
            //allow only nigeria number
            const verifyNumber = validateNigeriaNumber(mobileNumber)
            if(!verifyNumber.success) return sendResponse(res, 400, false, mobileNumber, verifyNumber.message)
            newMobileNumber = verifyNumber.number

        }

        //handle buyer
        if(userType.trim().toLowerCase() === 'buyer') {
            if(!buyerAccountTypeOptions.includes(buyerAccountType)) return sendResponse(res, 400, false, null, 'Invalid buyer account type')
            //allow only malaysia (asian countries)
            const verifyNumber = validateAsianNumber(mobileNumber)
            if(!verifyNumber.success) return sendResponse(res, 400, false, mobileNumber, verifyNumber.message)
            newMobileNumber = verifyNumber.number
        }

        const generateUserId = await generateUniqueCode(9)
        const userId = `TRD${generateUserId}`

        //create new user
        const newUser = await UserModel.create({
            email,
            mobileNumber: newMobileNumber,
            userType: userType.trim().toLowerCase(),
            password,
            userId
        })

        //create user corresponding account
        if(userType.trim().toLowerCase() === 'seller'){
            await SellerKycInfoModel.create({
                accountId: userId,
                sellerAccountType: sellerAccountType.trim().toLowerCase()
            })

            // Create Paystack customer
            const { data: customerRes } = await paystack.post("/customer", {
                email: newUser.email,
                first_name: newUser.email,
                last_name: "",
                phone: newMobileNumber,
            });

            // Save customer_code to user document
            newUser.customerCode = customerRes.data.customer_code;
            await newUser.save();
        } else {
            await BuyerKycInfoModel.create({
                accountId: userId,
                buyerAccountType: buyerAccountType
            })
        }

        //create otp and send to user
        const getOtpCode = await generateOtp({  mobileNumber: newMobileNumber, email, length: 4, accountType: 'user' })
        const codeArray = stringToNumberArray(getOtpCode)
        sendOtpEmail({
            email,
            name: 'User',
            code: codeArray
        })
        
        //create cookies tredahuserid
        res.cookie('tredahuserid', userId, {
            httpOnly: true,
            sameSite: 'None',
            secure: true,
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });

        //mask email address
        const hideEmail = maskEmail(email)
        sendResponse(res, 201, true, hideEmail, `User created otp email sent to ${hideEmail} to verify account ${process.env.BUILD_MODE === 'DEV' ? `CODE: ${getOtpCode}` : ''}`)
    } catch (error) {
        console.log('UNABLE TO CREATE A NEW USER ACCOUNT', error)
        sendResponse(res, 500, false, null, 'Unable to create new user account')
    }
}

//register new user via google
/**
 * create a tredahuserid and send via cookies
 * check if user exist login user else
 * recieve user email, name, userType, sellerAccountType, buyerAccountType
 * user proceed to onboarding screen
 */
export async function googleAuth(req, res) {
    
}

//resend otp
export async function resendOtp(req, res) {
    const tredahuserid = req.cookies.tredahuserid;
    if(!tredahuserid) return sendResponse(res, 404, false, null, 'User not found')

    try {
        const getUser = await UserModel.findOne({ userId: tredahuserid })
        if(!getUser) return sendResponse(res, 404, false, null, 'User with this id does not exist')

        //create otp and send to user
        const getOtpCode = await generateOtp({  mobileNumber: getUser?.mobileNumber, email: getUser?.email, length: 4, accountType: 'user' })
        const codeArray = stringToNumberArray(getOtpCode)
        sendOtpEmail({
            email: getUser?.email,
            name: getUser?.name || 'User',
            code: codeArray
        })

        //mask email address
        const hideEmail = maskEmail(getUser?.email)
        sendResponse(res, 200, true, hideEmail, `Verification Otp sent to ${hideEmail}. ${process.env.BUILD_MODE === 'DEV' ? `CODE: ${getOtpCode}` : ''}`)
    } catch (error) {
        console.log('UNABLE TO RESEND OTP CODE', error)
        sendResponse(res, 500, false, null, 'Unable to resend otp code')
    }
}

//request otp
export async function requestOtp(req, res) {
    const { userId } = req.user

    try {
        const getUser = await UserModel.findOne({ userId: userId })
        if(!getUser) return sendResponse(res, 404, false, null, 'User with this id does not exist')

        //create otp and send to user
        const getOtpCode = await generateOtp({  mobileNumber: getUser?.mobileNumber, email: getUser?.email, length: 4, accountType: 'user' })
        const codeArray = stringToNumberArray(getOtpCode)
        sendPasswordOtpEmail({
            email: getUser?.email,
            name: getUser?.name || 'User',
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

//verify otp
export async function verifyOtp(req, res) {
    const { otp } = req.body
    const tredahuserid = req.cookies.tredahuserid;
    if(!tredahuserid) return sendResponse(res, 404, false, null, 'No user id')
    if(!otp) return sendResponse(res, 400, false, null, 'OTP code is required')

    try {
        const getOtpData = await OtpModel.findOne({ otp })
        if(!getOtpData) return sendResponse(res, 400, false, null, 'Invalid OTP code')
        
        const getUser = await UserModel.findOne({ email: getOtpData?.email })
        if(!getUser) return sendResponse(res, 404, false, null, 'invalid OTP code')
        
        //check if userId is the same as tredahuserid
        if(tredahuserid !== getUser?.userId) return sendResponse(res, 405, false, null, 'Not allowed')
        getUser.verified = true
        await getUser.save()

        let sellerAccountType
        let buyerAccountType
        if(getUser?.userType === 'buyer') {
            const getBuyerAccount = await BuyerKycInfoModel.findOne({ accountId: getUser?.userId })
            buyerAccountType = getBuyerAccount?.buyerAccountType
        } else {
            const getSellerAccount = await SellerKycInfoModel.findOne({ accountId: getUser?.userId })
            sellerAccountType = getSellerAccount?.sellerAccountType
        }

        const userData = { email: getUser?.email, mobileNumber: getUser?.mobileNumber, userType: getUser?.userType, buyerAccountType, sellerAccountType }
        sendResponse(res, 200, true, userData, 'Otp verified successful')
    } catch (error) {
        console.log('UNABLE TO VERIFY OTP', error)
        sendResponse(res, 500, false, null, 'Unable to Verify OTP')
    }
}

//complete seller onboarding
export async function completeSellerOnboarding(req, res) {
    const tredahuserid = req.cookies.tredahuserid;
    const { sellerAccountType, name, email, mobileNumber, address, nin: ninValue, companyName, businessType, businessRegistrationNumber, entityType, businessAddress, businessCategory, businessEmail, taxId, socialLink } = req.body
    if(sellerAccountType) {
        if(!sellerAccountTypeOptions.includes(sellerAccountType)) return sendResponse(res, 400, false, null, 'Invalid seller account type')
    }
    if(!name) return sendResponse(res, 400, false, null, 'Name is required')
    if(!address) return sendResponse(res, 400, false, null, 'Address is not required')
    if(!ninValue) return sendResponse(res, 400, false, null, 'National Identity is required')
    
    try {
        let getUser
        if(tredahuserid) {
            getUser = await UserModel.findOne({ userId: tredahuserid })
        } else {
            getUser = await UserModel.findOne({ email })
        }
        if(!getUser) return sendResponse(res, 404, false, null, 'User does not exist')
        if(getUser?.userType === 'buyer') return sendResponse(res, 405, false, null, 'Not allowed')

        //if no mobile number (user signed up with google) update user mobile number
        if(!getUser?.mobileNumber) {
            if(!mobileNumber) return sendResponse(res, 400, false, null, 'Mobile Number is required')
            //allow only nigeria number
            const verifyNumber = validateNigeriaNumber(mobileNumber)
            if(!verifyNumber.success) return sendResponse(res, false, 400, mobileNumber, verifyNumber.message)
            getUser.mobileNumber = verifyNumber.number
            await getUser.save()
        }
        const getSeller = await SellerKycInfoModel.findOne({ accountId: getUser?.userId })
        if(!getSeller) return sendResponse(res, 404, false, null, 'Seller account does not exist')
        
        if(sellerAccountType === 'business' || getSeller?.sellerAccountType === 'business'){
            if(!companyName) return sendResponse(res, 400, false, null, 'Company name is required')
            if(!businessType) return sendResponse(res, 400, false, null, 'Business Type is required')
            if(!businessRegistrationNumber) return sendResponse(res, 400, false, null, 'Business Registration number is required')
            if(!businessAddress) return sendResponse(res, 400, false, null, 'Business address is required')
            if(!taxId) return sendResponse(res, 400, false, null, 'Business tax id is required')
            if(!socialLink) return sendResponse(res, 400, false, null, 'Business social link is required')
        
            //verify businessRegistrationNumber nin
            const verifyBusiness = await VASBusinessVerification({ regNum: businessRegistrationNumber, entityType: entityType })
        }

        getUser.name = name
        //getUser.isActive = true
        await getUser.save()

        //save seller account info
        if(sellerAccountType) getSeller.sellerAccountType = sellerAccountType
        if(ninValue) getSeller.nin = ninValue
        if(address) getSeller.address = address
        if(companyName) getSeller.companyName = companyName
        if(businessType) getSeller.businessType = businessType
        if(businessRegistrationNumber) getSeller.businessRegistrationNumber = businessRegistrationNumber
        if(businessAddress) getSeller.businessAddress = businessAddress
        if(businessEmail) getSeller.businessEmail = businessEmail
        if(taxId) getSeller.taxId = taxId
        if(businessCategory) getSeller.businessCategory = businessCategory
        if(socialLink) getSeller.socialLink = socialLink
        if(entityType) getSeller.entityType = entityType
        //getSeller.isActive = true
        await getSeller.save()

        //send welcome message
        sendWelcomeEmail({
            email: getUser?.email,
            name,
            buttonLink: `${process.env.DEV_URL_ONE}`,
        })


        //clear cookie
        res.clearCookie(`tredahuserid`)
        //set auth cookie
        const accessToken = getUser.getAccessToken()
        const refreshToken = getUser.getRefreshToken()
        //refresh token
        const refreshTokenExist = await RefreshTokenModel.findOne({ accountId: getUser.userId })
        if(refreshTokenExist){
            refreshTokenExist.refreshToken = refreshToken
            await refreshTokenExist.save()
        } else {
            await RefreshTokenModel.create({
                accountId: getUser?.userId,
                refreshToken,
                userType: getUser?.userType,
                accountType: getUser?.accountType
            })
        }
        ///set and send cookies
        res.cookie('tredahtoken', accessToken, {
            httpOnly: true,
            sameSite: 'None',
            secure: true,
            maxAge: 3 * 24 * 60 * 60 * 1000, // 3 days
        });
        res.cookie('tredahauthid', getUser?.userId, {
            httpOnly: true,
            sameSite: 'None',
            secure: true,
            maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        });
        //send user data
        const { password: userPassword, verified, isBlocked, accountSuspended, noOfLoginAttempts, temporaryAccountBlockTime, resetPasswordToken, resetPasswordExpire, subscriptionPriceId, subscriptionId, _id, ...userData } = getUser._doc;
        const { accountId, nin, ...sellerInfo } = getSeller._doc
        const data = {
            ...userData,
            ...sellerInfo
        }
        sendResponse(res, 201, true, data, 'Successful')
    } catch (error) {
        console.log('UNABLE TO COMPLETE ONBOARDING PROCESS', error)
        sendResponse(res, 500, false, null, 'Unable to complete onboarding process')
    }
}

//complete buyer onboarding
export async function completeBuyerOnboarding(req, res) {
    const tredahuserid = req.cookies.tredahuserid;
    const { buyerAccountType, name, email, mobileNumber, address, companyName, businessType, businessRegistrationNumber, businessAddress, businessCategory, taxId, socialLink } = req.body
    if(buyerAccountType) {
        if(!buyerAccountTypeOptions.includes(buyerAccountType)) return sendResponse(res, 400, false, null, 'Invalid buyer account type')
    }
    if(!name) return sendResponse(res, 400, false, null, 'Name is required')
    if(!address) return sendResponse(res, 400, false, null, 'Addresss is required')
    try {
        let getUser
        if(tredahuserid) {
            getUser = await UserModel.findOne({ userId: tredahuserid })
        } else {
            getUser = await UserModel.findOne({ email })
        }
        if(!getUser) return sendResponse(res, 404, false, null, 'User does not exist')
        if(getUser?.userType === 'seller') return sendResponse(res, 405, false, null, 'Not allowed')

        //if no mobile number (user signed up with google) update user mobile number
        if(!getUser?.mobileNumber) {
            if(!mobileNumber) return sendResponse(res, 400, false, null, 'Mobile Number is required')
            //allow only malaysia (asian countries)
            const verifyNumber = validateAsianNumber(mobileNumber)
            if(!verifyNumber.success) return sendResponse(res, false, 400, mobileNumber, verifyNumber.message)
            getUser.mobileNumber = verifyNumber.number
            await getUser.save()
        }
        const getBuyer = await BuyerKycInfoModel.findOne({ accountId: getUser?.userId })
        if(!getBuyer) return sendResponse(res, 404, false, null, 'Buyer account does not exist')
        
        //business account type is business verify business info
        if(buyerAccountType && buyerAccountType === 'business' || getBuyer?.buyerAccountType === 'business'){
            if(!companyName) return sendResponse(res, 400, false, null, 'Company name is required')
            if(!businessType) return sendResponse(res, 400, false, null, 'Business Type is required')
            if(!businessRegistrationNumber) return sendResponse(res, 400, false, null, 'Business Registration number is required')
            if(!businessAddress) return sendResponse(res, 400, false, null, 'Business address is required')
            if(!businessCategory) return sendResponse(res, 400, false, null, 'Business category is required')
        }

        getUser.name = name
        getUser.isActive = true
        await getUser.save()

        //save buyer account info
        if(buyerAccountType) getBuyer.buyerAccountType = buyerAccountType
        if(address) getBuyer.address = address
        if(companyName) getBuyer.companyName = companyName
        if(businessType) getBuyer.businessType = businessType
        if(businessRegistrationNumber) getBuyer.businessRegistrationNumber = businessRegistrationNumber
        if(businessAddress) getBuyer.businessAddress = businessAddress
        if(businessCategory) getBuyer.businessCategory = businessCategory
        if(taxId) getBuyer.taxId = taxId
        if(socialLink) getBuyer.socialLink = socialLink

        getBuyer.isActive = true
        await getBuyer.save()

        //send welcome message
        sendWelcomeEmail({
            email: getUser?.email,
            name,
            buttonLink: `${process.env.DEV_URL_ONE}`,
        })

        //clear cookie
        res.clearCookie(`tredahuserid`)
        //set auth cookie
        const accessToken = getUser.getAccessToken()
        const refreshToken = getUser.getRefreshToken()
        //refresh token
        const refreshTokenExist = await RefreshTokenModel.findOne({ accountId: getUser.userId })
        if(refreshTokenExist){
            refreshTokenExist.refreshToken = refreshToken
            await refreshTokenExist.save()
        } else {
            await RefreshTokenModel.create({
                accountId: getUser?.userId,
                refreshToken,
                userType: getUser?.userType,
                accountType: getUser?.accountType
            })
        }
        ///set and send cookies
        res.cookie('tredahtoken', accessToken, {
            httpOnly: true,
            sameSite: 'None',
            secure: true,
            maxAge: 3 * 24 * 60 * 60 * 1000, // 3 days
        });
        res.cookie('tredahauthid', getUser?.userId, {
            httpOnly: true,
            sameSite: 'None',
            secure: true,
            maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        });
        //send user data
        const { password: userPassword, verified, isBlocked, accountSuspended, noOfLoginAttempts, temporaryAccountBlockTime, resetPasswordToken, resetPasswordExpire, subscriptionPriceId, subscriptionId, _id, ...userData } = getUser._doc;
        const { accountId, ...buyerInfo } = getBuyer._doc
        const data = {
            ...userData,
            ...buyerInfo
        }
        sendResponse(res, 201, true, data, 'Successful')
    } catch (error) {
        console.log('UNABLE TO COMPLETE ONBOARDING PROCESS', error)
        sendResponse(res, 500, false, null, 'Unable to complete onboarding process')
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
        const getUser = await UserModel.findOne({ email })
        if(!getUser) return sendResponse(res, 404, false, null, 'Invalid Credentials')

        if(!getUser?.verified){
            //create cookies tredahuserid
            res.cookie('tredahuserid', getUser?.userId, {
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
        const refreshTokenExist = await RefreshTokenModel.findOne({ accountId: getUser.userId })
        if(refreshTokenExist){
            refreshTokenExist.refreshToken = refreshToken
            await refreshTokenExist.save()
        } else {
            await RefreshTokenModel.create({
                accountId: getUser?.userId,
                refreshToken,
                userType: getUser?.userType,
                accountType: getUser?.accountType
            })
        }
        ///set and send cookies
        res.cookie('tredahtoken', accessToken, {
            httpOnly: true,
            sameSite: 'None',
            secure: true,
            maxAge: 3 * 24 * 60 * 60 * 1000, // 3 days
        });
        res.cookie('tredahauthid', getUser?.userId, {
            httpOnly: true,
            sameSite: 'None',
            secure: true,
            maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        });
        //send user data
        const { password: userPassword, verified, isBlocked, accountSuspended, noOfLoginAttempts, temporaryAccountBlockTime, resetPasswordToken, resetPasswordExpire, subscriptionPriceId, subscriptionId, _id, ...userData } = getUser._doc;
        let getBusinessAccount
        if(getUser?.userType === 'buyer') {
            getBusinessAccount = await BuyerKycInfoModel.findOne({ accountId: getUser?.userId })
        } else {
            getBusinessAccount = await SellerKycInfoModel.findOne({ accountId: getUser?.userId })
        }
        const { accountId, nin, ...businessAccountInfo } = getBusinessAccount._doc
        const data = {
            ...userData,
            ...businessAccountInfo
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
        const getUser = await UserModel.findOne({ email })
        if(!getUser) return sendResponse(res, 404, false, null, 'Invalid email address')

        //generate  forgot password
        const resetToken = getUser.getPasswordToken()
        await getUser.save()
        console.log('REST', resetToken)

        sendForgotPasswordEmail({
            email: getUser?.email,
            name: getUser?.name,
            buttonLink: `${process.env.DEV_URL_ONE}/reset-password/${resetToken}`,
        })

        //create cookies tredahuserid
        res.cookie('tredahuserid', getUser?.userId, {
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
    const accountId = req.cookies.tredahuserid;

    if(!password) return sendResponse(res, 400, false, null, 'password id required')
    if(!confirmPassword) return sendResponse(res, 400, false, null, 'confirm password is required')
    const verifyPassword = await validatePassword(password)
    if(!verifyPassword.success) return sendResponse(res, 400, false, null, verifyPassword.message)

    if(password !== confirmPassword) return sendResponse(res, 400, false, null, 'Password do not match')

    if(!accountId) return sendResponse(res, 403, false, 'Not Allowed')
    try {
        const getUser = await UserModel.findOne({
            resetPasswordToken,
            resetPasswordExpire: { $gt: Date.now()}
        })

        if(!getUser) return sendResponse(res, 400, false, null, 'Invalid reset token')
        if(getUser.userId !== accountId) return sendResponse(res, 400, false, 'Not Allowed')

        const passwordMatch = await getUser.matchPassword(password)
        if(passwordMatch) return sendResponse(res, 400, false, null, 'Old password must not match new password')
        
        getUser.password = password
        getUser.resetPasswordToken = null
        getUser.resetPasswordExpire = null
        await getUser.save()

        res.clearCookie(`tredahuserid`)

        sendResponse(res, 201, true, null, 'Passowrd reset success')
    } catch (error) {
        console.log('UNABLE TO RESET USER PASSWORD', error)
        sendResponse(res, 500, false, null, 'Unable to reset user password')
    }

}

//verify access token
export async function verifyToken(req, res) {
    const accessToken = req.cookies.tredahtoken;
    const accountId = req.cookies.tredahauthid;

    try {
        if (accessToken) {
            try {
                const decoded = jwt.verify(accessToken, process.env.JWT_ACCESS_TOKEN_SECRET);

                if (decoded.accountType !== 'user') {
                    return sendResponse(res, 403, false, null, 'Unauthorized access');
                }

                const user = await UserModel.findOne({ userId: decoded.id });
                if (!user) return sendResponse(res, 404, false, null, 'User not found');
                if (!user.refreshToken) return sendResponse(res, 401, false, null, 'Unauthenticated');

                // Remove sensitive data before sending the response
                const { password, noOfLoginAttempts, temporaryAccountBlockTime, verified, accountSuspended, isBlocked, resetPasswordToken, resetPasswordExpire, subscriptionPriceId, subscriptionId, _id, ...userData } = user._doc;
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

    const user = await UserModel.findOne({ userId: accountId });
    if (!user) return sendResponse(res, 404, false, null, 'User not found');

    const refreshTokenExist = await RefreshTokenModel.findOne({ accountId });
    if (!refreshTokenExist) return sendResponse(res, 401, false, null, 'Invalid refresh token');

    const newAccessToken = user.getAccessToken();
    res.cookie('tredahtoken', newAccessToken, {
        httpOnly: true,
        sameSite: 'None',
        secure: true,
        maxAge: 15 * 60 * 1000, // 15 minutes
    });

    const { password, noOfLoginAttempts, temporaryAccountBlockTime, verified, accountSuspended, isBlocked, resetPasswordToken, resetPasswordExpire, subscriptionPriceId, subscriptionId, _id, ...userData } = user._doc;
    return sendResponse(res, 200, true, userData, newAccessToken);
}

export async function signout(req, res) {
    const { userId } = req.user || {}
    try {
        const getRefreshTokenToken = await RefreshTokenModel.findOne({ accountId: userId })

        if(getRefreshTokenToken){
            const deleteToken = await RefreshTokenModel.findOneAndDelete({ accountId: userId })
        }
        res.clearCookie(`tredahtoken`)
        res.clearCookie(`tredahauthid`)

        return sendResponse(res, 200, true, null, 'Signout success')
    } catch (error) {
        console.log('UNABLE TO SIGNOUT ACCOUNT', error)
        return sendResponse(res, 500, false, null, 'Unable to process signout')
    }
}

export async function dele(req, res) {
    if(process.env.BUILD_MODE === 'DEV') {
        try {
            const {email} = req.body

            const deleteUser = await UserModel.findOneAndDelete({ email })
            if(!deleteUser) return sendResponse(res, 404, false, null, 'User with this email does not exist')

            sendResponse(res, 200, true, null, `User with email ${email} deleted successfully`)
        } catch (error) {
            console.log('UNABLE TO DELETE EMAIL', error)
            sendResponse(res, 500, false, null, 'Unable to delete email')
        }
    } else{
        res.end()
    }
}