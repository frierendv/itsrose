"use client";

import { ArrowRotateRight } from "@gravity-ui/icons";
import {
	Button,
	Description,
	Label,
	Modal,
	NumberField,
	Typography,
} from "@heroui/react";
import { useState } from "react";
import { useTriggerCronMutation } from "../../hooks";

export const TriggerCronButton: React.FC = () => {
	const [isOpen, setIsOpen] = useState(false);
	const [leadDays, setLeadDays] = useState(3);
	const [graceDays, setGraceDays] = useState(3);
	const triggerCronMutation = useTriggerCronMutation();

	const handleExecute = async () => {
		try {
			await triggerCronMutation.mutateAsync({
				lead_days: leadDays,
				grace_days: graceDays,
			});
			setIsOpen(false);
		} catch {
			// Handled by hook
		}
	};

	return (
		<Modal isOpen={isOpen} onOpenChange={setIsOpen}>
			<Button variant="outline" size="sm" onPress={() => setIsOpen(true)}>
				<ArrowRotateRight aria-hidden />
				Trigger Cron
			</Button>
			<Modal.Backdrop>
				<Modal.Container size="sm">
					<Modal.Dialog>
						<Modal.CloseTrigger />
						<Modal.Header>
							<Modal.Heading>
								Execute Billing Cron Tasks
							</Modal.Heading>
						</Modal.Header>
						<Modal.Body className="flex flex-col gap-3">
							<Typography type="body-sm" color="muted">
								Trigger the automated billing pipeline
								on-demand. This executes D-3 advance renewal
								invoicing and sweeps expired grace period
								subscriptions.
							</Typography>

							<div className="grid grid-cols-2 gap-3">
								<NumberField
									isRequired
									name="lead_window"
									minValue={3}
									maxValue={14}
									value={leadDays}
									onChange={setLeadDays}
								>
									<Label>Lead Window (Days)</Label>
									<NumberField.Group>
										<NumberField.DecrementButton />
										<NumberField.Input />
										<NumberField.IncrementButton />
									</NumberField.Group>
									<Description>
										Invoice D-N before cycle end
									</Description>
								</NumberField>

								<NumberField
									isRequired
									name="grace_window"
									minValue={3}
									maxValue={14}
									value={graceDays}
									onChange={setGraceDays}
								>
									<Label>Grace Window (Days)</Label>
									<NumberField.Group>
										<NumberField.DecrementButton />
										<NumberField.Input />
										<NumberField.IncrementButton />
									</NumberField.Group>
									<Description>
										Allowed grace period
									</Description>
								</NumberField>
							</div>
						</Modal.Body>
						<Modal.Footer className="flex justify-end gap-2 pt-3">
							<Button
								variant="outline"
								onPress={() => setIsOpen(false)}
							>
								Cancel
							</Button>
							<Button
								variant="danger-soft"
								onPress={handleExecute}
								isPending={triggerCronMutation.isPending}
							>
								Run Pipeline
							</Button>
						</Modal.Footer>
					</Modal.Dialog>
				</Modal.Container>
			</Modal.Backdrop>
		</Modal>
	);
};

TriggerCronButton.displayName = "TriggerCronButton";
