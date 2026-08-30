import { createClient } from "redis";

const redisClient = createClient({
    url: process.env.redis
});

redisClient.on("error", (error) => {
    console.log("Redis error:", error);
})


const connectRedis = async () => {
    await redisClient.connect();
    console.log("Reddis connected successfully");
}

export { redisClient, connectRedis };