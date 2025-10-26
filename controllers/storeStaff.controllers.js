import { sendResponse } from "../middleware/utils"

//new staff
export async function newStaff(req, res) {
    const { userId } = req.user
    const { name, email, permission } = req.body

    try {
        const generateUserId = await generateUniqueCode(9)
        const userId = `TRD${generateUserId}STF`
    } catch (error) {
        console.log('UNABLE TO CREATE NEW STAFF', error)
        sendResponse(res, 500, false, null, 'Unable to create staff')
    }
}

//admin update staff

//delete staff

//get all staff

//get a staff


/**** */
//staff login

//forgot password

//resent password

//update account
