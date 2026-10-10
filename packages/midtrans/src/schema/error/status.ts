import { z } from "zod/v4";

export const HttpStatus = z
	.preprocess(
		(value) => (typeof value === "string" ? Number(value) : value),
		z.union([z.int().min(200).max(299), z.int().min(400).max(599)])
	)
	.transform((statusCode) => ({
		success: statusCode >= 200 && statusCode < 300,
		error: statusCode >= 400 && statusCode < 600,
	}));

export type HttpStatus = z.infer<typeof HttpStatus>;
