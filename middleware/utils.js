import OtpModel from "../models/Otp.js";
import UserModel from "../models/User.js";
import cloudinary from "cloudinary";
import multer from "multer";

// Configure Cloudinary
cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  timeout: 120000, // 120 seconds
});

export const formatDateAndTime = (createdAt) => {
    const date = new Date(createdAt);
  
    // Format date as "31 / 01 / 2024"
    const formattedDate = date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).replace(/\//g, ' / ');
  
    // Format time as "05.30 PM"
    const formattedTime = date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).replace(':', '.');
  
    return { formattedDate, formattedTime };
  };

export function multerErrorHandler(err, req, res, next) {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
            console.error(`Unexpected field: ${err.field}`);
            return res.status(400).json({ error: `Unexpected field: ${err.field}` });
        }
    }
    console.log('MULTER ERROR', err);
    next(err); // Pass to the next error handler if not a Multer error
}

// Configure Multer
const storage = multer.memoryStorage(); // Use memory storage for direct streaming
const upload = multer({ storage });

export const uploadMiddleware = upload.fields([
  { name: "image", maxCount: 1 },
  { name: "images", maxCount: 1 },
]);

export async function calculateAverageRating(reviews = []) {
    if (reviews.length === 0) return 0;
    const total = reviews.reduce((sum, r) => sum + (r.rating || 0), 0);
    return Math.round((total / reviews.length) * 10) / 10; // round to 1 decimal place
}

export async function generateUniqueCode(length) {
    const generateUserId = () => {
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let userId = ''; 

        for (let i = 0; i < length; i++) {
            const randomIndex = Math.floor(Math.random() * characters.length);
            userId += characters[randomIndex]; 
        }

        return userId;
    };

    let userId;
    let exists = true;

    while (exists) {
        userId = generateUserId();
        const existingId = await UserModel.findOne({ userId: userId });
        exists = existingId !== null; 
    }

    return userId;
}

export const sendResponse = (res, statusCode, success, data, message) => {
    return res.status(statusCode).json({ success: success, data: data, message: message ? message : '' });
};

export async function generateOtp({mobileNumber, email, length, accountType}) {
    const deleteOtpCode = await OtpModel.deleteMany({ mobileNumber: mobileNumber })
    const generateOtp = () => {
        const min = Math.pow(10, length - 1);  
        const max = Math.pow(10, length) - 1;         
        const otp = Math.floor(min + Math.random() * (max - min + 1)).toString(); 
        return otp;
    };

    let otp;
    let exists = true;

    while (exists) {
        otp = generateOtp();
        exists = await OtpModel.findOne({ code: otp });
    }

    const otpCode = await OtpModel.create({
        mobileNumber: mobileNumber,
        email: email,
        otp: otp,
        accountType: accountType
    });

    console.log('NEW OTP MODEL', otpCode);

    return otp;
}

export async function validatePassword(password) {
  if (typeof password !== 'string') {
    return { success: false, message: 'Password must be a string.' };
  }
  if (password.length < 8) {
    return { success: false, message: 'Password must be at least 8 characters long.' };
  }
  if (!/[a-z]/.test(password)) {
    return { success: false, message: 'Password must include at least one lowercase letter.' };
  }
  if (!/[A-Z]/.test(password)) {
    return { success: false, message: 'Password must include at least one uppercase letter.' };
  }
  if (!/[0-9]/.test(password)) {
    return { success: false, message: 'Password must include at least one number.' };
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return { success: false, message: 'Password must include at least one special character.' };
  }
  return { success: true, message: 'Password is valid.' };
}

export function maskEmail(email) {
  const [localPart, domain] = email.split("@");
  
  if (localPart.length <= 2) {
    // If too short, just mask everything except first char
    return localPart[0] + "*".repeat(localPart.length - 1) + "@" + domain;
  }

  return (
    localPart[0] +
    "*".repeat(localPart.length - 2) +
    localPart[localPart.length - 1] +
    "@" +
    domain
  );
}

export function stringToNumberArray(code) {
    return code.split('').map(Number);
}

