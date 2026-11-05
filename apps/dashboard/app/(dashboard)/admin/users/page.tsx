import { AdminUsers } from "@better-auth-ui/heroui";
import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Admin Users",
	description: "Manage platform users and role permissions.",
};

export default function AdminUsersPage() {
	return <AdminUsers />;
}
