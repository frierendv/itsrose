"use client";

import {
	SidebarMenuButton,
	SidebarMenuChip,
	SidebarMenuIcon,
	SidebarMenuItem,
	SidebarMenuLabel,
	SidebarMenuSub,
	useSidebar,
} from "@/components/ui/sidebar";
import type { SidebarItem } from "@/types/sidebar";
import { useRouter } from "@bprogress/next";
import { ArrowUpRightFromSquare } from "@gravity-ui/icons";
import {
	buttonVariants,
	Chip,
	Disclosure,
	Dropdown,
	Header,
	Label,
	Link,
} from "@heroui/react";
import { cn } from "@itsrose/react/core";
import { useCallback } from "react";
import { useSidebarItemState, useSidebarNavigation } from "./sidebar-nav-utils";

export type SidebarNavItemProps = {
	item: SidebarItem;
	depth?: number;
};

/**
 * Recursively find an item by its URL in the item tree.
 */
function findItemByUrl(
	items: SidebarItem[],
	url: string
): SidebarItem | undefined {
	for (const it of items) {
		if (it.url === url) {
			return it;
		}
		if (it.items && it.items.length > 0) {
			const found = findItemByUrl(it.items, url);
			if (found) {
				return found;
			}
		}
	}
	return undefined;
}

function mapBadgeColor(
	color?: SidebarItem["badgeColor"]
): "default" | "danger" | "accent" | "success" | "warning" {
	switch (color) {
		case "primary":
			return "accent";
		case "secondary":
			return "default";
		case "danger":
		case "success":
		case "warning":
		case "default":
			return color;
		default:
			return "default";
	}
}

/**
 * Recursive renderer for collapsed rail mode dropdown items and submenus.
 */
function renderDropdownChild(
	child: SidebarItem,
	onNavigate: (url: string) => void,
	pathname: string
): React.ReactNode {
	const SubIcon = child.icon;
	const hasChildren = Boolean(child.items && child.items.length > 0);

	if (hasChildren && child.items) {
		return (
			<Dropdown.SubmenuTrigger key={child.url + child.title}>
				<Dropdown.Item id={child.url} textValue={child.title}>
					{SubIcon && (
						<SubIcon className="size-4 shrink-0 text-muted" />
					)}
					<Label className="truncate">{child.title}</Label>
					<Dropdown.SubmenuIndicator />
				</Dropdown.Item>
				<Dropdown.Popover
					placement="right top"
					shouldFlip
					className="min-w-44"
				>
					<Dropdown.Menu
						disabledKeys={[pathname]}
						data-selected-key={pathname}
						onAction={(key) => onNavigate(String(key))}
					>
						<Dropdown.Section>
							<Header className="font-semibold text-xs text-muted uppercase tracking-wider px-2 py-1.5">
								{child.title}
							</Header>
							{child.items.map((nested) =>
								renderDropdownChild(
									nested,
									onNavigate,
									pathname
								)
							)}
						</Dropdown.Section>
					</Dropdown.Menu>
				</Dropdown.Popover>
			</Dropdown.SubmenuTrigger>
		);
	}

	return (
		<Dropdown.Item
			key={child.url + child.title}
			id={child.url}
			textValue={child.title}
			href={child.url}
		>
			{SubIcon && <SubIcon className="size-4 shrink-0 text-muted" />}
			<Label className="truncate">{child.title}</Label>
			{child.badge !== undefined && (
				<Chip
					size="sm"
					variant="soft"
					color={mapBadgeColor(child.badgeColor)}
					className="ml-auto h-4 px-1 text-[10px]"
				>
					{child.badge}
				</Chip>
			)}
			{child.isExternal && (
				<ArrowUpRightFromSquare className="size-3 shrink-0 text-muted ml-auto" />
			)}
		</Dropdown.Item>
	);
}