// Helper for uploading files to Cloudinary
export async function uploadToCloudinary(fileBuffer, folder, resourceType) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.v2.uploader.upload_stream(
      { folder, resource_type: resourceType },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );

    const bufferStream = new PassThrough();
    bufferStream.end(fileBuffer); // End the stream with the buffer
    bufferStream.pipe(uploadStream); // Pipe the buffer to the Cloudinary stream
  });
}

export function validateNigeriaNumber(number) {
  // Regex for full international format
  const intlRegex = /^(234(70|71|80|81|90|91)\d{8})$/;
  // Regex for local format (e.g. 08012345678)
  const localRegex = /^(0(70|71|80|81|90|91)\d{8})$/;

  if (intlRegex.test(number)) {
    return { success: true, number: number, message: 'Valid Nigerian number.' };
  }

  if (localRegex.test(number)) {
    // Convert local format to international
    const formatted = "234" + number.slice(1);
    return { success: true, number: formatted, message: 'Valid Nigerian number (converted to international).' };
  }

  return { success: false, number: null, message: 'Invalid Nigerian number format.' };
}

export function validateAsianNumber(number) {

  for (const rule of countryRules) {
    if (rule.intlRegex.test(number)) {
      return {
        success: true,
        number: number,
        country: rule.country,
        message: `Valid ${rule.country} number.`,
      };
    }
    if (rule.localRegex.test(number)) {
      const formatted = rule.code + number.slice(1); // Convert 0... → countrycode...
      return {
        success: true,
        number: formatted,
        country: rule.country,
        message: `Valid ${rule.country} number (converted to international).`,
      };
    }
  }

  return { valid: false, error: "Invalid Asian number format." };
}

