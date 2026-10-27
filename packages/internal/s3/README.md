# `@itsrose/s3`

Lightweight S3 and Cloudflare R2 storage client built on top of `s3mini`.

## Installation

```bash
pnpm add @itsrose/s3
```

## Quick Start

```ts
import { S3 } from "@itsrose/s3";

const s3 = new S3({
	accessKeyId: process.env.S3_ACCESS_KEY_ID,
	secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
	endpoint: "https://<account_id>.r2.cloudflarestorage.com",
	bucket: "my-bucket",
	customDomain: "https://cdn.example.com",
});
```

## Usage

### Uploading Objects

```ts
// High-level upload with MIME auto-detection and public URL resolution
const result = await s3.upload("uploads/avatar.png", imageBuffer);
console.log(result.publicUrl);
console.log(result.etag);

// Direct putObject
await s3.putObject("docs/readme.txt", "Hello World", {
	contentType: "text/plain",
	cacheControl: "public, max-age=3600",
});
```

### Retrieving Objects

```ts
// As string
const text = await s3.getObject("docs/readme.txt");

// As Buffer
const buffer = await s3.getObjectBuffer("uploads/avatar.png");

// As Readable stream
const stream = await s3.getObjectStream("video.mp4");

// As parsed JSON
const data = await s3.getObjectJSON<MyType>("data.json");
```

### Deleting Objects

```ts
// Single object
await s3.deleteObject("docs/readme.txt");

// Batch delete
const { deleted, errors } = await s3.deleteBatch(["file1.png", "file2.png"]);

// Purge prefix
await s3.purgePrefix("temp/");
```

### Pre-signed URLs

```ts
// Pre-signed download URL (default: 15 minutes)
const downloadUrl = await s3.createPresignedDownloadUrl({
	key: "private/report.pdf",
	expiresInSeconds: 300,
});

// Pre-signed upload URL
const uploadUrl = await s3.createPresignedUploadUrl({
	key: "uploads/new-file.zip",
	contentType: "application/zip",
	expiresInSeconds: 600,
});
```

### Public URLs

```ts
const url = s3.getPublicUrl("uploads/avatar.png");
```

### Error Handling

```ts
import { S3ObjectNotFoundError, S3ValidationError } from "@itsrose/s3";

try {
	await s3.getObject("missing.txt");
} catch (error) {
	if (error instanceof S3ObjectNotFoundError) {
		console.error("Object not found:", error.key);
	}
}
```
