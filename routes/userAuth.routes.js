import express from 'express'
import * as controllers from '../controllers/userAuth.controllers.js'
import { getLocation } from '../middleware/location.js'
import { AuthenticateUser } from '../middleware/auth/user-auth.js'

const router = express.Router()

//POST
router.post('/register', getLocation, controllers.register)
router.post('/verifyOtp', getLocation, controllers.verifyOtp)
router.post('/resendOtp', getLocation, controllers.resendOtp)
router.post('/completeBuyerOnboarding', getLocation, controllers.completeBuyerOnboarding)
router.post('/completeSellerOnboarding', getLocation, controllers.completeSellerOnboarding)
router.post('/login', getLocation, controllers.login)
router.post('/forgotPassword', getLocation, controllers.forgotPassword)
router.post('/resetPassword/:resetToken', getLocation, controllers.resetPassword)
router.post('/googleAuth', getLocation, controllers.googleAuth)
router.post('/signout', AuthenticateUser, controllers.signout)
router.post('/requestOtp', AuthenticateUser, controllers.requestOtp)

//DEV
router.post('/dele', getLocation, controllers.dele)


//GET
router.get('/verifyToken', AuthenticateUser, controllers.verifyToken)


export default router