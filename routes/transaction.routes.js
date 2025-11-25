import express from 'express'
import * as controllers from '../controllers/transaction.controllers.js'
import { getLocation } from '../middleware/location.js'
import { uploadMiddleware } from '../middleware/utils.js'
import { AllowedStoreStaff, AllowedUserType, AuthenticateUser } from '../middleware/auth/user-auth.js'
import { AuthenticateAdmin, PermissionsRole } from '../middleware/auth/admin-auth.js'

const router = express.Router()

//POST
router.post('/ticketRequest', AuthenticateUser, AllowedUserType(['buyer']), controllers.ticketRequest)
router.post('/export', AuthenticateUser, AllowedStoreStaff(['transaction']), controllers.exportTransactionHistroy)

//post public
router.post('/makePayment', AuthenticateUser, AllowedUserType(['buyer']), controllers.makePayment)
router.post('/payment/verify/:transactionId', AuthenticateUser, AllowedUserType(['buyer']), controllers.verifyPaymentRef)


//post methods admin
router.post('/verifyPayment/:transactionId', AuthenticateAdmin, PermissionsRole(['transaction', 'admin', 'superadmin']), controllers.verifyPaymentRef)
router.post('/ticket', AuthenticateAdmin, PermissionsRole(['transaction', 'order', 'admin', 'superadmin']), controllers.ticketRequest)
router.post('/closeTicket', AuthenticateAdmin, PermissionsRole(['transaction', 'order', 'admin', 'superadmin']), controllers.closeDispute)


//GET
router.get('/summary', AuthenticateUser, AllowedStoreStaff(['transaction']), controllers.getTransactionsSummary)
router.get('/history', AuthenticateUser, AllowedStoreStaff(['transaction']), controllers.getTransactionsHistroy)
router.get('/transactionDetail/:transactionId', AuthenticateUser, AllowedStoreStaff(['transaction']), controllers.getTransaction)
router.get('/transactionStats', AuthenticateUser, AllowedStoreStaff(['transaction']), controllers.getUserTransactionsStats)
router.get('/dispute', AuthenticateUser, AllowedUserType(['buyer']), controllers.getDisputeRequestReq)
router.get('/getDispute/:id', AuthenticateUser, AllowedUserType(['buyer']), controllers.getDispute)

//get methods store

//get methods admin
router.get('/allTransaction', AuthenticateAdmin, PermissionsRole(['transaction', 'admin', 'superadmin']), controllers.getAllTransactionsHistroy)
router.get('/stats', AuthenticateAdmin, PermissionsRole(['transaction', 'admin', 'superadmin']), controllers.getTransactionsStats)
router.get('/userStats/:accountId/:type', AuthenticateAdmin, PermissionsRole(['transaction', 'admin', 'superadmin']), controllers.getUserTransactionsStats)
//disputes
router.get('/getDisputeRequest/:userId', AuthenticateAdmin, PermissionsRole(['transaction', 'order', 'admin', 'superadmin']), controllers.getDisputeRequestReq)
router.get('/disputeRequest', AuthenticateAdmin, PermissionsRole(['transaction', 'order', 'admin', 'superadmin']), controllers.getDisputeRequests)
router.get('/getDisputeRequest/:id', AuthenticateAdmin, PermissionsRole(['transaction', 'order', 'admin', 'superadmin']), controllers.getDispute)

export default router