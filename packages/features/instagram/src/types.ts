import type { IInstagramResponse, IMediaNode } from "./zod-schema";

export type ScrapeFn = (
	url: string,
	controller?: AbortController
) => Promise<IInstagramResponse | null>;

export type ParseMediaUrl<T> = (media: T) => IMediaNode[];
