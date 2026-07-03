import { DeleteObjectCommand, DeleteObjectsCommand, GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const bucketName = process.env.R2_BUCKET

export const r2Client = new S3Client({
    region: "auto",
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
    }
})

export const createUploadSignedUrl = async ({ key, contentType }) => {
    const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        ContentType: contentType
    })

    const url = await getSignedUrl(r2Client, command, {
        expiresIn: 300,
        signableHeaders: new Set(["content-type"])
    })

    return url;
}

export const createGetSignedUrl = async ({ key, download = false, filename }) => {
    const command = new GetObjectCommand({
        Bucket: bucketName,
        Key: key,
        ResponseContentDisposition: `${download ? "attachment" : "inline"}; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`
    })

    const url = await getSignedUrl(r2Client, command, {
        expiresIn: 3600,
    })
    return url;
}

export const deleteR2File = async ({ key }) => {
    const command = new DeleteObjectCommand({
        Bucket: bucketName,
        Key: key,
    })
    return await r2Client.send(command);
}

export const deleteR2Files = async (keys) => {
    const command = new DeleteObjectsCommand({
        Bucket: bucketName,
        Delete: {
            Objects: keys,
            Quiet: true
        }
    })

    return await r2Client.send(command);
}

export const getR2FileMetaData = async ({ key }) => {
    const command = new HeadObjectCommand({
        Bucket: bucketName,
        Key: key,
    })
    return await r2Client.send(command);
}