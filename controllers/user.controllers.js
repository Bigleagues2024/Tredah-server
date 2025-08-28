import { sendAccountActivationEmail } from "../middleware/mailTemplate/mailService/mailTemplate.js"
import { sendResponse, uploadToCloudinary } from "../middleware/utils.js"
import AdminNotificationModel from "../models/AdminNotification.js"
import BuyerKycInfoModel from "../models/BuyerKycInfo.js"
import NotificationModel from "../models/Notification.js"
import SellerKycInfoModel from "../models/SellerKycInfo.js"
import UserModel from "../models/User.js"

//get user profile by user
export async function getProfile(req, res) {
    const { userId: ownerId } = req.user
    const userId = ownerId

    try {
        const getUser = await UserModel.findOne({ userId })
        if(!getUser) return sendResponse(res, 404, false, null, 'User not found')
        
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

        sendResponse(res, 200, true, data, 'Success')
    } catch (error) {
        console.log('', error)
        sendResponse(res, 500, false, null, 'Unable to get user profile')
    }
}

//get all users admin
export async function getAllUsers(req, res) {
    const { limit = 10, page = 1, startDate, endDate, search, verified, isActive, isBlocked, accountSuspended, oldest, subscriber } = req.query
    // Handle date filtering
    let query = {}
    if (startDate && endDate) {
        query.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
    } else if (startDate) {
        query.createdAt = { $gte: new Date(startDate) };
    } else if (endDate) {
        query.createdAt = { $lte: new Date(endDate) };
    }

    if (search) {
        if (search.includes('@')) {
            query.email = { $regex: search, $options: "i" };
        } else {
            query.$or = [
                { name: { $regex: search, $options: "i" } },
                { mobileNumber: { $regex: search, $options: "i" } }
            ];
        }
    }

    if(verified && verified === true){
        query.verified = true
    }
    if(isBlocked && isBlocked === true){
        query.isBlocked = true
    }
    if(isActive && isActive === true){
        query.isActive = true
    }
    if (subscriber) {
        query.subscriptionType = { $ne: 'free' }; // Proper Mongoose syntax for "not equal"
    }
    if(accountSuspended && accountSuspended === true ){
        query.accountSuspended = true
    }

    //SORTING
    let sortOrder = {};
    if (oldest) {
        sortOrder.createdAt = 1 ; // Sort by oldest first
    } 
    if(!oldest) {
        sortOrder.createdAt = -1 ; // Default: newest first
    }
    
    try {   
        // Calculate the number of documents to skip
        const skip = (Number(page) - 1) * Number(limit);

        const allUsers = await UserModel.find(query)
          .sort(sortOrder) // Sort the documents
          .skip(skip) // Skip the documents for pagination
          .limit(Number(limit)) // Limit the results for pagination
          .select('-_id -password')

        // Get the total count of users for pagination metadata
        const totalUsers = await UserModel.countDocuments(query);
        
        return sendResponse(res, 200, true, {
                totalUsers: totalUsers,
                users: allUsers,
                totalPages: Math.ceil(totalUsers / limit),
                currentPage: Number(page),
            },
            'users fetched successfully',
        );
    } catch (error) {
        console.log('UNABLE TO GET ALL USERS', error)
        sendResponse(res, 500, false, null, 'Unable to get all users')
    }
}

//get user admin
export async function getUser(req, res) {
    const accountId = req.params || {}
    const userId =  accountId

    try {
        const getUser = await UserModel.findOne({ userId })
        if(!getUser) return sendResponse(res, 404, false, null, 'User not found')
        
        //send user data
        const { password: userPassword, _id, ...userData } = getUser._doc;
        let getBusinessAccount
        if(getUser?.userType === 'buyer') {
            getBusinessAccount = await BuyerKycInfoModel.findOne({ accountId: getUser?.userId })
        } else {
            getBusinessAccount = await SellerKycInfoModel.findOne({ accountId: getUser?.userId })
        }
        const { ...businessAccountInfo } = getBusinessAccount._doc
        const data = {
            ...userData,
            ...businessAccountInfo
        }

        sendResponse(res, 200, true, data, 'Success')
    } catch (error) {
        console.log('', error)
        sendResponse(res, 500, false, null, 'Unable to get user profile')
    }
}

//update profile account owner
export async function updateProfile(req, res) {
    const { userId } = req.user
    const { accountName, accountNumber, bankName, name, } = req.body
    const { image } = req.files || {}

    try {
        let imageUrl = null;
        if (image?.[0]) {
            console.log("Uploading images...");
            imageUrl = await uploadToCloudinary(profileImg[0].buffer, "user/images", "image");
        }

        const getUser = await UserModel.findOne({ userId })

        if(accountName && typeof accountName !== 'undefined') getUser.accountName = accountName
        if(accountNumber && typeof accountNumber !== 'undefined') getUser.accountNumber = accountNumber
        if(bankName && typeof bankName !== 'undefined') getUser.bankName = bankName
        if(name && typeof name !== 'undefined') getUser.name = name
        if(imageUrl?.secure_url) getUser.profileImg = imageUrl?.secure_url

        await getUser.save()

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
        sendResponse(res, 200, true, data, 'Profile Updated')
    } catch (error) {
        console.log('UNABLE TO UPDATE USER ACCOUNT', error)
        sendResponse(res, 500, false, null, 'Unable to update account')        
    }
}