export function SidebarNavItem({ item, depth = 0 }: SidebarNavItemProps) {
	const { state, isMobile } = useSidebar();
	const { closeMobileSidebar } = useSidebarNavigation();
	const router = useRouter();

	const Icon = item.icon;
	const items = item.items ?? [];
	const hasSubItems = items.length > 0;
	const isCollapsed = state === "collapsed" && !isMobile;

	const { pathname, isExactActive, isActive, isOpen, setIsOpen } =
		useSidebarItemState(item);

	const handleNavigation = useCallback(
		(targetUrl: string) => {
			if (!targetUrl || targetUrl === "#") {
				return;
			}
			const targetItem = findItemByUrl([item], targetUrl);
			if (targetItem?.isExternal) {
				window.open(targetUrl, "_blank", "noopener,noreferrer");
			} else {
				router.push(targetUrl);
			}
			closeMobileSidebar();
		},
		[item, router, closeMobileSidebar]
	);

	// ==========================================
	// 1. Collapsed (Rail) Mode: Floating Dropdown
	// ==========================================
	if (isCollapsed) {
		if (hasSubItems && Icon) {
			return (
				<SidebarMenuItem
					level={depth + 1}
					hasChildItems
					isCurrent={isActive}
				>
					<Dropdown>
						<Dropdown.Trigger
							aria-label={item.title}
							className={cn(
								buttonVariants({
									size: "sm",
									variant: "ghost",
									isIconOnly: true,
								}),
								"peer/menu-button size-9! justify-center",
								isActive &&
									"bg-default/60 text-foreground font-semibold"
							)}
						>
							<SidebarMenuIcon>
								<Icon className="size-4 shrink-0" />
							</SidebarMenuIcon>
						</Dropdown.Trigger>

						<Dropdown.Popover
							placement="right top"
							shouldFlip
							className="min-w-48"
						>
							<Dropdown.Menu
								disabledKeys={[pathname]}
								data-selected-key={pathname}
								onAction={(key) =>
									handleNavigation(String(key))
								}
							>
								<Dropdown.Section>
									<Header className="font-semibold text-xs text-muted uppercase tracking-wider px-2 py-1.5">
										{item.title}
									</Header>
									{items.map((subItem) =>
										renderDropdownChild(
											subItem,
											handleNavigation,
											pathname
										)
									)}
								</Dropdown.Section>
							</Dropdown.Menu>
						</Dropdown.Popover>
					</Dropdown>
				</SidebarMenuItem>
			);
		}

		// Collapsed leaf item: Tooltip with title and badge
		return (
			<SidebarMenuItem
				level={depth + 1}
				isExpanded={false}
				hasChildItems={false}
				isCurrent={isExactActive}
			>
				<SidebarMenuButton
					as={Link}
					href={item.url}
					tooltip={
						item.badge !== undefined
							? `${item.title} (${item.badge})`
							: item.title
					}
					target={item.isExternal ? "_blank" : "_self"}
					rel={item.isExternal ? "noopener noreferrer" : undefined}
					isDisabled={isExactActive || item.isDisabled}
					isSelected={isExactActive}
					onClick={closeMobileSidebar}
				>
					{Icon && (
						<SidebarMenuIcon>
							<Icon className="size-4 shrink-0" />
						</SidebarMenuIcon>
					)}
					<SidebarMenuLabel>
						<span className="truncate">{item.title}</span>
					</SidebarMenuLabel>
				</SidebarMenuButton>
			</SidebarMenuItem>
		);
	}

	// ==========================================
	// 2. Expanded Mode: Branch with Disclosure
	// ==========================================
	if (hasSubItems) {
		return (
			<SidebarMenuItem
				level={depth + 1}
				hasChildItems
				isCurrent={isActive}
				isExpanded={isOpen}
			>
				<Disclosure
					isExpanded={isOpen}
					onExpandedChange={setIsOpen}
					className="w-full"
				>
					<Disclosure.Trigger
						className={cn(
							buttonVariants({
								size: "sm",
								fullWidth: true,
								variant: "ghost",
							}),
							"peer/menu-button flex w-full justify-between items-center",
							isActive &&
								"font-medium text-foreground bg-default/40"
						)}
					>
						{Icon && (
							<SidebarMenuIcon>
								<Icon className="size-4 shrink-0" />
							</SidebarMenuIcon>
						)}

						<SidebarMenuLabel>
							<span className="truncate">{item.title}</span>
						</SidebarMenuLabel>

						{item.badge !== undefined && (
							<SidebarMenuChip
								color={mapBadgeColor(item.badgeColor)}
							>
								{item.badge}
							</SidebarMenuChip>
						)}

						<Disclosure.Indicator />
					</Disclosure.Trigger>

					<Disclosure.Content>
						<SidebarMenuSub className="gap-1">
							{items.map((subItem) => (
								<SidebarNavItem
									key={subItem.url + subItem.title}
									item={subItem}
									depth={depth + 1}
								/>
							))}
						</SidebarMenuSub>
					</Disclosure.Content>
				</Disclosure>
			</SidebarMenuItem>
		);
	}

	// ==========================================
	// 3. Expanded Mode: Single Leaf Item
	// ==========================================
	return (
		<SidebarMenuItem
			level={depth + 1}
			isExpanded={false}
			hasChildItems={false}
			isCurrent={isExactActive}
		>
			<SidebarMenuButton
				as={Link}
				href={item.url}
				tooltip={item.title}
				target={item.isExternal ? "_blank" : "_self"}
				rel={item.isExternal ? "noopener noreferrer" : undefined}
				isDisabled={isExactActive || item.isDisabled}
				isSelected={isExactActive}
				onClick={closeMobileSidebar}
				className={cn(
					depth > 0 && "py-1 text-xs",
					isExactActive && "font-medium text-foreground"
				)}
			>
				{Icon && (
					<SidebarMenuIcon>
						<Icon className="size-4 shrink-0" />
					</SidebarMenuIcon>
				)}

				<SidebarMenuLabel>
					<span className="truncate">{item.title}</span>
				</SidebarMenuLabel>

				{item.badge !== undefined && (
					<SidebarMenuChip color={mapBadgeColor(item.badgeColor)}>
						{item.badge}
					</SidebarMenuChip>
				)}

				{item.isExternal && (
					<ArrowUpRightFromSquare className="size-3.5 shrink-0 text-muted ml-auto" />
				)}
			</SidebarMenuButton>
		</SidebarMenuItem>
	);
}

SidebarNavItem.displayName = "SidebarNavItem";
