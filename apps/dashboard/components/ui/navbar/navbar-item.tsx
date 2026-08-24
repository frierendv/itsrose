import { cn, forwardRef } from "@itsrose/react/core";

export type NavbarItemProps = {
	isActive?: boolean;
};
export const NavbarItem = forwardRef<"li", NavbarItemProps>((props, ref) => {
	const {
		as: Component = "li",
		className,
		children,
		isActive,
		...otherProps
	} = props;

	return (
		<Component
			ref={ref}
			className={cn(
				"text-medium",
				"whitespace-nowrap",
				"box-border",
				"list-none",
				// attr - isActive
				// "data-[active=true]:font-semibold",
				{ "font-semibold": isActive },
				className
			)}
			data-active={isActive}
			data-pressed={isActive}
			{...otherProps}
		>
			{children}
		</Component>
	);
});
