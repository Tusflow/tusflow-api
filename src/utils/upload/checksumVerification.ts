import * as crypto from "node:crypto";

// Verify the checksum of the uploaded file
export async function verifyChecksum(
	data: ArrayBuffer,
	algorithm: string,
	expectedChecksum: string,
): Promise<boolean> {
	const supportedAlgorithms = ["md5", "sha1", "sha256", "sha512"];

	if (!supportedAlgorithms.includes(algorithm.toLowerCase())) {
		throw new Error(`Unsupported checksum algorithm: ${algorithm}`);
	}

	const hash = crypto.createHash(algorithm.toLowerCase());
	hash.update(new Uint8Array(data));
	const calculatedChecksum = hash.digest("base64");

	return calculatedChecksum === expectedChecksum;
}
