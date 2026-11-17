/**
 * Environment keys consumed by the Eusend mailer.
 */
export const STORAGE_ENV = {
	accountId: "S3_ACCOUNT_ID",
	accessKeyId: "S3_ACCESS_KEY",
	secretAccessKey: "S3_SECRET_KEY",
	bucket: "S3_BUCKET",
	publicDomain: "S3_PUBLIC_DOMAIN",
} as const;

export const STORAGE_ENV_KEYS = [
	STORAGE_ENV.accountId,
	STORAGE_ENV.accessKeyId,
	STORAGE_ENV.secretAccessKey,
	STORAGE_ENV.bucket,
	STORAGE_ENV.publicDomain,
] as const;
