"use client";

import {
	DEFAULT_WEB_SETTING,
	useStoreWebSetting,
	type ProgressOptions,
} from "@/shared/web-setting";
import type { BProgressOptions, SpinnerPosition } from "@bprogress/next";
import Shuffle from "@gravity-ui/icons/Shuffle";
import {
	Button,
	ColorArea,
	ColorField,
	ColorPicker,
	ColorSlider,
	ColorSwatch,
	ColorSwatchPicker,
	Description,
	Label,
	ListBox,
	parseColor,
	Select,
	Separator,
} from "@heroui/react";
import { useCallback, useState } from "react";
import { Content } from "../common";
import type { SharedType } from "./shared";

const SPINNER_POSITION: SharedType<SpinnerPosition>[] = [
	{ id: "bottom-left" },
	{ id: "bottom-right" },
	{ id: "top-left" },
	{ id: "top-right" },
];
const PROGRESS_POSTION_USING: SharedType<
	NonNullable<BProgressOptions["positionUsing"]>
>[] = [
	{ id: "margin" },
	{ id: "translate" },
	{ id: "translate3d" },
	{ id: "width" },
];

const PROGRESS_COLOR_PRESETS = [
	"#ef4444",
	"#f97316",
	"#eab308",
	"#22c55e",
	"#06b6d4",
	"#3b82f6",
	"#8b5cf6",
	"#ff66cc",
	"#f43f5e",
];
export const WebProgressSetting: React.FC = () => {
	const { progress, setProgress } = useStoreWebSetting();
	const [color, setColor] = useState(parseColor(progress.color || "#ff66cc"));

	const shuffleColor = () => {
		const randomHue = Math.floor(Math.random() * 360);
		const randomSaturation = 50 + Math.floor(Math.random() * 50); // 50-100%
		const randomLightness = 40 + Math.floor(Math.random() * 30); // 40-70%

		return setColor(
			parseColor(
				`hsl(${randomHue}, ${randomSaturation}%, ${randomLightness}%)`
			)
		);
	};
	const renderListBox = useCallback(
		<T extends string>(items: Iterable<SharedType<T>>) => (
			<ListBox items={items}>
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
		),
		[]
	);
	return (
		<Content className="p-0 mt-2 ml-2">
			<div className="flex items-center justify-between gap-2">
				<div className="flex flex-col gap-0.5">
					<Label htmlFor="progress-spinner-position">
						Spinner position
					</Label>
					<Description>Change progress spinner position.</Description>
				</div>
				<Select
					id="progress-spinner-position"
					aria-label="web progress spinner position"
					className="min-w-32"
					selectionMode="single"
					value={progress.spinnerPosition}
					onChange={(key) => {
						const valueKey = key as SpinnerPosition;

						setProgress({ spinnerPosition: valueKey });
					}}
				>
					<Select.Trigger>
						<Select.Value />
						<Select.Indicator />
					</Select.Trigger>
					<Select.Popover>
						{renderListBox(SPINNER_POSITION)}
					</Select.Popover>
				</Select>
			</div>
			<div className="flex items-center justify-between gap-2">
				<div className="flex flex-col gap-0.5">
					<Label htmlFor="progress-position-using">
						Position using
					</Label>
					<Description>Change progress position using.</Description>
				</div>
				<Select
					id="progress-position-using"
					aria-label="change progress position using"
					className="min-w-32"
					selectionMode="single"
					value={progress.options?.positionUsing}
					onChange={(key) => {
						const valueKey = key as NonNullable<
							ProgressOptions["options"]
						>["positionUsing"];

						setProgress({ options: { positionUsing: valueKey } });
					}}
				>
					<Select.Trigger>
						<Select.Value />
						<Select.Indicator />
					</Select.Trigger>
					<Select.Popover>
						{renderListBox(PROGRESS_POSTION_USING)}
					</Select.Popover>
				</Select>
			</div>
			<div className="flex items-center justify-between gap-2">
				<div className="flex flex-col gap-0.5">
					<Label htmlFor="progress-color">Color</Label>
					<Description>Change progress display color.</Description>
				</div>
				<ColorPicker value={color} onChange={setColor}>
					<ColorPicker.Trigger>
						<ColorSwatch size="lg" />
					</ColorPicker.Trigger>
					<ColorPicker.Popover className="gap-2">
						<div className="flex items-center gap-2">
							<span className="text-sm">Current color: </span>
							<ColorSwatch size="xs" color={progress.color} />
							<span className="text-sm font-bold">
								{progress.color}
							</span>
						</div>
						<Separator />
						<ColorSwatchPicker
							className="justify-center pt-2"
							size="sm"
						>
							{PROGRESS_COLOR_PRESETS.map((preset) => (
								<ColorSwatchPicker.Item
									key={preset}
									color={preset}
								>
									<ColorSwatchPicker.Swatch />
								</ColorSwatchPicker.Item>
							))}
						</ColorSwatchPicker>
						<ColorArea
							aria-label="Color area"
							className="max-w-full"
							colorSpace="hsb"
							xChannel="saturation"
							yChannel="brightness"
						>
							<ColorArea.Thumb />
						</ColorArea>
						<div className="flex items-center gap-2 px-1">
							<ColorSlider
								aria-label="Hue slider"
								channel="hue"
								className="flex-1"
								colorSpace="hsb"
							>
								<ColorSlider.Track>
									<ColorSlider.Thumb />
								</ColorSlider.Track>
							</ColorSlider>
							<Button
								isIconOnly
								aria-label="Shuffle color"
								size="sm"
								variant="tertiary"
								onPress={shuffleColor}
							>
								<Shuffle className="size-4" />
							</Button>
						</div>
						<ColorField aria-label="Color field">
							<ColorField.Group variant="secondary">
								<ColorField.Prefix>
									<ColorSwatch size="xs" />
								</ColorField.Prefix>
								<ColorField.Input />
							</ColorField.Group>
						</ColorField>
						<Separator />
						<div className="flex gap-2 self-end">
							<Button
								variant="danger-soft"
								onPress={() =>
									setColor(
										parseColor(
											DEFAULT_WEB_SETTING.progress.color
										)
									)
								}
							>
								Reset
							</Button>
							<Button
								variant="primary"
								onPress={() =>
									setProgress({
										color: color.toString("hex"),
									})
								}
							>
								Save
							</Button>
						</div>
					</ColorPicker.Popover>
				</ColorPicker>
			</div>
			<Button
				variant="danger-soft"
				size="sm"
				className="self-end"
				onPress={() => setProgress(DEFAULT_WEB_SETTING.progress)}
			>
				Reset
			</Button>
		</Content>
	);
};
