import { LogoIcon } from "@/components/logo";
import { ThemeSwitch } from "@/components/theme-switch";
import { config } from "@/config/site";
import { Link } from "@heroui/react";
import { buttonVariants } from "@heroui/styles";
import { Navbar } from "@itsrose/react";
import NextLink from "next/link";
import type { PropsWithChildren } from "react";

const NAVBAR_ITEMS = [
	{ title: "Features", href: "/#features" },
	{ title: "Playground", href: "/#playground" },
	{ title: "Code", href: "/#code" },
	{ title: "Capabilities", href: "/#capabilities" },
	{ title: "Architecture", href: "/#architecture" },
	{ title: "Pricing", href: "/#pricing" },
	{ title: "FAQ", href: "/#faq" },
];

export default function AppLayout({ children }: PropsWithChildren) {
	return (
		<div className="flex flex-1 flex-col">
			<Navbar position="sticky" maxWidth="2xl" isBordered>
				<Navbar.Content justify="start">
					<Navbar.Item>
						<Navbar.Brand
							className="flex items-center gap-2 font-bold text-lg no-underline hover:text-accent/80"
							as={Link}
							href="/"
						>
							<LogoIcon size={24} aria-hidden />
							{config.appName}
						</Navbar.Brand>
					</Navbar.Item>
				</Navbar.Content>

				<Navbar.Content
					justify="center"
					className="flex flex-row items-center gap-1 max-md:hidden"
				>
					{NAVBAR_ITEMS.map((item, index) => (
						<Navbar.Item key={index}>
							<Link
								href={item.href}
								className="px-2 py-1 text-muted text-xs transition-colors hover:text-foreground"
							>
								{item.title}
							</Link>
						</Navbar.Item>
					))}
				</Navbar.Content>

				<Navbar.Content justify="end" className="gap-2">
					<Navbar.Item>
						<ThemeSwitch />
					</Navbar.Item>
					<Navbar.Item>
						<NextLink
							href="https://dash.itsrose.net/sign-in"
							className={buttonVariants({
								variant: "outline",
								size: "sm",
							})}
						>
							Sign in
						</NextLink>
					</Navbar.Item>
					<Navbar.Item className="max-sm:hidden">
						<NextLink
							href="https://dash.itsrose.net/sign-up"
							className={buttonVariants({
								variant: "primary",
								size: "sm",
							})}
						>
							Get API Key
						</NextLink>
					</Navbar.Item>
				</Navbar.Content>
			</Navbar>
			<main className="flex min-h-[calc(100svh-4rem)] w-full flex-col">
				{children}
			</main>
		</div>
	);
}
