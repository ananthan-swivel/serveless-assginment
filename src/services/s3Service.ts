/// <reference types="node" />
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { extractMimeType, extractBase64Payload } from "../validation/adSchema";

const client = new S3Client({});

const PRESIGNED_URL_EXPIRES_IN = 60 * 60; // 1 hour

/** Derives a file extension from a MIME type (e.g. "image/png" → "png"). */
function mimeToExtension(mimeType: string): string {
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
  };
  return map[mimeType] ?? "jpg";
}

/**
 * Uploads an image to S3 from a data URI (e.g. "data:image/png;base64,...").
 * The MIME type and file extension are derived from the data URI prefix.
 */
export async function uploadImage(
  adId: string,
  dataUri: string,
): Promise<string> {
  const bucket = process.env.ADS_BUCKET;
  if (!bucket) throw new Error("ADS_BUCKET env var not set");

  const mimeType = extractMimeType(dataUri);
  const rawBase64 = extractBase64Payload(dataUri);
  const extension = mimeToExtension(mimeType);

  const buffer = Buffer.from(rawBase64, "base64");
  const key = `ads/${adId}.${extension}`;

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
    }),
  );

  const signedUrl = await getSignedUrl(
    client,
    new GetObjectCommand({ Bucket: bucket, Key: key }),
    { expiresIn: PRESIGNED_URL_EXPIRES_IN },
  );

  return signedUrl;
}
