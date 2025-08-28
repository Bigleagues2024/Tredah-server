import RefreshTokenModel from "../../models/RefreshToken.js";
import UserModel from "../../models/User.js";
import { sendResponse } from "../utils.js";
import jwt from "jsonwebtoken";

const SUSPENSION_TIME = 6 * 60 * 60 * 1000

export const AuthenticateUser = async (req, res, next) => {
    const accessToken = req.cookies.tredahtoken;
    const accountId = req.cookies.tredahauthid;
    console.log('AUTH USER >>', { accessToken, accountId, cookies: req.cookies });

    try {
        let user;

        if (accessToken) {
            try {
                const decoded = jwt.verify(accessToken, process.env.JWT_ACCESS_TOKEN_SECRET);
                const refreshTokenExist = await RefreshTokenModel.findOne({ accountId: decoded.id });

                if (decoded.accountType === 'user') {
                    user = await UserModel.findOne({ userId: decoded.id });
                }

                if (!user) {
                    return sendResponse(res, 404, false, 'User not found');
                }
                if (!refreshTokenExist) {
                    return sendResponse(res, 401, false, 'Unauthenticated');
                }

                req.user = user;
            } catch (error) {
                if (error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError') {
                    if (accountId) {
                        user = await UserModel.findOne({ userId: accountId });
                        const refreshTokenExist = await RefreshTokenModel.findOne({ accountId });

                        if (user && refreshTokenExist) {
                            const newAccessToken = user.getAccessToken();
                            res.cookie('tredahtoken', newAccessToken, {
                                httpOnly: true,
                                sameSite: 'None',
                                secure: true,
                                maxAge: 15 * 60 * 1000, // 15 minutes
                            });
                            req.user = user;
                        } else {
                            return sendResponse(res, 401, false, 'Unauthenticated');
                        }
                    } else {
                        return sendResponse(res, 401, false, 'Unauthenticated');
                    }
                }
            }
        } else if (accountId) {
            user = await UserModel.findOne({ userId: accountId });
            const refreshTokenExist = await RefreshTokenModel.findOne({ accountId });

            if (user && refreshTokenExist) {
                const newAccessToken = user.getAccessToken();
                res.cookie('tredahtoken', newAccessToken, {
                    httpOnly: true,
                    sameSite: 'None',
                    secure: true,
                    maxAge: 15 * 60 * 1000, // 15 minutes
                });
                req.user = user;
            } else {
                return sendResponse(res, 401, false, 'Unauthenticated');
            }
        } else {
            return sendResponse(res, 401, false, 'Unauthenticated');
        }

        // ==========================
        // ✅ Verify Account Section
        // ==========================
        const { verified, isBlocked, accountSuspended, temporaryAccountBlockTime, isActive } = req.user;

        if (!verified) {
            return sendResponse(res, 401, false, 'Your account is not verified');
        }
        if (!isActive) {
            return sendResponse(res, 401, false, 'Your account is not active, still undergoing KYC verification');
        }
        if (isBlocked) {
            return sendResponse(res, 401, false, 'Your account has been blocked. Contact admin for support');
        }
        if (accountSuspended) {
            const timeDiff = Date.now() - new Date(temporaryAccountBlockTime).getTime();
            const remainingTime = Math.ceil((SUSPENSION_TIME - timeDiff) / (60 * 1000)); // in minutes
            return sendResponse(res, 403, false, `Account temporarily blocked. Try again in ${remainingTime} minutes.`);
        }

        // If everything is fine
        return next();

    } catch (error) {
        console.error('Authentication/Verification error:', error);
        return sendResponse(res, 500, false, 'Server error during authentication');
    }
};

//allow account types
  export const AllowedUserType = (allowedUserType) => {
    //allowedUserType = ['seller', 'buyer]
    return (req, res, next) => {
      if (!req.user?.userType) {
        return sendResponse(res, 403, false, 'Not allowed', 'User account type not found');
      }
  
      // Check if the user's type is in the allowedUserType array
      if (!allowedUserType.includes(req.user.userType)) {
        return sendResponse(res, 403, false, 'Forbidden', 'You do not have permission to access this resource');
      }
  
      next();
    };
  };

//handle subscription

export const AuthenticateUserSocket = async (socket, next) => {
    //console.log('Authenticating user socket:', socket.id);

    try {
        const cookies = socket.handshake.headers.cookie || ''; // Safeguard for missing cookies
        if (!cookies) {
            console.log('No cookies received');
            return next(new Error('No cookies provided'));
        }

        const parseCookies = (cookieString) => {
            return cookieString.split(';').reduce((acc, cookie) => {
                const [key, value] = cookie.trim().split('=');
                acc[key] = decodeURIComponent(value);
                return acc;
            }, {});
        };

        const cookieObj = parseCookies(cookies);
        const userAccessToken = cookieObj['tredahtoken'];
        const userAccountId = cookieObj['tredahauthid'];

        const adminAccessToken = cookieObj['tredahtoken'];

        const accessToken = userAccessToken || adminAccessToken
        const accountId = userAccountId

        //console.log('AccessToken:', accessToken, 'AccountId:', accountId);

        let user = null;
        let accountType = null;

        if (accessToken) {
            try {
                const decoded = jwt.verify(accessToken, process.env.JWT_ACCESS_TOKEN_SECRET);
                console.log('Decoded token:', decoded);

                if (decoded.accountType === 'user') {
                    user = await UserModel.findOne({ userId: decoded.id });
                    accountType = 'user';
                } else {
                    return next(new Error('Invalid user account type'));
                }

                const refreshTokenExist = await RefreshTokenModel.findOne({ accountId: decoded.id });

                if (user && refreshTokenExist) {
                    socket.user = {
                        ...user.toObject(),
                        accountId: decoded.id,  // Add accountId to socket.user
                        accountType
                    };
                    if(socket.accountType === 'admin' && socket.user.isBlocked){
                        return next(new Error('Account is blocked'));
                    }
                    if(socket.accountType === 'user' && socket.user.isBlocked){
                        return next(new Error('Account is blocked'));
                    }
                    if(socket.accountType === 'user' && !socket.user.verified){
                        return next(new Error('Account is not yet verified'));
                    }
                    return next();
                }

                return next(new Error('Invalid access token'));
            } catch (error) {
                console.error('Token verification error:', error);
                return next(new Error('Token expired or invalid'));
            }
        }

        if (accountId) {
            user = await UserModel.findOne({ userId: accountId });
            accountType = 'user';

            const refreshTokenExist = await RefreshTokenModel.findOne({ accountId: accountId });

            if (user && refreshTokenExist) {
                socket.user = {
                    ...user.toObject(),
                    accountId,  // Add accountId to socket.user
                    accountType
                };
                if(socket.accountType === 'user' && socket.user.isBlocked){
                    return next(new Error('Account is blocked'));
                }
                if(socket.accountType === 'user' && !socket.user.verified){
                    return next(new Error('Account is not yet verified'));
                }
                socket.emit('tokenRefreshed', { accessToken: user.getAccessToken() });
                return next();
            }
        }

        return next(new Error('Unauthenticated'));
    } catch (error) {
        console.error('Authentication error:', error);
        return next(new Error('Server error during authentication'));
    }
};