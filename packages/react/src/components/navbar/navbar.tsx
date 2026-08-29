import type { ComponentProps } from "react";
import { NavbarBrand } from "./navbar-brand";
import { NavbarContent } from "./navbar-content";
import { NavbarItem } from "./navbar-item";
import { NavbarMenu } from "./navbar-menu";
import { NavbarMenuItem } from "./navbar-menu-item";
import { NavbarMenuToggle } from "./navbar-menu-toggle";
import { NavbarRoot } from "./navbar-root";

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
	Brand: ComponentProps<typeof NavbarBrand>;
	Content: ComponentProps<typeof NavbarContent>;
	Item: ComponentProps<typeof NavbarItem>;
	Menu: ComponentProps<typeof NavbarMenu>;
	MenuItem: ComponentProps<typeof NavbarMenuItem>;
	MenuToggle: ComponentProps<typeof NavbarMenuToggle>;
};
