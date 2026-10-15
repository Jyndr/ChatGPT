import Chat from "../model/ChatSchema.js"
import Msg from "../model/msgSchema.js"
import User from "../model/UserSchema.js"
import { genAIresponse } from "../services/geminiRouterService.js"


const summary_chunk_size = 20;

export const UpdateSummaryIfNeeded = async (chatId) => {

    const chat = await Chat.findById(chatId);

    if (!chat) {
        return;
    }

    const unsummarized = chat.messageCount - chat.summarizedTillmessageNumber;

    if (unsummarized < summary_chunk_size) {
        return;
    }


    const msgToSummarize = await Msg.find({ chatId })
        .sort({ createdAt: 1 })
        .skip(chat.summarizedTillmessageNumber)
        .limit(summary_chunk_size); // dbt


    if (msgToSummarize.length == 0) return;

    const summary_msg = [
        {
            role: "system",
            content: "Summarize the conversation. Keep important context, user goals, decisions, and unresolved doubts. Do not add extra information."
        },
        {
            role: "user",
            content: `Previous Summary: ${chat.summary || "No previous Summary yet"}`
        },

        ...msgToSummarize.map((msg) => ({ // dbt
            role: msg.role,
            content: msg.content
        })),

        {
            role: "user",
            content: "Summarize the above conversation"
        }
    ];

    const { ai_reply, usage } = await genAIresponse({
        model: chat.model,
        messages: summary_msg
    });

    chat.summary = ai_reply;
    chat.summaryUpdatedAt = new Date();
    chat.summarizedTillmessageNumber += msgToSummarize.length;

    chat.usage.PromptToken += usage.prompt_token;
    chat.usage.completionTokens += usage.completion_token;
    chat.usage.TotalTokens += usage.total_tokens;

    await chat.save();

    const user = await User.findById(chat.userId);


    if (user) {
        user.usage.TokenUsed += usage.total_tokens;
        user.usage.TotalTokenUsed += usage.total_tokens;
        await user.save();
    }
}