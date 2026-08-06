import { z } from zod;


export const signupSchema = z.object({
    name:
        z.string()
            .trim()
            .min(3, "Minimum length of name should be 3")
            .max(30, "Maximum length of name should be 30"),

    age:
        z.number()
            .min(10, "Minimum age must be 10")
            .max(100, "Maximum age must be 100")
            .optional(),

    email: z.preprocess(
        (value) => typeof value == "string" ? value.trim().toLowerCase() : "",
        z.email("Email must be valid")
    ),

    password:
        z.string()
            .min(8, "Minimum length should be 8")
            .max(30, "Maximum length should be 30")
            .regex(/[A-Z]/, "Password should contain one capital letter")
            .regex(/[a-z]/, "Password should contain one small letter")
            .regex(/[0-9]/, "Password should contain one digit")
});


export const loginSchema = z.object({
    email: z.preprocess(
        (value) => typeof value == "string" ? value.trim().toLowerCase() : "",
        z.email("Email must be valid")
    ),

    password:
        z.string()
            .min(8, "Minimum length should be 8")
            .max(30, "Maximum length should be 30")
            .regex(/[A-Z]/, "Password should contain one capital letter")
            .regex(/[a-z]/, "Password should contain one small letter")
            .regex(/[0-9]/, "Password should contain one digit")
});