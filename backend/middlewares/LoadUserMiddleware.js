import User from "../model/UserSchema.js"

const LoadUser = async (req, res, next) => {
    try {
        const user = await User.findById(req.userID);

        if (!user) {
            return res.status(404).json({
                message: "User doesn't exist"
            });
        }
        req.user = user;
        next();
    } catch (error) {
        console.log("LoadUserMiddleware error", error);
        return res.status(500).json({
            message: "Internal server error"
        });
    }
}

export default LoadUser;