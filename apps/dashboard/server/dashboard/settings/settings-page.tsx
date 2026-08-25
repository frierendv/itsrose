import { AccountSettings, SecuritySettings } from "@better-auth-ui/heroui";
import { UserActivity } from "@better-auth-ui/heroui/plugins/dash";
import { Separator } from "@heroui/react/separator";
import type { Metadata } from "next";

export const SettingsPage = async () => (
	<div
		// aria-label="You should not be in this page."
		id="settings-view-root"
		className="flex flex-col gap-4"
	>
		<AccountSettings variant="default" />
		<Separator />
		<SecuritySettings variant="default" />
		<Separator />
		<UserActivity />
	</div>
);

export const generateMetadata = async (): Promise<Metadata> => {
	return {
		title: "Settings",
		description: "Manage your ItsRose account.",
	};
};
