import { z } from "zod";

const mobileSchema = z.string().regex(
    /^[6-9]\d{9}$/, // Regex for valid Indian mobile numbers
    {
      message: "Not a valid mobile number.",
    }
);

export const loginValidator = z.object({
    mobile: mobileSchema
})

export const signupValidator = z.object({
    mobile: mobileSchema,
    username: z.string().min(3, {
        message: "Username must be 3 characters long."
    }),
})

export const updateValidator = z.object({
    username: z.string().min(3, {
        message: "Username must be 3 characters long."
    })
})

export const otpValidator = z.object({
    mobile: mobileSchema,
    otp: z.string().min(6, {
        message: "OTP must be 6 characters long."
    })
})


export const referralValidator = z.object({
    referralCode: z.string().length(6, {message: "Invalid referral code."})
})