import { cn, forwardRef } from "@itsrose/react/core";

/**
 * `NavbarBrand` declares no custom props.
 *
 * `Record<never, never>` is the "no props" marker: structurally identical to
 * `{}`, but expressed as a mapped type so the empty-object-type rule stays
 * strict across the repository.
 */
export type NavbarBrandProps = Record<never, never>;

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
