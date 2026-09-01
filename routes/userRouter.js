import express from "express"
import { login, SignUp, profile, logout, deleteAccount } from "../controllers/userController.js"
import authUserMiddleware from "../middlewares/authUserMiddleware.js"
import unauthenticatedRateLimiter from "../middlewares/unauthenticatedRateLimiter.js";
import authenticatedRateLimiter from "../middlewares/authenticatedRateLimiter.js";
import LoadUser from "../middlewares/LoadUserMiddleware.js";


const userRouter = express.Router();


//dbt
userRouter.post("/signup", unauthenticatedRateLimiter, SignUp);
userRouter.post("/login", unauthenticatedRateLimiter, login);
userRouter.post("/logout", authUserMiddleware, authenticatedRateLimiter, LoadUser, logout);
userRouter.get("/profile", authUserMiddleware, authenticatedRateLimiter, LoadUser, profile);
userRouter.delete("/delete", authUserMiddleware, authenticatedRateLimiter, LoadUser, deleteAccount);

export default userRouter;