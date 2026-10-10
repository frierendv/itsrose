import { z } from "zod/v4";

export type NarrowInput<T, Schema> = T &
	Schema & {
		[K in keyof T]: K extends keyof Schema ? T[K] : never;
	};
export type PDeepNullable<T> = {
	// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
	[K in keyof T]: T[K] extends Function
		? T[K]
		: T[K] extends Array<infer U>
			? Array<DeepNullable<U>> | null
			: T[K] extends object
				? DeepNullable<T[K]> | null
				: T[K] | null;
};

export type DeepNullable<T> = T extends (...args: any[]) => any
	? T
	: T extends Date | RegExp | Error
		? T | null
		: T extends Map<infer K, infer V>
			? Map<DeepNullable<K>, DeepNullable<V>> | null
			: T extends Set<infer U>
				? Set<DeepNullable<U>> | null
				: T extends readonly (infer _U)[]
					? { [K in keyof T]: DeepNullable<T[K]> | null } | null
					: T extends object
						? { [K in keyof T]: DeepNullable<T[K]> | null } | null
						: T | null;

export type Prettify<T> = {
	[K in keyof T]: T[K];
} & {};
/**
 * Merge Input and Schema with Extra
 */
export type MergeWithSchema<Schema, Input, Extra extends {} = {}> = Prettify<
	(Omit<Schema, keyof Input> & Input) & (Extra & {})
>;

// --- Recursive TypeScript Types ---
export type ZodDeepNullable<T extends z.core.SomeType> =
	T extends z.ZodOptional<infer Inner>
		? z.ZodOptional<z.ZodNullable<ZodDeepNullable<Inner>>>
		: T extends z.ZodNullable<infer Inner>
			? z.ZodNullable<ZodDeepNullable<Inner>>
			: T extends z.ZodObject<infer Shape, infer Config>
				? z.ZodObject<
						{ [K in keyof Shape]: ZodDeepNullable<Shape[K]> },
						Config
					>
				: T extends z.ZodArray<infer Element>
					? z.ZodArray<ZodDeepNullable<Element>>
					: T extends z.ZodIntersection<infer Left, infer Right>
						? z.ZodIntersection<
								ZodDeepNullable<Left>,
								ZodDeepNullable<Right>
							>
						: T extends z.ZodDiscriminatedUnion<
									infer Options,
									infer Disc
							  >
							? z.ZodDiscriminatedUnion<
									{
										[K in keyof Options]: ZodDeepNullable<
											Options[K]
										>;
									},
									Disc
								>
							: T extends z.ZodUnion<infer Options>
								? z.ZodUnion<{
										[K in keyof Options]: ZodDeepNullable<
											Options[K]
										>;
									}>
								: T;

export type ZodDeepNullish<T extends z.core.SomeType> =
	T extends z.ZodOptional<infer Inner>
		? z.ZodOptional<z.ZodNullable<ZodDeepNullish<Inner>>>
		: T extends z.ZodNullable<infer Inner>
			? z.ZodOptional<z.ZodNullable<ZodDeepNullish<Inner>>>
			: T extends z.ZodObject<infer Shape, infer Config>
				? z.ZodObject<
						{ [K in keyof Shape]: ZodDeepNullish<Shape[K]> },
						Config
					>
				: T extends z.ZodArray<infer Element>
					? z.ZodArray<ZodDeepNullish<Element>>
					: T extends z.ZodIntersection<infer Left, infer Right>
						? z.ZodIntersection<
								ZodDeepNullish<Left>,
								ZodDeepNullish<Right>
							>
						: T extends z.ZodDiscriminatedUnion<
									infer Options,
									infer Disc
							  >
							? z.ZodDiscriminatedUnion<
									{
										[K in keyof Options]: ZodDeepNullish<
											Options[K]
										>;
									},
									Disc
								>
							: T extends z.ZodUnion<infer Options>
								? z.ZodUnion<{
										[K in keyof Options]: ZodDeepNullish<
											Options[K]
										>;
									}>
								: T;

