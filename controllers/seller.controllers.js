import { calculateAverageRating, sendResponse } from "../middleware/utils.js"
import SellerKycInfoModel from "../models/SellerKycInfo.js"
import StoreModel from "../models/StoreFront.js"
import UserModel from "../models/User.js"
import cron from "node-cron";

//create/update store front (owner) - subscribed owner
export async function updateStoreDetails(req, res) {
    const { userId, storeId } = req.user
    const { storeImg, name, about, description, businessAddress, socialLink } = req.body
    const sellerId = storeId || userId

    try {
        let storeData
        const getSeller = await SellerKycInfoModel.findOne({ accountId: sellerId })

        const getStore = await StoreModel.findOne({ sellerId })
        if(getStore) {
            if(storeImg) getStore.storeImg = storeImg
            if(about) getStore.about = about
            if(description) getStore.description = description
            if(name) getStore.name = name
            if(businessAddress) getStore.businessAddress = businessAddress
            if(socialLink) getStore.socialLink = socialLink

            await getStore.save()
            if(!getStore?.name) {
                getStore.name = getSeller?.companyName
                await getStore.save()
            }
            storeData= getStore
        } else {
            const newStore = await StoreModel.create({
                sellerId,
                storeImg,
                name: name ? name : getSeller?.companyName,
                about,
                description, 
                businessAddress,
                socialLink  
            })
            storeData = newStore
        }

        const getUser = await UserModel.findOne({ userId })
        getUser.isStoreActive = true
        await getUser.save()

        sendResponse(res, 201, true, storeData, 'Store information updated successful')
    } catch (error) {
        console.log('UNABLE TO UPDATE STORE DETAILS', error)
        sendResponse(res, 500, false, null, 'Unable to update store details')
    }
}

//add reveiw to store (users)
export async function rateStore(req, res) {
  const { userId, name } = req.user;
  const { sellerId, rating, review } = req.body;

  if (!sellerId) return sendResponse(res, 400, false, null, 'Seller Id is required');
  if (!rating && !review) return sendResponse(res, 400, false, null, 'Either Review, rating or both is required');

  if (rating) {
    if (isNaN(rating)) return sendResponse(res, 400, false, null, 'Rating must be a number');
    if (rating < 1 || rating > 5) return sendResponse(res, 400, false, null, 'Rating must be between 1 and 5');
  }

  if (review && typeof review !== 'string') return sendResponse(res, 400, false, null, 'Review must be a string');

  try {
    let seller = await StoreModel.findOne({ sellerId });

    const newData = {};
    if (rating !== undefined) newData.rating = rating;
    if (review !== undefined) newData.review = review;

    if (seller) {
      const existingReviewIndex = seller.reviews.findIndex(r => r.userId === userId);

      if (existingReviewIndex !== -1) {
        seller.reviews[existingReviewIndex] = {
          ...seller.reviews[existingReviewIndex],
          ...newData,
        };
      } else {
        seller.reviews.push({ userId, ...newData, name, date: Date.now() });
      }

      await seller.save();
    } else {
      await StoreModel.create({
        sellerId,
        reviews: [{ userId, ...newData }],
      });
    }

    sendResponse(res, 200, true, null, 'Rating saved successfully');
  } catch (error) {
    console.log('UNABLE TO RATE SELLER', error);
    sendResponse(res, 500, false, null, 'Unable to rate seller');
  }
}

//get a store review
export async function getStoreReview(req, res) {
    const { sellerId } = req.params;
    const { limit = 10, page = 1 } = req.query;

    const parsedLimit = parseInt(limit);
    const parsedPage = parseInt(page);
    const skip = (parsedPage - 1) * parsedLimit;

    try {
        const reviews = await StoreModel.findOne({ sellerId })
            .skip(skip)
            .limit(parsedLimit)
            .sort({ createdAt: -1 }); // optional: latest first

            
            if (!reviews || reviews.length === 0) {
                return sendResponse(res, 404, false, null, 'No seller reviews found');
            }

            const totalReviews = reviews.reviews?.length;

        sendResponse(res, 200, true, {
            data: reviews.reviews,
            totalCount: totalReviews,
            currentPage: parsedPage,
            totalPages: Math.ceil(totalReviews / parsedLimit),
        }, 'Seller reviews retrieved successfully');
    } catch (error) {
        console.error('UNABLE TO GET SELLER REVIEWS:', error);
        sendResponse(res, 500, false, null, 'Unable to get seller reviews');
    }
}

//get store front (users) only active
export async function getStoreInfo(req, res) {
    const { sellerId } = req.params
    if(!sellerId) return sendResponse(res, 404, false, null, 'Seller Id is required')

    try {
        const getInfo = await StoreModel.findOne({ sellerId, active: true }).select('-__v -_id')
        if(!getInfo) return sendResponse(res, 404, false, null, 'Store Not found')
        
        const getAcountId = await SellerKycInfoModel.findOne({ accountId: sellerId }).select('-__v -_id -approved -active -userId')

        //rating
        const reviews = getInfo?.reviews || [];
        const rating = calculateAverageRating(reviews);
        const totalReviews = reviews.length;

        const getInfoData = getInfo.toObject()
        const getSellerData = getAcountId.toObject()
        const {
            accountId,
            sellerAccountType,
            nin,
            businessRegistrationNumber,
            taxId,
            isActive,
            ...filteredData
        } = getSellerData || {};

        getSellerData = filteredData;

        const data = {
            ...getInfoData,
            ...getSellerData,
            rating,
            totalReviews,   
        }

        sendResponse(res, 200, true, data, 'Store information fetched success')
    } catch (error) {
        console.log('UNABLE TO GET SELLER INFOMATION', error)
        sendResponse(res, 500, false, null, 'Unable to get store info')
    }
}

