import express from "express"
import { getMessage, sendMessage } from "../controllers/msgController.js";
import authUserMiddleware from "../middlewares/authUserMiddleware.js";


const msgRouter = express.Router();
msgRouter.use(authUserMiddleware);

msgRouter.get("/:chatId", getMessage);
msgRouter.post("/:chatId", sendMessage);

export default msgRouter;