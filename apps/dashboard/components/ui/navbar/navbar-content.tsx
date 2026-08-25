"use client";

import { cn, forwardRef } from "@itsrose/react/core";

export type NavbarContentProps = {
	/**
	 * The justify of the content
	 * @default start
	 */
	justify?: "start" | "end" | "center";
};
export const NavbarContent = forwardRef<"ul", NavbarContentProps>(
	(props, ref) => {
		const {
			justify = "start",
			className,
			children,
			as: Component = "ul",
			...otherProps
		} = props;

		return (
			<Component
				ref={ref}
				className={cn(
					"flex",
					"gap-4",
					"h-full",
					"flex-row",
					"flex-nowrap",
					"items-center",
					justify !== "center"
						? `justify-${justify} grow basis-0`
						: "justify-center",
					className
				)}
				data-justify={justify}
				{...otherProps}
			>
				{children}
			</Component>
		);
	}
);