//get saved store front
export async function getSavedStoreInfo(req, res) {
  const { savedSeller = [] } = req.user;
  const { limit = 10, page = 1 } = req.query;

  const parsedLimit = Number(limit);
  const parsedPage = Number(page);
  const skip = (parsedPage - 1) * parsedLimit;

  try {
    if (!savedSeller.length) {
      return sendResponse(res, 200, true, {
        data: [],
        totalCount: 0,
        currentPage: parsedPage,
        totalPages: 0,
      }, 'No saved stores found');
    }

    // Get stores
    const stores = await StoreModel.find({
      sellerId: { $in: savedSeller },
      active: true
    })
      .select('-__v -_id')
      .skip(skip)
      .limit(parsedLimit);

    const total = await StoreModel.countDocuments({
      sellerId: { $in: savedSeller },
      active: true
    });

    // Build detailed store info
    const enrichedStores = await Promise.all(stores.map(async (store) => {
      const getInfoData = store.toObject();

      // Fetch Seller KYC info
      const getAccountId = await SellerKycInfoModel.findOne({ accountId: store.sellerId })
        .select('-__v -_id -approved -active -userId');

      let getSellerData = getAccountId ? getAccountId.toObject() : {};
      const {
        accountId,
        sellerAccountType,
        nin,
        businessRegistrationNumber,
        taxId,
        isActive,
        ...filteredData
      } = getSellerData;

      getSellerData = filteredData;

      // Rating
      const reviews = store?.reviews || [];
      const rating = calculateAverageRating(reviews);
      const totalReviews = reviews.length;

      return {
        ...getInfoData,
        ...getSellerData,
        rating,
        totalReviews
      };
    }));

    // Response
    const responsePayload = {
      data: enrichedStores,
      totalCount: total,
      currentPage: parsedPage,
      totalPages: Math.ceil(total / parsedLimit),
    };

    sendResponse(res, 200, true, responsePayload, 'Saved stores fetched successfully');
  } catch (error) {
    console.log('UNABLE TO GET USER SAVED STORES', error);
    sendResponse(res, 500, false, null, 'Unable to get user saved stores');
  }
}

//save/follow a store 
export async function saveStore(req, res) {
    const { userId } = req.user;
    const { sellerId } = req.body;

    try {
        const getSeller = await StoreModel.findOne({ sellerId, active: true });
        if (!getSeller) return sendResponse(res, 400, false, null, 'Seller not found');
        const getUser = await UserModel.findOne({ userId });

        const alreadyfollowed = getSeller.followers.includes(userId);
        if (alreadyfollowed) {
            return sendResponse(res, 400, false, null, 'Store saved');
        }

        getSeller.followers.push(userId);
        await getSeller.save();

        getUser.savedSeller.push(sellerId)
        await getUser.save()

        sendResponse(res, 200, true, null, 'Store saved');
    } catch (error) {
        console.log('UNABLE TO FOLLOW STORE', error);
        sendResponse(res, 500, false, null, 'Unable to save store');
    }
}

//unsave/unfollow a store
export async function unfollowStore(req, res) {
  const { userId } = req.user;
  const { sellerId } = req.body;

  try {
    const getSeller = await StoreModel.findOne({ sellerId, active: true });
    if (!getSeller) return sendResponse(res, 400, false, null, 'Seller not found');
    const getUser = await UserModel.findOne({ userId });

    // Remove the userId from the followers array
    getSeller.followers = getSeller.followers.filter(id => id !== userId);
    await getSeller.save();

    // Remove the sellerId from the savedSeller array
    getUser.savedSeller = getUser.savedSeller.filter(id => id !== sellerId);
    await getUser.save();

    sendResponse(res, 200, true, null,  'Store removed');
  } catch (error) {
    console.log('UNABLE TO UNFOLLOW STORE', error);
    sendResponse(res, 500, false, null, 'Unable to remove Store');
  }
}

