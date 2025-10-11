import express from 'express'
import * as controllers from '../controllers/subscription.controllers.js'
import { getLocation } from '../middleware/location.js'
import { AuthenticateUser } from '../middleware/auth/user-auth.js'
import { AuthenticateAdmin, PermissionsRole } from '../middleware/auth/admin-auth.js'

const router = express.Router()

//POST
router.post('/', AuthenticateAdmin, PermissionsRole(['admin','superadmin']), controllers.createSubscriptionPlan)
router.post('/toggleActive', AuthenticateAdmin, PermissionsRole(['admin','superadmin']), controllers.toggleSubscriptionPlan)
router.post('/subscribe', AuthenticateUser, controllers.makeSubscription)


//post methods admin


//PUT
router.patch('/:id', AuthenticateAdmin, PermissionsRole(['admin','superadmin']), controllers.createSubscriptionPlan)


//GET
router.get('/', controllers.getSubscriptions)

//get methods admin
router.get('/all', AuthenticateAdmin, PermissionsRole(['admin','superadmin']), controllers.getSubscriptions)

router.get('/histroy', AuthenticateAdmin, PermissionsRole(['admin','superadmin']), controllers.getSubscriptionHistory)
router.get('/history/:id', AuthenticateAdmin, PermissionsRole(['admin','superadmin']), controllers.getSubscriptionDetails)
router.get('/stats', AuthenticateAdmin, PermissionsRole(['admin','superadmin']), controllers.getSubscriptionStats)



export default router