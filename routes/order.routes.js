import express from 'express'
import * as controllers from '../controllers/order.controllers.js'
import { getLocation } from '../middleware/location.js'
import { uploadMiddleware } from '../middleware/utils.js'
import { AllowedUserType, AuthenticateUser } from '../middleware/auth/user-auth.js'
import { AuthenticateAdmin, PermissionsRole } from '../middleware/auth/admin-auth.js'

const router = express.Router()

//POST
router.post('/newOrder', AuthenticateUser, AllowedUserType(['seller']), controllers.newOrder)
router.post('/editOrder', AuthenticateUser, AllowedUserType(['seller']), controllers.editOrder)

//post buyer
router.post('/makePayment', AuthenticateUser, AllowedUserType(['buyer']), controllers.makePayment)



//post methods admin


//GET
router.get('/summary', AuthenticateUser, controllers.getOrderSummary)
router.get('/history', AuthenticateUser, controllers.getordersHistory)
router.get('/orderDetail/:orderId', AuthenticateUser, controllers.getOrder)

//get methods store

//get methods admin
router.get('/allorders', AuthenticateAdmin, PermissionsRole(['order', 'admin', 'superadmin']), controllers.getAllorders)
router.get('/stats', AuthenticateAdmin, PermissionsRole(['order', 'admin', 'superadmin']), controllers.getOrderStats)


export default router