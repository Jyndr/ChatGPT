import express from "express"
import authUserMiddleware from "../middlewares/authUserMiddleware.js";
import { getRecentChat, getSingleChat, createChat, deleteChat } from "../controllers/ chatController.js";



const chatRouter = express.Router();
chatRouter.use(authUserMiddleware);


chatRouter.post("createChat", createChat);
chatRouter.get("getRecentChat", getRecentChat);
chatRouter.get("/:chatId", getSingleChat);
chatRouter.delete("/:chatId", deleteChat);

export default chatRouter;