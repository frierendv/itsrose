import { cn, forwardRef, type HTMLProps } from "@itsrose/react/core";

export type NavbarBrandProps = HTMLProps<"div">;
export const NavbarBrand = forwardRef<"div", NavbarBrandProps>((props, ref) => {
	const { className, children, as: Component = "div", ...otherProps } = props;

	return (
		<Component
			ref={ref}
			className={cn(
				"flex",
				"basis-0",
				"flex-row",
				"grow",
				"flex-nowrap",
				"justify-start",
				"bg-transparent",
				"items-center",
				"no-underline",
				"text-medium",
				"whitespace-nowrap",
				"box-border",
				className
			)}
			{...otherProps}
		>
			{children}
		</Component>
	);
});