//update buyer info
export async function updateBuyerInfo(req, res) {
    const { userId } = req.user
    const { } = req.body

    try {
        
    } catch (error) {
        console.log('UNABLE TO UDATE BUYER ACCOUNT', error)
        sendResponse(res, 500, false, null, 'Unable to udate nuyer account')
    }
}

//update seller info
export async function updateSellerInfo(req, res) {
    const { userId } = req.user || {}
    const { email, nin: ninValue, address, companyName, businessType, businessRegistrationNumber, businessAddress, businessEmail, taxId, businessCategory, socialLink } = req.body

    try {
        let getUser
        if(userId) {
            getUser = await UserModel.findOne({ userId })
        } else {
            getUser = await UserModel.findOne({ email })
        }
        if(!getUser) return sendResponse(res, 404, false, null, 'Account not found')
        const getSeller = await SellerKycInfoModel.findOne({ accountId: userId })
        if(!getSeller) return sendResponse(res, 404, false, null, 'Account not found')

        if(address) getSeller.address = address
        if(companyName) getSeller.companyName = companyName
        if(businessType) getSeller.businessType = businessType
        if(businessAddress) getSeller.businessAddress = businessAddress
        if(businessEmail) getSeller.businessEmail = businessEmail
        if(businessCategory) getSeller.businessCategory = businessCategory
        if(socialLink) getSeller.socialLink = socialLink

        if(!getSeller.isActive) {
            if(businessRegistrationNumber) getSeller.businessRegistrationNumber = businessRegistrationNumber
            if(taxId) getSeller.taxId = taxId
            if(ninValue) getSeller.nin = ninValue
        }

        await getSeller.save()

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
        sendResponse(res, 200, true, data, 'Seller Information Updated')
    } catch (error) {
        console.log('UNABLE TO UPDATE SELLER INFO', error)
        sendResponse(res, 500, false, null, 'Unable to update seller account')
    }
}

//approve user account
export async function approveAccount(req, res) {
    const { name, adminId } = req.user || {}
    const { userId } = req.body
    if(!userId) return sendResponse(res, 400, false, null, 'User is required')

    try {
        const getUser = await UserModel.findOne({ userId })
        if(!getUser) return sendResponse(res, 404, false, null, 'User not found')

        getUser.isActive = true
        getUser.isBlocked = false
        await getUser.save()

        //create notification
        await AdminNotificationModel.create({
            notification: `${name} approved user(${getUser?.name}) account.`
        })

        //create user notification
        await NotificationModel.create({
            userId: getUser?.userId,
            notification: 'You account has been approved'
        })

        //send activation email
        sendAccountActivationEmail({
            email: getUser?.email,
            name: getUser?.name,
            buttonLink: `${process.env.DEV_URL_ONE}`
        })

        sendResponse(res, 200, true, null, 'Account has been activated')
    } catch (error) {
        console.log('UNABLE TO BLOCK USER', error)
        sendResponse(res, 500, false, null, 'Unable to block user')
    }
}

//block user account
export async function blockAccount(req, res) {
    const { name, adminId } = req.user
    const { userId } = req.body
    if(!userId) return sendResponse(res, 400, false, null, 'User is required')

    try {
        const getUser = await UserModel.findOne({ userId })
        if(!getUser) return sendResponse(res, 404, false, null, 'User not found')

        getUser.isActive = false
        getUser.isBlocked = true
        await getUser.save()

        //create notification
        await AdminNotificationModel.create({
            notification: `${name} blocked user(${getUser?.name}) account.`
        })

        //create user notification
        await NotificationModel.create({
            userId: getUser?.userId,
            notification: 'You account has been blocked by admin'
        })

        sendResponse(res, 200, true, null, 'Account has been blocked')
    } catch (error) {
        console.log('UNABLE TO BLOCK USER', error)
        sendResponse(res, 500, false, null, 'Unable to block user')
    }
}

