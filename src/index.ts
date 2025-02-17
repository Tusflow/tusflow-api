import { SECURITY_CONFIG } from "@/config";
import {
  handleDeleteRequest,
  handleGetRequest,
  handleHeadRequest,
  handleOptionsRequest,
  handlePatchRequest,
  handlePostRequest,
} from "@/handlers";
import maintenanceRoutes from "@/routes/maintenance";
import { S3Client } from "@aws-sdk/client-s3";
import { Redis } from "@upstash/redis/cloudflare";
import createApp from "@/lib/create-app";

const app = createApp();

// Maintenance routes
app.route("/", maintenanceRoutes);

// Upload routes
app.all("/files/*", async (c) => {
  const {
    AWS_REGION,
    AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY,
    AWS_BUCKET_NAME,
    AWS_ENDPOINT,
    UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN,
  } = c.env;

  // Intialize S3 client and Upstash Redis client
  const s3Client = new S3Client({
    region: AWS_REGION,
    endpoint: AWS_ENDPOINT,
    credentials: {
      accessKeyId: AWS_ACCESS_KEY_ID,
      secretAccessKey: AWS_SECRET_ACCESS_KEY,
    },
  });

  const redis = new Redis({
    url: UPSTASH_REDIS_REST_URL,
    token: UPSTASH_REDIS_REST_TOKEN,
  });

  // Get the upload ID from the request path
  const uploadId = c.req.path.split("/files/")[1];

  // Get the TUS resumable version from the request headers
  const tusResumable = c.req.header("Tus-Resumable") || "1.0.0";
  const tusVersions = tusResumable.split(",").map((v) => v.trim());

  if (!tusVersions.includes("1.0.0")) {
    return new Response("Unsupported TUS version", { status: 412 });
  }

  const validVersion = tusVersions.find((v) => v === "1.0.0") || "1.0.0";

  const baseHeaders = {
    "Tus-Resumable": validVersion,
    "Access-Control-Allow-Origin": SECURITY_CONFIG.ALLOWED_ORIGINS.join(", "),
    "Access-Control-Allow-Methods": SECURITY_CONFIG.ALLOWED_METHODS.join(", "),
    "Access-Control-Allow-Headers": SECURITY_CONFIG.ALLOWED_HEADERS.join(", "),
  };

  const method = c.req.header("X-HTTP-Method-Override") || c.req.method;

  // Handle the request based on the HTTP method
  try {
    switch (method) {
      case "HEAD":
        return await handleHeadRequest(redis, uploadId, baseHeaders);
      case "PATCH":
        return await handlePatchRequest(
          c,
          s3Client,
          redis,
          uploadId,
          AWS_BUCKET_NAME,
          baseHeaders
        );
      case "POST":
        return await handlePostRequest(
          c,
          s3Client,
          redis,
          AWS_BUCKET_NAME,
          baseHeaders
        );
      case "DELETE":
        return await handleDeleteRequest(
          s3Client,
          redis,
          uploadId,
          AWS_BUCKET_NAME,
          baseHeaders
        );
      case "GET":
        if (c.req.path.endsWith("/progress")) {
          return await handleGetRequest(c, redis, uploadId, baseHeaders);
        }
        return new Response("Not Found", { status: 404 });
      case "OPTIONS":
        return handleOptionsRequest(baseHeaders);
      default:
        return new Response("Method not allowed", { status: 405 });
    }
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error:`, error);
    return new Response("Internal Server Error", { status: 500 });
  }
});

export default app;
