"use client";

import { Breadcrumbs } from "@heroui/react/breadcrumbs";
import { usePathname } from "next/navigation";
import { memo, useMemo } from "react";

export const PathBreadcrumbs = memo(() => {
	const pathname = usePathname();

	const pathSegments = useMemo(
		() => (pathname ?? "").split("/").filter(Boolean),
		[pathname]
	);

	const items = useMemo(() => {
		const out = [];
		let acc = "";
		for (const seg of pathSegments) {
			acc += `/${seg}`;
			out.push({
				key: acc,
				url: acc,
				title: seg,
			});
		}
		return out;
	}, [pathSegments]);
	if (!items.length) {
		return null;
	}

	return (
		<Breadcrumbs aria-label="Navigation Breadcrumbs">
			{items.map(({ key, url, title }) => (
				<Breadcrumbs.Item key={key} href={url} className="capitalize">
					{title}
				</Breadcrumbs.Item>
			))}
		</Breadcrumbs>
	);
});
PathBreadcrumbs.displayName = "PathBreadcrumbs";
