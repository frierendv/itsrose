"use client";

import { Link, type LinkRootProps } from "@heroui/react";
import { cn, type HTMLProps } from "@itsrose/react/core";

export const MDXLink = ({
	href,
	onClick,
	className,
	...props
}: LinkRootProps & HTMLProps<"a">) => {
	const isAnchor = typeof href === "string" && href.startsWith("#");
	return (
		<Link
			href={href}
			className={cn(
				"text-accent underline underline-offset-4 hover:opacity-80 transition-opacity font-medium",
				className
			)}
			onClick={(e) => {
				if (isAnchor && href) {
					const targetId = href.slice(1);
					const targetEl =
						document.getElementById(targetId) ||
						document.getElementById(decodeURIComponent(targetId));
					if (targetEl) {
						e.preventDefault();
						targetEl.scrollIntoView({
							behavior: "smooth",
							block: "start",
						});
						window.history.pushState(null, "", href);
					}
				}
				(
					onClick as
						| ((
								e: React.MouseEvent<
									HTMLAnchorElement,
									MouseEvent
								>
						  ) => void)
						| undefined
				)?.(
					e as unknown as React.MouseEvent<
						HTMLAnchorElement,
						MouseEvent
					>
				);
			}}
			{...props}
		/>
	);
};
