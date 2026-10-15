import Chat from "../model/ChatSchema.js"
import msg from "../model/msgSchema.js"



// getRecentChat: , getSingleChat , createChat, deleteChat

export const getRecentChat = async (req, res) => {
    try {

        const chats = await Chat.find({ userId: req.user._id }).select("topic")
            .sort({ updatedAt: -1 }).limit(20);

        res.status(200).json({
            message: "All your recent chats",
            chats
        })

    } catch (error) {
        console.log(error);
        res.status(500).json({
            message: "Internal Server Error"
        })
    }
}


export const getSingleChat = async (req, res) => {

    try {

        const { chatId } = req.params;

        const chat = await Chat.findOne({ _id: chatId, userId: req.user._id });

        if (!chat) {
            return res.status(404).json({
                message: "Sorry no chat found"
            })
        }

        res.status(200).json({
            chatId: chat._id,
            userId: chat.userId,
            topic: chat.Topic
        })

    } catch (error) {
        console.log(error);
        res.status(500).json({
            message: "Internal Server Error"
        })
    }
}

export const createChat = async (req, res) => {
    try {
        const { model } = req.body;

        if (!model) {
            return res.status(400).json({
                messages: "Model name is missing"
            })
        }

        const chat = await Chat.create({
            model,
            userId: req.userID
        })

        res.status(200).json({
            chatid: chat._id,
            userId: chat.userId,
            topic: chat.Topic
        })

    } catch (error) {
        console.log(error);
        res.status(500).json({
            message: "Internal Server Error"
        })
    }
}


export const deleteChat = async (req, res) => {
    try {

        const { chatId } = req.params;

        const chat = Chat.find({ _id: chatId, userId: req.user._id });

        if (!chat) {
            return res.status(403).json({
                message: "You are not allowed to do this"
            })
        }

        await msg.deleteMany({
            chatId: chat._id
        });


        await chat.deleteOne({
            _id: chatId
        });

        res.status(200).json({
            message: "Your chats are deleted successfully"
        })

    } catch (error) {
        console.log(error);
        res.status(500).json({
            message: "Internal Server Error"
        })
    }
}