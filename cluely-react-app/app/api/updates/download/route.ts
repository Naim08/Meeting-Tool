import { NextRequest, NextResponse } from "next/server";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const DEFAULT_TTL_SECONDS = 300;
const MAX_TTL_SECONDS = 3600;

function resolveTtl(): number {
  const raw = process.env.UPDATE_URL_TTL_SECONDS;
  const parsed = raw ? Number(raw) : NaN;
  if (Number.isFinite(parsed) && parsed > 0) {
    return Math.min(Math.floor(parsed), MAX_TTL_SECONDS);
  }
  return DEFAULT_TTL_SECONDS;
}

function resolveObjectKey(
  params: URLSearchParams,
  prefix: string
): string | null {
  const keyParam = params.get("key");
  const version = params.get("version");
  const platform = params.get("platform");
  const file = params.get("file");

  let key = keyParam ?? "";

  if (!key && version && platform && file) {
    key = `${version}/${platform}/${file}`;
  }

  if (!key) {
    return null;
  }

  const sanitized = key.replace(/^\//, "");
  if (sanitized.includes("..")) {
    throw new Error("Invalid object key");
  }

  const trimmedPrefix = prefix.replace(/^\//, "").replace(/\/$/, "");
  return trimmedPrefix ? `${trimmedPrefix}/${sanitized}` : sanitized;
}

function createS3Client(): S3Client {
  const region = process.env.AWS_REGION;
  if (!region) {
    throw new Error("AWS_REGION env variable is required");
  }

  const credentials =
    process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
      ? {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
          sessionToken: process.env.AWS_SESSION_TOKEN,
        }
      : undefined;

  return new S3Client({ region, credentials });
}

export async function GET(request: NextRequest) {
  const bucket = process.env.UPDATE_S3_BUCKET;
  if (!bucket) {
    return NextResponse.json(
      { error: "UPDATE_S3_BUCKET env variable is required" },
      { status: 500 }
    );
  }

  try {
    const prefix = process.env.UPDATE_S3_PREFIX ?? "";
    const key = resolveObjectKey(request.nextUrl.searchParams, prefix);

    if (!key) {
      return NextResponse.json(
        {
          error:
            "Provide ?key=<object-key> or ?version=<v>&platform=<p>&file=<name>",
        },
        { status: 400 }
      );
    }

    const expiresIn = resolveTtl();
    const client = createS3Client();
    const command = new GetObjectCommand({ Bucket: bucket, Key: key });

    const url = await getSignedUrl(client, command, { expiresIn });

    return NextResponse.json({ url, expiresIn, key, bucket });
  } catch (error) {
    console.error("[api/updates/download] Failed to create signed URL", error);
    return NextResponse.json(
      { error: "Unable to generate download URL" },
      { status: 500 }
    );
  }
}
