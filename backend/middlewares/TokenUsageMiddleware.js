import { redisClient } from "../config/redis.js"
import dotenv from "dotenv";

dotenv.config();

const TokenUsage = async (req, res, next) => {
    try {
        const key = `Token-Usage${req.userID}`;

        let usage = await redisClient.get(key);
        const limit = Number(process.env.Token);

        if (!usage) {
            usage = 0;
        }

        if (usage >= limit) {
            const remaining_time = await redisClient.ttl(key);

            return res.status(429).json({
                message: `try again after ${remaining_time} seconds`,
                usage
            })
        }
        req.key = key;
        next();
    } catch (error) {
        console.log("Token usage middleware error", error);
        next();
    }
}

export default TokenUsage;