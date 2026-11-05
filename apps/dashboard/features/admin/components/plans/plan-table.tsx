"use client";

import { TableEmptyState, TableLoadingState } from "@/components/table";
import { Magnifier, Pencil, Plus, TrashBin, Xmark } from "@gravity-ui/icons";
import {
	Button,
	Chip,
	Input,
	ModalBackdrop,
	ModalBody,
	ModalCloseTrigger,
	ModalContainer,
	ModalDialog,
	ModalFooter,
	ModalHeader,
	ModalHeading,
	Table,
	Typography,
} from "@heroui/react";
import type { ApiPlan } from "@itsrose/auth-billing";
import { useState } from "react";
import { useAdminPlans, useDeletePlanMutation } from "../../hooks";
import { formatIDR } from "../../utils";
import { PlanFormModal } from "./plan-form-modal";
import { SeedPlansButton } from "./seed-plans-button";

export const PlanTable: React.FC = () => {
	const { plans, isLoading } = useAdminPlans();
	const deleteMutation = useDeletePlanMutation();

	const [searchQuery, setSearchQuery] = useState("");
	const [editingPlan, setEditingPlan] = useState<ApiPlan | null>(null);
	const [isFormOpen, setIsFormOpen] = useState(false);
	const [deletingPlan, setDeletingPlan] = useState<ApiPlan | null>(null);

	const filteredPlans = plans.filter((p) => {
		const q = searchQuery.toLowerCase().trim();
		if (!q) {
			return true;
		}
		return (
			p.plan_id.toLowerCase().includes(q) ||
			p.name.toLowerCase().includes(q) ||
			(p.description || "").toLowerCase().includes(q)
		);
	});

	const handleDeleteConfirm = async () => {
		if (!deletingPlan) {
			return;
		}
		try {
			await deleteMutation.mutateAsync(deletingPlan.plan_id);
			setDeletingPlan(null);
		} catch {
			// Handled by hook
		}
	};

	return (
		<div className="flex flex-col gap-4">
			{/* Top Bar with Search and Actions */}
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
				<div className="relative w-full sm:w-72">
					<Input
						variant="secondary"
						placeholder="Search plans by name or ID..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
					/>
					{searchQuery ? (
						<button
							type="button"
							onClick={() => setSearchQuery("")}
							className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer text-muted hover:text-foreground"
							aria-label="Clear search"
						>
							<Xmark className="size-3.5" />
						</button>
					) : (
						<div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted">
							<Magnifier className="size-3.5" />
						</div>
					)}
				</div>

				<div className="flex items-center gap-2">
					<SeedPlansButton />
					<Button
						variant="primary"
						size="sm"
						onPress={() => {
							setEditingPlan(null);
							setIsFormOpen(true);
						}}
					>
						<Plus className="size-4" />
						Create Plan
					</Button>
				</div>
			</div>
			<Table>
				<Table.ScrollContainer>
					<Table.Content aria-label="Billing Plans Catalog">
						<Table.Header>
							<Table.Column id="plan_id" isRowHeader>
								Plan ID
							</Table.Column>
							<Table.Column id="name">Name</Table.Column>
							<Table.Column id="price">Price (IDR)</Table.Column>
							<Table.Column id="interval">Interval</Table.Column>
							<Table.Column id="limits">
								Limits (RPM)
							</Table.Column>
							<Table.Column id="badge">Highlighted</Table.Column>
							<Table.Column id="actions">
								<span className="sr-only">Actions</span>
							</Table.Column>
						</Table.Header>
						<Table.Body
							items={filteredPlans || []}

							renderEmptyState={() =>
								isLoading ? (
									<TableLoadingState />
								) : (
									<TableEmptyState
										label={
											searchQuery
												? "No plans match your search query."
												: "No billing plans exist in the catalog yet."
										}
									/>
								)
							}
						>
							{(p) => (
								<Table.Row key={p.plan_id} id={p.plan_id}>
									<Table.Cell>
										<Typography
											type="body-sm"
											className="font-bold"
										>
											{p.plan_id}
										</Typography>
									</Table.Cell>
									<Table.Cell>
										<div className="flex flex-col">
											<Typography
												type="body-sm"
												className="font-medium"
											>
												{p.name}
											</Typography>
											{p.description && (
												<Typography
													type="body-xs"
													color="muted"
													className="line-clamp-1 max-w-xs"
												>
													{p.description}
												</Typography>
											)}
										</div>
									</Table.Cell>
									<Table.Cell>
										<Typography type="body-sm">
											{formatIDR(p.price?.amount || 0)}
										</Typography>
									</Table.Cell>
									<Table.Cell>
										<Typography
											type="body-xs"
											color="muted"
										>
											30 days (
											{p.price?.interval || "month"})
										</Typography>
									</Table.Cell>
									<Table.Cell>
										<Chip
											size="sm"
											variant="soft"
											color="default"
										>
											{p.limits?.max ?? 60} RPM
										</Chip>
									</Table.Cell>
									<Table.Cell>
										{p.highlighted ? (
											<Chip
												size="sm"
												variant="soft"
												color="accent"
											>
												Popular
											</Chip>
										) : (
											<span className="text-muted text-xs">
												Standard
											</span>
										)}
									</Table.Cell>
									<Table.Cell>
										<div className="flex items-center justify-end gap-1.5">
											<Button
												variant="outline"
												size="sm"
												onPress={() => {
													setEditingPlan(p);
													setIsFormOpen(true);
												}}
												aria-label={`Edit ${p.name}`}
												isIconOnly
											>
												<Pencil className="size-3.5" />
											</Button>
											<Button
												variant="outline"
												size="sm"
												onPress={() =>
													setDeletingPlan(p)
												}
												aria-label={`Delete ${p.name}`}
												isIconOnly
											>
												<TrashBin className="size-3.5 text-danger" />
											</Button>
										</div>
									</Table.Cell>
								</Table.Row>
							)}
						</Table.Body>
					</Table.Content>
				</Table.ScrollContainer>
			</Table>

			{/* Form Modal for Create & Edit */}
			<PlanFormModal
				plan={editingPlan}
				isOpen={isFormOpen}
				onOpenChange={setIsFormOpen}
			/>

			{/* Delete Confirmation Modal */}
			<ModalBackdrop
				isOpen={Boolean(deletingPlan)}
				onOpenChange={(open) => !open && setDeletingPlan(null)}
			>
				<ModalContainer size="sm">
					<ModalDialog>
						<ModalCloseTrigger />
						<ModalHeader>
							<ModalHeading>Delete Plan</ModalHeading>
						</ModalHeader>
						<ModalBody className="flex flex-col gap-2">
							<Typography type="body-sm">
								Are you sure you want to delete plan{" "}
								<strong>{deletingPlan?.name}</strong> (
								<code>{deletingPlan?.plan_id}</code>)?
							</Typography>
							<Typography type="body-xs" color="muted">
								Existing subscribers will retain active access
								until cycle end, but new upgrades to this tier
								will be disabled.
							</Typography>
						</ModalBody>
						<ModalFooter className="flex justify-end gap-2 pt-3">
							<Button
								variant="secondary"
								onPress={() => setDeletingPlan(null)}
							>
								Cancel
							</Button>
							<Button
								variant="danger"
								onPress={handleDeleteConfirm}
								isPending={deleteMutation.isPending}
							>
								Delete Plan
							</Button>
						</ModalFooter>
					</ModalDialog>
				</ModalContainer>
			</ModalBackdrop>
		</div>
	);
};

PlanTable.displayName = "PlanTable";
