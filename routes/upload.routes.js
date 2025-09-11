import express from 'express'
import * as controllers from '../controllers/upload.controlllers.js'
import { multerErrorHandler, uploadMiddleware } from '../middleware/utils.js'

const router = express.Router()

//POST
router.post('/', uploadMiddleware, multerErrorHandler, controllers.upload)

export default router