# TUS File Upload API Documentation

## Protocol Version

- TUS Protocol: 1.0.0

## Overview

This API implements the TUS resumable upload protocol, built with Hono and deployed on Cloudflare Workers. It provides a robust and reliable way to upload files with resume capability.

## Base URL

```
https://<your-worker>.workers.dev
```

## Authentication

Authentication is handled via Unkey. All requests must include a valid API key:

```http
Authorization: Bearer <your-api-key>
```

## Rate Limiting

Implemented using Upstash Rate Limit:

- Default: 100 requests/minute per IP
- Authenticated: 1000 requests/minute per API key

## Core Protocol Endpoints

### 1. Create Upload

Creates a new upload resource.

```http
POST /files
Tus-Resumable: 1.0.0
Upload-Length: [size]
Upload-Metadata: filename [base64_encoded_name],filetype [base64_encoded_type]
```

#### Response

```http
HTTP/1.1 201 Created
Location: https://<your-worker>.workers.dev/files/:id
Tus-Resumable: 1.0.0
```

### 2. Upload File Content

Uploads a chunk of the file.

```http
PATCH /files/:id
Tus-Resumable: 1.0.0
Content-Type: application/offset+octet-stream
Upload-Offset: [offset]
Content-Length: [chunk_size]
```

#### Response

```http
HTTP/1.1 204 No Content
Tus-Resumable: 1.0.0
Upload-Offset: [new_offset]
```

### 3. Check Upload Status

Get the current status of an upload.

```http
HEAD /files/:id
Tus-Resumable: 1.0.0
```

#### Response

```http
HTTP/1.1 200 OK
Tus-Resumable: 1.0.0
Upload-Length: [total_size]
Upload-Offset: [current_offset]
Upload-Metadata: [metadata_string]
```

## Protocol Extensions

### Supported Extensions

- creation
- creation-with-upload
- termination
- checksum
- expiration

### Creation Extension

Enables upload resource creation. Required for initiating uploads.

### Creation-With-Upload

Allows including file data in the initial creation request.

### Termination Extension

Enables explicit upload termination.

```http
DELETE /files/:id
Tus-Resumable: 1.0.0
```

### Checksum Extension

Supports upload integrity verification.

```http
PATCH /files/:id
Tus-Resumable: 1.0.0
Upload-Checksum: [algorithm] [base64_checksum]
```

Supported algorithms:

- sha1
- md5

### Expiration Extension

Handles upload expiration.

Response includes:

```http
Upload-Expires: [RFC7231_date_time]
```

## Response Status Codes

- `201 Created`: Upload created successfully
- `204 No Content`: Upload chunk processed successfully
- `400 Bad Request`: Invalid request
- `401 Unauthorized`: Invalid or missing API key
- `403 Forbidden`: Operation not allowed
- `404 Not Found`: Upload not found
- `409 Conflict`: Upload offset mismatch
- `410 Gone`: Upload expired or deleted
- `413 Request Entity Too Large`: File too large
- `415 Unsupported Media Type`: Invalid content type
- `429 Too Many Requests`: Rate limit exceeded
- `460 Checksum Mismatch`: Upload chunk checksum verification failed
- `500 Server Error`: Internal server error

## Storage Details

Files are stored in AWS S3:

- Region: [Your S3 Region]
- Bucket: [Your Bucket Name]

## Caching

Redis caching via Upstash is implemented for:

- Upload metadata
- File status
- Authentication tokens

## Error Responses

All error responses follow this format:

```json
{
    "error": {
        "code": "ERROR_CODE",
        "message": "Human readable message",
        "details": {}
    }
}
```

## Implementation Notes

1. Maximum file size: Defined by Tus-Max-Size header in OPTIONS response
2. Chunk size: Recommended 5MB per PATCH request
3. Expiration: Uploads expire after 24 hours if incomplete
4. Supported file types: All types supported
5. Metadata: Must be base64 encoded
