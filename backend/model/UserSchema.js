import mongoose from "mongoose"

const userSchema = new mongoose.Schema({

    name: {
        type: String,
        required: true
    },

    age: {
        type: Number
    },

    email: {
        type: String,
        required: true,
        unique: true
    },

    password: {
        type: String,
        required: true
    },

    usage: {
        TotalTokenUsed: {
            type: Number,
            default: 0
        },
    }
}, { timestamps: true });


const User = mongoose.model("User", userSchema);

export default User;