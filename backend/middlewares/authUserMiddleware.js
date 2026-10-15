import jwt from "jsonwebtoken"
import User from "../model/UserSchema.js"
import { redisClient } from "../config/redis.js";


// dbt
const authUserMiddleware = async (req, res, next) => {
    try {

        const { token } = req.cookies;

        if (!token) {
            return res.status(401).json({
                message: "login first"
            })
        }

        const payload = jwt.verify(token, process.env.JWT_key);

        const blockedToken = await redisClient.get(
            `blocklist:${token}`
        );

        if (blockedToken) {
            return res.status(401).json({
                message: "Please login again"
            });
        }
        req.userID = payload.id;
        req.token = token;
        req.payload = payload;
        next();

    } catch (err) {
        console.log(err)
        res.status(500).json({
            message: "Internal Server Error"
        })
    }
}

export default authUserMiddleware;