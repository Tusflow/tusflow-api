import type { S3Client } from "@aws-sdk/client-s3";

export async function checkS3Health(s3Client: S3Client): Promise<boolean> {
	try {
		await s3Client.config.credentials(); // Check if S3 credentials are valid
		return true;
	} catch (error) {
		console.error("S3 health check failed:", error);
		return false;
	}
}
