import { config } from "dotenv";
config()
import axios from "axios";

//GT SQAUD PAYMENT LINK
export async function initiatePayment() {
    const data = {
    amount: 100000,
    email: 'successakin123@gmail.com' ,
    currency: "NGN",
    initiate_type: "inline",
    callback_url: "https://tredah.netlify.app",
    pass_charge: true
  }

  let config = {
    method: 'post',
    maxBodyLength: Infinity,
    url: `${process.env.GT_SQAUD_URL}/transaction/initiate`,
    headers: { 
      'Authorization': `Bearer ${process.env.GT_SQAUD_SK}`, 
      'Content-Type': 'application/json'
    },
    data : data
  };

  try {
      const res = await axios.request(config)
      console.log('SUCCESS RESPONSE', res?.data)
  } catch (error) {
    console.log('ERROR RESPONSE', error.response?.data || error.message)
  }

}

//initiatePayment()

const paymentRef = 'SQECOM6389915838358900001'
export async function verifyPayemnt() {

  let config = {
    method: 'get',
    maxBodyLength: Infinity,
    url: `${process.env.GT_SQAUD_URL}/transaction/verify/${paymentRef}`,
    headers: { 
      'Authorization': `Bearer ${process.env.GT_SQAUD_SK}`, 
      'Content-Type': 'application/json'
    },
  };

  try {
      const res = await axios.request(config)
      console.log('SUCCESS VERIFY RESPONSE', res?.data)
  } catch (error) {
    console.log('ERROR VERIFY RESPONSE', error.response?.data || error.message)
  }
}

verifyPayemnt()