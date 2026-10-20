"use client";

import { Typography } from "@heroui/react/typography";
import { forwardRef } from "@itsrose/react";

export const Footer = forwardRef<"footer">((props, ref) => {
	const { as: Component = "footer", className, ...restProps } = props;

	return (
		<Component
			ref={ref}
			className="mt-auto flex w-full flex-row flex-wrap items-center justify-center gap-2 py-3 text-muted"
			{...restProps}
		>
			<Typography type="body-sm">
				&copy; 2026 ItsRose. All rights reserved.
			</Typography>
		</Component>
	);
});
