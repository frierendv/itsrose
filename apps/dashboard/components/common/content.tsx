import { cn, forwardRef, type HTMLProps } from "@/shared/utils";

export const Content = forwardRef<"div", HTMLProps<"div">>(
	({ as: Comp = "div", className, ...props }, ref) => {
		return (
			<Comp
				ref={ref}
				data-slot="content"
				className={cn("flex flex-col gap-4 p-2", className)}
				{...props}
			/>
		);
	}
);
