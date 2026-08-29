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
			className={cn("navbar--item", className)}
			data-active={isActive}
			{...otherProps}
		>
			{children}
		</Component>
	);
});
