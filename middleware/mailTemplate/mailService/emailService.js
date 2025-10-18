import axios from "axios";
import { config } from "dotenv";
config();

const apiKey = process.env.BREVO_API;
const emailUrl = process.env.EMAIL_URL;
const emailAddress = process.env.EMAIL_ADDRESS;


const senderInfo = {
  name: "Tredah Market Place",
  email: emailAddress,
};

/**
 * sendEmail - Sends an email
 * @param {Object} options - The email options
 * @param {Array|String} options.to - Recipient(s): can be a single email or an array of emails/objects
 * @param {String} options.subject - The subject line
 * @param {String} options.html - The HTML content
 */
const sendEmail = async (options) => {
  try {
    // Normalize recipients
    let recipients = [];

    if (Array.isArray(options.to)) {
      // If array of strings or objects
      recipients = options.to.map((recipient) =>
        typeof recipient === "string" ? { email: recipient } : recipient
      );
    } else if (typeof options.to === "string") {
      recipients = [{ email: options.to }];
    } else {
      throw new Error("Invalid 'to' field. It must be a string or array.");
    }

    const emailData = {
      sender: senderInfo,
      to: recipients,
      subject: options.subject,
      htmlContent: options.html,
    };

    const response = await axios.post(emailUrl, emailData, {
      headers: {
        "Content-Type": "application/json",
        "api-key": apiKey,
      },
    });

    console.log("EMAIL SENT SUCCESSFULLY:", response.data?.messageId || "OK");
  } catch (error) {
    console.error(
      "UNABLE TO SEND EMAIL:",
      error.response?.data || error.message
    );
  }
};

export default sendEmail;
