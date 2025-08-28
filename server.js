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

//STRIPE WEBHOOK
//import * as sexOrientControllers from './controllers/sex-orient/stripeWebhook.controllers.js';

//app.post('/api/sex-orient/webhook/stripeWebHook', express.raw({ type: 'application/json' }), sexOrientControllers.stripeWebHook);

//EXPRESS MIDDLEWARE
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

//ROUTES IMPORT
import UserAuthRoutes from './routes/userAuth.routes.js'
import UserRoutes from './routes/user.routes.js'



//ROUTES ENDPOINT
app.use('/api/auth', UserAuthRoutes)
app.use('/api/user', UserRoutes)



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
/**GENERAL SOCKET */
import { AuthenticateUserSocket } from "./middleware/auth/user-auth.js";

//import * as interactiveSectionController from './controllers/sex-orient/interactiveSectionCourse.controllers.js';

export const generalNamespace = io.of('/general');

export const generalConnections = new Map()

// Apply socket-specific authentication middleware for General
generalNamespace.use(AuthenticateUserSocket);
generalNamespace.on('connection', (socket) => {
  console.log('USER CONNECTED:', socket.id);

  const { userId } = socket.user

  if(userId){
    generalConnections.set(userId, socket.id)
  }
  console.log('CONNECTING USER ID TO SOCKET ID', generalConnections)

  //sockets for live call
  //socket.on('interactiveChat', (data) => interactiveSectionController.interactiveChat( data, socket ));
  
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    if(userId){
      generalConnections.delete(userId)
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