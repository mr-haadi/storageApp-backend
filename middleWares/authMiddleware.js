import redisClient from "../config/redis.js";
import User from "../models/userModel.js";
import { ROLE_LEVELS } from "../utils/roles.js";

function unauthorized(res) {
  res.clearCookie("sid");
  return res.status(401).json({
    error: "Active session not found!"
  });
}

export default async function checkAuth(req, res, next) {
  const { sid } = req.signedCookies;

  if (!sid) return unauthorized(res);

  const session = await redisClient.json.get(`session:${sid}`)

  if (!session) return unauthorized(res);

  const user = await User.findById(session.userId).lean();

  if (!user) return unauthorized(res);

  if (user.isDeleted) {
    return res.status(403).json({ error: "Your account is disabled! Contact Admin to recover." })
  }
  req.user = user;
  next();
}

export function requireRole(minRole) {
  return (req, res, next) => {
    if (ROLE_LEVELS[req.user.role] >= ROLE_LEVELS[minRole]) {
      return next();
    }

    return res.status(403).json({
      error: "Access denied!",
    });
  };
}
