import z from "zod";

export const directoryNameSchema = z
  .string()
  .trim()
  .min(1, "Directory name required")
  .max(200, "Directory name too long");

export const createDirectorySchema = z.object({
  dirname: directoryNameSchema.optional(),
});

export const renameDirectorySchema = z.object({
  newDirName: directoryNameSchema,
});