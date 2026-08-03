import jwt from "jsonwebtoken"
import User from "../model/UserSchema.js"


// dbt
const authUserMiddleware = async (req, res, next) => {
    try {

        const { token } = req.cookies;

        const payload = jwt.verify(token, process.env.JWT_key);

        const user = await User.findById(payload.id);

        if (!user) {
            res.status(404).json({
                message: "User not found"
            })
        }

        req.user = user;
        next();

    } catch (err) {
        console.log(err)
        res.status(500).json({
            message: "Internal Server Error"
        })
    }
}


export default authUserMiddleware;