//get all store front (admin)
export async function getAllStores(req, res) {
    const limit = parseInt(req.query.limit) || 10;
    const page = parseInt(req.query.page) || 1;
    const skip = (page - 1) * limit;
    const search = req.query.search?.trim();
    const active = req.query.active

    try {
        // Build search filter
        let filter = {};
        if (search) {
            filter = {
                $or: [
                    { sellerId: { $regex: search, $options: "i" } },   // case-insensitive
                    { name: { $regex: search, $options: "i" } }  // change `storeName` if your field is different
                ]
            };
        }
        if(active && active === 'true') {
            filter.active = true
        }
        if(active && active === 'false') {
            filter.active = false
        }

        const totalItems = await StoreModel.countDocuments(filter);
        const allSellers = await StoreModel.find(filter)
            .select("-__v -_id")
            .skip(skip)
            .limit(limit);

        const data = await Promise.all(
            allSellers.map(async (sellerDoc) => {
                const seller = sellerDoc.toObject();
                const reviews = seller.reviews || [];
                const rating = calculateAverageRating(reviews);
                const totalReviews = reviews.length;

                const accountDoc = await SellerKycInfoModel.findOne({
                    accountId: seller.sellerId
                }).select("-__v -_id");

                const account = accountDoc?.toObject() || {};

                return {
                    ...seller,
                    ...account,
                    rating,
                    totalReviews,
                };
            })
        );

        const totalPages = Math.ceil(totalItems / limit);

        sendResponse(
            res,
            200,
            true,
            {
                data,
                totalCount: totalItems,
                totalPages,
                currentPage: page,
                //pageSize: limit
            },
            "Stores information"
        );
    } catch (error) {
        console.log("UNABLE TO GET ALL SELLERS INFORMATION", error);
        sendResponse(res, 500, false, null, "Unable to get all sellers info");
    }
}

//get a store front (admin and owner)
export async function getAStoreInfo(req, res) {
    const { sellerId: accountId } = req.params
    const { userId } = req.user || {}
    const sellerId = userId || accountId
    if(!sellerId) return sendResponse(res, 404, false, null, 'Store Id is required')

    try {
        const getInfo = await StoreModel.findOne({ sellerId }).select('-__v -_id')
        if(!getInfo) return sendResponse(res, 404, false, null, 'Store Not found')
        
        const getAcountId = await SellerKycInfoModel.findOne({ accountId: sellerId }).select('-__v -_id')

        //rating
        const reviews = getInfo?.reviews || [];
        const rating = calculateAverageRating(reviews);
        const totalReviews = reviews.length;

        const getInfoData = getInfo.toObject()
        const getAcountIdData = getAcountId.toObject()
        const data = {
            ...getInfoData,
            ...getAcountIdData,
            rating,
            totalReviews, 
        }


        sendResponse(res, 200, true, data, 'Store information fetched success')
    } catch (error) {
        console.log('UNABLE TO GET SELLER INFOMATION FOR ADMIN', error)
        sendResponse(res, 500, false, null, 'Unable to get store info')
    }
}

//deactivate store (admin)
export async function deactivateStore(req, res) {
    const { sellerId } = req.body
    if(!sellerId) return sendResponse(res, 400, false, null, 'Store Id is required')

    try {
        const getStore = await StoreModel.findOne({ sellerId })
        if(!getStore) return sendResponse(res, 404, false, null, 'Store with this Id does not exist')

        getStore.active = false
        await getStore.save()

        sendResponse(res, 20, true, getStore, 'Store deactivated')
    } catch (error) {
        console.log('UNABLE TO DEACTIVE STORE FRONT ACCOUNT', error)
        sendResponse(res, 500, false, null, 'Unable to disable store front account')
    }
}

//activate store admin(admin)
export async function activateStore(req, res) {
    const { sellerId } = req.body
    if(!sellerId) return sendResponse(res, 400, false, null, 'Store Id is required')

    try {
        const getStore = await StoreModel.findOne({ sellerId })
        if(!getStore) return sendResponse(res, 404, false, null, 'Store with this Id does not exist')

        getStore.active = true
        await getStore.save()

        sendResponse(res, 20, true, getStore, 'Store activated')
    } catch (error) {
        console.log('UNABLE TO ACTIVE STORE FRONT ACCOUNT', error)
        sendResponse(res, 500, false, null, 'Unable to activate store front account')
    }
}

//auto deactivate store with expired subcription
export async function autoDeactivateStore() {
  try {
    const now = new Date();

    // Get all users with expired or free subscriptions
    const expiredUsers = await UserModel.find({
      $or: [
        { subscriptionType: "free" },
        { subscriptionEndDate: { $lt: now } },
      ],
    }).select("_id");

    if (!expiredUsers.length) {
      console.log("No expired/free subscriptions found at", now);
      return;
    }

    const expiredUserIds = expiredUsers.map((user) => user._id);

    // Deactivate all stores belonging to those users
    const storeResult = await StoreModel.updateMany(
      { sellerId: { $in: expiredUserIds }, active: true },
      { $set: { active: false } }
    );

    // Update users to reflect inactive store
    const userResult = await UserModel.updateMany(
      { _id: { $in: expiredUserIds }, isStoreActive: true },
      { $set: { isStoreActive: false } }
    );

    console.log(
      `Auto-deactivation complete at ${now}: ${storeResult.modifiedCount} store(s) deactivated, ${userResult.modifiedCount} user(s) updated`
    );
  } catch (error) {
    console.error("UNABLE TO DEACTIVATE SCHEDULED STORE", error);
  }
}

// Schedule job to run every 10 minutes
cron.schedule("*/10 * * * *", () => {
  console.log("Running autoDeactivateStore job...");
  autoDeactivateStore();
});

