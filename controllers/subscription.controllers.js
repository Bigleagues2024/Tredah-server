import paystack from "../middleware/paystack.js";
import { sendResponse } from "../middleware/utils.js";
import SubscriptionHistroyModel from "../models/SubscriptionHistroy.js";
import SubscriptionPlanModel from "../models/SubscriptionsPlan.js";
import UserModel from "../models/User.js";
import { subDays } from "date-fns";

function validateFeatures(features) {
  // Ensure features is an array
  if (!Array.isArray(features)) {
    return { success: false, data: 'Features must be an array.' };
  }

  for (const item of features) {
    // Each item must be an object
    if (typeof item !== 'object' || item === null) {
      return { success: false, data: 'Each feature must be an object.' };
    }

    // 'feature' must exist and be a string
    if (!('feature' in item) || typeof item.feature !== 'string') {
      return { success: false, data: "Each item must have a 'feature' key with a string value." };
    }

    // 'active' must exist and be a boolean
    if (!('active' in item) || typeof item.active !== 'boolean') {
      return { success: false, data: "Each item must have an 'active' key with a boolean value." };
    }
  }

  // If all checks pass
  return { success: true, data: 'All features are valid.' };
}

const intervalOption = ['hourly', 'monthly', 'quarterly', 'biannually', 'yearly']

// Create a subscription plan (Admin)
export async function createSubscriptionPlan(req, res) {
  try {
    const { productName, price, subscriptionTier, interval, features, trialPeriodDays, slug, productCTA } = req.body;
    if(!productName) return sendResponse(res, 400, false, 'Product Name is required')
    if(!price) return sendResponse(res, 400, false, 'Product Price is required')
    if(!subscriptionTier) return sendResponse(res, 400, false, 'Subscription Tier Number is required')
    if(isNaN(price)) return sendResponse(res, 400, false, 'Price is an invalid number')
    if(isNaN(subscriptionTier)) return sendResponse(res, 400, false, 'Subscription Tier is an invalid number')

    if(features){
        const verifyFeature = validateFeatures(features)
        if(!verifyFeature.success){
            console.log('object', verifyFeature)
            return sendResponse(res, 400, false, verifyFeature.data)
        }
    }
    if(interval && !intervalOption.includes(interval)) return sendResponse(res, 400, false, null, 'Invalid interval options')

    const isTeirExist = await SubscriptionPlanModel.findOne({ disabled: false, subscriptionTier })
    if(isTeirExist) return sendResponse(res, 400, false, null, 'An active subcription plan already exist with this subscription tier')

    // Create on Paystack
    const { data: paystackRes } = await paystack.post("/plan", {
        name: productName,
        amount: price * 100, // kobo
        interval: interval || 'monthly', // monthly, yearly
        currency: "NGN",
        description: productCTA || slug || '',
        //trial_days: trialPeriodDays ? parseInt(trialPeriodDays) : 0,
    });

    const plan = new SubscriptionPlanModel({
      productName,
      price,
      interval,
      trialPeriodDays,
      subscriptionTier,
      productId: paystackRes.data.plan_code,
      priceId: paystackRes.data.id.toString(),
      features,
      slug,
      productCTA
    });

    await plan.save();

    sendResponse(res, 201, true, plan, "Subscription plan created successfully.");
  } catch (error) {
    console.error("Error creating subscription:", error.response?.data || error);
    sendResponse(res, 500, false, null, "Failed to create subscription plan.");
  }
}

// Get subscriptions (active for user, all for admin)
export async function getSubscriptions(req, res) {
  try {
    const { adminId } = req.user || {};
    const filter = adminId ? {} : { disabled: false };

    const subscriptions = await SubscriptionPlanModel.find(filter).sort({ createdAt: -1 });
    sendResponse(res, 200, true, subscriptions, "Subscriptions fetched successfully.");
  } catch (error) {
    console.error("Error fetching subscriptions:", error);
    sendResponse(res, 500, false, null, "Failed to fetch subscriptions.");
  }
}

