import express from 'express'
import * as controllers from '../controllers/subscription.controllers.js'
import { getLocation } from '../middleware/location.js'
import { AllowedStoreStaff, AuthenticateUser } from '../middleware/auth/user-auth.js'
import { AuthenticateAdmin, PermissionsRole } from '../middleware/auth/admin-auth.js'

const router = express.Router()

//POST
router.post('/', AuthenticateAdmin, PermissionsRole(['subscription', 'admin','superadmin']), controllers.createSubscriptionPlan)
router.post('/toggleActive', AuthenticateAdmin, PermissionsRole(['subscription', 'admin','superadmin']), controllers.toggleSubscriptionPlan)
router.post('/subscribe', AuthenticateUser, AllowedStoreStaff(['subscription']), controllers.makeSubscription)


//post methods admin


//PUT
router.patch('/:id', AuthenticateAdmin, PermissionsRole(['subscription', 'admin','superadmin']), controllers.updateSubscriptionPlan)


//GET
router.get('/', controllers.getSubscriptions)

//get methods admin
router.get('/all', AuthenticateAdmin, PermissionsRole(['subscription', 'admin','superadmin']), controllers.getSubscriptions)

router.get('/histroy', AuthenticateAdmin, PermissionsRole(['subscription', 'admin','superadmin']), controllers.getSubscriptionHistory)
router.get('/history/:id', AuthenticateAdmin, PermissionsRole(['subscription', 'admin','superadmin']), controllers.getSubscriptionDetails)
router.get('/stats', AuthenticateAdmin, PermissionsRole(['subscription', 'admin','superadmin']), controllers.getSubscriptionStats)



export default router