import {
	Badge,
	Button,
	Chip,
	Skeleton,
	toggleButtonVariants,
	Tooltip,
} from "@heroui/react";
import { cn, forwardRef } from "@itsrose/react/core";
import * as React from "react";
import { useSidebar } from "./context";

export const SidebarMenu = forwardRef<"ul">(
	({ as: Component = "ul", className, ...props }, ref) => {
		return (
			<Component
				ref={ref}
				data-sidebar="menu"
				data-slot="sidebar-menu"
				data-guide-lines="always"
				className={cn(
					"sidebar__menu flex w-full min-w-0 flex-col gap-1 list-none p-0 m-0",
					className
				)}
				{...props}
			/>
		);
	}
);
SidebarMenu.displayName = "SidebarMenu";

export type SidebarMenuItemProps = {
	level?: number;
	isCurrent?: boolean;
	isExpanded?: boolean;
	hasChildItems?: boolean;
};

export const SidebarMenuItem = forwardRef<"li", SidebarMenuItemProps>(
	(
		{
			as: Component = "li",
			level = 1,
			isCurrent = false,
			isExpanded,
			hasChildItems,
			className,
			style,
			...props
		},
		ref
	) => {
		return (
			<Component
				ref={ref}
				data-sidebar="menu-item"
				data-slot="sidebar-menu-item"
				data-level={level}
				data-current={isCurrent ? "true" : undefined}
				data-expanded={isExpanded ? "true" : undefined}
				data-has-child-items={hasChildItems ? "true" : undefined}
				style={
					{
						"--tree-item-level": level,
						...style,
					} as React.CSSProperties
				}
				className={cn(
					"sidebar__menu-item group/menu-item relative list-none px-1",
					className
				)}
				{...props}
			/>
		);
	}
);
SidebarMenuItem.displayName = "SidebarMenuItem";

export type SidebarMenuButtonProps = {
	isSelected?: boolean;
	tooltip?: string | React.ReactNode;
	size?: "default" | "sm" | "lg";
};

export const SidebarMenuButton = forwardRef<"button", SidebarMenuButtonProps>(
	(
		{
			as: Component = "button",
			tooltip,
			className,
			children,
			isSelected,
			...props
		},
		ref
	) => {
		const { isMobile, state } = useSidebar();
		const buttonClass = toggleButtonVariants({
			size: "sm",
			variant: "ghost",
			isIconOnly: state === "collapsed",
		});

		const button = (
			<Component
				ref={ref}
				data-sidebar="menu-button"
				data-slot="sidebar-menu-item-content"
				aria-disabled={isSelected}
				// ui state
				data-selected={isSelected}
				data-disabled={isSelected}

				className={cn(
					"sidebar__menu-item-content peer/menu-button flex items-center gap-2 text-left text-sm w-full",
					"group-data-[collapsible=icon]:size-9! group-data-[collapsible=icon]:p-2! group-data-[collapsible=icon]:justify-center",
					"no-underline text-foreground",
					buttonClass,
					className
				)}
				{...props}
			>
				{children}
			</Component>
		);

		if (!tooltip) {
			return button;
		}

		if (state !== "collapsed" || isMobile) {
			return button;
		}

		return (
			<Tooltip delay={0}>
				<Tooltip.Trigger>{button}</Tooltip.Trigger>
				<Tooltip.Content placement="right" showArrow shouldFlip>
					<Tooltip.Arrow />
					{tooltip}
				</Tooltip.Content>
			</Tooltip>
		);
	}
);
SidebarMenuButton.displayName = "SidebarMenuButton";

export const SidebarMenuIcon = forwardRef<"span">(
	({ as: Component = "span", className, ...props }, ref) => {
		return (
			<Component
				ref={ref}
				data-slot="sidebar-menu-icon"
				className={cn(
					"sidebar__menu-icon flex items-center justify-center shrink-0 [&>svg]:size-4",
					className
				)}
				{...props}
			/>
		);
	}
);
SidebarMenuIcon.displayName = "SidebarMenuIcon";

export const SidebarMenuLabel = forwardRef<"span">(
	({ as: Component = "span", className, ...props }, ref) => {
		return (
			<Component
				ref={ref}
				data-sidebar="label"
				data-slot="sidebar-menu-label"
				className={cn(
					"sidebar__menu-label flex flex-1 items-center justify-between min-w-0 group-data-[collapsible=icon]:hidden truncate",
					className
				)}
				{...props}
			/>
		);
	}
);
SidebarMenuLabel.displayName = "SidebarMenuLabel";

export const SidebarMenuIndicator = forwardRef<
	"svg",
	React.SVGProps<SVGSVGElement>
>(({ className, ...props }, ref) => {
	return (
		<svg
			ref={ref}
			fill="none"
			height="16"
			viewBox="0 0 16 16"
			width="16"
			xmlns="http://www.w3.org/2000/svg"
			data-slot="sidebar-menu-indicator"
			className={cn(
				"sidebar__menu-indicator ml-auto size-4 shrink-0 text-muted transition-transform duration-200 group-data-[expanded=true]/menu-item:rotate-90 group-data-[state=open]/menu-item:rotate-90",
				className
			)}
			{...props}
		>
			<path
				clipRule="evenodd"
				d="M5.47 13.03a.75.75 0 0 1 0-1.06L9.44 8 5.47 4.03a.75.75 0 0 1 1.06-1.06l4.5 4.5a.75.75 0 0 1 0 1.06l-4.5 4.5a.75.75 0 0 1-1.06 0"
				fill="currentColor"
				fillRule="evenodd"
			/>
		</svg>
	);
});
SidebarMenuIndicator.displayName = "SidebarMenuIndicator";

