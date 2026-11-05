"use client";

import { Drawer, Typography } from "@heroui/react";

export type EntityDrawerProps = {
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
	title: string;
	description?: string;
	footer?: React.ReactNode;
	children: React.ReactNode;
};

/**
 * Right-side inspector used for entity details.
 *
 * Replaces the per-module detail modals so every admin module inspects records
 * the same way and wide payloads (events, invoices) get room to breathe.
 */
export const EntityDrawer: React.FC<EntityDrawerProps> = ({
	isOpen,
	onOpenChange,
	title,
	description,
	footer,
	children,
}) => (
	<Drawer isOpen={isOpen} onOpenChange={onOpenChange}>
		<Drawer.Backdrop>
			<Drawer.Content placement="right">
				<Drawer.Dialog>
					<Drawer.CloseTrigger />
					<Drawer.Header>
						<Drawer.Heading>{title}</Drawer.Heading>
						{description ? (
							<Typography type="body-xs" color="muted">
								{description}
							</Typography>
						) : null}
					</Drawer.Header>
					<Drawer.Body>{children}</Drawer.Body>
					{footer ? (
						<Drawer.Footer className="flex justify-end gap-2">
							{footer}
						</Drawer.Footer>
					) : null}
				</Drawer.Dialog>
			</Drawer.Content>
		</Drawer.Backdrop>
	</Drawer>
);

EntityDrawer.displayName = "EntityDrawer";
