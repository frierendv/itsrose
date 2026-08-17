"use client";

import {
	DEFAULT_WEB_SETTING,
	useStoreWebSetting,
	type ToastOptions,
} from "@/shared/web-setting";
import {
	Button,
	Description,
	Label,
	ListBox,
	Select,
	toast as toastFn,
} from "@heroui/react";
import React from "react";
import { Content } from "../common";

const TOAST_PLACEMENTS: {
	id: ToastOptions["placement"];
}[] = [
	{ id: "bottom" },
	{ id: "bottom end" },
	{ id: "bottom start" },
	{ id: "top" },
	{ id: "top end" },
	{ id: "top start" },
];

export const WebToastSetting: React.FC = () => {
	const { toast, setToast } = useStoreWebSetting();
	return (
		<Content className="p-0 mt-2 ml-2">
			<div className="flex items-center justify-between gap-2">
				<div className="flex flex-col gap-0.5">
					<Label htmlFor="toast-placement">Placement</Label>
					<Description>Change toast placement.</Description>
				</div>
				<Select
					id="toast-placement"
					aria-label="web toast placement"
					className="min-w-32"
					selectionMode="single"
					value={toast.placement}
					onChange={(key) => {
						const valueKey = key as ToastOptions["placement"];

						setToast({ placement: valueKey });
					}}
				>
					<Select.Trigger>
						<Select.Value />
						<Select.Indicator />
					</Select.Trigger>
					<Select.Popover>
						<ListBox items={TOAST_PLACEMENTS}>
							{(item) => (
								<ListBox.Item
									key={item.id}
									id={item.id}
									textValue={item.id}
								>
									{item.id}
									<ListBox.ItemIndicator />
								</ListBox.Item>
							)}
						</ListBox>
					</Select.Popover>
				</Select>
			</div>

			<div className="flex items-center self-end gap-2">
				<Button
					variant="outline"
					size="sm"
					onPress={() => toastFn("Lorem ipsun dolor sit amet")}
				>
					Show toast
				</Button>
				<Button
					variant="danger-soft"
					size="sm"
					onPress={() => setToast(DEFAULT_WEB_SETTING.toast)}
				>
					Reset
				</Button>
			</div>
		</Content>
	);
};
