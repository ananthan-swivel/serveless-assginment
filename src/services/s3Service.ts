import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from "uuid";

const client = new S3Client({});

export async function uploadImage(
  adId: string,
  base64: string,
): Promise<string> {
  const bucket = process.env.ADS_BUCKET;
  if (!bucket) throw new Error("ADS_BUCKET env var not set");

  const buffer = Buffer.from(base64, "base64");
  const key = `ads/${adId}.jpg`;

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: "image/jpeg",
    }),
  );

  const region = process.env.AWS_REGION || "us-east-1";
  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
}
