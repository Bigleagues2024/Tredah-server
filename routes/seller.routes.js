import express from 'express'
import * as controllers from '../controllers/seller.controllers.js'
import { getLocation } from '../middleware/location.js'
import { uploadMiddleware } from '../middleware/utils.js'
import { AllowedStoreStaff, AllowedUserType, AuthenticateUser } from '../middleware/auth/user-auth.js'
import { AuthenticateAdmin, PermissionsRole } from '../middleware/auth/admin-auth.js'

const router = express.Router()

//POST
router.post('/updateStoreDetails', AuthenticateUser, AllowedUserType(['seller']), AllowedStoreStaff(['store']), controllers.updateStoreDetails) //subscription protected endpoint

//post public
router.post('/rateStore', AuthenticateUser, controllers.rateStore)
router.post('/saveStore', AuthenticateUser, controllers.saveStore)
router.post('/unfollowStore', AuthenticateUser, controllers.unfollowStore)

//post methods admin
router.post('/activateStore', AuthenticateAdmin, PermissionsRole(['seller', 'admin','superadmin']), controllers.activateStore)
router.post('/deactivateStore', AuthenticateAdmin, PermissionsRole(['seller', 'admin','superadmin']), controllers.deactivateStore)


//GET
router.get('/getStoreReview/:sellerId', controllers.getStoreReview)
router.get('/getStoreDetails/:sellerId', controllers.getStoreInfo)
router.get('/getSavedStoreInfo', AuthenticateUser, controllers.getSavedStoreInfo)

//get methods store endpoint
router.get('/getStoreInfo', AuthenticateUser, AllowedUserType(['seller']), controllers.getAStoreInfo)

//get methods admin
router.get('/getAllStores', AuthenticateAdmin, PermissionsRole(['seller', 'admin','superadmin']), controllers.getAllStores)
router.get('/getAStoreInfo/:sellerId', AuthenticateAdmin, PermissionsRole(['seller', 'admin','superadmin']), controllers.getAStoreInfo)


export default router