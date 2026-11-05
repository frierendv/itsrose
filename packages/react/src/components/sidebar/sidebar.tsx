"use client";

import { Drawer, Surface } from "@heroui/react";
import { cn, forwardRef } from "@itsrose/react/core";
import { useIsMobile } from "@itsrose/react/hooks/use-is-mobile";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
	SIDEBAR_KEYBOARD_SHORTCUT,
	SIDEBAR_WIDTH,
	SIDEBAR_WIDTH_ICON,
} from "./constants";
import {
	SidebarContextProvider,
	useSidebar,
	type SidebarContextProps,
} from "./context";
import { useSidebarPersistedState } from "./use-sidebar-store";

export type SidebarProviderProps = {
	defaultOpen?: boolean;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
	/**
	 * Current route pathname. When provided, the mobile drawer closes
	 * automatically on navigation. Hosts using a router should supply it
	 * (e.g. Next.js `usePathname()`).
	 */
	pathname?: string;
};

export const SidebarProvider = forwardRef<"div", SidebarProviderProps>(
	(
		{
			as: Component = "div",
			defaultOpen = true,
			open: openProp,
			onOpenChange: setOpenProp,
			pathname: pathnameProp,
			className,
			style,
			children,
			...props
		},
		ref
	) => {
		const isMobile = useIsMobile();
		const [openMobile, setOpenMobile] = useState(false);

		// Internal open state persisted to cookie / localStorage for uncontrolled usage
		const [persistedOpen, setPersistedOpen] =
			useSidebarPersistedState(defaultOpen);
		const open = openProp ?? persistedOpen;

		const setOpen = useCallback(
			(value: boolean | ((prev: boolean) => boolean)) => {
				const openState =
					typeof value === "function" ? value(open) : value;
				if (setOpenProp) {
					setOpenProp(openState);
				} else {
					setPersistedOpen(openState);
				}
			},
			[setOpenProp, setPersistedOpen, open]
		);

		const toggleSidebar = useCallback(() => {
			if (isMobile) {
				setOpenMobile((prev) => !prev);
			} else {
				setOpen((prev) => !prev);
			}
		}, [isMobile, setOpen]);

		// Automatically close mobile drawer when navigation route changes
		useEffect(() => {
			setOpenMobile(false);
		}, [pathnameProp]);

		// Keyboard shortcut (⌘+B or Ctrl+B)
		useEffect(() => {
			const handleKeyDown = (event: KeyboardEvent) => {
				if (
					event.key === SIDEBAR_KEYBOARD_SHORTCUT &&
					(event.metaKey || event.ctrlKey)
				) {
					event.preventDefault();
					toggleSidebar();
				}
			};

			window.addEventListener("keydown", handleKeyDown);
			return () => window.removeEventListener("keydown", handleKeyDown);
		}, [toggleSidebar]);

		const state = open ? "expanded" : "collapsed";

		const contextValue = useMemo<SidebarContextProps>(
			() => ({
				state,
				open,
				setOpen,
				isMobile,
				openMobile,
				setOpenMobile,
				toggleSidebar,
			}),
			[state, open, setOpen, isMobile, openMobile, toggleSidebar]
		);

		return (
			<SidebarContextProvider value={contextValue}>
				<Component
					ref={ref}
					style={
						{
							"--sidebar-width": SIDEBAR_WIDTH,
							"--sidebar-width-icon": SIDEBAR_WIDTH_ICON,
							...style,
						} as React.CSSProperties
					}
					className={cn(
						"group/sidebar-wrapper flex min-h-svh w-full",
						className
					)}
					{...props}
				>
					{children}
				</Component>
			</SidebarContextProvider>
		);
	}
);
SidebarProvider.displayName = "SidebarProvider";

export type SidebarProps = {
	side?: "left" | "right";
	variant?: "sidebar" | "floating" | "inset";
	collapsible?: "offcanvas" | "icon" | "none";
};

export const Sidebar = forwardRef<"div", SidebarProps>(
	(
		{
			as: Component = "div",
			side = "left",
			variant = "sidebar",
			collapsible = "offcanvas",
			className,
			children,
			...props
		},
		ref
	) => {
		const { isMobile, state, openMobile, setOpenMobile } = useSidebar();

		if (collapsible === "none") {
			return (
				<Component
					ref={ref}
					className={cn(
						"flex h-full w-(--sidebar-width) flex-col shrink-0",
						className
					)}
					{...props}
				>
					{children}
				</Component>
			);
		}

		if (isMobile) {
			return (
				<Drawer>
					<Drawer.Backdrop
						isOpen={openMobile}
						onOpenChange={setOpenMobile}
						variant="opaque"
					>
						<Drawer.Content placement={side} className="p-0">
							<Drawer.Dialog className="h-full p-0 flex flex-col outline-none">
								<Drawer.Header className="sr-only">
									<Drawer.Heading>
										Sidebar Navigation
									</Drawer.Heading>
								</Drawer.Header>
								<Drawer.Body className="p-0 flex flex-col h-full overflow-hidden">
									{children}
								</Drawer.Body>
							</Drawer.Dialog>
						</Drawer.Content>
					</Drawer.Backdrop>
				</Drawer>
			);
		}

		return (
			<div
				ref={ref}
				className="group peer"
				data-state={state}
				data-collapsible={state === "collapsed" ? collapsible : ""}
				data-variant={variant}
				data-side={side}
			>
				{/* Desktop spacing dummy element for layout flow */}
				<div
					className={cn(
						"duration-200 relative h-svh transition-[width] ease-linear shrink-0",
						"w-(--sidebar-width)",
						"group-data-[collapsible=offcanvas]:w-0",
						"group-data-[side=right]:rotate-180",
						"group-data-[collapsible=icon]:w-(--sidebar-width-icon)"
					)}
				/>
				{/* Fixed sidebar content container */}
				<Component
					data-sidebar="container"
					className={cn(
						"duration-200 fixed inset-y-0 z-20 flex flex-col h-svh w-(--sidebar-width)",
						"transition-[left,right,width] ease-linear shrink-0",
						`${side}-0 group-data-[collapsible=offcanvas]:-${side}-(--sidebar-width)`,
						"group-data-[collapsible=icon]:w-(--sidebar-width-icon)",
						"group-data-[side=left]:border-r group-data-[side=right]:border-l border-border",
						className
					)}
					{...props}
				>
					<Surface
						data-sidebar="sidebar"
						variant={
							variant === "inset" ? "transparent" : "default"
						}
						className={cn(
							"flex h-full w-full flex-col px-2",
							"bg-background",
							`border-${side === "right" ? "l" : "r"} border-border`,
							{
								"rounded-(--field-radius)":
									variant === "floating",
								"inset rounded-(--field-radius)":
									variant === "inset",
							}
						)}
					>
						{children}
					</Surface>
				</Component>
			</div>
		);
	}
);
Sidebar.displayName = "Sidebar";
