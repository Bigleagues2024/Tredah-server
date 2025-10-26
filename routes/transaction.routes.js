import express from 'express'
import * as controllers from '../controllers/transaction.controllers.js'
import { getLocation } from '../middleware/location.js'
import { uploadMiddleware } from '../middleware/utils.js'
import { AllowedStoreStaff, AllowedUserType, AuthenticateUser } from '../middleware/auth/user-auth.js'
import { AuthenticateAdmin, PermissionsRole } from '../middleware/auth/admin-auth.js'

const router = express.Router()

//POST
router.post('/requestRefund', AuthenticateUser, controllers.requestRefund)
router.post('/export', AuthenticateUser, AllowedStoreStaff(['transaction']), controllers.exportTransactionHistroy)

//post public


//post methods admin


//GET
router.get('/summary', AuthenticateUser, AllowedStoreStaff(['transaction']), controllers.getTransactionsSummary)
router.get('/history', AuthenticateUser, AllowedStoreStaff(['transaction']), controllers.getTransactionsHistroy)
router.get('/transactionDetail/:transactionId', AuthenticateUser, AllowedStoreStaff(['transaction']), controllers.getTransaction)

//get methods store

//get methods admin
router.get('/allTransaction', AuthenticateAdmin, PermissionsRole(['transaction', 'admin', 'superadmin']), controllers.getAllTransactionsHistroy)
router.get('/stats', AuthenticateAdmin, PermissionsRole(['transaction', 'admin', 'superadmin']), controllers.getTransactionsStats)

export default router