import express from 'express'
import * as controllers from '../controllers/user.controllers.js'
import { getLocation } from '../middleware/location.js'
import { uploadMiddleware } from '../middleware/utils.js'
import { AuthenticateUser } from '../middleware/auth/user-auth.js'
import { AuthenticateAdmin, PermissionsRole } from '../middleware/auth/admin-auth.js'

const router = express.Router()

//POST
router.post('/updateProfile', AuthenticateUser, uploadMiddleware, controllers.updateProfile)
router.post('/updateSellerInfo', AuthenticateUser, controllers.updateSellerInfo)

//post methods admin
router.post('/approveAccount', AuthenticateAdmin, PermissionsRole(['user', 'admin','superadmin']), controllers.approveAccount)
router.post('/blockAccount', AuthenticateAdmin, PermissionsRole(['user', 'admin','superadmin']), controllers.blockAccount)


//GET
router.post('/getProfile', AuthenticateUser, controllers.getProfile)
router.post('/getNotifications', AuthenticateUser, controllers.getNotifications)
router.post('/markNotificationAsRead', AuthenticateUser, controllers.markNotificationAsRead)
router.post('/markAllNotificationAsRead', AuthenticateUser, controllers.markAllNotificationAsRead)

//get methods admin
router.post('/getAllUsers', AuthenticateAdmin, PermissionsRole(['user', 'admin','superadmin']), controllers.getAllUsers)
router.post('/getUser/:userId', AuthenticateAdmin, PermissionsRole(['user', 'admin','superadmin']), controllers.getUser)
router.post('/getUserStats', AuthenticateAdmin, PermissionsRole(['user', 'admin','superadmin']), controllers.getUserStats)


export default router