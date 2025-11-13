import express from 'express'
import * as controllers from '../controllers/storeStaff.controllers.js'
import { getLocation } from '../middleware/location.js'
import { uploadMiddleware } from '../middleware/utils.js'
import { AllowedStoreStaff, AllowedUserType, AuthenticateUser } from '../middleware/auth/user-auth.js'
import { AuthenticateAdmin, PermissionsRole } from '../middleware/auth/admin-auth.js'

const router = express.Router()

//POST
router.post('/profile', AuthenticateUser, AllowedUserType(['seller']), controllers.updateProfile) 

//store
router.post('/', AuthenticateUser, AllowedUserType(['seller']), AllowedStoreStaff(['staff']), controllers.newStaff)
router.patch('/:staffId', AuthenticateUser, AllowedUserType(['seller']), AllowedStoreStaff(['staff']), controllers.updateStaff)
router.delete('/:staffId', AuthenticateUser, AllowedUserType(['seller']), AllowedStoreStaff(['staff']), controllers.deleteStaff)


//GET
router.get('/profile', AuthenticateUser, AllowedUserType(['seller']), controllers.getProfile) 

//store
router.get('/', AuthenticateUser, AllowedUserType(['seller']), AllowedStoreStaff(['staff']), controllers.getStaffs)
router.get('/:staffId', AuthenticateUser, AllowedUserType(['seller']), AllowedStoreStaff(['staff']), controllers.getStaff)


export default router