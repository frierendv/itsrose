import { cn, forwardRef, type HTMLProps } from "@/shared/utils";

export type BaseLayoutProps = HTMLProps<"div">;
export const BaseLayout = forwardRef<"div", BaseLayoutProps>(
	({ as: Component = "div", ...props }, ref) => (
		<Component
			ref={ref}
			data-slot="base-layout"
			className="flex flex-col shrink-0"
			{...props}
		/>
	)
);
BaseLayout.displayName = "BaseLayout";

export type MainLayoutProps = HTMLProps<"main">;
export const MainLayout = forwardRef<"main", MainLayoutProps>(
	({ as: Component = "main", className, ...props }, ref) => (
		<Component
			ref={ref}
			data-slot="main-layout"
			className={cn(
				"relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4 md:mt-6 pb-6 overflow-x-hidden",
				className
			)}
			{...props}
		/>
	)
);
MainLayout.displayName = "MainLayout";
