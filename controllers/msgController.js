import { z } from "zod";
import Chat from "../model/ChatSchema.js"
import msg from "../model/msgSchema.js"

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
        console.log(err);
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
                _id:chatId
            })

            if (!chat) {
                res.status(400).json({
                    message: "Chat not found"
                })
            }

        }

        const userMessage = await msg.create({
            chatId: chat._id,
            userId: req.user._id,
            role: "user",
            content: content.trim()
        })

        //dummy ai reply
        const ai_reply = "ha bhai kesa hai"

        const assistantMessage = await msg.create({
            chatId: chat._id,
            userId: req.user._id,
            role: "assistant",
            content: ai_reply
        })


        chat.messageCount += 2;

        // dbt
        await chat.save();

        res.status(201).json({
            message: "message sent successfully",
            chatId: chat._id,
            userId: req.user._id,
            userMessage,
            assistantMessage
        })

    } catch (error) {
        console.log(error);
        res.status(500).json({
            message: "Internal Server Error"
        })
    }
}