import mongoose, { Types } from "mongoose";
import OTP from "../models/otpModel.js"
import User from "../models/userModel.js";
import Directory from "../models/directoryModel.js";
import { getUserFromAuthCode } from "../services/googleAuthService.js"
import { sendOtpService } from "../services/sendOtpService.js"
import redisClient from "../config/redis.js";
import { sendOtpSchema, verifyOtpSchema } from "../validators/authSchema.js";
import { enforceDeviceLimit, createSession } from "../utils/sessionUtils.js";


const expiryTime = 1000 * 60 * 60 * 24 * 7;


export const sendOtp = async (req, res) => {
    const { success, data } = sendOtpSchema.safeParse(req.body)
    if (!success) {
        return res.status(400).json({ error: "Please type valid email" });
    }
    const { email } = data;
    const result = await sendOtpService(email)
    if (!result.success) {
        return res.status(400).json({ error: result.error || "Unable to sent Otp!" })
    }

    return res.json(result)
}

export const verifyOtp = async (req, res) => {
    const { success, data } = verifyOtpSchema.safeParse(req.body)
    if (!success) {
        return res.status(400).json({ error: "Invalid or Expired Otp!" });
    }
    const { email, otp } = data
    const result = await OTP.findOne({ email, otp })
    if (!result) {
        return res.status(400).json({ error: "Invalid or Expired Otp!" })
    }
    return res.json({ message: "Otp verified" })
}

export const loginWithGoogle = async (req, res, next) => {
    const transactionSession = await mongoose.startSession();
    let txnStarted = false;

    try {
        const { code } = req.body;
        if (!code) {
            return res.status(400).json({ error: "Authorization code is required" });
        }

        const userData = await getUserFromAuthCode(code);
        if (userData.error) return res.status(400).json({ error: userData.error });
        const { name, email, picture } = userData;

        const user = await User.findOne({ email })
        if (user) {
            if (user.isDeleted) {
                return res.status(403).json({ error: "Your account is disabled! Contact Admin to recover." })
            }
            await enforceDeviceLimit(user.id, user.accessDevice);

            if (!user.picture.includes("googleusercontent.com")) {
                user.picture = picture
                await user.save()
            }

            await createSession(res, user.id)
            return res.json({ message: "User logged in with google" });
        }

        const rootDirId = new Types.ObjectId();
        const userId = new Types.ObjectId();

        txnStarted = true;
        transactionSession.startTransaction();
        await Directory.insertOne(
            {
                _id: rootDirId,
                name: `root-${email}`,
                parentDirId: null,
                userId,
            },
            { session: transactionSession },
        );
        await User.insertOne(
            {
                _id: userId,
                name,
                email,
                picture,
                rootDirId,
            },
            { session: transactionSession },
        );
        await transactionSession.commitTransaction();

        await createSession(res, userId)
        return res.status(201).json({ message: "User Registered with Google & Logged In" });
    } catch (err) {
        if(txnStarted) {
            await transactionSession.abortTransaction();
        }
        next(err);
    } finally {
        await transactionSession.endSession();
    }
}
