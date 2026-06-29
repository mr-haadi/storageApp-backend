import { Types } from "mongoose";

export default function (req, res, next, id) {
  if (!Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: `Invalid Id! ${id}` });
  }
  next();
}