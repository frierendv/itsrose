import { cn, forwardRef } from "@/shared/utils";

export type ContentLeftProps = {};
export const ContentLeft = forwardRef<"div", ContentLeftProps>(
	({ className, ...props }, ref) => (
		<div
			ref={ref}
			className={cn("flex flex-col gap-4 p-6 md:p-10", className)}
			data-content="content-left"
			{...props}
		/>
	)
);
ContentLeft.displayName = "AuthContainer.ContentLeft";

export const ContentRight = forwardRef<"div">(
	({ className, ...props }, ref) => (
		<div
			ref={ref}
			className={cn("relative hidden lg:block", className)}
			data-content="content-right"
			{...props}
		/>
	)
);
ContentRight.displayName = "AuthContainer.ContentRight";
