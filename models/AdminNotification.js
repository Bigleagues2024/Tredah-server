import mongoose from "mongoose";

const AdminNotificationSchema = new mongoose.Schema({
    adminId: {
        type: String,
        //required: [ true, 'User Id is required'],
        //unique: [ true, 'User Id already exist']
    },
    notification: {
        type: String
    },
    read: {
        type: Boolean,
        default: false
    }
},
{ timestamps: true }
)

const AdminNotificationModel = mongoose.model('adminUserNotification', AdminNotificationSchema)
export default AdminNotificationModel