import { model, Schema } from "mongoose";

const directorySchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Directory name is required!"],
    },
    size: {
      type: Number,
      required: true,
      default: 0
    },
    path: [{
      type: Schema.Types.ObjectId,
      required: true,
      ref: "Directory",
      default: []
    }],
    parentDirId: {
      type: Schema.Types.ObjectId,
      default: null,
      ref: "Directory",
    },
    userId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
  },
  {
    strict: "throw",
    timestamps: true
  },
);

const Directory = model("Directory", directorySchema);

export default Directory;
