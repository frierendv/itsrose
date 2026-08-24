export function lowerCase<const T extends string>(str?: T): T {
	return String(str).toLowerCase() as T;
}
export function upperCase<const T extends string>(str?: T): T {
	return String(str).toUpperCase() as T;
}
