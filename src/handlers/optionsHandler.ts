import { TUS_CONFIG } from "@/config";

export function handleOptionsRequest(
	baseHeaders: Record<string, string>,
): Response {
	const headers = {
		...baseHeaders,
		"Tus-Version": TUS_CONFIG.SUPPORTED_VERSIONS.join(","), // Server's supported versions in order of preference
		"Tus-Extension": TUS_CONFIG.EXTENSIONS.join(","),
		"Tus-Max-Size": TUS_CONFIG.MAX_SIZE.toString(),
	};

	// According to protocol: return 204 No Content
	return new Response(null, {
		status: 204,
		headers,
	});
}
