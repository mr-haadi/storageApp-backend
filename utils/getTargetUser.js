import User from "../models/userModel.js";
import { canManageUser } from "./permissions.js";



export async function getTargetUser(req, res) {
    const target = await User.findById(req.params.userId);

    if (!target) {
        res.status(404).json({
            error: "User not found",
        });
        return null;
    }

    const isSelf = req.user._id.toString() === target._id.toString();
    if (!isSelf && !canManageUser(req.user.role, target.role)) {
        res.status(403).json({
            error: "You don't have permission to perform this action",
        });
        return null;
    }

    return target;
}
