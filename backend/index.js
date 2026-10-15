import express from "express"
import ConnectDB from "./config/database.js"
import { connectRedis } from "./config/redis.js"
import dotenv from "dotenv/config.js"
import cookieParser from "cookie-parser"
import userRouter from "./routes/userRouter.js"
import msgRouter from "./routes/msgRouter.js"
import chatRouter from "./routes/chatRouter.js"
import cors from "cors"

const app = express();

app.use(
    cors({
        origin:["http://localhost:5173","http://localhost:5174"],
        credentials:true
    })
)


app.use(express.json());
app.use(cookieParser());



app.use("/user", userRouter);
app.use("/message", msgRouter);
app.use("/chat", chatRouter);


const startServer = async () => {
    try {

        await ConnectDB();
        await connectRedis();

        app.listen(process.env.PORT, () => {
            console.log(`Server started listening to port ${process.env.PORT}`);
        })

    } catch (error) {
        console.log(error);
    }
}

startServer();
