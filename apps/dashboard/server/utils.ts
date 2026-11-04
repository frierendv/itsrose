export function lowerCase<const T extends string>(str?: T): T {
	return String(str).toLowerCase() as T;
}
