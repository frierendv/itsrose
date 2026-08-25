"use client";

import {
	SidebarMenuButton,
	SidebarMenuIcon,
	SidebarMenuIndicator,
	SidebarMenuItem,
	SidebarMenuLabel,
	SidebarMenuSub,
	SidebarMenuSubButton,
	SidebarMenuSubItem,
	useSidebar,
} from "@/components/ui/sidebar";
import { useActivePath } from "@/hooks/use-active-path";
import { cn } from "@/shared/utils";
import { useRouter } from "@bprogress/next";
import {
	buttonVariants,
	Disclosure,
	Dropdown,
	Header,
	Link,
} from "@heroui/react";
import { useState } from "react";
import type { MainItem } from "./types";

export type NavMainItemProps = {
	item: MainItem;
};
export const NavMainItem = ({ item }: NavMainItemProps) => {
	const { state, isMobile } = useSidebar();
	const { pathname } = useActivePath();
	const route = useRouter();
	const [isOpen, setIsOpen] = useState(
		item.isExpanded ?? item.isActive ?? false
	);
	const hasSubItems = Boolean(item.items && item.items.length > 0);
	const Icon = item.icon;
	const isCollapsed = state === "collapsed" && !isMobile;

	// When collapsed in icon-only mode: render a Dropdown popover displaying sub-items to the right
	if (hasSubItems && isCollapsed) {
		return (
			<SidebarMenuItem
				level={1}
				isCurrent={item.isActive}
				hasChildItems={true}
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
							"sidebar__menu-item-content peer/menu-button size-9! p-2! justify-center"
						)}
					>
						<SidebarMenuIcon>
							<Icon className="size-4 shrink-0" />
						</SidebarMenuIcon>
					</Dropdown.Trigger>
					<Dropdown.Popover placement="right top" shouldFlip>
						<Dropdown.Menu
							onAction={(key) => {
								const target = item.items?.find(
									(s) => s.title === key
								);
								if (target?.url && target.url !== "#") {
									route.push(target.url);
								}
							}}
							disabledKeys={[pathname]}
						>
							<Dropdown.Section>
								<Header>{item.title}</Header>
								{item.items?.map((subItem) => (
									<Dropdown.Item
										key={subItem.title}
										id={subItem.url}
										textValue={subItem.title}
										href={subItem.url}
									>
										<span className="truncate">
											{subItem.title}
										</span>
										<Dropdown.ItemIndicator />
									</Dropdown.Item>
								))}
							</Dropdown.Section>
						</Dropdown.Menu>
					</Dropdown.Popover>
				</Dropdown>
			</SidebarMenuItem>
		);
	}

	// When expanded (or in mobile drawer): render with Disclosure
	if (hasSubItems) {
		return (
			<SidebarMenuItem
				level={1}
				isCurrent={item.isActive}
				isExpanded={isOpen}
				hasChildItems={true}
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
							"sidebar__menu-item-content peer/menu-button flex w-full"
						)}
					>
						<SidebarMenuIcon>
							<Icon className="size-4 shrink-0" />
						</SidebarMenuIcon>

						<SidebarMenuLabel>
							<span className="truncate">{item.title}</span>
							<SidebarMenuIndicator />
						</SidebarMenuLabel>
					</Disclosure.Trigger>

					<Disclosure.Content>
						<SidebarMenuSub>
							{item.items?.map((subItem) => (
								<SidebarMenuSubItem key={subItem.title}>
									<SidebarMenuSubButton
										as={Link}
										href={subItem.url}
										// TODO: reusable
										isDisabled={pathname === subItem.url}

										isSelected={pathname === subItem.url}
										className="w-full"
									>
										<span className="truncate">
											{subItem.title}
										</span>
									</SidebarMenuSubButton>
								</SidebarMenuSubItem>
							))}
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
			isCurrent={item.isActive}
			isExpanded={false}
			hasChildItems={false}
		>
			<SidebarMenuButton
				as={Link}
				href={item.url}
				tooltip={item.title}
				// TODO: reusable
				isDisabled={pathname === item.url}
				isSelected={pathname === item.url}
			>
				<SidebarMenuIcon>
					<Icon className="size-4 shrink-0" />
				</SidebarMenuIcon>

				<SidebarMenuLabel>
					<span className="truncate">{item.title}</span>
				</SidebarMenuLabel>
			</SidebarMenuButton>
		</SidebarMenuItem>
	);
};
