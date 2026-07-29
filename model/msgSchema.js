import mongoose from "mongoose"


const MessageSchema = new mongoose.Schema({

    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: true
    },

    chatId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "chat",
        required: true
    },

    role: {
        type: String,
        enum: ["user", "assistant"],
        required: true
    },

    content: {
        type: String,
        required: true
    },

    tokens: {
        type: Number,
        default: 0
    },

    usage: {
        promptTokens: {
            type: Number,
            default: 0
        },

        completionToken: {
            type: Number,
            default: 0
        },

        TotalTokens: {
            type: Number,
            default: 0
        }
    }
}, { timestamps: true });

MessageSchema.index({ chatId: 1, createdAt: 1 });
MessageSchema.index({ userId: 1, createdAt: -1 });

const Message = mongoose.model("Message", MessageSchema);

export default Message;