export const addTokenUsage = async (user, TotalTokens) => {
    user.usage.TotalTokenUsed += TotalTokens;
    await user.save();
}
