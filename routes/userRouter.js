import express from "express"
import { login, SignUp, profile, logout } from "../controllers/userController.js"
import authUserMiddleware from "../middlewares/authUserMiddleware.js"


const userRouter = express.Router();


//dbt
userRouter.post("/signup", SignUp);
userRouter.post("/login", login);
userRouter.post("/logout", logout);
userRouter.get("/profile", authUserMiddleware, profile);


export default userRouter;