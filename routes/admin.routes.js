import express from 'express'
import * as controllers from '../controllers/admin.controllers.js'
import { getLocation } from '../middleware/location.js'
import { AuthenticateAdmin, PermissionsRole } from '../middleware/auth/admin-auth.js'

const router = express.Router()

//POST
router.post('/profile', AuthenticateAdmin, controllers.updateProfile) 
router.post('/updatePassword', AuthenticateAdmin, controllers.updatePassword) 
router.post('/requestOtp', AuthenticateAdmin, controllers.requestOtp) 
router.post('/login', controllers.login) 
router.post('/forgotPassword', controllers.forgotPassword) 
router.post('/resetPassword', controllers.resetPassword) 
router.post('/signout', AuthenticateAdmin, controllers.signout) 



//store
router.post('/', AuthenticateAdmin, PermissionsRole(['staff']), controllers.createAdminUser)
router.patch('/:adminId', AuthenticateAdmin, PermissionsRole(['staff']), controllers.updateAdmin)
router.delete('/:adminId', AuthenticateAdmin, PermissionsRole(['staff']), controllers.deleteAdmin)


//GET
router.get('/profile', AuthenticateAdmin, controllers.getProfile) 
router.get('/verifyToken', AuthenticateAdmin, controllers.verifyToken) 

//store
router.get('/', AuthenticateAdmin, PermissionsRole(['staff']), controllers.getAdmins)
router.get('/:staffId', AuthenticateAdmin, PermissionsRole(['staff']), controllers.getAdmin)


export default router