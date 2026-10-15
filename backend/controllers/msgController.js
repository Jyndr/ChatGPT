import { z } from "zod";
import Chat from "../model/ChatSchema.js"
import msg from "../model/msgSchema.js"
import { addTokenUsage } from "../utils/userUsage.js";
import { buildMessageForAi } from "../utils/chatContext.js";
import { genAIresponse } from "../services/geminiRouterService.js";
import { addChatTokenUsage } from "../utils/ChatToken.js";
import { UpdateSummaryIfNeeded } from "../services/summaryService.js";
import { redisClient } from "../config/redis.js";
import dotenv from "dotenv"
dotenv.config();

// getMessage, sendMessage


export const getMessage = async (req, res) => {
    try {

        const { chatId } = req.params;

        const chat = await Chat.findOne({
            _id: chatId,
            userId: req.user._id
        })


        if (!chat) {
            return res.status(404).json({
                message: "Chat not found"
            })
        }

        const messages = await msg.find({ chatId }).sort({ createdAt: 1 });

        res.status(200).json({
            message: "Your all msg are here",
            msg: messages
        })

    } catch (error) {
        console.log(error);
        res.status(500).json({
            message: "Internal Server Error"
        })
    }
}


export const sendMessage = async (req, res) => {
    try {

        const { chatId } = req.params;
        const { content, model } = req.body;

        if (!model) {
            return res.status(400).json({
                message: "pls mention your model name"
            })
        }

        if (!content || content.trim() == "") {
            return res.status(400).json({
                message: "Msg content is required"
            })
        }

        let chat;

        if (!chatId) {
            // no chat id so we need to create one

            chat = await Chat.create({
                userId: req.user._id,
                model,
                topic: content.trim().slice(0, 20)
            })

        } else {

            chat = await Chat.findOne({
                userId: req.user._id,
                _id: chatId
            })

            if (!chat) {
                return res.status(400).json({
                    message: "Chat not found"
                })
            }

        }

        const oldMessages = await msg.find({ chatId: chat._id })
            .sort({ createdAt: 1 })
            .skip(chat.summarizedTillmessageNumber);


        const msg_for_ai = await buildMessageForAi({
            chat,
            oldMessages,
            currentMessages: content.trim()
        });


        const { ai_reply, usage } = await genAIresponse({ model, messages: msg_for_ai });

        const userMessage = await msg.create({
            chatId: chat._id,
            userId: req.user._id,
            role: "user",
            content: content.trim()
        })

        const assistantMessage = await msg.create({
            chatId: chat._id,
            userId: req.user._id,
            role: "assistant",
            content: ai_reply,
            usage
        })


        chat.messageCount += 2;

        if (chat.Topic == "New Chat") {
            chat.Topic = content.trim().slice(0, 40);
        }

        await addChatTokenUsage(chat, usage);
        await addTokenUsage(req.user, usage.total_tokens);

        const TokensUsed = await redisClient.incrBy(req.key, usage.total_tokens);

        if (TokensUsed == usage.total_tokens) { // created first time
            await redisClient.expire(req.key, Number(process.env.TokenTime));
        }

        res.status(201).json({
            message: "message sent successfully",
            chatId: chat._id,
            reply: ai_reply,
            usage,
            TokensUsed,
            Token_limit: Number(process.env.Token),
        })

        UpdateSummaryIfNeeded(chat._id);

    } catch (error) {
        console.log(error);
        res.status(500).json({
            message: "Internal Server Error"
        })
    }
}