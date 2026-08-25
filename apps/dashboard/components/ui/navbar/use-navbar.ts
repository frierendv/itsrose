"use client";

import { usePreventScroll } from "@react-aria/overlays";
import { useControlledState } from "@react-stately/utils";
import { useCallback } from "react";

export type UseNavbarProps = {
	/**
	 * The height of the navbar.
	 * @default "4rem" (64px)
	 */
	height?: number | string;
	/**
	 * Whether the menu is open.
	 * @default false
	 */
	isMenuOpen?: boolean;
	/**
	 * The event handler for the menu open state.
	 * @param isOpen boolean
	 * @returns void
	 */
	onMenuOpenChange?: (isOpen: boolean) => void;
	/**
	 * Whether the menu should be open by default.
	 * @default false
	 */
	isMenuDefaultOpen?: boolean;
};

export function useNavbar(props: UseNavbarProps) {
	const {
		height = "4rem",
		isMenuOpen: isMenuOpenProp,
		isMenuDefaultOpen,
		onMenuOpenChange = () => {},
	} = props;
	const handleMenuOpenChange = useCallback(
		(isOpen: boolean | undefined) => {
			onMenuOpenChange(isOpen || false);
		},
		[onMenuOpenChange]
	);
	const [isMenuOpen, setIsMenuOpen] = useControlledState<boolean>(
		isMenuOpenProp,
		isMenuDefaultOpen ?? false,
		handleMenuOpenChange
	);
	usePreventScroll({ isDisabled: !isMenuOpen });
	return {
		height,
		isMenuOpen,
		setIsMenuOpen,
	};
}

export type UseNavbarReturn = ReturnType<typeof useNavbar>;
