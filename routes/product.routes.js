import express from 'express'
import * as controllers from '../controllers/product.controllers.js'
import { getLocation } from '../middleware/location.js'
import { uploadMiddleware } from '../middleware/utils.js'
import { AllowedUserType, AuthenticateUser } from '../middleware/auth/user-auth.js'
import { AuthenticateAdmin, PermissionsRole } from '../middleware/auth/admin-auth.js'

const router = express.Router()

//POST
router.post('/newProduct', AuthenticateUser, AllowedUserType(['seller']), controllers.newProduct)
router.post('/editProduct', AuthenticateUser, AllowedUserType(['seller']), controllers.editProduct)
router.post('/deleteProduct', AuthenticateUser, AllowedUserType(['seller']), controllers.deleteProduct)
router.post('/deActivateProduct', AuthenticateUser, AllowedUserType(['seller']), controllers.deActivateProduct)
router.post('/activateProduct', AuthenticateUser, AllowedUserType(['seller']), controllers.activateProduct)

//post public
router.post('/rateProduct', AuthenticateUser, controllers.rateProduct)
router.post('/likeProduct', AuthenticateUser, controllers.likeProduct)
router.post('/unlikeProduct', AuthenticateUser, controllers.unlikeProduct)


//post methods admin
router.post('/blockProduct', AuthenticateAdmin, PermissionsRole(['product', 'admin','superadmin']), controllers.blockProduct)
router.post('/unBlockProduct', AuthenticateAdmin, PermissionsRole(['product', 'admin','superadmin']), controllers.unBlockProduct)


//GET
router.get('/getCategories', controllers.getCategories)
router.get('/getProducts', controllers.getProducts)
router.get('/getStoreProducts/:sellerId', controllers.getStoreProducts)
router.get('/getProduct/:productId', controllers.getProduct)
router.get('/getRelatedProduct/:productId', controllers.getRelatedProduct)
router.get('/getProductReview/:productId', controllers.getProductReview)

//get methods store
router.get('/getStoreProduct', AuthenticateUser, AllowedUserType(['seller']), controllers.getSellerProducts) //for store owner get all products
router.get('/getProductDetail/productId', AuthenticateUser, AllowedUserType(['seller']), controllers.getAProduct) //for store owner get a product detail


//get methods admin
router.get('/getAllProducts', AuthenticateAdmin, PermissionsRole(['product', 'admin','superadmin']), controllers.getAllProducts)
router.get('/getSellerProducts/:sellerId', AuthenticateAdmin, PermissionsRole(['product', 'admin','superadmin']), controllers.getSellerProducts)
router.get('/getAProduct/:productId', AuthenticateAdmin, PermissionsRole(['product', 'admin','superadmin']), controllers.getAProduct)


export default router