import axios from "axios";

const API_URL = "https://paygw.globalpay.com.ng/globalpay-paymentgateway/api/paymentgateway/generate-payment-link";
const MERCHANT_QUERY_API_URL = "https://paygw.globalpay.com.ng/globalpay-paymentgateway/api/paymentgateway/query-single-transaction-by-merchant-reference"
const SYSTEM_QUERY_API_URL = "https://paygw.globalpay.com.ng/globalpay-paymentgateway/api/paymentgateway/query-single-transaction"

const API_KEY = "UIB6Q465GGH9IXKK"; // your provided API key
const merchantId = "1111"
const systemId = "5127903585695669"

/**
 * Generate GlobalPay payment link
 */
export async function generatePaymentLink(data) {
  try {
    const response = await axios.post(API_URL, data, {
      headers: {
        apikey: API_KEY,
        language: "en",
        "Content-Type": "application/json",
      },
    });

    return response.data;
  } catch (error) {
    console.error("Error generating payment link:", error.response?.data || error.message);
    throw error;
  }
}

/**
 * 
(async () => {
  const data = {
    amount: 10000,
    merchantTransactionReference: "1111",
    redirectURL: "https://tredah.netlify.app",
    webhookUrl: "https://9ef0d7bc16ee.ngrok-free.app",
    customer: {
      lastName: "lastname",
      firstName: "firstname",
      currency: "NGN",
      phoneNumber: "09059309831",
      address: "string",
      emailAddress: "successakin123@gmail.com",
    },
  };

  try {
    const result = await generatePaymentLink(data);
    console.log("Payment link generated:", result);
  } catch (err) {
    console.error("Failed to generate payment link:", err);
  }
})();
 */


/** VERIFY PAYMENT */
export async function verifyPayment() {
  try {
    const response = await axios.get(`${SYSTEM_QUERY_API_URL}/${systemId}`, {
      headers: {
        apikey: API_KEY,
        language: "en",
        "Content-Type": "application/json",
      },
    });

    console.log('PAYMENT HISTROY', response?.data)
  } catch (error) {
    console.error("Error getting transaction history:", error.response?.data || error.message);
    //throw error;
  }
}
verifyPayment()