export const SidebarMenuActions = forwardRef<"div">(
	({ as: Component = "div", className, ...props }, ref) => {
		return (
			<Component
				ref={ref}
				data-slot="sidebar-menu-actions"
				className={cn(
					"sidebar__menu-actions ml-auto flex items-center gap-1 group-data-[collapsible=icon]:hidden",
					className
				)}
				{...props}
			/>
		);
	}
);
SidebarMenuActions.displayName = "SidebarMenuActions";

export const SidebarMenuAction = forwardRef<
	"button",
	React.ComponentProps<typeof Button>
>(({ className, ...props }, ref) => {
	return (
		<Button
			ref={ref}
			data-sidebar="menu-action"
			data-slot="sidebar-menu-action"
			variant="ghost"
			isIconOnly
			size="sm"
			className={cn(
				"sidebar__menu-action size-6 min-w-0 p-0 group-data-[collapsible=icon]:hidden [&>svg]:size-4 [&>svg]:shrink-0",
				className
			)}
			{...props}
		/>
	);
});
SidebarMenuAction.displayName = "SidebarMenuAction";

export const SidebarMenuChip = forwardRef<
	"span",
	React.ComponentProps<typeof Chip>
>(
	(
		{
			className,
			children,
			color = "success",
			variant = "soft",
			size = "sm",
			...props
		},
		ref
	) => {
		return (
			<span
				data-slot="sidebar-menu-chip"
				className="sidebar__menu-chip ml-auto group-data-[collapsible=icon]:hidden"
			>
				<Chip
					ref={ref}
					size={size}
					variant={variant}
					color={color}
					className={cn(
						"h-5 px-1.5 text-[11px] font-medium leading-none",
						className
					)}
					{...props}
				>
					{children}
				</Chip>
			</span>
		);
	}
);
SidebarMenuChip.displayName = "SidebarMenuChip";

export const SidebarMenuBadge = forwardRef<
	"span",
	React.ComponentProps<typeof Badge>
>(
	(
		{ className, variant = "secondary", size = "sm", children, ...props },
		ref
	) => {
		return (
			<span
				data-sidebar="menu-badge"
				data-slot="sidebar-menu-badge"
				className="sidebar__menu-badge pointer-events-none absolute right-1 group-data-[collapsible=icon]:hidden"
			>
				<Badge
					ref={ref}
					variant={variant}
					size={size}
					className={cn("tabular-nums", className)}
					{...props}
				>
					{children}
				</Badge>
			</span>
		);
	}
);
SidebarMenuBadge.displayName = "SidebarMenuBadge";

export const SidebarMenuSub = forwardRef<"ul">(
	({ as: Component = "ul", className, ...props }, ref) => {
		return (
			<Component
				ref={ref}
				data-sidebar="menu-sub"
				data-slot="sidebar-menu-sub"
				className={cn(
					"sidebar__menu-sub",
					"group-data-[collapsible=icon]:hidden",
					"flex flex-col gap-2",
					"ml-4 w-auto",
					"border-l border-border pl-2 py-1 my-0.5",
					className
				)}
				{...props}
			/>
		);
	}
);
SidebarMenuSub.displayName = "SidebarMenuSub";

export const SidebarMenuSubItem = forwardRef<"li">(
	({ as: Component = "li", className, ...props }, ref) => {
		return (
			<Component
				ref={ref}
				data-sidebar="menu-sub-item"
				data-slot="sidebar-menu-sub-item"
				className={cn(
					"sidebar__menu-sub-item group/menu-sub-item relative list-none",
					className
				)}
				{...props}
			/>
		);
	}
);
SidebarMenuSubItem.displayName = "SidebarMenuSubItem";

export type SidebarMenuSubButtonProps = {
	isSelected?: boolean;
};

export const SidebarMenuSubButton = forwardRef<"a", SidebarMenuSubButtonProps>(
	(
		{ as: Component = "a", className, children, isSelected, ...props },
		ref
	) => {
		const variant = toggleButtonVariants({
			size: "sm",
			variant: "ghost",
		});
		return (
			<Component
				ref={ref}
				data-sidebar="menu-sub-button"
				data-slot="sidebar-menu-sub-button"
				aria-disabled={isSelected}
				// ui state
				data-selected={isSelected}
				data-disabled={isSelected}
				className={cn(
					"sidebar__menu-sub-button flex min-w-0 items-center justify-between text-sm",
					"no-underline text-default-foreground",
					variant,
					className
				)}
				{...props}
			>
				{children}
			</Component>
		);
	}
);
SidebarMenuSubButton.displayName = "SidebarMenuSubButton";

export type SidebarMenuSkeletonProps = {
	showIcon?: boolean;
};

export const SidebarMenuSkeleton = forwardRef<"div", SidebarMenuSkeletonProps>(
	({ className, showIcon = true, ...props }, ref) => {
		return (
			<div
				ref={ref}
				data-sidebar="menu-skeleton"
				className={cn("flex h-8 items-center gap-2 px-2", className)}
				{...props}
			>
				{showIcon && <Skeleton className="size-4 shrink-0" />}
				<Skeleton className="h-4 max-w-[calc(100%-2rem)] flex-1" />
			</div>
		);
	}
);
SidebarMenuSkeleton.displayName = "SidebarMenuSkeleton";
