import { cn, forwardRef } from "@itsrose/react/core";

export const BaseLayout = forwardRef<"div">(
	({ as: Component = "div", className, ...props }, ref) => (
		<Component
			ref={ref}
			data-layout="base"
			className={cn("flex flex-col shrink-0", className)}
			{...props}
		/>
	)
);
BaseLayout.displayName = "BaseLayout";
