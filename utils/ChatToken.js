export const addChatTokenUsage = async (chat, usage) => {
    chat.usage.PromptToken += usage.prompt_token;
    chat.usage.CompletionToken += usage.completion_token;
    chat.usage.TotalTokens += usage.total_tokens;

    await chat.save();
}