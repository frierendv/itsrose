import type { InternalAnyProps, Merge, OmitMeta, PickMeta } from "../types";

const isRecord = (value: unknown): value is InternalAnyProps =>
	Boolean(value) && typeof value === "object";

/** @internal */
export const mergeMeta = <Base extends object, Extra extends object>(
	base?: Base,
	extra?: Extra
) =>
	({
		...(isRecord(base) ? base : ({} as Base)),
		...(isRecord(extra) ? extra : ({} as Extra)),
	}) as Merge<Base, Extra>;

/**
 * Extracts meta without mutating the incoming object.
 *
 * @internal
 */
export function extractMeta<T>(payload = {} as T) {
	if (!isRecord(payload) || !("meta" in payload)) {
		return {
			payload: payload as OmitMeta<T>,
			meta: {} as PickMeta<T>,
		};
	}

	const { meta, ...rest } = payload as InternalAnyProps & {
		meta?: unknown;
	};

	const normalizedMeta = isRecord(meta)
		? (meta as PickMeta<T>)
		: ({} as PickMeta<T>);

	return {
		payload: rest as OmitMeta<T>,
		meta: normalizedMeta,
	};
}
