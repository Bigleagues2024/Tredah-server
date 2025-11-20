import express from 'express'
import * as controllers from '../controllers/transaction.controllers.js'
import { getLocation } from '../middleware/location.js'
import { uploadMiddleware } from '../middleware/utils.js'
import { AllowedStoreStaff, AllowedUserType, AuthenticateUser } from '../middleware/auth/user-auth.js'
import { AuthenticateAdmin, PermissionsRole } from '../middleware/auth/admin-auth.js'

const router = express.Router()

//POST
router.post('/requestRefund', AuthenticateUser, AllowedUserType(['buyer']), controllers.requestRefund)
router.post('/export', AuthenticateUser, AllowedStoreStaff(['transaction']), controllers.exportTransactionHistroy)

//post public
router.post('/makePayment', AuthenticateUser, AllowedUserType(['buyer']), controllers.makePayment)
router.post('/payment/verify/:transactionId', AuthenticateUser, AllowedUserType(['buyer']), controllers.verifyPaymentRef)


//post methods admin
router.get('/verifyPayment/:transactionId', AuthenticateAdmin, PermissionsRole(['transaction', 'admin', 'superadmin']), controllers.verifyPaymentRef)


//GET
router.get('/summary', AuthenticateUser, AllowedStoreStaff(['transaction']), controllers.getTransactionsSummary)
router.get('/history', AuthenticateUser, AllowedStoreStaff(['transaction']), controllers.getTransactionsHistroy)
router.get('/transactionDetail/:transactionId', AuthenticateUser, AllowedStoreStaff(['transaction']), controllers.getTransaction)
router.get('/transactionStats', AuthenticateUser, AllowedStoreStaff(['transaction']), controllers.getUserTransactionsStats)

//get methods store

//get methods admin
router.get('/allTransaction', AuthenticateAdmin, PermissionsRole(['transaction', 'admin', 'superadmin']), controllers.getAllTransactionsHistroy)
router.get('/stats', AuthenticateAdmin, PermissionsRole(['transaction', 'admin', 'superadmin']), controllers.getTransactionsStats)
router.get('/userStats/:accountId/:type', AuthenticateAdmin, PermissionsRole(['transaction', 'admin', 'superadmin']), controllers.getUserTransactionsStats)

export default router