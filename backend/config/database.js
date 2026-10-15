import mongoose from "mongoose"

const ConnectDB = async () => {
    console.log("MONGO_URI loaded:", !!process.env.Mongo_url);
    await mongoose.connect(process.env.Mongo_url);
    console.log("Connected to Database Successfully");
}

export default ConnectDB;