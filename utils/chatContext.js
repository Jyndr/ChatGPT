const system_prompt = `You are a helpful AI assistant.
Answer the user's question clearly and accurately.
If the user asks for code, provide clean and practical code.
If the user asks for explanation, explain in a simple and structured way.
If you are unsure, say that you are unsure instead of guessing.
Dont use abusive language, if user ask question related to something which
can harm other, dont answer it.`;


export const buildMessageForAi = async ({ chat, oldMessages, currentMessages }) => {
    const Messages = [{
        role: "system",
        content: system_prompt
    }]

    if (chat.summary && chat.summary.trim() != "") {
        Messages.push({
            role: "system",
            content: `previous conversation summary:\n ${chat.summary}`
        });
    }

    for (const msg of oldMessages) {
        Messages.push({
            role: msg.role,
            content: msg.content
        });
    }


    Messages.push({
        role: "user",
        content: currentMessages
    })

    return Messages;
}