import AdminModel from "../../models/Admin.js";
import RefreshTokenModel from "../../models/RefreshToken.js";
import { sendResponse } from "../utils.js";
import jwt from "jsonwebtoken";
import moment from "moment";

//Authenticate admin
const SUSPENSION_TIME = 6 * 60 * 60 * 1000;

export const AuthenticateAdmin = async (req, res, next) => {
    const accessToken = req.cookies.tredahoneadmintoken;
    const accountId = req.cookies.trdahoneadminauthid;
    console.log('ADMIN', 'accessToken', accessToken, 'accountId', accountId);

    try {
        let user;
        let refreshTokenExist;

        if (accessToken) {
            try {
                const decoded = jwt.verify(accessToken, process.env.JWT_ACCESS_TOKEN_SECRET);
                refreshTokenExist = await RefreshTokenModel.findOne({ accountId: decoded.id });

                if (decoded.accountType === 'admin') {
                    user = await AdminModel.findOne({ adminId: decoded.id });
                }

                if (!user || !refreshTokenExist) {
                    return sendResponse(res, 401, false, 'Unauthenticated');
                }
            } catch (error) {
                if (error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError') {
                    if (accountId) {
                        user = await AdminModel.findOne({ adminId: accountId });
                        refreshTokenExist = await RefreshTokenModel.findOne({ accountId });

                        if (!user || !refreshTokenExist) {
                            return sendResponse(res, 401, false, 'Unauthenticated');
                        }

                        const accessToken = user.getAccessToken();
                        res.cookie('tredahoneadmintoken', accessToken, {
                            httpOnly: true,
                            sameSite: 'None',
                            secure: true,
                            maxAge: 15 * 60 * 1000, // 15 minutes
                        });
                    } else {
                        return sendResponse(res, 401, false, 'Unauthenticated');
                    }
                }
            }
        } else if (accountId) {
            user = await AdminModel.findOne({ adminId: accountId });
            refreshTokenExist = await RefreshTokenModel.findOne({ accountId });

            if (!user || !refreshTokenExist) {
                return sendResponse(res, 401, false, 'Unauthenticated');
            }

            const accessToken = user.getAccessToken();
            res.cookie('tredahoneadmintoken', accessToken, {
                httpOnly: true,
                sameSite: 'None',
                secure: true,
                maxAge: 15 * 60 * 1000, // 15 minutes
            });
        } else {
            return sendResponse(res, 401, false, 'Unauthenticated');
        }

        // Account verification logic merged
        const { isBlocked, accountSuspended, isActive, temporaryAccountBlockTime } = user;

        if (accountSuspended) {
            const timeDiff = Date.now() - new Date(temporaryAccountBlockTime).getTime();
            const remainingTime = Math.ceil((SUSPENSION_TIME - timeDiff) / (60 * 1000)); // in minutes
            return sendResponse(res, 403, false, `Account temporarily blocked. Try again in ${remainingTime} minutes.`);
        }

        if (isBlocked) {
            return sendResponse(res, 403, false, 'Your account has been blocked');
        }

        if (!isActive) {
            return sendResponse(res, 403, false, `Your access to this account has been revoked. Account: ${status}`);
        }

        req.user = user;
        return next();
    } catch (error) {
        console.error('Authentication error:', error);
        return sendResponse(res, 500, false, 'Server error during authentication');
    }
};

  //Allowed user roles:
  export const UserRole = (allowedRoles) => {
    return (req, res, next) => {
      if (!req.user?.role) {
        return sendResponse(res, 403, false, 'Unauthorized', 'User role not found');
      }
  
      // Check if the user's role is in the allowedRoles array
      if (!allowedRoles.includes(req.user.role)) {
        return sendResponse(res, 403, false, 'Forbidden', 'You do not have permission to access this resource');
      }
  
      next();
    };
  };


// Admin User Allowed Permissions:
export const PermissionsRole = (allowedRoles) => {
    return (req, res, next) => {
      if (
        !req.user?.permissions || 
        !req.user.permissions.some(role => allowedRoles.map(r => r.toLowerCase()).includes(role.toLowerCase()))
      ) {
        return sendResponse(res, 403, false, "No Permission", "You do not have permission for this request");
      }
  
      next();
    };
  };
  
  