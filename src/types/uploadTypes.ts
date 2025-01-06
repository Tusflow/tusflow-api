export interface UploadMetadata {
	offset: string;
	length: string;
	deferLength?: boolean;
	metadata?: Record<string, string>;
	createdAt: number;
	multipartUploadId?: string;
	parts: { PartNumber: number; ETag: string }[];
	chunkSize: number;
	networkSpeed: number;
	lastUploadTime: number;
	uploadedChunks: number[];
	lastProgressUpdate?: number;
}
