import { SecuritySettings } from "@better-auth-ui/heroui";
import { UserActivity } from "@better-auth-ui/heroui/plugins/dash";

export const SecuritySettingsPage = async () => (
	<>
		<SecuritySettings variant="default" />
		<UserActivity variant="default" />
	</>
);
