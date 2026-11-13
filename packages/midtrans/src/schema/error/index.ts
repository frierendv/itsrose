/**
 * The Midtrans error family.
 *
 * A single model: every error shape the client can receive is classified into
 * exactly one kind by the schemas exported here. The runtime error type is
 * inferred from the schemas, so no hand-written error interface exists
 * anywhere in the package.
 *
 * The canonical names of the model are exported from the client barrel as
 * `MidtransApiError` and `MidtransErrorKind`; they are aliased here as
 * `ApiError` and `ApiErrorKind` to keep the two public barrels free of
 * ambiguous re-exports.
 */
export {
	ApiErrorSchema,
	CoreErrorSchema,
	DefaultErrorSchema,
	MidtransApiErrorSchema,
	TransportErrorSchema,
	UnauthorizedErrorSchema,
	createMidtransErrorModel,
} from "./model";
export type {
	CoreError,
	DefaultError,
	MidtransApiError as ApiError,
	MidtransErrorKind as ApiErrorKind,
	TransportError,
	UnauthorizedError,
} from "./model";
