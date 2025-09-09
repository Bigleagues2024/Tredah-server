import express from 'express'
import * as controllers from '../controllers/user.controllers.js'
import { getLocation } from '../middleware/location.js'
import { AuthenticateUser } from '../middleware/auth/user-auth.js'
import { AuthenticateAdmin, PermissionsRole } from '../middleware/auth/admin-auth.js'

const router = express.Router()

//POST
router.post('/updateProfile', AuthenticateUser, controllers.updateProfile)
router.post('/updateSellerInfo', AuthenticateUser, controllers.updateSellerInfo)
router.post('/updateBuyerInfo', AuthenticateUser, controllers.updateBuyerInfo)
router.post('/markNotificationAsRead', AuthenticateUser, controllers.markNotificationAsRead)
router.post('/markAllNotificationAsRead', AuthenticateUser, controllers.markAllNotificationAsRead)

//post methods admin
//router.post('/approveAccount', AuthenticateAdmin, PermissionsRole(['user', 'admin','superadmin']), controllers.approveAccount)
router.post('/blockAccount', AuthenticateAdmin, PermissionsRole(['user', 'admin','superadmin']), controllers.blockAccount)
router.post('/approveAccount', controllers.approveAccount)


//GET
router.get('/getProfile', AuthenticateUser, controllers.getProfile)
router.get('/getNotifications', AuthenticateUser, controllers.getNotifications)

//get methods admin
router.get('/getAllUsers', AuthenticateAdmin, PermissionsRole(['user', 'admin','superadmin']), controllers.getAllUsers)
router.get('/getUser/:userId', AuthenticateAdmin, PermissionsRole(['user', 'admin','superadmin']), controllers.getUser)
router.get('/getUserStats', AuthenticateAdmin, PermissionsRole(['user', 'admin','superadmin']), controllers.getUserStats)


export default router