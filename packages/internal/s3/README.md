# `@itsrose/s3`

Modern, ergonomic storage client optimized for **Cloudflare R2**, built on the
standard [`@aws-sdk/client-s3`](https://www.npmjs.com/package/@aws-sdk/client-s3).

## Installation

```bash
pnpm add @itsrose/s3
```

## Quick Start

```ts
import { StorageClient } from "@itsrose/s3";

const storage = new StorageClient({
	accountId: process.env.R2_ACCOUNT_ID,
	accessKeyId: process.env.R2_ACCESS_KEY_ID,
	secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
	bucket: "my-bucket",
	keyPrefix: "app/assets", // optional global prefix
	publicDomain: "https://cdn.example.com", // optional public bucket domain
});
```

The R2 endpoint is always `https://<accountId>.r2.cloudflarestorage.com` with
region `auto`.

## Usage

### Uploading

`upload` accepts a `Buffer` or a base64 string, auto-detects the MIME type from
magic bytes, and applies the configured `keyPrefix` automatically.

```ts
// From a Buffer — content type detected automatically.
const result = await storage.upload("avatar.png", imageBuffer);
console.log(result.key); // "app/assets/avatar.png"
console.log(result.url); // "https://cdn.example.com/app/assets/avatar.png"

// From a base64 string.
await storage.upload("avatar.png", imageBuffer.toString("base64"));

// With an explicit content type and custom metadata.
await storage.upload("report.pdf", pdfBuffer, {
	contentType: "application/pdf",
	metadata: { author: "itsrose" },
});
```

### Downloading

```ts
const buffer: Buffer = await storage.download("avatar.png");
```

### Deleting

```ts
await storage.delete("avatar.png");
```

### Public URLs

```ts
const url = storage.getPublicUrl("avatar.png"); // string | null
```

### Pre-signed URLs

```ts
const url = await storage.getPresignedUrl("private/report.pdf", 600);
```

## Errors

```ts
import { StorageClientError, StorageConfigError } from "@itsrose/s3";

try {
	await storage.download("missing.png");
} catch (error) {
	if (error instanceof StorageClientError) {
		console.error("Storage error:", error.message);
	}
}
```
