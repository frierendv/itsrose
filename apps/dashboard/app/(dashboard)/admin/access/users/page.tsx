import { AdminUsersPage } from "@/features/admin";
import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Admin Users",
	description: "Manage platform users and role permissions.",
};

export default function AdminUsersRoute() {
	return <AdminUsersPage />;
}
