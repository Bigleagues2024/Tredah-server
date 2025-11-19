import express from 'express'
import * as controllers from '../controllers/revenue.controllers.js'
import { getLocation } from '../middleware/location.js'
import { AuthenticateAdmin, PermissionsRole } from '../middleware/auth/admin-auth.js'

const router = express.Router()

//POST


//post methods admin


//PUT


//GET

//get methods admin

router.get('/', AuthenticateAdmin, PermissionsRole(['revenue', 'admin','superadmin']), controllers.getRevenues)
router.get('/stats', AuthenticateAdmin, PermissionsRole(['revenue', 'admin','superadmin']), controllers.getRevenueStats)



export default router