const countryRules = [
  {
    country: "Afghanistan",
    code: "93",
    intlRegex: /^(93[7][0-9]\d{7})$/,     // +93, mobile starts with 7x, total 11 digits
    localRegex: /^(0[7][0-9]\d{7})$/,     // Local: 07xxxxxxxx
  },
  {
    country: "Armenia",
    code: "374",
    intlRegex: /^(374(9[1-9]|4[1-9])\d{6})$/, // Mobile prefixes 91–99, 41–49
    localRegex: /^((09[1-9]|04[1-9])\d{6})$/,
  },
  {
    country: "Azerbaijan",
    code: "994",
    intlRegex: /^(994(5[015]|7[07]|99)\d{7})$/, // Mobile prefixes 50,51,55,70,77,99
    localRegex: /^((0(50|51|55|70|77|99))\d{7})$/,
  },
  {
    country: "Bahrain",
    code: "973",
    intlRegex: /^(973(3[0-9])\d{6})$/,   // Mobile: 3xxxxxxx
    localRegex: /^((3[0-9])\d{6})$/,
  },
  {
    country: "Bangladesh",
    code: "880",
    intlRegex: /^(8801[3-9]\d{8})$/,     // +880 1X
    localRegex: /^(01[3-9]\d{8})$/,
  },
  {
    country: "Bhutan",
    code: "975",
    intlRegex: /^(9757\d{7})$/,          // Mobile starts 7x
    localRegex: /^(1?\d{7})$/,           // Often 8 digits locally
  },
  {
    country: "Brunei",
    code: "673",
    intlRegex: /^(673(7|8)\d{6})$/,      // Mobile: 7,8xxxxxx
    localRegex: /^((7|8)\d{6})$/,
  },
  {
    country: "Cambodia",
    code: "855",
    intlRegex: /^(855(1[2-9]|6[0-9]|7[0-9]|8[0-9]|9[0-9])\d{6,7})$/,
    localRegex: /^((0(1[2-9]|6[0-9]|7[0-9]|8[0-9]|9[0-9]))\d{6,7})$/,
  },
  {
    country: "China",
    code: "86",
    intlRegex: /^(86(1[3-9])\d{9})$/,
    localRegex: /^(1[3-9]\d{9})$/,
  },
  {
    country: "Cyprus",
    code: "357",
    intlRegex: /^(3579[4-9]\d{6})$/,     // Mobile 94–99
    localRegex: /^(9[4-9]\d{6})$/,
  },
  {
    country: "Georgia",
    code: "995",
    intlRegex: /^(9955\d{8})$/,          // Mobile: 5xxxxxxxx
    localRegex: /^(5\d{8})$/,
  },
  {
    country: "India",
    code: "91",
    intlRegex: /^(91[6-9]\d{9})$/,
    localRegex: /^(0[6-9]\d{9})$/,
  },
  {
    country: "Indonesia",
    code: "62",
    intlRegex: /^(62(8\d{8,10}))$/,      // Mobile: 8xxxxxxxxx
    localRegex: /^((08\d{8,10}))$/,
  },
  {
    country: "Iran",
    code: "98",
    intlRegex: /^(989\d{9})$/,           // Mobile starts 9
    localRegex: /^(09\d{9})$/,
  },
  {
    country: "Iraq",
    code: "964",
    intlRegex: /^(9647\d{9})$/,          // Mobile starts 7
    localRegex: /^(07\d{9})$/,
  },
  {
    country: "Israel",
    code: "972",
    intlRegex: /^(9725\d{8})$/,          // Mobile starts 5x
    localRegex: /^(05\d{8})$/,
  },
  {
    country: "Japan",
    code: "81",
    intlRegex: /^(81[789]0\d{8})$/,
    localRegex: /^(0[789]0\d{8})$/,
  },
  {
    country: "Jordan",
    code: "962",
    intlRegex: /^(9627\d{8})$/,
    localRegex: /^(07\d{8})$/,
  },
  {
    country: "Kazakhstan",
    code: "7",
    intlRegex: /^(7(7\d{9}|6\d{9}))$/,   // Shared with Russia, but mobiles 7x,6x
    localRegex: /^((87|86)\d{8})$/,
  },
  {
    country: "Kuwait",
    code: "965",
    intlRegex: /^(965[5-9]\d{7})$/,
    localRegex: /^([5-9]\d{7})$/,
  },
  {
    country: "Kyrgyzstan",
    code: "996",
    intlRegex: /^(9965\d{8})$/,
    localRegex: /^(0?5\d{8})$/,
  },
  {
    country: "Laos",
    code: "856",
    intlRegex: /^(85620\d{7,8})$/,
    localRegex: /^(020\d{7,8})$/,
  },
  {
    country: "Lebanon",
    code: "961",
    intlRegex: /^(961(3|7|71|76|78|79|81)\d{6})$/,
    localRegex: /^((03|7\d)\d{6})$/,
  },
  {
    country: "Malaysia",
    code: "60",
    intlRegex: /^(60(1\d{8,9}))$/,
    localRegex: /^((01\d{8,9}))$/,
  },
  {
    country: "Maldives",
    code: "960",
    intlRegex: /^(960(7[2-9]|9[1-9])\d{5})$/,
    localRegex: /^((7[2-9]|9[1-9])\d{5})$/,
  },
  {
    country: "Mongolia",
    code: "976",
    intlRegex: /^(976(8|9)\d{7})$/,
    localRegex: /^((8|9)\d{7})$/,
  },
  {
    country: "Myanmar",
    code: "95",
    intlRegex: /^(959\d{7,9})$/,
    localRegex: /^(09\d{7,9})$/,
  },
  {
    country: "Nepal",
    code: "977",
    intlRegex: /^(9779\d{8})$/,
    localRegex: /^(9\d{8})$/,
  },
  {
    country: "North Korea",
    code: "850",
    intlRegex: /^(85019\d{6})$/,         // Rare, intl mobile
    localRegex: /^(019\d{6})$/,
  },
  {
    country: "Oman",
    code: "968",
    intlRegex: /^(9689\d{7})$/,
    localRegex: /^(9\d{7})$/,
  },
  {
    country: "Pakistan",
    code: "92",
    intlRegex: /^(92(3\d{9}))$/,
    localRegex: /^(03\d{9})$/,
  },
  {
    country: "Palestine",
    code: "970",
    intlRegex: /^(9705\d{8})$/,
    localRegex: /^(05\d{8})$/,
  },
  {
    country: "Philippines",
    code: "63",
    intlRegex: /^(639\d{9})$/,
    localRegex: /^(09\d{9})$/,
  },
  {
    country: "Qatar",
    code: "974",
    intlRegex: /^(974(3|5|6|7)\d{7})$/,
    localRegex: /^((3|5|6|7)\d{7})$/,
  },
  {
    country: "Saudi Arabia",
    code: "966",
    intlRegex: /^(9665\d{8})$/,
    localRegex: /^(05\d{8})$/,
  },
  {
    country: "Singapore",
    code: "65",
    intlRegex: /^(65(8|9)\d{7})$/,
    localRegex: /^((8|9)\d{7})$/,
  },
  {
    country: "South Korea",
    code: "82",
    intlRegex: /^(8210\d{8})$/,
    localRegex: /^(010\d{8})$/,
  },
  {
    country: "Sri Lanka",
    code: "94",
    intlRegex: /^(947\d{8})$/,
    localRegex: /^(07\d{8})$/,
  },
  {
    country: "Syria",
    code: "963",
    intlRegex: /^(9639\d{8})$/,
    localRegex: /^(09\d{8})$/,
  },
  {
    country: "Taiwan",
    code: "886",
    intlRegex: /^(8869\d{8})$/,
    localRegex: /^(09\d{8})$/,
  },
  {
    country: "Tajikistan",
    code: "992",
    intlRegex: /^(992[9][0-9]\d{7})$/,
    localRegex: /^((9\d{8}))$/,
  },
  {
    country: "Thailand",
    code: "66",
    intlRegex: /^(668\d{8,9})$/,
    localRegex: /^(0(8|9)\d{7,8})$/,
  },
  {
    country: "Timor-Leste",
    code: "670",
    intlRegex: /^(6707\d{7})$/,
    localRegex: /^(7\d{7})$/,
  },
  {
    country: "Turkey",
    code: "90",
    intlRegex: /^(905\d{9})$/,
    localRegex: /^(05\d{9})$/,
  },
  {
    country: "Turkmenistan",
    code: "993",
    intlRegex: /^(9936\d{7})$/,
    localRegex: /^(6\d{7})$/,
  },
  {
    country: "United Arab Emirates",
    code: "971",
    intlRegex: /^(9715\d{8})$/,
    localRegex: /^(05\d{8})$/,
  },
  {
    country: "Uzbekistan",
    code: "998",
    intlRegex: /^(9989\d{8})$/,
    localRegex: /^(9\d{8})$/,
  },
  {
    country: "Vietnam",
    code: "84",
    intlRegex: /^(84(3|5|7|8|9)\d{8})$/,
    localRegex: /^((03|05|07|08|09)\d{8})$/,
  },
  {
    country: "Yemen",
    code: "967",
    intlRegex: /^(9677\d{7})$/,
    localRegex: /^(07\d{7})$/,
  }
];

/**
 // Define country rules: regex for intl, regex for local, country code
 const countryRules = [
   {
     country: "India",
     code: "91",
     intlRegex: /^(91[6-9]\d{9})$/,     // India: +91 and starts with 6-9, total 12 digits
     localRegex: /^(0[6-9]\d{9})$/,     // Local: 10 digits starting with 6-9, prefixed by 0
   },
   {
     country: "China",
     code: "86",
     intlRegex: /^(86(1[3-9])\d{9})$/,  // China: +86, starts 13–19, 11 digits
     localRegex: /^(1[3-9]\d{9})$/,     // Local: 11 digits
   },
   {
     country: "Japan",
     code: "81",
     intlRegex: /^(81[789]0\d{8})$/,    // Japan: +81, mobile prefixes 70, 80, 90
     localRegex: /^(0[789]0\d{8})$/,    // Local: starts with 070, 080, 090
   },
 ];
 * 
 */