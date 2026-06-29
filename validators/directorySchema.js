import z from "zod";

export const directoryNameSchema = z.string()
    .trim()
    .min(1, "Directory name required")
    .max(50, "Directory name too long");


export const renameDirectorySchema = z.object({
    newDirName: z.string()
        .trim()
        .min(1, "Directory name required")
        .max(50, "Directory name too long"),
});