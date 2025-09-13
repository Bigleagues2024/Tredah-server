import OrderContractExchangesModel from "../models/OrderContractExchanges.js"
import UserModel from "../models/User.js"
import path from "path";
import { URL } from "url";
import { generalConnections, generalNamespace } from "../server.js";
import { generateUniqueCode } from "../middleware/utils.js";
import NotificationModel from "../models/Notification.js";

//get user all chat contacts
export async function getChats({ socket = {}, data = {} }) {
  const { userId, userType } = socket.user;
  const isSeller = userType.toLowerCase() === "seller";

  try {
    // get all chats where this user is either the seller or buyer
    const query = isSeller ? { sellerId: userId } : { buyerId: userId };

    const chats = await OrderContractExchangesModel.find(query)
      .sort({ updatedAt: -1 }) // sort latest updated chats first
      .lean();

    if (!chats.length) {
      socket.emit("getChats", {
        success: true,
        data: [],
        message: "No chat history found",
      });
      return;
    }

    // map results
    const contacts = chats.map((chat) => {
      const lastMessage =
        chat.chats && chat.chats.length > 0
          ? chat.chats[0] // since you are unshifting, first element is latest
          : null;

      return {
        contractId: chat.contractId,
        buyerId: chat.buyerId,
        sellerId: chat.sellerId,
        lastMessage,
      };
    });

    socket.emit("getChats", {
      success: true,
      data: contacts,
      message: "Chat contacts retrieved successfully",
    });
  } catch (error) {
    console.log("UNABLE TO GET CHATS HISTORY DATA OF USER", error);
    socket.emit("getChats", {
      success: false,
      data: null,
      message: "Unable to get chats history",
    });
  }
}

//get a chat history
export async function getChatHistroy({ socket = {}, data = {} }) {
    const { userId, userType } = socket.user
    const { orderId } = data
    const isSeller = userType.toLowerCase() === "seller" ? true : false;

    if(!orderId) {
        socket.emit('getChatHistroy', { success: false, data: null, message: 'Order Id is required' })
        return
    }

    try {
        const getChatHistroyData = await OrderContractExchangesModel.findOne({ orderId })
        if(!getChatHistroyData) return socket.emit('getChatHistroy', { success: false, data: null, message: 'Chat not found' })
        if(isSeller){
            if(getChatHistroyData.sellerId !== userId) return socket.emit('getChatHistroy', { success: false, data: null, message: 'Not allowed'})
        } else {
            if(getChatHistroyData.buyerId !== userId) return socket.emit('getChatHistroy', { success: false, data: null, message: 'Not allowed'})
        }

        socket.emit('getChatHistroy', { success: true, data: getChatHistroyData?.chats, message: 'Chat histroy fetched success'})
    } catch (error) {
        console.log('UNABLE TO GET CHAT HISTORY', error)
        socket.emit('getChatHistroy', { success: false, data: null, message: 'Unable to get chat history' })
    }
}

//message a user
export async function sendMessage({ socket = {}, data = {} }) {
  const { userId: senderId, userType, name, profileImg } = socket.user;
  const { orderId, receiverId, message, mediaLink } = data;
  const isSeller = userType.toLowerCase() === "seller" ? true : false;
  
  if (!orderId) {
    socket.emit("sendMessage", {
      success: false,
      data: null,
      message: "Order id is required/cannot be blank",
    });
    return;
  }

  if (!message && !mediaLink) {
    socket.emit("sendMessage", {
      success: false,
      data: null,
      message: "Message is required/cannot be blank",
    });
    return;
  }

  // ✅ Validate mediaLink
  let mediaType = null;
  if (mediaLink) {
    try {
      new URL(mediaLink); // throws if not valid
    } catch {
      socket.emit("sendMessage", {
        success: false,
        data: null,
        message: "Media link must be a valid URL",
      });
      return;
    }

    // ✅ Extract extension
    const ext = path.extname(mediaLink).toLowerCase();

    if ([".png", ".jpg", ".jpeg", ".gif", ".webp"].includes(ext)) {
      mediaType = "image";
    } else if ([".mp3", ".wav", ".ogg"].includes(ext)) {
      mediaType = "audio";
    } else if ([".mp4", ".mov", ".avi", ".mkv"].includes(ext)) {
      mediaType = "video";
    } else if ([".pdf"].includes(ext)) {
      mediaType = "document";
    } else {
      mediaType = "unknown";
    }
  }

  try {
    const getReciever = await UserModel.findOne({ userId: receiverId });
    if (!getReciever) {
      socket.emit("sendMessage", {
        success: false,
        data: null,
        message: "Receiver not found",
      });
      return;
    }

    // ✅ Create message data
    const messagData = {
      message,
      from: isSeller ? "seller" : "buyer",
      mediaLink,
      mediaType,
      senderId,
      profileImg,
      name,
      createdAt: new Date(),
    };

    // ✅ Get chat history or create new
    let sellerId = isSeller ? senderId : receiverId;
    let buyerId = !isSeller ? senderId : receiverId;

    let chatHistory = await OrderContractExchangesModel.findOne({ sellerId, buyerId, orderId });
    if (chatHistory) {
      chatHistory.chats.unshift(messagData);
      await chatHistory.save();
    } else {
        const generateCode = generateUniqueCode(10)
        const contractId = `TRH${generateCode}CHT`
      chatHistory = await OrderContractExchangesModel.create({
        contractId,
        orderId,
        sellerId,
        buyerId,
        chats: [messagData],
      });
    }

    //create new notification to reciever
    await NotificationModel.create({
        userId: receiverId,
        image: profileImg,
        notificationType: `New message from ${name} (${isSeller ? 'Seller' : 'Buyer'}) on order chat order: ${orderId}`,
    })

    //notify receiver
    const receiverSocketId = generalConnections.get(receiverId)
    if(receiverSocketId){
        generalNamespace.to(receiverSocketId).emit('incomingMessage', { success: true, data: chatHistory, message: 'New incoming message'})
    }

    socket.emit("sendMessage", {
      success: true,
      data: chatHistory,
      message: "Message sent",
    });
  } catch (error) {
    console.log("UNABLE TO SEND MESSAGE TO RECEIVER", error);
    socket.emit("sendMessage", {
      success: false,
      data: null,
      message: `Unable to send message to ${isSeller ? "Seller" : "Buyer"}`,
    });
  }
}

