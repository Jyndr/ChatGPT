import { redisClient } from "../config/redis.js";


export const unauthenticatedRateLimiter = async (req, res, next) => {
    try {
        const key = `rate-limit:ip:${req.ip}`;

        const req_cnt = await redisClient.incr(key);

        if (req_cnt == 1) {
            await redisClient.expire(key, 60);
        }

        if (req_cnt > 10) {
            const remaining_time = await redisClient.ttl(key);
            return res.status(429).json({
                message: `Too many request try after ${remaining_time} seconds`
            });
        }

        next();
    } catch {
        console.log("unauthenticated Rate Limiter Error");
        next();
    }
}

export default unauthenticatedRateLimiter;