import { config } from "dotenv";
import { Resend } from "resend";
config();

const resend = new Resend(process.env.RESEND_API_KEY);
const emailAddress = process.env.EMAIL_ADDRESS;

const senderInfo = {
  name: "Tredah Market Place",
  email: emailAddress,
};

/**
 * sendEmail - Sends an email using Resend
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
        typeof recipient === "string" ? recipient : recipient.email
      );
    } else if (typeof options.to === "string") {
      recipients = [options.to];
    } else {
      throw new Error("Invalid 'to' field. It must be a string or array.");
    }

    const emailData = {
      from: `${senderInfo.email}`,
      //from: `${senderInfo.name} <${senderInfo.email}>`,
      to: recipients,
      subject: options.subject,
      html: options.html,
    };

    const response = await resend.emails.send(emailData);
    console.log("✅ EMAIL SENT SUCCESSFULLY:", response?.id || "OK");
  } catch (error) {
    console.error(
      "❌ UNABLE TO SEND EMAIL:",
      error.response?.data || error.message
    );
  }
};

export default sendEmail;
