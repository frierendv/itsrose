import { cn, forwardRef } from "@itsrose/react/core";

export type NavbarBrandProps = {};

export const NavbarBrand = forwardRef<"div", NavbarBrandProps>((props, ref) => {
	const { className, children, as: Component = "div", ...otherProps } = props;

	return (
		<Component
			ref={ref}
			className={cn("navbar--brand", className)}
			{...otherProps}
		>
			{children}
		</Component>
	);
});
NavbarBrand.displayName = "NavbarBrand";
