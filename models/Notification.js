import mongoose from "mongoose";

const NotificationSchema = new mongoose.Schema({
    userId: {
        type: String,
        //required: [ true, 'User Id is required'],
        //unique: [ true, 'User Id already exist']
    },
    notification: {
        type: String
    },
    image: {
        type: String
    },
    read: {
        type: Boolean,
        default: false
    }
},
{ timestamps: true }
)

const NotificationModel = mongoose.model('notification', NotificationSchema)
export default NotificationModel