import { redisClient } from "../config/redis.js";


export const authenticatedRateLimiter = async (req, res, next) => {
    try {
        const userID = req.userID;
        const key = `rate-limit:user:${userID}`;

        const req_cnt = await redisClient.incr(key);

        if (req_cnt == 1) {
            await redisClient.expire(key, 60);
        }

        if (req_cnt > 20) {
            const remaining_time = await redisClient.ttl(key);
            return res.status(429).json({
                message: `Too many request try after ${remaining_time} seconds`
            });
        }
        next();
    } catch (error) {
        console.log("unauthenticated Rate Limiter Error", error);
        next();
    }
}

export default authenticatedRateLimiter;