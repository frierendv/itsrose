/**
 * Base error for all storage-related failures.
 */
export class StorageClientError extends Error {
	constructor(message: string, options?: ErrorOptions) {
		super(message, options);
		this.name = new.target.name;
	}
}

/**
 * Thrown when the storage client is constructed with invalid or missing config.
 */
export class StorageConfigError extends StorageClientError {}

/**
 * Thrown when an object key or other input fails validation.
 */
export class StorageValidationError extends StorageClientError {}
