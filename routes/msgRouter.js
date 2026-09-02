import express from "express"
import { getMessage, sendMessage } from "../controllers/msgController.js";
import authUserMiddleware from "../middlewares/authUserMiddleware.js";
import authenticatedRateLimiter from "../middlewares/authenticatedRateLimiter.js";
import TokenUsage from "../middlewares/TokenUsageMiddleware.js";
import LoadUser from "../middlewares/LoadUserMiddleware.js";


const msgRouter = express.Router();
msgRouter.use(authUserMiddleware);
msgRouter.use(authenticatedRateLimiter);

msgRouter.get("/:chatId", LoadUser, getMessage);
msgRouter.post("/:chatId", TokenUsage, LoadUser, sendMessage);

export default msgRouter;