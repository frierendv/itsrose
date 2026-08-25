import { cn, forwardRef } from "@itsrose/react/core";

export const Content = forwardRef<"div">(
	({ as: Component = "div", className, ...props }, ref) => {
		return (
			<Component
				ref={ref}
				data-slot="content"
				className={cn("flex flex-col gap-4", className)}
				{...props}
			/>
		);
	}
);