// updateSubscriptionPlan
export async function updateSubscriptionPlan(req, res) {
  try {
    const { id } = req.params;
    const {
      productName,
      subscriptionTier,
      features,
      trialPeriodDays,
      productCTA,
      slug,
    } = req.body;

    if(subscriptionTier) {
        if(!subscriptionTier) return sendResponse(res, 400, false, 'Subscription Tier Number is required')
        if(isNaN(subscriptionTier)) return sendResponse(res, 400, false, 'Subscription Tier is an invalid number')
        const isTeirExist = await SubscriptionPlanModel.findOne({ disabled: false, subscriptionTier })
        if(isTeirExist) return sendResponse(res, 400, false, null, 'An active subcription plan already exist with this subscription tier')
    }

    if(features){
        const verifyFeature = validateFeatures(features)
        if(!verifyFeature.success){
            console.log('object', verifyFeature)
            return sendResponse(res, 400, false, verifyFeature.data)
        }
    }

    const plan = await SubscriptionPlanModel.findById(id);
    if (!plan) return sendResponse(res, 404, false, null, "Subscription plan not found.");

    if(productName) {
        await paystack.put(`/plan/${plan.priceId}`, {
          name: productName || plan.productName,
          description: productCTA || plan.productCTA || '',
          //trial_days: trialPeriodDays ? parseInt(trialPeriodDays) : parseInt(plan.trialPeriodDays) || 0,  
        });
    }

    // Update all editable fields locally
    plan.productName = productName || plan.productName;
    plan.features = features || plan.features;
    plan.trialPeriodDays = trialPeriodDays || plan.trialPeriodDays;
    plan.productCTA = productCTA || plan.productCTA;
    plan.slug = slug || plan.slug;
    plan.subscriptionTier = subscriptionTier || plan.subscriptionTier;

    await plan.save();

    return sendResponse(res, 200, true, plan, "Subscription plan updated successfully.");
  } catch (error) {
    console.error("Error updating subscription:", error.response?.data || error);
    sendResponse(res, 500, false, null, "Failed to update subscription plan.");
  }
}

// toggleSubscriptionPlan
export async function toggleSubscriptionPlan(req, res) {
  try {
    const { id } = req.body;

    const plan = await SubscriptionPlanModel.findById(id);
    if (!plan) return sendResponse(res, 404, false, null, "Subscription plan not found.");

    plan.disabled = !plan.disabled;
    await plan.save();

    // Update Paystack plan description to reflect the status
    try {
      await paystack.put(`/plan/${plan.priceId}`, {
        description: plan.disabled
          ? `${plan.productName} (DEACTIVATED)`
          : `${plan.productName} (ACTIVE)`,
      });
    } catch (err) {
      console.warn("Paystack plan toggle warning:", err.response?.data || err.message);
    }

    // Find all users who have this plan
    const affectedUsers = await UserModel.find({
      subscriptionPriceId: plan.priceId, // assuming you store the Paystack priceId on user
      subscriptionCode: { $exists: true },
    });

    if (plan.disabled) {
      // ❌ Deactivate subscriptions on Paystack
      for (const user of affectedUsers) {
        try {
          await paystack.put(`/subscription/disable`, {
            code: user.subscriptionCode, // Paystack subscription code
            token: user.email_token || user.customerCode, // optional, depending on what you store
          });
        } catch (err) {
          console.warn(
            `Failed to disable subscription for ${user.email}`,
            err.response?.data || err.message
          );
        }
      }
    } else {
      // ✅ Reactivate subscriptions on Paystack
      for (const user of affectedUsers) {
        try {
          await paystack.put(`/subscription/enable`, {
            code: user.subscriptionCode,
            token: user.email_token || user.customerCode,
          });
        } catch (err) {
          console.warn(
            `Failed to reactivate subscription for ${user.email}`,
            err.response?.data || err.message
          );
        }
      }
    }

    return sendResponse(
      res,
      200,
      true,
      plan,
      `Subscription ${plan.disabled ? "deactivated" : "reactivated"} successfully.`
    );
  } catch (error) {
    console.error("Error toggling subscription:", error.response?.data || error);
    sendResponse(res, 500, false, null, "Failed to toggle subscription plan.");
  }
}

//make subscription
export async function makeSubscription(req, res) {
    const { userId: ownerId, storeId } = req.user;
    const { id } = req.body;
    const userId = storeId || ownerId

  try {
    const subscription = await SubscriptionPlanModel.findById(id);
    if(!subscription) return sendResponse(res, 404, false, null, 'Subscription not found');

    const user = await UserModel.findOne({ userId })
    // Ensure customer exists
    let customerCode = user.customerCode;
    if (!customerCode) {
      const { data: customerRes } = await paystack.post("/customer", {
        email: user.email,
        first_name: user.name,
        last_name: "",
        phone: user.mobileNumber,
      });

      customerCode = customerRes.data.customer_code;

      // Update user with customer_code
      user.customerCode = customerCode;
      await user.save();
    }

    // Create subscription/payment link
    const { data: paymentRes } = await paystack.post("/transaction/initialize", {
        email: user.email,
        customer: customerCode,
        plan: subscription.productId,
        phone: user.mobileNumber,
        amount: Number(subscription.price * 100),
        callback_url: "http://localhost:5137",
    });

    return sendResponse(res, 200, true, paymentRes.data.authorization_url, "Subscription initialized successfully");
  } catch (error) {
    console.error("UNABLE TO MAKE SUBSCRIPTION", error.response?.data || error);
    sendResponse(res, 500, false, null, "Unable to make subscription");
  }
}

