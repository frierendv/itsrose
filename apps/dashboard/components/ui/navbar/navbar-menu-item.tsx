import { cn, forwardRef } from "@itsrose/react/core";
import { useNavbarContext } from "./context";

export type NavbarMenuItemProps = {
	isActive?: boolean;
};

export const NavbarMenuItem = forwardRef<"li", NavbarMenuItemProps>(
	(props, ref) => {
		const {
			className,
			isActive,
			children,
			as: Component = "li",
			...otherProps
		} = props;
		const { isMenuOpen } = useNavbarContext();
		return (
			<Component
				ref={ref}
				className={cn(
					"text-large", // active
					"data-[active=true]:font-semibold",
					className
				)}
				data-active={isActive}
				data-open={isMenuOpen}
				{...otherProps}
			>
				{children}
			</Component>
		);
	}
);
