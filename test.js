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
//verifyPayment()


//VAS BUSINESS VERIFICATION

const CAC_VAS_URL = "https://vasapp.cac.gov.ng/api/vas/validation/company";
const VAS_API_KEY = process.env.CAC_VAS_API_KEY; // store in .env for security

export async function VASBusinessVerification({ regNum, entityType = "INCORPORATED_TRUSTEE" }) {
  try {
    const payload = {
      rc_number: regNum,
      entity_type: entityType,
    };

    const headers = {
      "Content-Type": "application/json",
      "X_API_KEY": '$2a$10$OYpWp82BQkOKloMsk12UyOs04w1Z61ONVvYMNikFYAecyjl9N22lW',
      //"x-api-key": '$2a$10$OYpWp82BQkOKloMsk12UyOs04w1Z61ONVvYMNikFYAecyjl9N22lW',
    };

    const { data } = await axios.post(CAC_VAS_URL, payload, { headers });
    console.log({ success: true, data, message: 'Success' });
    return
  } catch (error) {
    console.error("❌ CAC Verification Error:", error.response?.data || error.message);
    return { success: false, message: error.response?.data?.message || "Failed to verify business" }
  }
}
VASBusinessVerification({ regNum: '35147935' })




/******** EASY POST LOGISTICS API  ********** */
async function getRates() {
  const shipment = await client.Shipment.create({
    to_address: {
      name: 'Dr. Steve Brule',
      street1: '525 8 Ave SW',
      city: 'Calgary',
      state: 'AB',
      zip: 'T2P 1G1',
      country: 'CA',
      phone: '4035559999',
    },
    from_address: {
      company: 'EasyPost Canada',
      street1: '100 King St W',
      street2: 'Suite 6200',
      city: 'Toronto',
      state: 'ON',
      zip: 'M5X 1B8',
      country: 'CA',
      phone: '4161234567',
    },
    parcel: {
      length: 8,
      width: 5,
      height: 5,
      weight: 5,
    },
  });

  return shipment.rates.map(rate => ({
    shipment: shipment.id,
    id: rate.id,
    carrier: rate.carrier,
    service: rate.service,
    rate: rate.rate,
    currency: rate.currency,
    delivery_days: rate.delivery_days,
    delivery_date: rate.delivery_date,
  }));
}

// Example usage
//getRates().then(console.log).catch(console.error);

async function buyShipment(shipmentId, selectedRateId) {
  // Retrieve the shipment from EasyPost
  const shipment = await client.Shipment.retrieve(shipmentId);

  // Find the selected rate
  const rate = shipment.rates.find(r => r.id === selectedRateId);
  if (!rate) throw new Error('Rate not found');

  // Buy the shipment with the selected rate
  const bought = await client.Shipment.buy(
    shipmentId,
    selectedRateId,
    rate?.rate
  );

  // Optionally retrieve the associated tracker (can also be auto-created)
  const tracker = bought.tracker ? await client.Tracker.retrieve(bought.tracker.id) : null;

  return {
    labelUrl: bought.postage_label?.label_url,
    trackingCode: bought.tracking_code,
    carrier: bought.selected_rate?.carrier,
    service: bought.selected_rate?.service,
    shipmentStatus: bought.status,
    trackerId: tracker?.id || bought.tracker?.id || null,
    trackerStatus: tracker?.status || bought.status || null
  };
}


// Example usage
//buyShipment('shp_d0e7a311c5614024bd93cca8acd02be8', 'rate_2c6920fa46574f138e1126f9e69501e3').then(console.log).catch(console.error);
