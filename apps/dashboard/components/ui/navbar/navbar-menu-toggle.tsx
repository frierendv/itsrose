import { Button, type ButtonRootProps } from "@heroui/react/button";
import { cn, forwardRef } from "@itsrose/react/core";
import { useMemo } from "react";
import { useNavbarContext } from "./context";

export type NavbarMenuToggleProps = Omit<
	ButtonRootProps,
	"isIconOnly" | "fullWidth"
>;

export const NavbarMenuToggle = forwardRef<"button", NavbarMenuToggleProps>(
	(props, ref) => {
		const {
			as: Component = "button",
			children,
			className,
			// buttonProps
			size,
			variant = "ghost",
			// ---
			...otherProps
		} = props;

		const { isMenuOpen, setIsMenuOpen } = useNavbarContext();

		const child = useMemo(() => {
			return (
				<span
					className={cn([
						"w-full",
						"h-full",
						"pointer-events-none",
						"flex",
						"flex-col",
						"items-center",
						"justify-center",
						"text-inherit",
						"group-data-[pressed=true]:opacity-70",
						"transition-opacity",
						// before - first line
						"before:content-['']",
						"before:block",
						"before:h-px",
						"before:w-6",
						"before:bg-current",
						"before:transition-transform",
						"before:duration-150",
						"before:-translate-y-1",
						"before:rotate-0",
						"group-data-[open=true]:before:translate-y-px",
						"group-data-[open=true]:before:rotate-45",
						// after - second line
						"after:content-['']",
						"after:block",
						"after:h-px",
						"after:w-6",
						"after:bg-current",
						"after:transition-transform",
						"after:duration-150",
						"after:translate-y-1",
						"after:rotate-0",
						"group-data-[open=true]:after:translate-y-0",
						"group-data-[open=true]:after:-rotate-45",
					])}
				/>
			);
			// Only re-compute if relevant props change
			// eslint-disable-next-line react-hooks/exhaustive-deps
		}, [isMenuOpen]);

		const srOnlyText = useMemo(() => {
			return isMenuOpen
				? "close navigation menu"
				: "open navigation menu";
		}, [isMenuOpen]);
		return (
			<Button
				ref={ref}
				variant={variant}
				size={size}
				isIconOnly
				fullWidth={false}
				render={({ className: buttonClassName, ...buttonProps }) => (
					<Component
						className={cn(buttonClassName, className)}
						{...buttonProps}
					/>
				)}
				data-open={isMenuOpen}
				onPress={() => setIsMenuOpen((prev) => !prev)}
				{...otherProps}
			>
				<span className="sr-only">{srOnlyText}</span>
				{child}
			</Button>
		);
	}
);
