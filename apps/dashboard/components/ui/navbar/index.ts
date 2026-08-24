// follow heroui anatomy
import type { ComponentProps } from "react";
import {
	Navbar as NavbarRoot,
	type NavbarProps as NavbarRootProps,
} from "./navbar";
import { NavbarBrand, type NavbarBrandProps } from "./navbar-brand";
import { NavbarContent, type NavbarContentProps } from "./navbar-content";
import { NavbarItem, type NavbarItemProps } from "./navbar-item";
import { NavbarMenu, type NavbarMenuProps } from "./navbar-menu";
import { NavbarMenuItem, type NavbarMenuItemProps } from "./navbar-menu-item";
import {
	NavbarMenuToggle,
	type NavbarMenuToggleProps,
} from "./navbar-menu-toggle";

export const Navbar = Object.assign(NavbarRoot, {
	Root: NavbarRoot,
	Brand: NavbarBrand,
	Content: NavbarContent,
	Item: NavbarItem,
	Menu: NavbarMenu,
	MenuItem: NavbarMenuItem,
	MenuToggle: NavbarMenuToggle,
});
export type Navbar = {
	Props: ComponentProps<typeof NavbarRoot>;
	RootProps: ComponentProps<typeof NavbarRoot>;
	Content: ComponentProps<typeof NavbarContent>;
	Item: ComponentProps<typeof NavbarItem>;
	Menu: ComponentProps<typeof NavbarMenu>;
	MenuItem: ComponentProps<typeof NavbarMenuItem>;
	MenuToggle: ComponentProps<typeof NavbarMenuToggle>;
};
export {
	NavbarRoot,
	NavbarBrand,
	NavbarItem,
	NavbarContent,
	NavbarMenu,
	NavbarMenuItem,
	NavbarMenuToggle,
};
export type {
	NavbarBrandProps,
	NavbarContentProps,
	NavbarItemProps,
	NavbarMenuItemProps,
	NavbarMenuProps,
	NavbarMenuToggleProps,
	NavbarRootProps,
};
