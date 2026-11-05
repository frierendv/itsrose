"use client";

import { CopyButton } from "@/components/copy-button";
import { JsonView } from "@/components/json-view";
import { ArrowUpRightFromSquare } from "@gravity-ui/icons";
import {
	Button,
	buttonVariants,
	Separator,
	Surface,
	Tooltip,
	Typography,
} from "@heroui/react";
import type { Invoice } from "@itsrose/auth-billing";
import NextLink from "next/link";
import {
	formatDateTime,
	formatIDR,
	getInvoiceStatusProps,
	getInvoiceTypeProps,
} from "../../utils";
import { EntityDrawer } from "../shell";

export interface InvoiceInspectDrawerProps {
	invoice: Invoice | null;
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
}

export const InvoiceInspectDrawer: React.FC<InvoiceInspectDrawerProps> = ({
	invoice,
	isOpen,
	onOpenChange,
}) => {
	if (!invoice) {
		return null;
	}

	const statusProps = getInvoiceStatusProps(invoice.status);
	const typeProps = getInvoiceTypeProps(invoice.invoice_type);

	const paymentUrl = invoice.payment_link_url;
	const pdfUrl = invoice.paid_pdf_url || invoice.pdf_url;

	const proration = invoice.proration_details;

	return (
		<EntityDrawer
			description={`${typeProps.label} · ${statusProps.label}`}
			isOpen={isOpen}
			onOpenChange={onOpenChange}
			title="Invoice details"
		>
			<div className="flex flex-col gap-4">
				<div className="flex flex-col gap-4">
					{/* Meta summary block */}
					<Surface className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
						{/* <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-surface-secondary text-xs"> */}
						<div>
							<span className="text-muted">Order ID:</span>
							<p className="font-mono font-medium text-foreground select-all">
								{invoice.order_id}
							</p>
						</div>
						<div>
							<span className="text-muted">
								Gateway Invoice ID:
							</span>
							<p className="font-mono font-medium text-foreground select-all">
								{invoice.invoice_id}
							</p>
						</div>
						<div>
							<span className="text-muted">
								Customer User ID:
							</span>
							<p className="font-mono text-foreground select-all">
								{invoice.user_id}
							</p>
						</div>
						<div>
							<span className="text-muted">
								Target Plan Tier:
							</span>
							<p className="font-semibold text-foreground uppercase">
								{invoice.target_tier}
							</p>
						</div>
						<div>
							<span className="text-muted">Invoice Date:</span>
							<p className="text-foreground">
								{formatDateTime(invoice.invoice_date)}
							</p>
						</div>
						<div>
							<span className="text-muted">Due Date:</span>
							<p className="text-foreground">
								{formatDateTime(invoice.due_date)}
							</p>
						</div>
						<div>
							<span className="text-muted">Payment Type:</span>
							<p className="text-foreground">
								{invoice.payment_type || "Midtrans Hosted"}
							</p>
						</div>
						<div>
							<span className="text-muted">Settled Date:</span>
							<p className="text-foreground">
								{invoice.paid_date
									? formatDateTime(invoice.paid_date)
									: "Unpaid / Pending"}
							</p>
						</div>
						{/* </div> */}
					</Surface>

					{/* Itemized Financial Breakdown */}
					<div className="flex flex-col gap-2 p-2 border border-separator">
						<Typography type="h5">Payment Breakdown</Typography>

						{proration ? (
							<div className="flex flex-col gap-2 pt-1 text-xs">
								<div className="flex justify-between">
									<span className="text-muted">
										Target Tier Price (
										{proration.target_tier.toUpperCase()}
										):
									</span>
									<span className="font-medium">
										{formatIDR(proration.target_tier_price)}
									</span>
								</div>
								<div className="flex justify-between">
									<span className="text-muted">
										Current Tier Credit (
										{proration.current_tier.toUpperCase()}
										):
									</span>
									<span className="font-medium text-success">
										–{" "}
										{formatIDR(
											proration.current_tier_price
										)}
									</span>
								</div>
								<div className="flex justify-between">
									<span className="text-muted">
										Proration Difference:
									</span>
									<span className="font-medium">
										{formatIDR(proration.price_difference)}
									</span>
								</div>
								<Separator />
								<div className="flex justify-between items-baseline pt-1">
									<Typography
										type="body-sm"
										className="font-semibold"
									>
										Total Net Payable:
									</Typography>
									<Typography type="h4">
										{formatIDR(
											invoice.gross_amount ||
												proration.payable_amount
										)}
									</Typography>
								</div>
							</div>
						) : (
							<div className="flex justify-between items-baseline pt-1">
								<span className="text-muted text-xs">
									Gross Billed Amount:
								</span>
								<Typography type="h4">
									{formatIDR(invoice.gross_amount)}
								</Typography>
							</div>
						)}
					</div>

					{/* Payment and Receipt Links */}
					{(paymentUrl || pdfUrl) && (
						// <div className="flex flex-col gap-2 p-3 bg-surface-tertiary text-xs">
						<Surface className="flex flex-col gap-2 text-xs">
							{paymentUrl && (
								<div className="flex items-center justify-between gap-2">
									<div className="flex flex-col overflow-hidden">
										<span className="text-muted">
											Payment Link:
										</span>
										<span className="font-mono text-xs truncate max-w-64">
											{paymentUrl}
										</span>
									</div>
									<Tooltip delay={0}>
										<Tooltip.Trigger>
											<CopyButton
												textValue={paymentUrl}
												title="Copy payment link"
												aria-label="Copy payment link"
											/>
										</Tooltip.Trigger>
										<Tooltip.Content placement="left">
											<Tooltip.Arrow />
											Copy payment link
										</Tooltip.Content>
									</Tooltip>
								</div>
							)}

							{pdfUrl && (
								<div className="flex items-center justify-between">
									<div className="flex flex-col overflow-hidden">
										<span className="text-muted">
											Receipt / Tax Invoice PDF:
										</span>
										<span className="font-mono text-xs truncate max-w-64">
											{invoice.invoice_number}
										</span>
									</div>
									<Tooltip delay={0}>
										<Tooltip.Trigger>
											<NextLink
												href={pdfUrl}
												target="_blank"
												rel="noopener noreferrer"
												className={buttonVariants({
													size: "sm",
													isIconOnly: true,
													variant: "outline",
												})}
											>
												<ArrowUpRightFromSquare />
											</NextLink>
										</Tooltip.Trigger>
										<Tooltip.Content placement="left">
											<Tooltip.Arrow />
											Open invoice in new tab
										</Tooltip.Content>
									</Tooltip>
								</div>
							)}
						</Surface>
					)}

					{/* Proration Audit Details JSON */}
					{proration && (
						<div className="flex flex-col gap-1.5">
							<Typography type="body-sm" color="muted">
								Proration Audit Math JSON
							</Typography>
							<JsonView
								value={proration}
								displayDataTypes={false}
								aria-label="Proration Audit Math"
							/>
						</div>
					)}
				</div>
				<div className="flex justify-end">
					<Button
						variant="outline"
						onPress={() => onOpenChange(false)}
					>
						Close
					</Button>
				</div>
			</div>
		</EntityDrawer>
	);
};

InvoiceInspectDrawer.displayName = "InvoiceInspectDrawer";
