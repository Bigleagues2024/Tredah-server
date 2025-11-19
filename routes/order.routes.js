import express from 'express'
import * as controllers from '../controllers/order.controllers.js'
import { getLocation } from '../middleware/location.js'
import { uploadMiddleware } from '../middleware/utils.js'
import { AllowedStoreStaff, AllowedUserType, AuthenticateUser } from '../middleware/auth/user-auth.js'
import { AuthenticateAdmin, PermissionsRole } from '../middleware/auth/admin-auth.js'

const router = express.Router()

//POST
router.post('/newOrder', AuthenticateUser, AllowedUserType(['seller']), AllowedStoreStaff(['order']), controllers.newOrder)
router.post('/editOrder', AuthenticateUser, AllowedUserType(['seller']), AllowedStoreStaff(['order']), controllers.editOrder)


//post methods admin
router.post('/update', AuthenticateAdmin, PermissionsRole(['order', 'admin', 'superadmin']), controllers.updateOrderStatus)


//GET
router.get('/summary', AuthenticateUser, AllowedStoreStaff(['order']), controllers.getOrderSummary)
router.get('/history', AuthenticateUser, AllowedStoreStaff(['order']), controllers.getordersHistory)
router.get('/orderDetail/:orderId', AuthenticateUser, AllowedStoreStaff(['order']), controllers.getOrder)
router.get('/orderStats', AuthenticateUser, AllowedStoreStaff(['order']), controllers.getUserOrderStats)

//get methods store

//get methods admin
router.get('/allorders', AuthenticateAdmin, PermissionsRole(['order', 'admin', 'superadmin']), controllers.getAllorders)
router.get('/stats', AuthenticateAdmin, PermissionsRole(['order', 'admin', 'superadmin']), controllers.getOrderStats)
router.get('/userStats/:accountId/:type', AuthenticateAdmin, PermissionsRole(['order', 'admin', 'superadmin']), controllers.getUserOrderStats)


export default router