import mongoose from "mongoose"

const AppSettingsSchema = new mongoose.Schema({
    commission: {
        type: Number,
        default: 0
    },
    
    
},
{ 
    timestamps: true
 }
)

const AppSettingsModel = mongoose.model('appSetting', AppSettingsSchema)
export default AppSettingsModel