"use client";

import { Typography } from "@heroui/react";

export type AdminPageProps = {
	title: string;
	description?: string;
	actions?: React.ReactNode;
	children: React.ReactNode;
};

/**
 * Shared page frame: title, description and an actions slot.
 */
export const AdminPage: React.FC<AdminPageProps> = ({
	title,
	description,
	actions,
	children,
}) => (
	<div className="flex flex-col gap-6">
		<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
			<div className="flex flex-col gap-1">
				<Typography type="h2">{title}</Typography>
				{description ? (
					<Typography type="body-sm" color="muted">
						{description}
					</Typography>
				) : null}
			</div>
			{actions ? (
				<div className="flex flex-wrap items-center gap-2">
					{actions}
				</div>
			) : null}
		</div>
		{children}
	</div>
);

AdminPage.displayName = "AdminPage";
