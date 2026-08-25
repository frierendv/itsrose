/** Make all `T` object optional */
export type DeepPartial<T extends object> = {
	[P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};
/** Make all `T` object required */
export type DeepRequired<T extends object> = {
	[P in keyof T]-?: T[P] extends object ? DeepRequired<T[P]> : T[P];
};
