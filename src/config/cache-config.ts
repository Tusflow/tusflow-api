import { UPLOAD_CONFIG } from "@/config";

export const CACHE_CONFIG = {
	CACHE_NAME: "tusflow-api-cache",
	MAX_AGE: UPLOAD_CONFIG.UPLOAD.INCOMPLETE_TTL,
	VARY_HEADERS: ["Accept", "Accept-Encoding", "Authorization"],
};
