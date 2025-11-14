import { sendNewStaffEmail } from "../middleware/mailTemplate/mailService/mailTemplate.js"
import { sendResponse } from "../middleware/utils.js"
import StoreModel from "../models/StoreFront.js"
import StoreStaffModel from "../models/StoreStaff.js"

const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

//new staff
export async function newStaff(req, res) {
    const { userId: uId, storeId: sId, } = req.user
    const storeId = sId || uId
    const { name, email, permission } = req.body
    if(!name) return sendResponse(res, 400, false, null, 'Staff Name is required')
    if(!email) return sendResponse(res, 400, false, null, 'User Email address is required')
    if(!emailRegex.test(email)) return sendResponse(res, 400, false, null, 'Invalid email address')
    if(!permission || !Array.isArray(permission)) return sendResponse(res, 400, false, null, 'Permision must be a valid array of strings')

    if (
        !Array.isArray(permission) ||                 // must be an array
        permission.length === 0 ||                    // must not be empty
        !permission.every((p) => typeof p === 'string' && p.trim() !== '') // all must be non-empty strings
    ) {
        return sendResponse(res, 400, false, null, 'Permission must be a non-empty array of strings');
    }

    try {
        const generateUserId = await generateUniqueCode(9)
        const userId = `TRD${generateUserId}STFF`
        const getCode = await generateUniqueCode(4)
        
        const staffExist = await StoreStaffModel.findOne({ email })
        if(staffExist) return sendResponse(res, 409, false, null, 'Staff with this email already exist')

        const newPassword = `${userId}&${getCode}`
        const addStaff = await StoreStaffModel.create({
            storeId,
            userId,
            name,
            email,
            permission,
            password: newPassword,
            verified: true,
            isOnBoardingComplete: true
        })

        const getStore = await StoreModel.findOne({ sellerId: storeId })

        //sendEmail to user
        await sendNewStaffEmail({
            email,
            name,
            title: `${getStore?.name} Staff Account created | Treadah`,
            profile: { userId, password: newPassword },
            store: getStore?.name
        })

        sendResponse(res, 201, true, addStaff, 'New Staff created successful')
    } catch (error) {
        console.log('UNABLE TO CREATE NEW STAFF', error)
        sendResponse(res, 500, false, null, 'Unable to create staff')
    }
}

//admin update staff
export async function updateStaff(req, res) {
    const { userId: uId, storeId: sId, } = req.user
    const storeId = sId || uId
    const { staffId } = req.params
    const { block, permission } = req.body
    if(block && typeof block !== 'boolean') return sendResponse(res, 400, false, null, 'block value must be boolen')
    if (
        permission &&
        !Array.isArray(permission) || 
        !permission.every((p) => typeof p === 'string' && p.trim() !== '')
    ) {
        return sendResponse(res, 400, false, null, 'Permission must be a non-empty array of strings');
    }

    try {
        const getStaff = await StoreStaffModel.findOne({ userId: staffId })
        if(!getStaff) return sendResponse(res, 404, false, null, 'Staff not found')
            
        if(block) getStaff.isBlocked = block
        if(permission) getStaff.permission = permission
        
        await getStaff.save()

        const { password: userPassword, temporaryAccountBlockTime, _id, __v, ...userData } = getStaff._doc;
        sendResponse(res, 200, true, userData, 'Staff Account updated')
    } catch (error) {
        console.log('UNABLE TO UPDATE STAFF', error)
        sendResponse(res, 500, false, null, 'Unable to update staff detail')
    }
}

//delete staff
export async function deleteStaff(req, res) {
    const { userId: uId, storeId: sId, } = req.user
    const storeId = sId || uId
    const { staffId } = req.params

    try {
        const getStaff = await StoreStaffModel.findOneAndDelete({ userId: staffId, storeId })
        if(!getStaff) return sendResponse(res, 404, false, null, 'Staff not found')

        sendResponse(res, 200, true, null, 'staff deleted')
    } catch (error) {
        console.log('UNABLE TO DELETE STAFF ACCOUNT')
        sendResponse(res, 500, false, null, 'Unable to delete staff account')
    }
}

// Get all staff (with pagination)
export async function getStaffs(req, res) {
    const { userId: uId, storeId: sId } = req.user;
    const storeId = sId || uId
  const { limit = 10, page = 1 } = req.query;

  try {
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Fetch staff belonging to this store
    const [staffs, total] = await Promise.all([
      StoreStaffModel.find({ storeId })
        .select('-_id -__v -password -resetToken -resetPasswordExpire')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      StoreStaffModel.countDocuments({ storeId }),
    ]);

    const data = {
      staffs,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
    };

    sendResponse(res, 200, true, data, 'All staff fetched successfully');
  } catch (error) {
    console.error('UNABLE TO GET ALL STAFF', error);
    sendResponse(res, 500, false, null, 'Unable to get all staff');
  }
}

// Get a single staff
export async function getStaff(req, res) {
  const { staffId } = req.params;
  const { userId: uId, storeId: sId } = req.user;
    const storeId = sId || uId

  if (!staffId)
    return sendResponse(res, 400, false, null, 'Staff ID is required');

  try {
    const staff = await StoreStaffModel.findOne({ userId: staffId, storeId }).select('-_id -__v');
    if (!staff)
      return sendResponse(res, 404, false, null, 'No staff found with the provided ID');

    const { password: userPassword, temporaryAccountBlockTime, _id, __v, ...userData } = getStaff._doc;

    sendResponse(res, 200, true, userData, 'Staff details fetched successfully');
  } catch (error) {
    console.error('UNABLE TO GET STAFF DETAIL', error);
    sendResponse(res, 500, false, null, 'Unable to get staff details');
  }
}

/**** */
//update profile account
export async function updateProfile(req, res) {
    const { userId } = req.user
    const { name, phoneNumber, profileImg } = req.body

    try {
        const getStaff = await StoreStaffModel.findOne({ userId })

        if(name) getStaff.name = name
        if(phoneNumber) getStaff.phoneNumber = phoneNumber
        if(profileImg) getStaff.profileImg = profileImg
        await getStaff.save()

        const { password: userPassword, verified, isBlocked, accountSuspended, noOfLoginAttempts, temporaryAccountBlockTime, resetPasswordToken, resetPasswordExpire, _id, ...userData } = getStaff._doc;
        sendResponse(res, 200, true, userData, 'Store staff account updated')
    } catch (error) {
        console.log('UNABLE TO UPDATE STORE STAFF ACCOUNT', error)
        sendResponse(res, 500, false, null, 'Unable to update store staff account')
    }
}

//get profile
export async function getProfile(req, res) {
    const { userId } = req.user

    try {
        const getStaff = await StoreStaffModel.findOne({ userId })

        const { password: userPassword, verified, isBlocked, accountSuspended, noOfLoginAttempts, temporaryAccountBlockTime, resetPasswordToken, resetPasswordExpire, _id, ...userData } = getStaff._doc;
        sendResponse(res, 200, true, userData, 'Staff profile fetched')
    } catch (error) {
        console.log('UNABLE TO GET STAFF PROFILE', error)
        sendResponse(res, 500, false, null, 'Unable to get staff profile')
    }
}