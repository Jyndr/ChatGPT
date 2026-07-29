import mongoose from "mongoose"

const chatSchema = new mongoose.model({

    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    Topic: {
        type: String,
        default: "New Chat"
    },

    model: {
        type: String,
        required: true
    },

    summary: {
        type: String,
        dafault: ""
    },

    summaryUpdatedAt: {
        type: Date,
        dafault: null
    },

    summarizedTillmessageNumber: {
        type: Number,
        dafault: 0
    },

    messageCount: {
        type: Number,
        default: 0
    },

    usage: {
        PromptToken: {
            type: Number,
            default: 0
        },

        CompletionToken: {
            type: Number,
            default: 0
        },

        TotalTokens: {
            type: Number,
            default: 0
        },
    }
}, { timestamps: true });

chatSchema.index({ userId: 1, updatedAt: -1 });

const Chat = mongoose.model("Chat", chatSchema);

export default Chat;

