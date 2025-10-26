import express from "express";
import cors from 'cors';
import { config } from "dotenv";
import cookieParser from 'cookie-parser';
import bodyParser from 'body-parser';
import http from 'http'; 
import { Server } from 'socket.io';
config()
import morgan from 'morgan';

const app = express()
const server = http.createServer(app); 
const io = new Server(server, {
    cors: {
      origin: [
        process.env.SERVER_URL,
        process.env.DEV_URL_ONE,
        process.env.DEV_URL_TWO,

      ],
      methods: ["GET", "POST"],
      credentials: true,
      transports: ["websocket"],
    },
  });

//DB
import './connection/db.js';

// CORS setup
const allowedOrigins = [
    process.env.SERVER_URL,
    process.env.DEV_URL_ONE,
    process.env.DEV_URL_TWO,
];

const corsOptions = {
    origin: function (origin, callback) {
        console.log('URL ORIGIN', origin);
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS', 'ORIGIN>', origin));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
};
app.use(cors(corsOptions));

// Add Morgan middleware to log HTTP requests
app.use(morgan('dev'));

//PAYSTACK WEBHOOK
import * as payStackControllers from './controllers/paystackWebhook.controllers.js';

app.post('/api/paystack/subscription/webhook', express.raw({ type: 'application/json' }), payStackControllers.paystackSubscriptionWebHook);

//EXPRESS MIDDLEWARE
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

//ROUTES IMPORT
import UserAuthRoutes from './routes/userAuth.routes.js'
import UserRoutes from './routes/user.routes.js'
import UploadRoutes from './routes/upload.routes.js'
import ProductRoutes from './routes/product.routes.js'
import SellerRoutes from './routes/seller.routes.js'
import TransactionRoutes from './routes/transaction.routes.js'
import OrderRoutes from './routes/order.routes.js'
import SubscriptionRoutes from './routes/subscription.routes.js'



//ROUTES ENDPOINT
app.use('/api/auth', UserAuthRoutes)
app.use('/api/user', UserRoutes)
app.use('/api/upload', UploadRoutes)
app.use('/api/product', ProductRoutes)
app.use('/api/seller', SellerRoutes)
app.use('/api/transaction', TransactionRoutes)
app.use('/api/order', OrderRoutes)
app.use('/api/subscription', SubscriptionRoutes)





//DOCs
import swaggerUI from 'swagger-ui-express';
import YAML from 'yamljs';

const swaggerGeneralJSDocs = YAML.load('./docs/api-doc.yaml');

// Serve Swagger UI correctly for each route
const swaggerGeneralUI = swaggerUI.serveFiles(swaggerGeneralJSDocs, { explorer: true });

//Swagger docs routes
app.use('/api/api-doc', swaggerGeneralUI, swaggerUI.setup(swaggerGeneralJSDocs, { explorer: true }));



import { sendResponse } from "./middleware/utils.js";
//SOCKET.IO
import { AllowedSocketStoreStaff, AuthenticateUserSocket } from "./middleware/auth/user-auth.js";

import * as messageChat from './controllers/chat.controllers.js';
import * as orderExchangeChat from './controllers/orderContractExchanges.controllers.js';

/**GENERAL SOCKET */
export const generalNamespace = io.of('/general');

export const generalConnections = new Map()

// Apply socket-specific authentication middleware for General
generalNamespace.use(AuthenticateUserSocket);
generalNamespace.use(AllowedSocketStoreStaff(['customerSupport']));

generalNamespace.on('connection', (socket) => {
  console.log('USER CONNECTED:', socket.id);

  const { userId } = socket.user

  if(userId){
    generalConnections.set(userId, socket.id)
  }
  console.log('CONNECTING USER ID TO SOCKET ID', generalConnections)

  //sockets for live call
  socket.on('sendMessage', (data) => messageChat.sendMessage( data, socket )); //send message to user(either seller or buyer) (incomingMessage)
  socket.on('getChatHistroy', (data) => messageChat.getChatHistroy( data, socket )); //get chat histroy a user chat with receiver
  socket.on('editMessage', (data) => messageChat.editMessage( data, socket )); //update sent message ('messageUpdated)
  socket.on('deleteMessage', (data) => messageChat.deleteMessage( data, socket )); //delete sent message ('messageDeleted)
  socket.on('getChats', (data) => messageChat.getChats( data, socket )); //user get chats history
  //socket emits
  //incomingMessage
  //messageUpdated
  //messageDeleted

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    if(userId){
      generalConnections.delete(userId)
    }
  });

});


/**ORDER SOCKET */
export const orderNamespace = io.of('/order');

export const orderConnections = new Map()

// Apply socket-specific authentication middleware for order namespace
orderNamespace.use(AuthenticateUserSocket);
orderNamespace.use(AllowedSocketStoreStaff(['orderContract']));

orderNamespace.on('connection', (socket) => {
  console.log('USER CONNECTED:', socket.id);

  const { userId } = socket.user

  if(userId){
    orderConnections.set(userId, socket.id)
  }
  console.log('CONNECTING USER ID TO ORDER NAMESPACE SOCKET ID', orderConnections)

  //sockets for live call
  socket.on('sendMessage', (data) => orderExchangeChat.sendMessage( data, socket )); //send message to user(either seller or buyer) (incomingMessage)
  socket.on('getChatHistroy', (data) => orderExchangeChat.getChatHistroy( data, socket )); //get chat histroy a user chat with receiver
  socket.on('editMessage', (data) => orderExchangeChat.editMessage( data, socket )); //update sent message ('messageUpdated)
  //socket.on('deleteMessage', (data) => orderExchangeChat.deleteMessage( data, socket )); //delete sent message ('messageDeleted)
  socket.on('getChats', (data) => orderExchangeChat.getChats( data, socket )); //user get chats history
  //socket emits
  //incomingMessage
  //messageUpdated
  //messageDeleted (removed)

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    if(userId){
      orderConnections.delete(userId)
    }
  });

});


//import './corn-jobs.js'
app.get('/', (req, res) => {
    try {
        return sendResponse(res, 200, true, 'Home get req')
    } catch (error) {
        console.log('BASE ENDPOINT ERROR', error)
        return sendResponse(res, 500, false, 'Home get error')
    }
})

const PORT = process.env.PORT || 12000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});