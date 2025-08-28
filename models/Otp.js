import mongoose from "mongoose";

const OtpSchema = new mongoose.Schema(
  {
    otp: {
      type: String,
      required: [true, "Otp code is required"],
      unique: [true, "Otp code already exists"],
    },
    mobileNumber: {
      type: String,
      required: [true, "Mobile number is required"],
    },
    email: {
        type: String,
        required: [true, "email address is required"],
    },
    accountType: {
      type: String,
      required: [true, "Account type is required"], //user || admin
    },
    createdAt:{
        type: Date,
        default: () => Date.now(),
        expires: 900 //15min
    }
  },
  { timestamps: true }
);

const OtpModel = mongoose.model("otp", OtpSchema);
export default OtpModel;
