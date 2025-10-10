import crypto from "crypto";
import SubscriptionPlanModel from "../models/SubscriptionsPlan.js";
import { sendResponse } from "../middleware/utils.js";
import UserModel from "../models/User.js";
import SubscriptionHistroyModel from "../models/SubscriptionHistroy.js";

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;
function calculateEndDate(interval) {
  const now = new Date();
  let endDate;

  switch (interval) {
    case "hourly":
      endDate = new Date(now.getTime() + 60 * 60 * 1000); // +1 hour
      break;
    case "daily":
      endDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // +1 day
      break;
    case "weekly":
      endDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // +1 week
      break;
    case "monthly":
      endDate = new Date(now.setMonth(now.getMonth() + 1)); // +1 month
      break;
    case "quarterly":
      endDate = new Date(now.setMonth(now.getMonth() + 3)); // +3 months
      break;
    case "biannually":
      endDate = new Date(now.setMonth(now.getMonth() + 6)); // +6 months
      break;
    case "yearly":
      endDate = new Date(now.setFullYear(now.getFullYear() + 1)); // +1 year
      break;
    default:
      endDate = null; // unknown interval
  }

  return endDate;
}


export async function paystackSubscriptionWebHook(req, res) {
  try {
    // 1️⃣ Verify Paystack signature
    const signature = req.headers["x-paystack-signature"];
    if (!signature) {
      console.warn("❌ Missing Paystack signature header");
      return res.status(400).send("Missing signature");
    }

    // Since express.raw() was used, req.body is a Buffer — DO NOT stringify it
    const computedHash = crypto
      .createHmac("sha512", PAYSTACK_SECRET)
      .update(req.body)
      .digest("hex");

    if (computedHash !== signature) {
      console.warn("❌ Invalid Paystack signature");
      return res.status(400).send("Invalid signature");
    }

    // 2️⃣ Parse the raw body (Buffer → JSON)
    const body = JSON.parse(req.body.toString("utf8"));
    const event = body.event;
    const data = body.data;

    console.log(`📬 Paystack Webhook Event: ${event}`);
    console.log(`📬 Paystack Data: ${JSON.stringify(data, null, 2)}`);

    const { email, customer_code } = data?.customer
    const { plan_code, amount, interval } = data?.plan
    const { channel, card_type, bank } = data?.authorization
    const user = await UserModel.findOne({ email });
    const subcription = await SubscriptionPlanModel.findOne({ productId: plan_code })

    switch (event) {
      // ✅ New Subscription Created
      case "subscription.create": {

        break;
      }

      // ✅ Recurring Payment Successful
      case "charge.success": {
        if (user && subcription) {

          user.subscriptionType = subcription.productName;
          user.subscriptionId = plan_code;
          user.subscriptionTier = subcription.subscriptionTier;
          user.subscriptionPriceId = subcription.priceId;
          user.customerCode = customer_code;
          
          user.subscriptionStartDate =  Date.now();
          user.subscriptionEndDate = calculateEndDate(interval) //add end date based on interval;

          await user.save();

          //create new subscription histroy
          await SubscriptionHistroyModel.create({
            userId: user.userId,
            email: user.email,
            mobileNumber: user.mobileNumber,
            price: Number(amount/100).toFixed(2),
            productName: subcription.productName,
            productId: plan_code,
            priceId: subcription.priceId,
            interval,
            startDate: Date.now(),
            endDate: calculateEndDate(interval), //add end date based on interval,
            status: 'Successful',
            success: true,
            paymentRefrence: data?.reference,
            channel,
            bank,
            cardType: card_type
          })
        }
        break;
      }

      // ⚠️ Payment Failed / Auto Renewal Failed
      case "invoice.payment_failed": {
        if(user && subcription) {
            //create new subscription histroy
            await SubscriptionHistroyModel.create({
                userId: user.userId,
                email: user.email,
                mobileNumber: user.mobileNumber,
                price: Number(amount/100).toFixed(2),
                productName: subcription.productName,
                productId: plan_code,
                priceId: subcription.priceId,
                interval,
                startDate: Date.now(),
                endDate: calculateEndDate(interval), //add end date based on interval,
                status: 'Failed',
                success: false,
                paymentRefrence: data?.reference,
                channel,
                bank,
                cardType: card_type
            })
        }
        break;
      }

      // 🚫 Subscription Canceled / Not Renewing
      case "subscription.disable":
      case "subscription.not_renew": {

        break;
      }

      default:
        console.log("Unhandled Paystack event:", event);
    }

    // ✅ Respond quickly
    res.sendStatus(200);
  } catch (error) {
    console.error("❌ Error handling Paystack webhook:", error);
    return sendResponse(res, 500, false, null, "Webhook processing failed");
  }
}