//edit a message
export async function editMessage({ socket = {}, data = {} }) {
  const { userId } = socket.user;
  const { contractId, messageId, newMessage } = data;

  if (!contractId || !messageId || !newMessage) {
    socket.emit("editMessage", {
      success: false,
      data: null,
      message: "contractId, messageId and newMessage are required",
    });
    return;
  }

  try {
    // Find the chat and the specific message, then update message and editedAt
    const chatHistory = await OrderContractExchangesModel.findOneAndUpdate(
      { contractId, "chats._id": messageId, "chats.senderId": userId },
      { 
        $set: { 
          "chats.$.message": newMessage,
          "chats.$.editedAt": new Date()   // store edit timestamp
        } 
      },
      { new: true }
    );

    if (!chatHistory) {
      socket.emit("editMessage", {
        success: false,
        data: null,
        message: "Message not found or not authorized",
      });
      return;
    }

    socket.emit("editMessage", {
      success: true,
      data: chatHistory,
      message: "Message updated",
    });

    // Notify the receiver in real-time
    const receiverId =
      chatHistory.sellerId === userId ? chatHistory.buyerId : chatHistory.sellerId;
    const receiverSocketId = generalConnections.get(receiverId);
    if (receiverSocketId) {
      generalNamespace
        .to(receiverSocketId)
        .emit("messageUpdated", { success: true, data: chatHistory });
    }
  } catch (error) {
    console.error("UNABLE TO EDIT MESSAGE", error);
    socket.emit("editMessage", {
      success: false,
      data: null,
      message: "Unable to edit message",
    });
  }
}

// delete a message
export async function deleteMessage({ socket = {}, data = {} }) {
  const { userId } = socket.user;
  const { contractId, messageId } = data;

  if (!contractId || !messageId) {
    socket.emit("deleteMessage", {
      success: false,
      data: null,
      message: "contractId and messageId are required",
    });
    return;
  }

  try {
    // Remove the message if it belongs to the user
    const chatHistory = await OrderContractExchangesModel.findOneAndUpdate(
      { contractId, "chats._id": messageId, "chats.senderId": userId },
      { $pull: { chats: { _id: messageId } } },
      { new: true }
    );

    if (!chatHistory) {
      socket.emit("deleteMessage", {
        success: false,
        data: null,
        message: "Message not found or not authorized",
      });
      return;
    }

    socket.emit("deleteMessage", {
      success: true,
      data: chatHistory,
      message: "Message deleted",
    });

    // Notify receiver
    const receiverId =
      chatHistory.sellerId === userId ? chatHistory.buyerId : chatHistory.sellerId;
    const receiverSocketId = generalConnections.get(receiverId);
    if (receiverSocketId) {
      generalNamespace
        .to(receiverSocketId)
        .emit("messageDeleted", { success: true, data: { contractId, messageId } });
    }
  } catch (error) {
    console.error("UNABLE TO DELETE MESSAGE", error);
    socket.emit("deleteMessage", {
      success: false,
      data: null,
      message: "Unable to delete message",
    });
  }
}