"use client";

import {
	SidebarMenuButton,
	SidebarMenuIcon,
	SidebarMenuItem,
	SidebarMenuLabel,
	SidebarMenuSub,
	SidebarMenuSubButton,
	SidebarMenuSubItem,
	useSidebar,
} from "@/components/ui/sidebar";
import { useActivePath } from "@/hooks/use-active-path";
import type { SidebarItem } from "@/shared/dashboard";
import { useRouter } from "@bprogress/next";
import { ArrowUpRightFromSquare } from "@gravity-ui/icons";
import {
	buttonVariants,
	Disclosure,
	Dropdown,
	Header,
	Label,
	Link,
} from "@heroui/react";
import { cn } from "@itsrose/react/core";
import { useState } from "react";

export type SidebarNavItemProps = {
	item: SidebarItem;
};

export const SidebarNavItem = ({ item }: SidebarNavItemProps) => {
	const { state, isMobile, setOpenMobile } = useSidebar();
	const { pathname } = useActivePath();
	const route = useRouter();

	const hasSubItems = Boolean(item.items && item.items.length > 0);
	const isCollapsed = state === "collapsed" && !isMobile;
	const Icon = item.icon;

	// Check if this item or any of its sub-items matches current pathname
	const isExactActive = pathname === item.url;
	const hasActiveChild = Boolean(
		item.items?.some(
			(sub) =>
				pathname === sub.url ||
				(sub.url !== "/dashboard" && pathname.startsWith(sub.url + "/"))
		)
	);
	const isActive = isExactActive || hasActiveChild;

	const [prevHasActiveChild, setPrevHasActiveChild] =
		useState(hasActiveChild);
	const [isOpen, setIsOpen] = useState(hasActiveChild);

	// Sync open state during render when active route shifts to a child of this item
	if (prevHasActiveChild !== hasActiveChild) {
		setPrevHasActiveChild(hasActiveChild);
		if (hasActiveChild) {
			setIsOpen(true);
		}
	}

	// Handler for closing mobile sidebar on link navigation
	const handleLinkClick = () => {
		if (isMobile) {
			setOpenMobile(false);
		}
	};

	// Collapsed in icon-only mode with sub-items -> Render Dropdown popover
	if (hasSubItems && isCollapsed && Icon) {
		return (
			<SidebarMenuItem
				level={1}
				hasChildItems={true}
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
							"peer/menu-button size-9! p-2! justify-center"
						)}
					>
						<SidebarMenuIcon>
							<Icon className="size-4 shrink-0" />
						</SidebarMenuIcon>
					</Dropdown.Trigger>

					<Dropdown.Popover placement="right top" shouldFlip>
						<Dropdown.Menu
							disabledKeys={[pathname]}
							data-selected-key={pathname}
							onAction={(key) => {
								const targetUrl = String(key);
								if (targetUrl && targetUrl !== "#") {
									route.push(targetUrl);
									handleLinkClick();
								}
							}}
						>
							<Dropdown.Section>
								<Header>{item.title}</Header>
								{item.items?.map(
									({ icon: SubItemIcon, ...subItem }) => (
										<Dropdown.Item
											key={subItem.url}
											id={subItem.url}
											textValue={subItem.title}
											href={subItem.url}
										>
											{SubItemIcon && (
												<SubItemIcon className="size-4 shrink-0 text-muted" />
											)}
											<Label className="truncate">
												{subItem.title}
											</Label>
										</Dropdown.Item>
									)
								)}
							</Dropdown.Section>
						</Dropdown.Menu>
					</Dropdown.Popover>
				</Dropdown>
			</SidebarMenuItem>
		);
	}

	// Expanded (or in mobile drawer) with sub-items -> Render with Disclosure
	if (hasSubItems) {
		return (
			<SidebarMenuItem
				level={1}
				hasChildItems={true}
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
							"peer/menu-button flex w-full"
						)}
					>
						{Icon && (
							<SidebarMenuIcon>
								<Icon className="size-4 shrink-0" />
							</SidebarMenuIcon>
						)}

						<SidebarMenuLabel>
							<span className="truncate">{item.title}</span>
							<Disclosure.Indicator />
						</SidebarMenuLabel>
					</Disclosure.Trigger>

					<Disclosure.Content>
						<SidebarMenuSub>
							{item.items?.map(
								({ icon: SubItemIcon, ...subItem }) => {
									const isSubActive =
										pathname === subItem.url;
									return (
										<SidebarMenuSubItem key={subItem.url}>
											<Link
												href={subItem.url}
												onClick={handleLinkClick}
												className="w-full justify-start"
												target={
													subItem.isExternal
														? "_blank"
														: "_self"
												}
												isDisabled={isSubActive}
												render={(domProps) => (
													<SidebarMenuSubButton
														isSelected={isSubActive}
														{...domProps}
													/>
												)}
											>
												{SubItemIcon && (
													<Link.Icon>
														<SubItemIcon className="size-4 shrink-0" />
													</Link.Icon>
												)}
												{subItem.title}

												{subItem.isExternal && (
													<Link.Icon>
														<ArrowUpRightFromSquare className="size-3 shrink-0" />
													</Link.Icon>
												)}
											</Link>
										</SidebarMenuSubItem>
									);
								}
							)}
						</SidebarMenuSub>
					</Disclosure.Content>
				</Disclosure>
			</SidebarMenuItem>
		);
	}

	// Single link item without children
	return (
		<SidebarMenuItem
			level={1}
			isExpanded={false}
			hasChildItems={false}
			isCurrent={isExactActive}
		>
			<SidebarMenuButton
				as={Link}
				href={item.url}
				tooltip={item.title}
				target={item.isExternal ? "_blank" : "_self"}
				isDisabled={isExactActive}
				isSelected={isExactActive}
				onClick={handleLinkClick}
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
};