//get subscription histroy
export async function getSubscriptionHistory(req, res) {
    const { limit = 10, page = 1 } = req.query;

    try {
        // Get total count of subscriptions
        const totalSubscriptions = await SubscriptionHistroyModel.countDocuments();

        // Calculate pagination values
        const totalPages = Math.ceil(totalSubscriptions / limit);
        const skip = (page - 1) * limit;

        // Fetch paginated subscription history
        const subscriptionHistory = await SubscriptionHistroyModel.find()
            .sort({ createdAt: -1 }) // Sort by newest first
            .skip(skip)
            .limit(Number(limit))
            .lean();

        sendResponse(res, 200, true, {
                subscriptions: subscriptionHistory,
                totalSubscriptions,
                totalPages,
                currentPage: Number(page),
                limit: Number(limit),
            },
            'Subscription fetched successfully',
        );
    } catch (error) {
        console.log('UNABLE TO GET SUBSCRIPTION HISTORY', error);
        sendResponse(res, 500, false, 'Unable to get subscription history');
    }
}

//get a subscription histroy
export async function getSubscriptionDetails(req, res){
    const { id } = req.params
    if(!id) return sendResponse(res, 400, false, 'Subscription data id is required')
    
    try {
        const getSubscription = await SubscriptionHistroyModel.findById({ _id: id })
        if(!getSubscription) return sendResponse(res, 404, false, 'Subscription not found')

        sendResponse(res, 200, true, getSubscription, 'Subscription data fetched successful')
    } catch (error) {
        console.log('UNABLE TO FETCH SUBSCRIPTION DETAILS', error)
        sendResponse(res, 500, false, 'Unable to get subscription details')
    }
}

export async function getSubscriptionStats(req, res) {
    const { period = '30days' } = req.query;

    // Allowed periods and corresponding time frames
    const periods = {
        '3days': 3,
        '7days': 7,
        '30days': 30,
        '3mth': 90,
        '6mth': 180,
        '1year': 365,
        'alltime': null
    };

    if (!periods.hasOwnProperty(period)) {
        return sendResponse(res, 400, false, 'Invalid period specified');
    }

    try {
        let startDate = periods[period] ? subDays(new Date(), periods[period]) : null;
        let previousStartDate = periods[period] ? subDays(startDate, periods[period]) : null;
        let endDate = new Date();
        let previousEndDate = startDate;

        const currentFilter = startDate ? { createdAt: { $gte: startDate, $lte: endDate } } : {};
        const previousFilter = previousStartDate ? { createdAt: { $gte: previousStartDate, $lte: previousEndDate } } : {};

        // Get all subscription plans
        const subscriptionPlans = await SubscriptionPlanModel.find({}, { productId: 1, productName: 1 });

        let results = await Promise.all(subscriptionPlans.map(async (plan) => {
            // Get total subscriptions for the current and previous period
            const totalCurrent = await SubscriptionHistroyModel.countDocuments({ 
                productId: plan.productId, 
                ...currentFilter 
            });

            const totalPrevious = await SubscriptionHistroyModel.countDocuments({ 
                productId: plan.productId, 
                ...previousFilter 
            });

            // Function to calculate percentage change
            const calculatePercentageChange = (current, previous) => {
                if (previous === 0) return current > 0 ? 100 : 0;
                let change = ((current - previous) / previous) * 100;
                return Math.abs(change.toFixed(2));
            };

            return {
                planName: plan.productName,
                currentSubscriptions: totalCurrent,
                previousSubscriptions: totalPrevious,
                percentageChange: calculatePercentageChange(totalCurrent, totalPrevious),
                changeIndicator: totalCurrent >= totalPrevious ? '+' : '-',
            };
        }));

        sendResponse(res, 200, true, results, 'Subscription statistics retrieved successfully');
    } catch (error) {
        console.log('UNABLE TO GET SUBSCRIPTION STATS', error);
        sendResponse(res, 500, false, 'Unable to get subscription stats');
    }
}