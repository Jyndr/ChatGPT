import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"
import cookieparser from "cookie-parser"
import User from "../model/UserSchema.js"


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
    maxAge: process.env.TokenTime
}


export const SignUp = async (req, res) => {
    try {
        const { name, age, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                message: "missing details"
            })
        }

        const user = User.findOne({ email: email });

        if (user) {
            return res.status(409).json({
                message: "user already exist"
            })
        }

        const hashedPass = bcrypt.hash(password, 12);


        const new_user = User.create({
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
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                message: "missing details"
            })
        }

        const user = User.findOne({ email });

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
            message: "User loggedIn successfully"
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

        res.clearCookie("token", {
            httpOnly: true,
            secure: false
        })

        res.status(200).json({
            message: "User logged Out succussfully"
        })

    } catch (err) {
        console.log(err);
        res.status(500).json({
            message: "Internal Server Error"
        })
    }
}

export const profile = async (res, res) => { // dbt
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