//get notifications
export async function getNotifications(req, res) {
    const { userId } = req.user
    const { limit = 10, page = 1, read, oldest } = req.query
    let query = { userId }
    let sortOrder = {}

    if(read && typeof read === 'boolean'){
        query.read = read
    }
    if (oldest) {
        sortOrder.createdAt = 1 ; // Sort by oldest first
    } 
    if(!oldest) {
        sortOrder.createdAt = -1 ; // Default: newest first
    }

    try {
        // Calculate the number of documents to skip
        const skip = (Number(page) - 1) * Number(limit);

        const allNotifications = await NotificationModel.find(query)
          .sort(sortOrder) // Sort by latest notification request
          .skip(skip) // Skip the documents for pagination
          .limit(Number(limit)) // Limit the results for pagination

        // Get the total count of notification for pagination metadata
        const totalNotifications = await NotificationModel.countDocuments(query);
        
        return sendResponse(res, 200, true, {
                totalNotifications: totalNotifications,
                notifications: allNotifications,
                totalPages: Math.ceil(totalNotifications / limit),
                currentPage: Number(page),
            },
            'Notifcation fetched successfully'
        );
    } catch (error) {
        console.log('UNABLE TO GET NOTIFICATION HISTROY', error)
        sendResponse(res, 500, false, null, 'Unable to get notification histroy')
    }
}

//mark notifications as read
export async function markNotificationAsRead(req, res) {
    const { userId } = req.user
    const { _id } = req.body
    try {
        const getNotification = await NotificationModel.findById({ _id })
        if(!getNotification) return sendResponse(res, 404, false, null, 'Notifucation not found')

        getNotification.read = true
        await getNotification.save()

        sendResponse(res, 200, true, null, 'success')
    } catch (error) {
        console.log('UNABLE TO MARK NOTIFICATION AS READ', error)
        sendResponse(res, 500, false, null, 'Unable to mark notification as read')
    }
}

//mark all as read
export async function markAllNotificationAsRead(req, res) {
    const { userId } = req.user

    try {
        await NotificationModel.updateMany({ userId }, { $set: { read: true } }); // Corrected filter and update syntax

        sendResponse(res, 200, true, null, 'All notifications marked as read');
    } catch (error) {
        console.log('UNABLE TO MARK ALL NOTIFICATIONS AS READ', error);
        sendResponse(res, 500, false, null, 'Unable to mark all notifications as read');
    }
}

// get users stats
export async function getUserStats(req, res) {
    const { period = '30days' } = req.query;

    // Allowed periods and corresponding time frames
    const periods = {
        '3days': 3,
        '7days': 7,
        '30days': 30,
        '3mth': 90,
        '6mth': 180,
        '1year': 365,
        'alltime': null
    };

    if (!periods.hasOwnProperty(period)) {
        return sendResponse(res, 400, false, 'Invalid period specified');
    }

    try {
        let startDate = periods[period] ? subDays(new Date(), periods[period]) : null;
        let previousStartDate = periods[period] ? subDays(startDate, periods[period]) : null;
        let endDate = new Date();
        let previousEndDate = startDate;

        // Query conditions
        const currentFilter = startDate ? { createdAt: { $gte: startDate, $lte: endDate } } : {};
        const previousFilter = previousStartDate ? { createdAt: { $gte: previousStartDate, $lte: previousEndDate } } : {};

        // Get user stats for the current period
        const totalUser = await UserModel.countDocuments(currentFilter);
        const totalActiveUser = await UserModel.countDocuments({ ...currentFilter, isBlocked: false, verified: true, isActive: true });
        const totalInactiveUser = await UserModel.countDocuments({ ...currentFilter, $or: [{ verified: false }, { isBlocked: true }, { isActive: true }] });

        // Get user stats for the previous period
        const previousTotalUser = await UserModel.countDocuments(previousFilter);
        const previousTotalActiveUser = await UserModel.countDocuments({ ...previousFilter, isBlocked: false, verified: true, isActive: true });
        const previousTotalInActiveUser = await UserModel.countDocuments({ ...previousFilter, $or: [{ verified: false }, { isBlocked: true }, { isActive: true }] });

        // Function to calculate percentage change
        const calculatePercentageChange = (current, previous) => {
            if (previous === 0) return current > 0 ? 100 : 0;
            let change = ((current - previous) / previous) * 100;
            return Math.abs(change.toFixed(2));
        };

        // Construct the final result
        const finalResult = [
            {
                current: totalUser,
                previous: previousTotalUser,
                id: 'totalusers',
                name: 'Total users',
                percentage: calculatePercentageChange(totalUser, previousTotalUser),
                percentageChange: totalUser >= previousTotalUser ? '+' : '-',
            },
            {
                current: totalActiveUser,
                previous: previousTotalActiveUser,
                id: 'activeusers',
                name: 'Active users',
                percentage: calculatePercentageChange(totalActiveUser, previousTotalActiveUser),
                percentageChange: totalActiveUser >= previousTotalActiveUser ? '+' : '-',
            },
            {
                current: totalInactiveUser,
                previous: previousTotalInActiveUser,
                id: 'inactiveuser',
                name: 'Inactive users',
                percentage: calculatePercentageChange(totalInactiveUser, previousTotalInActiveUser),
                percentageChange: totalInactiveUser >= previousTotalInActiveUser ? '+' : '-',
            }
        ];

        sendResponse(res, 200, true, 'User statistics retrieved successfully', finalResult);
    } catch (error) {
        console.log('UNABLE TO GET USER STATS', error);
        sendResponse(res, 500, false, 'Unable to get user stats');
    }
}