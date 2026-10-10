import { z } from "zod/v4";
import { CoreErrorSchema } from "./core";
import { DefaultErrorSchema } from "./default";

export const ApiErrorSchema = z.union([CoreErrorSchema, DefaultErrorSchema]);
export type ApiError = z.infer<typeof ApiErrorSchema>;
