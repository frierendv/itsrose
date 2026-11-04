import type { SidebarItem } from "@/types/sidebar";

/**
 * Checks if a given URL is active against the current pathname.
 * Root `/` requires an exact match.
 * Nested paths match exactly or with a trailing slash.
 */
export function isRouteActive(pathname: string, url: string): boolean {
	if (!pathname || !url) {
		return false;
	}
	if (url === "/") {
		return pathname === "/";
	}
	if (pathname === url) {
		return true;
	}
	return pathname === `${url}/`;
}

/**
 * Recursively checks if any descendant item of the given SidebarItem is active.
 */
export function hasActiveDescendant(
	item: SidebarItem,
	pathname: string
): boolean {
	if (!item.items || item.items.length === 0) {
		return false;
	}
	return item.items.some(
		(child) =>
			isRouteActive(pathname, child.url) ||
			hasActiveDescendant(child, pathname)
	);
}

/**
 * Collects all descendant URLs from a SidebarItem recursively.
 */
export function getAllDescendantUrls(item: SidebarItem): string[] {
	if (!item.items || item.items.length === 0) {
		return [];
	}
	return item.items.flatMap((child) => [
		child.url,
		...getAllDescendantUrls(child),
	]);
}
