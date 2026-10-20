"use client";

import {
	ArrowUpRight,
	ChevronDown,
	CircleQuestion,
	Clock,
	CreditCard,
	QrCode,
	ShieldCheck,
} from "@gravity-ui/icons";
import { Accordion } from "@heroui/react";
import { useCallback } from "react";
import { FAQ_ITEMS, type BillingFaqItem } from "./billing-faq-data";
import { FaqContentBlock } from "./faq-content-block";

export const BillingFaqAccordion: React.FC = () => {
	const renderFaqIcon = useCallback(
		(iconName: BillingFaqItem["iconName"]) => {
			switch (iconName) {
				case "QrCode":
					return <QrCode />;
				case "Clock":
					return <Clock />;
				case "ArrowUpRight":
					return <ArrowUpRight />;
				case "SlidersVertical":
				case "ArrowsRotateLeft":
				case "Receipt":
				case "CreditCard":
					return <CreditCard />;
				case "ShieldCheck":
					return <ShieldCheck />;
				default:
					return <CircleQuestion />;
			}
		},
		[]
	);
	return (
		<Accordion
			variant="default"
			allowsMultipleExpanded
			defaultExpandedKeys={["payment-methods", "mid-cycle-upgrades"]}
		>
			{FAQ_ITEMS.map((item) => (
				<Accordion.Item key={item.id} id={item.id} className="py-1">
					<Accordion.Heading>
						<Accordion.Trigger>
							{item.iconName ? (
								<span className="me-3 size-4 shrink-0 text-muted">
									{renderFaqIcon(item.iconName)}
								</span>
							) : null}
							{item.title}
							<Accordion.Indicator>
								<ChevronDown />
							</Accordion.Indicator>
						</Accordion.Trigger>
					</Accordion.Heading>
					<Accordion.Panel>
						<Accordion.Body>
							<FaqContentBlock content={item.content} />
						</Accordion.Body>
					</Accordion.Panel>
				</Accordion.Item>
			))}
		</Accordion>
	);
};
