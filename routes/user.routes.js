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
router.post('/addShippingAddres', AuthenticateUser, controllers.addShippingAddres)
router.post('/editShippingAddres', AuthenticateUser, controllers.editShippingAddres)
router.post('/deleteShippingAddres', AuthenticateUser, controllers.deleteShippingAddres)
router.post('/updatePassword', AuthenticateUser, controllers.updatePassword)

//post methods admin
router.post('/approveAccount', AuthenticateAdmin, PermissionsRole(['user', 'admin','superadmin']), controllers.approveAccount)
router.post('/blockAccount', AuthenticateAdmin, PermissionsRole(['user', 'admin','superadmin']), controllers.blockAccount)
//router.post('/approveAccount', controllers.approveAccount)
router.post('/notification', AuthenticateAdmin, PermissionsRole(['user', 'admin','superadmin']), controllers.notifyUser)


//GET
router.get('/getProfile', AuthenticateUser, controllers.getProfile)
router.get('/getNotifications', AuthenticateUser, controllers.getNotifications)
router.get('/getShippingAddress', AuthenticateUser, controllers.getShippingAddress)

router.get('/getSubscriptionHistroy', AuthenticateUser, controllers.getSubscriptionHistory)

//get methods admin
router.get('/getAllUsers', AuthenticateAdmin, PermissionsRole(['user', 'admin','superadmin']), controllers.getAllUsers)
router.get('/getUser/:userId', AuthenticateAdmin, PermissionsRole(['user', 'admin','superadmin']), controllers.getUser)
router.get('/getUserStats', AuthenticateAdmin, PermissionsRole(['user', 'admin','superadmin']), controllers.getUserStats)
router.get('/getUserShippingAddress/:userId', AuthenticateAdmin, PermissionsRole(['user', 'admin','superadmin']), controllers.getUser)

router.get('/getUserSubscriptionHistroy/:email', AuthenticateAdmin, PermissionsRole(['user', 'admin','superadmin']), controllers.getSubscriptionHistory)
router.get('/getSubscriptionDetails/:id', AuthenticateAdmin, PermissionsRole(['user', 'admin','superadmin']), controllers.getSubscriptionDetails)


export default router