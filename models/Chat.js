import mongoose from "mongoose";

const ChatSchema = new mongoose.Schema({
    chatId: {
        type: String,
        required: [ true, 'Chat Id is required'],
        unique: [ true, 'Chat Id must be unique'],
    },
    sellerId: {
        type: String,
        required: [ true, 'Seller Id is required'],
    },
    buyerId: {
        type: String,
        required: [ true, 'Buyer Id is required'],
    },
    chats: [
        {
            message: {
                type: String
            },
            from: {
                type: String
            },
            mediaLink: {
                type: String
            },
            mediaType: {
                type: String
            },
            senderId: {
                type: String
            },
            profileImg: {
                type: String
            },
            name: {
                type: String
            },
            editedAt: {
                type: Date
            }
        }
    ]
},
{ timestamps: true }
)

const ChatModel = mongoose.model('chat', ChatSchema)
export default ChatModel