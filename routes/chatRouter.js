import express from "express"
import authUserMiddleware from "../middlewares/authUserMiddleware.js";
import { getRecentChat, getSingleChat, createChat, deleteChat } from "../controllers/ chatController.js";
import authenticatedRateLimiter from "../middlewares/authenticatedRateLimiter.js";
import LoadUser from "../middlewares/LoadUserMiddleware.js";



const chatRouter = express.Router();
chatRouter.use(authUserMiddleware);
chatRouter.use(authenticatedRateLimiter);
chatRouter.use(LoadUser)


chatRouter.post("/createChat", createChat);
chatRouter.get("/getRecentChat", getRecentChat);
chatRouter.get("/:chatId", getSingleChat);
chatRouter.delete("/:chatId", deleteChat);

export default chatRouter;