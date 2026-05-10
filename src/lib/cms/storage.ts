import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

function getEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

function makeClient(): S3Client {
  return new S3Client({
    region: "auto",
    endpoint: getEnv("R2_ENDPOINT"),
    credentials: {
      accessKeyId: getEnv("R2_ACCESS_KEY_ID"),
      secretAccessKey: getEnv("R2_SECRET_ACCESS_KEY")
    }
  });
}

export function objectUrl(key: string): string {
  const publicBase = process.env.R2_PUBLIC_BASE_URL;
  if (!publicBase) {
    return key;
  }
  return `${publicBase.replace(/\/$/, "")}/${key.replace(/^\//, "")}`;
}

export async function createPresignedUpload(input: {
  key: string;
  contentType: string;
  expiresInSec?: number;
}): Promise<string> {
  const client = makeClient();
  const command = new PutObjectCommand({
    Bucket: getEnv("R2_BUCKET"),
    Key: input.key,
    ContentType: input.contentType
  });
  return getSignedUrl(client, command, { expiresIn: input.expiresInSec ?? 900 });
}
