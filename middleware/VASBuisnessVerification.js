import axios from "axios";

const CAC_VAS_URL = "https://vasapp.cac.gov.ng/api/vas/validation/company";
const VAS_API_KEY = process.env.CAC_VAS_API_KEY; 

export async function VASBusinessVerification({ regNum, entityType = "INCORPORATED_TRUSTEE" }) {
  try {
    const payload = {
      rc_number: regNum,
      entity_type: entityType,
    };

    const headers = {
      "Content-Type": "application/json",
      "X_API_KEY": VAS_API_KEY,
    };

    const { data } = await axios.post(CAC_VAS_URL, payload, { headers });
    return { success: true, data, message: 'Success' };
  } catch (error) {
    console.error("❌ CAC Verification Error:", error.response?.data || error.message);
    return { success: false, message: error.response?.data?.message || "Failed to verify business" }
  }
}
