"use client";

import { getErrorMessage } from "@/lib/errors";
import { Button, Card, Typography } from "@heroui/react";

export type QueryErrorProps = {
	title?: string;
	error?: unknown;
	onRetry?: () => void;
	/** Set when the request failed with a 403. */
	isForbidden?: boolean;
};

/**
 * Standard failure panel for admin reads.
 */
export const QueryError: React.FC<QueryErrorProps> = ({
	title,
	error,
	onRetry,
	isForbidden = false,
}) => (
	<Card variant="default">
		<Card.Content className="flex flex-col items-center gap-3 py-8 text-center">
			<Typography type="body-sm" className="font-medium">
				{title ??
					(isForbidden
						? "Admin privileges required"
						: "Could not load this data")}
			</Typography>
			<Typography type="body-xs" color="muted">
				{isForbidden
					? "Your account does not have access to this resource."
					: getErrorMessage(error, "The request failed. Try again.")}
			</Typography>
			{onRetry ? (
				<Button size="sm" variant="outline" onPress={onRetry}>
					Retry
				</Button>
			) : null}
		</Card.Content>
	</Card>
);

QueryError.displayName = "QueryError";
