import { cn, forwardRef } from "@/shared/utils";

export const AuthContainer = forwardRef<"div">(
	({ className, ...props }, ref) => (
		<div
			ref={ref}
			className={cn("grid min-h-svh lg:grid-cols-2", className)}
			data-content="container"
			{...props}
		/>
	)
);
AuthContainer.displayName = "AuthContainer";
