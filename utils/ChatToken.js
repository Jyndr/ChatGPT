export const addChatTokenUsage = async (chat, usage) => {
    chat.usage.PromptToken += usage.PromptTokens;
    chat.usage.CompletionToken += usage.CompletionToken;
    chat.usage.TotalTokens += usage.TotalTokens;

    await chat.save();
}