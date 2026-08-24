import { cn, forwardRef } from "@itsrose/react/core";

export const MainLayout = forwardRef<"main">(
	({ as: Component = "main", className, ...props }, ref) => (
		<Component
			ref={ref}
			data-layout="main"
			className={cn(
				//  px-4 sm:px-6 lg:px-8
				"relative w-full mt-4 md:mt-6 pb-6 overflow-x-hidden",
				className
			)}
			{...props}
		/>
	)
);
MainLayout.displayName = "MainLayout";
