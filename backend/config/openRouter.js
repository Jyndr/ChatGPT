import { OpenRouter } from "@openrouter/sdk";
import dotenv from "dotenv/config"

if (!process.env.OPENROUTER_API_KEY) {
    throw new Error("Open router API key is missing");
}

const openRouter = new OpenRouter({
    apiKey: process.env.OPENROUTER_API_KEY,
})

export default openRouter;