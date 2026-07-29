import mongoose from "mongoose"

const ConnectDB = async () => {
    await mongoose.connect(process.env.Mongo_url);
    console.log("Connected to Database Successfully");
}

export default ConnectDB;