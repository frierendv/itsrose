import { z } from "zod/v4";
import { CoreErrorSchema } from "./core";
import { DefaultErrorSchema } from "./default";
import { SubscriptionErrorSchema } from "./subscription";
import { UnauthorizedErrorSchema } from "./unauthorized";

/**
 * Every error body Midtrans can return.
 *
 * The order matters: Core errors are checked first because they are the most
 * specific, followed by the legacy `error_messages` envelope, HTTP 401 and the
 * subscription shape.
 */
export const ApiErrorSchema = z.union([
	CoreErrorSchema,
	DefaultErrorSchema,
	UnauthorizedErrorSchema,
	SubscriptionErrorSchema,
]);

export type ApiError = z.infer<typeof ApiErrorSchema>;
