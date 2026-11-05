"use client";

import { AdminUsers } from "@better-auth-ui/heroui";
import { AdminPage } from "../components/shell";

export const AdminUsersPage: React.FC = () => (
	<AdminPage
		description="Manage platform users, roles, bans and active sessions."
		title="Users & roles"
	>
		<AdminUsers />
	</AdminPage>
);

AdminUsersPage.displayName = "AdminUsersPage";
