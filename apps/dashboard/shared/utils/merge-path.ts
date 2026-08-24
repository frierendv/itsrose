export type TPath = `/${string}`;

export function mergePath<
	const BasePath extends TPath,
	const PathPart extends TPath,
>(
	basePath: BasePath,
	path?: PathPart
): PathPart extends undefined ? BasePath : `${BasePath}${PathPart}` {
	return (
		path ? `${basePath}${path}` : basePath
	) as PathPart extends undefined ? BasePath : `${BasePath}${PathPart}`;
}
