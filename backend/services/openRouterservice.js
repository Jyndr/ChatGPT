import openRouter from "../config/openRouter.js"


export const genAIresponse = async ({ model, messages }) => {
    try {
        const completion = await openRouter.chat.send({
            chatRequest: {
                model,
                messages
            }
        })

        const ai_reply = completion.choices[0]?.message?.content;

        if (!ai_reply) {
            throw new Error("Ai response is empty");
        }

        const prompt_token = completion.usage?.prompt_tokens || 0;
        const completion_token = completion.usage?.completion_tokens || 0;

        return {
            ai_reply,
            usage: {
                prompt_token,
                completion_token,
                total_tokens: prompt_token + completion_token
            }
        }
    } catch (error) {
        console.log("openrouter api error :", error);
        throw error;
    }
}