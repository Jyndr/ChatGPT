
export const resetUsageifNeeded = async (user) => {
    const now = new Date(); // dbt

    if (now > new Date(user.usage.ResetAt)) {
        user.usage.TokenUsed = 0;
        user.usage.ResetAt = new Date(Date.now() + 5 * 1000 * 60 * 60);
        await user.save();
    }
}


export const hasTokenLimitReached = (user) => {
    return user.usage.TokenUsed >= user.usage.TokenLimit;
}


export const addTokenUsage = async (user, TotalTokens) => {
    user.usage.TokenUsed += TotalTokens;
    user.usage.TotalTokenUsed += TotalTokens;

    await user.save();
}
