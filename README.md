
# TusFlow API

A high-performance, scalable implementation of the TUS resumable upload protocol using Cloudflare Workers. This API allows for reliable file uploads with support for resumption, chunking, and progress tracking.

## Features

- Full [TUS protocol](https://tus.io/) v1.0.0 implementation
- Chunked upload support with dynamic chunk sizing
- Upload resumption and progress tracking
- AWS S3/R2 storage backend
- Redis-based state management
- Rate limiting and file validation
- Health monitoring and metrics
- CORS and security headers
- Authentication middleware

## Prerequisites

- Node.js 16+ or Bun 1.0+
- AWS S3 or Cloudflare R2 bucket
- Upstash Redis instance
- Cloudflare Workers account

## Installation

```bash
# Using bun (recommended)
bun install

# Using npm
npm install
```

## Configuration

1. Configure your `wrangler.toml` with appropriate values

2. Set up your secrets using wrangler:

```bash
wrangler secret put AWS_ACCESS_KEY_ID
wrangler secret put AWS_SECRET_ACCESS_KEY
wrangler secret put UPSTASH_REDIS_REST_URL
wrangler secret put UPSTASH_REDIS_REST_TOKEN
wrangler secret put INTERNAL_API_KEY
```

4. Optional: Configure additional settings in `src/config`

## Development

```bash
# Start development server
bun run dev


# Deploy to Cloudflare Workers
bun run deploy
```

## API Documentation

### Endpoints

- `POST /files`: Initialize upload
- `PATCH /files/{uploadId}`: Upload file chunk
- `HEAD /files/{uploadId}`: Get upload status
- `GET /files/{uploadId}/progress`: Get upload progress
- `DELETE /files/{uploadId}`: Cancel upload
- `GET /health`: Check API health

For detailed API documentation, see [API.md](./API.md)

## Security

- All endpoints (except /health) require authentication
- File validation for type and size
- Rate limiting per endpoint
- Secure headers and CORS configuration
- Environment-based configuration
- Secrets management through Cloudflare Workers

## Contributing

Contributions are welcome! Please read our [Contributing Guidelines](CONTRIBUTING.md) for details.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [TUS Protocol](https://tus.io/)
- [Cloudflare Workers](https://workers.cloudflare.com/)
- [Hono](https://hono.dev/)
- [Upstash Redis](https://upstash.com/)

[![Formatted with Biome](https://img.shields.io/badge/Formatted_with-Biome-60a5fa?style=flat&logo=biome)](https://biomejs.dev/)
[![Linted with Biome](https://img.shields.io/badge/Linted_with-Biome-60a5fa?style=flat&logo=biome)](https://biomejs.dev)
[![Checked with Biome](https://img.shields.io/badge/Checked_with-Biome-60a5fa?style=flat&logo=biome)](https://biomejs.dev)