/**
 * infer object type value by it key.
 */
export type InferObjectValue<
	T extends object,
	Key extends keyof T = keyof T,
> = T extends {
	[__Key__ in Key]: infer __Infer__;
}
	? __Infer__
	: T[Key];
