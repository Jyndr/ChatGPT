import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"
import cookieparser from "cookie-parser"
import User from "../model/UserSchema.js"
import { signupSchema, loginSchema } from "../validators/userValidator.js"
import msg from "../model/msgSchema.js"
import chat from "../model/ChatSchema.js"
import user from "../model/UserSchema.js"
import { redisClient } from "../config/redis.js"


// writing all the api of the users here
// login , signup , logout , profile



const CreateToken = (id, email) => {

    if (!process.env.JWT_key) {
        throw new Error("JWT secret key is missing");
    }

    const token = jwt.sign({ id, email }, process.env.JWT_key, { expiresIn: "5h" });
    return token;
}

const cookieOptions = {
    httpOnly: true,
    secure: false,
    maxAge: 1000 * 60 * 60 * 5 // bug
}


export const SignUp = async (req, res) => {
    try {

        const result = signupSchema.safeParse(req.body);

        if (!result.success) {
            return res.status(400).json({
                message: result.error.issues[0].message
            })
        }

        const { name, age, email, password } = result.data;

        const user = await User.findOne({ email: email });

        if (user) {
            return res.status(409).json({
                message: "user already exist"
            })
        }

        const hashedPass = await bcrypt.hash(password, 12);


        const new_user = await User.create({
            name,
            age,
            email,
            password: hashedPass
        })

        const token = CreateToken(new_user._id, email);

        res.cookie("token", token, cookieOptions);

        res.status(201).json({
            message: "user created successfully"
        })

    } catch (err) {
        console.log(err);
        res.status(500).json({
            message: "Internal Server Error"
        })
    }
}

export const login = async (req, res) => {

    try {

        const result = loginSchema.safeParse(req.body);

        if (!result.success) {
            return res.status(400).json({
                message: result.error.issues[0].message
            })
        }

        const { email, password } = result.data;

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            })
        }

        const isCorrect = await bcrypt.compare(password, user.password);

        if (!isCorrect) {
            return res.status(401).json({
                message: "Invalid Credentials"
            })
        }

        const token = CreateToken(user._id, email);

        res.cookie("token", token, cookieOptions);

        res.status(200).json({
            message: "User loggedIn successfully",
            name: user.name,
            email: user.email
        })

    } catch (err) {
        console.log(err);
        res.status(500).json({
            message: "Internal Server Error"
        })
    }
}

export const logout = async (req, res) => {
    try {
        if (req.token) {
            const curr_time = Math.floor(Date.now() / 1000);
            const remaining_time = req.payload.expiresIn - curr_time;
            if (remaining_time > 0) {
                await redisClient.create(
                    `Blocked:${token}`, "blocked",
                    {
                        EX: remaining_time
                    }
                )
            }

            res.clearCookie("token", {
                httpOnly: true,
                secure: false
            })

            res.status(200).json({
                message: "User logged Out succussfully"
            })
        }

    } catch (err) {
        console.log(err);
        res.status(500).json({
            message: "Internal Server Error"
        })
    }
}

export const profile = async (req, res) => { // dbt
    try {

        res.status(200).json({
            name: req.user.name,
            age: req.user.age,
            usage: req.user.usage,
            email: req.user.email
        })

    } catch (error) {
        console.log(err);
        res.status(500).json({
            message: "Internal Server Error"
        })
    }
}


export const deleteAccount = async (req, res) => {
    try {
        // dbt 
        const userId = req.user._id;

        await msg.deleteMany({ userId });

        await chat.deleteMany({ userId });

        await user.deleteOne({ _id: userId });

        res.clearCookie("token", {
            httpOnly: true,
            secure: false
        });

        res.status(200).json({
            message: "Account deleted Successfully"
        })

    } catch (error) {
        console.log(err);
        res.status(500).json({
            message: "Internal Server Error"
        })
    }
}