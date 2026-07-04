import z from "zod";

export const renameFileSchema = z.object({
    newFilename: z.string()
    .trim()
    .min(1, "File name required")
    .max(200, "File name is too long")
});