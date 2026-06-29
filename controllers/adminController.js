import redisClient from "../config/redis.js";
import Directory from "../models/directoryModel.js";
import File from "../models/fileModel.js";
import User from "../models/userModel.js";
import { deleteR2Files } from "../services/cloudflareR2Service.js";
import { getTargetUser } from "../utils/getTargetUser.js";
import { canAssignRole } from "../utils/permissions.js";
import { roleSchema } from "../validators/authSchema.js";
import { deleteUserSessions } from "./userController.js";


export const getAllUsers = async (req, res) => {
    const allUsers = await User.find()
        .select("name email role isDeleted picture maxStorageInBytes usedStorageInBytes")
        .lean();

    // all active redis sessions
    const allSessions = await redisClient.ft.search(
        "userIdIdx",
        "*",
        {
            RETURN: ["userId"],
        }
    );
    const loggedInUsers = new Set(
        allSessions.documents.map(
            (doc) => doc.value.userId.toString()
        )
    );

    const transformedUsers = allUsers.map(
        ({ _id, name, email, role, isDeleted, picture, maxStorageInBytes, usedStorageInBytes }) => ({
            id: _id,
            name,
            email,
            role,
            isDeleted,
            picture,
            maxStorageInBytes,
            usedStorageInBytes,
            isLoggedIn: loggedInUsers.has(_id.toString()),
        })
    );
    return res.status(200).json(transformedUsers);
};

export const logoutByAdmin = async (req, res) => {
    const target = await getTargetUser(req, res);

    if (!target) return;

    await deleteUserSessions(target._id);

    return res.json({
        message: "User logged out",
    });
};

export const softDelete = async (req, res) => {
    const { userId } = req.params;

    if (req.user._id.toString() === userId) {
        return res.status(403).json({
            error: "Cannot delete yourself",
        });
    }

    const target = await getTargetUser(req, res);

    if (!target) return;

    target.isDeleted = true;
    await target.save();

    await deleteUserSessions(userId);

    return res.json({
        message: "User deleted",
    });
};

export const hardDelete = async (req, res) => {
    const { userId } = req.params;

    if (req.user._id.toString() === userId) {
        return res.status(403).json({
            error: "Cannot delete yourself",
        });
    }

    const target = await getTargetUser(req, res);

    if (!target) return;

    const allFiles = await File.find({ userId })
        .select("_id extension")
        .lean();

    const keys = allFiles.map(({ _id, extension }) => ({
        Key: `${_id}${extension}`,
    }));

    if (keys.length) {
        await deleteR2Files(keys);
    }
    await Promise.all([
        File.deleteMany({ userId }),
        deleteUserSessions(userId),
        Directory.deleteMany({ userId }),
        target.deleteOne(),
    ]);

    return res.json({
        message: "User deleted successfully",
    });
};

export const recoverUserByAdmin = async (req, res) => {
    const target = await getTargetUser(req, res);

    if (!target) return;

    target.isDeleted = false;
    await target.save();

    return res.json({
        message: "User recovered successfully",
    });
};

export const updateUserRole = async (req, res) => {
    const { userId } = req.params;

    if (req.user._id.toString() === userId) {
        return res.status(403).json({
            error: "Cannot change your own role",
        });
    }

    const { success, data, error } =
        roleSchema.safeParse(req.body);

    if (!success) {
        return res.status(400).json({
            error: error.issues[0].message,
        });
    }

    const target = await getTargetUser(req, res);

    if (!target) return;

    if (
        !canAssignRole(
            req.user.role,
            data.role
        )
    ) {
        return res.status(403).json({
            error: "Cannot assign this role",
        });
    }

    if (target.role === data.role) {
        return res.status(400).json({
            error: "User already has this role",
        });
    }
    target.role = data.role;
    await target.save();

    return res.json({
        message: "Role updated",
    });
};