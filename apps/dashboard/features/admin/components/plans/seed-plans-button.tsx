"use client";

import { ArrowsRotateLeft } from "@gravity-ui/icons";
import {
	Button,
	ModalBackdrop,
	ModalBody,
	ModalCloseTrigger,
	ModalContainer,
	ModalDialog,
	ModalFooter,
	ModalHeader,
	ModalHeading,
	Typography,
} from "@heroui/react";
import { useState } from "react";
import { useSeedPlansMutation } from "../../hooks";

export const SeedPlansButton: React.FC = () => {
	const [isOpen, setIsOpen] = useState(false);
	const seedMutation = useSeedPlansMutation();

	const handleConfirm = async () => {
		try {
			await seedMutation.mutateAsync(true);
			setIsOpen(false);
		} catch {
			// Handled by mutation hook
		}
	};

	return (
		<>
			<Button
				variant="secondary"
				size="sm"
				onPress={() => setIsOpen(true)}
			>
				<ArrowsRotateLeft className="size-4" />
				Seed Default Plans
			</Button>

			<ModalBackdrop isOpen={isOpen} onOpenChange={setIsOpen}>
				<ModalContainer size="sm">
					<ModalDialog>
						<ModalCloseTrigger />
						<ModalHeader>
							<ModalHeading>Seed Default Plans</ModalHeading>
						</ModalHeader>
						<ModalBody className="flex flex-col gap-2">
							<Typography type="body-sm">
								Are you sure you want to seed the default system
								plans?
							</Typography>
							<Typography type="body-xs" color="muted">
								This will populate or restore default tier
								catalog records (Hobby: 60,000 IDR, Pro: 160,000
								IDR, Business: 400,999 IDR) in your database.
							</Typography>
						</ModalBody>
						<ModalFooter className="flex justify-end gap-2 pt-3">
							<Button
								variant="secondary"
								onPress={() => setIsOpen(false)}
							>
								Cancel
							</Button>
							<Button
								variant="primary"
								onPress={handleConfirm}
								isPending={seedMutation.isPending}
							>
								Seed Plans
							</Button>
						</ModalFooter>
					</ModalDialog>
				</ModalContainer>
			</ModalBackdrop>
		</>
	);
};

SeedPlansButton.displayName = "SeedPlansButton";