export type ZodOmitKeys<T extends z.core.SomeType, Keys extends PropertyKey> =
	T extends z.ZodOptional<infer Inner>
		? z.ZodOptional<ZodOmitKeys<Inner, Keys>>
		: T extends z.ZodNullable<infer Inner>
			? z.ZodNullable<ZodOmitKeys<Inner, Keys>>
			: T extends z.ZodObject<infer Shape, infer Config>
				? z.ZodObject<Omit<Shape, Keys>, Config>
				: T extends z.ZodIntersection<infer Left, infer Right>
					? z.ZodIntersection<
							ZodOmitKeys<Left, Keys>,
							ZodOmitKeys<Right, Keys>
						>
					: T extends z.ZodDiscriminatedUnion<
								infer Options,
								infer Disc
						  >
						? z.ZodDiscriminatedUnion<
								{
									[K in keyof Options]: ZodOmitKeys<
										Options[K],
										Keys
									>;
								},
								Disc
							>
						: T extends z.ZodUnion<infer Options>
							? z.ZodUnion<{
									[K in keyof Options]: ZodOmitKeys<
										Options[K],
										Keys
									>;
								}>
							: T;

export type ZodSchemaWithExtra<
	Base extends z.core.SomeType,
	Extra extends z.ZodRawShape | z.core.SomeType | undefined = undefined,
> = Extra extends undefined
	? Base
	: Base extends z.ZodObject<infer BaseShape, infer Config>
		? Extra extends z.ZodObject<infer ExtraShape, any>
			? z.ZodObject<z.util.Extend<BaseShape, ExtraShape>, Config>
			: Extra extends z.ZodRawShape
				? z.ZodObject<z.util.Extend<BaseShape, Extra>, Config>
				: Extra extends z.core.SomeType
					? z.ZodIntersection<Base, Extra>
					: Base
		: Extra extends z.ZodObject<infer ExtraShape, any>
			? z.ZodIntersection<ZodOmitKeys<Base, keyof ExtraShape>, Extra>
			: Extra extends z.ZodRawShape
				? z.ZodIntersection<
						ZodOmitKeys<Base, keyof Extra>,
						z.ZodObject<Extra>
					>
				: Extra extends z.core.SomeType
					? z.ZodIntersection<Base, Extra>
					: Base;

/**
 * Recursively omits top-level keys from any ZodObject contained within the schema
 * (including intersections, unions, and optional/nullable wrappers).
 */
export function omitSchemaKeys<T extends z.core.SomeType>(
	schema: T,
	keys: string[]
): any {
	if (!keys || keys.length === 0) {
		return schema;
	}

	if (schema instanceof z.ZodObject) {
		const shape = schema.shape;
		let hasMatch = false;
		for (const key of keys) {
			if (key in shape) {
				hasMatch = true;
				break;
			}
		}
		if (!hasMatch) {
			return schema;
		}
		const mask: any = {};
		for (const key of keys) {
			if (key in shape) {
				mask[key] = true;
			}
		}
		return schema.omit(mask);
	}

	if (schema instanceof z.ZodIntersection) {
		const def = (schema as any)._zod.def;
		return z.intersection(
			omitSchemaKeys(def.left, keys),
			omitSchemaKeys(def.right, keys)
		);
	}

	if (schema instanceof z.ZodDiscriminatedUnion) {
		const def = (schema as any)._zod.def;
		return z.discriminatedUnion(
			def.discriminator,
			def.options.map((opt: any) => omitSchemaKeys(opt, keys))
		);
	}

	if (schema instanceof z.ZodUnion) {
		const def = (schema as any)._zod.def;
		return z.union(
			def.options.map((opt: any) => omitSchemaKeys(opt, keys))
		);
	}

	if (schema instanceof z.ZodOptional) {
		return z.optional(omitSchemaKeys(schema.unwrap() as any, keys));
	}

	if (schema instanceof z.ZodNullable) {
		return z.nullable(omitSchemaKeys(schema.unwrap() as any, keys));
	}

	return schema;
}

/**
 * Merges extra fields onto a base schema, overwriting any matching fields in the base schema.
 */
export function mergeWithExtra<
	T extends z.core.SomeType,
	Extra extends z.ZodRawShape | z.core.SomeType | undefined = undefined,
