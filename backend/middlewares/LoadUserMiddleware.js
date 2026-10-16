import User from "../model/UserSchema.js"

const LoadUser = async (req, res, next) => {
    try {
        const user = await User.findById(req.userID);

        if (!user) {
            // The JWT is no longer associated with an account in this
            // database. Expire the stale session and let the client sign in.
            res.clearCookie("token", {
                httpOnly: true,
                secure: true,
                sameSite: "none",
                path: "/"
            });

            return res.status(401).json({
                message: "Session expired. Please log in again."
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
