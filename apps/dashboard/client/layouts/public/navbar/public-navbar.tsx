"use client";

import { FlowerOutline } from "@/components/common";
import { ThemeSwitchBase } from "@/components/theme-switch";
import { config } from "@/shared/config";
import { Button, buttonVariants } from "@heroui/react/button";
import { Link } from "@heroui/react/link";
import { Navbar } from "@itsrose/react";
import { cn } from "@itsrose/react/core";
import { memo, useState } from "react";

const PUBLIC_NAV_ITEMS = [
	{
		title: "Features",
		url: "#features",
	},
	{
		title: "Pricing",
		url: "#pricing",
	},
	{
		title: "FAQ",
		url: "#faq",
	},
	{
		title: "Docs",
		url: "/resource/api-reference",
		isExternal: true,
	},
];

export const PublicNavbar = memo(() => {
	const [menuOpen, setMenuOpen] = useState<boolean>(false);
	return (
		<Navbar
			position="sticky"
			maxWidth="lg"
			isBlured
			isBordered
			isMenuOpen={menuOpen}
			onMenuOpenChange={setMenuOpen}
		>
			<Navbar.Content>
				<Navbar.MenuToggle
					size="sm"
					variant="ghost"
					isIconOnly
					as={Button}
					className="sm:hidden"
				/>
				<Navbar.Brand>
					<Link
						href="/"
						className="flex items-center gap-2.5 text-foreground hover:opacity-90 transition-opacity"
					>
						<FlowerOutline size={30} />
						<span className="font-bold text-xl tracking-tight">
							{config.APP_NAME}
						</span>
					</Link>
				</Navbar.Brand>
			</Navbar.Content>

			<Navbar.Content className="hidden md:flex gap-6" justify="center">
				{PUBLIC_NAV_ITEMS.map((item) => (
					<Navbar.Item key={item.url}>
						<Link
							href={item.url}
							target={item.isExternal ? "_blank" : "_self"}
						>
							{item.title}
							{item.isExternal && <Link.Icon />}
						</Link>
					</Navbar.Item>
				))}
			</Navbar.Content>

			<Navbar.Content justify="end" className="gap-2">
				<Navbar.Item className="hidden sm:flex">
					<ThemeSwitchBase size="sm" variant="ghost" />
				</Navbar.Item>
				<Navbar.Item>
					<Link
						href="/sign-in"
						className={cn(
							"text-xs font-medium",
							buttonVariants({ variant: "outline", size: "sm" })
						)}
					>
						Login
					</Link>
				</Navbar.Item>
			</Navbar.Content>

			<Navbar.Menu>
				{PUBLIC_NAV_ITEMS.map((item) => (
					<Navbar.MenuItem key={item.url}>
						<Link
							href={item.url}
							target={item.isExternal ? "_blank" : "_self"}
							onPress={() => setMenuOpen((prev) => !prev)}
						>
							{item.title}
							{item.isExternal && <Link.Icon />}
						</Link>
					</Navbar.MenuItem>
				))}
			</Navbar.Menu>
		</Navbar>
	);
});
PublicNavbar.displayName = "PublicNavbar";
