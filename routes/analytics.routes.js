import express from 'express'
import * as controllers from '../controllers/analytics.controllers.js'
import { AllowedUserType, AuthenticateUser } from '../middleware/auth/user-auth.js'

const router = express.Router()

//POST

//post public

//post methods admin


//GET

//get methods store endpoint
router.get('/getAnalyticsStats', AuthenticateUser, AllowedUserType(['seller']), controllers.getAnalyticsStats)
router.get('/getTotalRevenueStats', AuthenticateUser, AllowedUserType(['seller']), controllers.getTotalRevenueStats)
router.get('/getTopSellingProduct', AuthenticateUser, AllowedUserType(['seller']), controllers.getTopSellingProduct)

//get methods admin


export default router