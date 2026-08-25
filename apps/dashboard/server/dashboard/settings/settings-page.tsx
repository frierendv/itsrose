import { Content } from "@/components/common";
import { AccountSettings, SecuritySettings } from "@better-auth-ui/heroui";
import { Separator } from "@heroui/react/separator";
import type { Metadata } from "next";

export const SettingsPage = async () => (
	<Content className="p-0">
		<AccountSettings variant="default" />
		<Separator />
		<SecuritySettings variant="default" />
	</Content>
);

export const generateMetadata = async (): Promise<Metadata> => {
	return {
		title: "Settings",
		description: "Manage your ItsRose account.",
	};
};
