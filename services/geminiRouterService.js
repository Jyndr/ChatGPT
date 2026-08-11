import ai from "../config/gemini.js"


export const genAIresponse = async ({ model, messages }) => {
    try {

        const prompt = messages // ai 
            .map((m) => `${m.role}: ${m.content}`)
            .join("\n");

        const interaction = await ai.interactions.create({
            model: model,
            input: prompt
        });

        const ai_reply = interaction.output_text;

        if (!ai_reply) {
            throw new Error("Ai response is empty");
        }

        const prompt_token = interaction.usage?.total_input_tokens || 0;
        const completion_token = (interaction.usage?.total_output_tokens + interaction.usage?.total_thought_tokens) || 0;

        return {
            ai_reply,
            usage: {
                prompt_token,
                completion_token,
                total_tokens: prompt_token + completion_token
            }
        }
    } catch (error) {
        console.log("gemini api error :", error);
        throw error;
    }
}