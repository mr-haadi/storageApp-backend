import File from "../models/fileModel.js";
import Directory from "../models/directoryModel.js";
import { updateDirectorySize } from "./fileController.js";
import { deleteR2Files } from "../services/cloudflareR2Service.js";
import { directoryNameSchema, renameDirectorySchema } from "../validators/directorySchema.js";

export const readDirectory = async (req, res) => {
  const user = req.user;
  const _id = req.params.id || user.rootDirId;

  // Find the directory and verify ownership
  const directoryData = await Directory.findOne({
    _id,
    userId: user._id,
  }).lean();
  if (!directoryData) {
    return res.status(404).json({
      error: "Directory not found or you do not have access to it!",
    });
  }

  const files = await File.find({ parentDirId: directoryData._id }).lean();
  const directories = await Directory.find({ parentDirId: _id }).lean();

  return res.status(200).json({
    ...directoryData,
    files: files.map((dir) => ({ ...dir, id: dir._id })),
    directories: directories.map((dir) => ({ ...dir, id: dir._id })),
  });
};

export const createDirectory = async (req, res) => {
  const user = req.user;
  const parentDirId = req.params.parentDirId || user.rootDirId;
  const dirname = req.headers.dirname || "New Folder";

  const { success, data, error } = directoryNameSchema.safeParse(dirname)
  if (!success) {
    return res.status(400).json({ error: error.issues[0].message });
  }

  const parentDir = await Directory.findOne({
    _id: parentDirId,
    userId: user._id,
  }).lean();

  if (!parentDir) {
    return res.status(403).json({
      error: "Invalid parent directory or access denied!",
    });
  }

  const path =
    parentDir._id.toString() === user.rootDirId.toString()
      ? []
      : [...parentDir.path, parentDir._id];

  const insertedDir = await Directory.create({
    name: data,
    parentDirId,
    userId: user._id,
    path,
  });
  return res.status(200).json({ message: "Directory Created!" });
};

export const getDirectoryPath = async (req, res) => {
  const { id } = req.params;

  const dir = await Directory.findById(id)
    .populate("path", "name _id")
    .select("path name")
    .lean();

  if (!dir) {
    return res.status(404).json({ error: "Directory not found" });
  }

  return res.status(200).json({
    path: dir.path,
    current: {
      _id: dir._id,
      name: dir.name,
    },
  });
};

export const renameDirectory = async (req, res) => {
  const user = req.user;
  const { id } = req.params;
  const { success, data, error } = renameDirectorySchema.safeParse(req.body)
  if (!success) {
    return res.status(400).json({ error: error.issues[0].message });
  }
  const { newDirName } = data;

  const dirData = await Directory.findOne({
    _id: id,
    userId: user._id,
  });
  if (!dirData) {
    return res.status(404).json({
      error: "Directory not found or access denied!",
    });
  }
  dirData.name = newDirName;
  await dirData.save();

  res.status(200).json({ message: "Directory Renamed!" });
};

export const deleteDirectory = async (req, res) => {
  const user = req.user;
  const { id } = req.params;

  const directoryData = await Directory.findOne({
    _id: id,
    userId: user._id,
  })
    .select("_id size parentDirId")
    .lean();

  if (!directoryData) {
    return res.status(404).json({
      error: "Directory not found or Access denied!",
    });
  }

  async function getDirectoryContent(id) {
    let files = await File.find({ parentDirId: id }).select("_id extension").lean();
    let directories = await Directory.find({ parentDirId: id })
      .select("_id")
      .lean();

    for await (const { _id } of directories) {
      const { files: childFiles, directories: childDirectories } =
        await getDirectoryContent(_id);
      files = [...files, ...childFiles];
      directories = [...directories, ...childDirectories];
    }
    return { files, directories };
  }

  const data = await getDirectoryContent(directoryData._id);
  const { files, directories } = data;

  const keys = files.map(({ _id, extension }) => ({ Key: `${_id}${extension}` }))
  if (keys.length) {
    await deleteR2Files(keys)
  }

  await File.deleteMany({
    _id: { $in: files.map(({ _id }) => _id) },
  });
  await Directory.deleteMany({
    _id: { $in: [...directories.map(({ _id }) => _id), directoryData._id] },
  });

  await updateDirectorySize(directoryData.parentDirId, -directoryData.size, user.rootDirId)

  return res.status(200).json({ message: "Directory Deleted successfully!" });
};
