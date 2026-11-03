import { Card, Chip, Typography } from "@heroui/react";
import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Home",
};

export default function DashboardHomePage() {
	return (
		<div className="flex flex-1 flex-col gap-6">
			<div className="grid auto-rows-min gap-4 md:grid-cols-3">
				<Card variant="default">
					<Card.Header className="flex items-center justify-between pb-2">
						<Typography
							type="body-sm"
							color="muted"
							className="font-medium uppercase tracking-wider"
						>
							Total Requests
						</Typography>
						<Chip color="accent" variant="soft" size="sm">
							+12.5%
						</Chip>
					</Card.Header>
					<Card.Content>
						<Typography
							type="h3"
							className="font-bold tracking-tight"
						>
							1,284,930
						</Typography>
						<Typography
							type="body-sm"
							color="muted"
							className="mt-1"
						>
							Across all API endpoints
						</Typography>
					</Card.Content>
				</Card>

				<Card variant="default">
					<Card.Header className="flex items-center justify-between pb-2">
						<Typography
							type="body-sm"
							color="muted"
							className="font-medium uppercase tracking-wider"
						>
							Average Latency
						</Typography>
						<Chip color="success" variant="soft" size="sm">
							Optimal
						</Chip>
					</Card.Header>
					<Card.Content>
						<Typography
							type="h3"
							className="font-bold tracking-tight"
						>
							42 ms
						</Typography>
						<Typography
							type="body-sm"
							color="muted"
							className="mt-1"
						>
							Global edge network
						</Typography>
					</Card.Content>
				</Card>
			</div>

			<Card
				variant="default"
				className="min-h-[50vh] flex-1 flex items-center justify-center text-center p-8"
			>
				<Card.Content className="max-w-md flex flex-col items-center gap-2">
					<Typography type="h3" className="font-semibold">
						Welcome to Your Dashboard
					</Typography>
					<Typography type="body-sm" color="muted">
						Use the sidebar navigation on the left to explore
						models, manage projects, and configure platform
						settings.
					</Typography>
				</Card.Content>
			</Card>
		</div>
	);
}