>(schema: T, extraFields?: Extra): ZodSchemaWithExtra<T, Extra> {
	if (!extraFields) {
		return schema as any;
	}

	const isZodType =
		extraFields instanceof z.ZodType || (extraFields as any)?._zod;
	const isZodObject = extraFields instanceof z.ZodObject;
	const isRawShape =
		!isZodType && typeof extraFields === "object" && extraFields !== null;

	const extraShape = isZodObject
		? (extraFields as z.ZodObject<any>).shape
		: isRawShape
			? (extraFields as z.ZodRawShape)
			: null;

	const extraSchema = isZodType
		? (extraFields as z.core.SomeType)
		: z.object(extraShape as any);

	if (extraShape) {
		const keys = Object.keys(extraShape);
		if (keys.length === 0) {
			return schema as any;
		}
		if (schema instanceof z.ZodObject) {
			return schema.extend(extraShape) as any;
		}
		const stripped = omitSchemaKeys(schema, keys);
		return z.intersection(stripped, extraSchema) as any;
	}

	return z.intersection(schema, extraSchema) as any;
}

/** Converts all nested optional fields to .nullable().optional(), preserving required fields */
export function deepNullable<
	T extends z.core.SomeType,
	Extra extends z.ZodRawShape | z.core.SomeType | undefined = undefined,
>(
	schema: T,
	extraFields?: Extra
): ZodSchemaWithExtra<ZodDeepNullable<T>, Extra> {
	let transformed: any = schema;

	if (schema instanceof z.ZodOptional) {
		transformed = z
			.nullable(deepNullable(schema.unwrap() as any))
			.optional();
	} else if (schema instanceof z.ZodNullable) {
		transformed = z.nullable(deepNullable(schema.unwrap() as any));
	} else if (schema instanceof z.ZodObject) {
		const shape = schema.shape;
		const newShape: any = {};
		for (const key in shape) {
			newShape[key] = deepNullable(shape[key]);
		}
		transformed = z.object(newShape);
	} else if (schema instanceof z.ZodArray) {
		transformed = z.array(deepNullable(schema.element));
	} else if (schema instanceof z.ZodIntersection) {
		const def = (schema as any)._zod.def;
		transformed = z.intersection(
			deepNullable(def.left),
			deepNullable(def.right)
		);
	} else if (schema instanceof z.ZodDiscriminatedUnion) {
		const def = (schema as any)._zod.def;
		transformed = z.discriminatedUnion(
			def.discriminator,
			def.options.map((opt: any) => deepNullable(opt))
		);
	} else if (schema instanceof z.ZodUnion) {
		const def = (schema as any)._zod.def;
		transformed = z.union(def.options.map((opt: any) => deepNullable(opt)));
	}

	return mergeWithExtra(transformed, extraFields) as any;
}

/** Converts all nested optional fields to .nullish(), preserving required fields */
export function deepNullish<
	T extends z.core.SomeType,
	Extra extends z.ZodRawShape | z.core.SomeType | undefined = undefined,
>(
	schema: T,
	extraFields?: Extra
): ZodSchemaWithExtra<ZodDeepNullish<T>, Extra> {
	let transformed: any = schema;

	if (schema instanceof z.ZodOptional) {
		transformed = z.nullish(deepNullish(schema.unwrap() as any));
	} else if (schema instanceof z.ZodNullable) {
		transformed = z.nullish(deepNullish(schema.unwrap() as any));
	} else if (schema instanceof z.ZodObject) {
		const shape = schema.shape;
		const newShape: any = {};
		for (const key in shape) {
			newShape[key] = deepNullish(shape[key]);
		}
		transformed = z.object(newShape);
	} else if (schema instanceof z.ZodArray) {
		transformed = z.array(deepNullish(schema.element));
	} else if (schema instanceof z.ZodIntersection) {
		const def = (schema as any)._zod.def;
		transformed = z.intersection(
			deepNullish(def.left),
			deepNullish(def.right)
		);
	} else if (schema instanceof z.ZodDiscriminatedUnion) {
		const def = (schema as any)._zod.def;
		transformed = z.discriminatedUnion(
			def.discriminator,
			def.options.map((opt: any) => deepNullish(opt))
		);
	} else if (schema instanceof z.ZodUnion) {
		const def = (schema as any)._zod.def;
		transformed = z.union(def.options.map((opt: any) => deepNullish(opt)));
	}

	return mergeWithExtra(transformed, extraFields) as any;
}
