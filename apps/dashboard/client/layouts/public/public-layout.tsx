"use client";

import { FlowerOutline } from "@/components/common";
import { BaseLayout, MainLayout } from "@/components/layout";
import { Navbar } from "@/components/ui/navbar";
import { config } from "@/shared/config";
import { Link } from "@heroui/react/link";
import { memo, type PropsWithChildren } from "react";

export const PublicLayout = memo<PropsWithChildren>(({ children }) => (
	<BaseLayout>
		<Navbar position="sticky" maxWidth="full">
			<Navbar.Content>
				<Navbar.MenuToggle className="sm:hidden" />
				<Navbar.Brand>
					<FlowerOutline size={32} />
					<p className="font-bold text-2xl">{config.APP_NAME}</p>
				</Navbar.Brand>
			</Navbar.Content>
			<Navbar.Content className="hidden md:flex">
				<Navbar.Item>
					<Link href="/docs" target="_blank">
						Docs
						<Link.Icon />
					</Link>
				</Navbar.Item>
				<Navbar.Item isActive>
					<Link href="#">Dashboard</Link>
				</Navbar.Item>
				<Navbar.Item>
					<Link href="#">Pricing</Link>
				</Navbar.Item>
			</Navbar.Content>
			<Navbar.Content justify="end">
				<Navbar.Item>
					<Link href="/sign-in">Login</Link>
				</Navbar.Item>
			</Navbar.Content>
			<Navbar.Menu>
				<Navbar.MenuItem>
					<Link href="#">Features</Link>
				</Navbar.MenuItem>
				<Navbar.MenuItem>
					<Link href="#">Dashboard</Link>
				</Navbar.MenuItem>
				<Navbar.MenuItem>
					<Link href="#">Pricing</Link>
				</Navbar.MenuItem>
			</Navbar.Menu>
		</Navbar>
		<MainLayout>{children}</MainLayout>
	</BaseLayout>
));

PublicLayout.displayName = "PublicLayout";
