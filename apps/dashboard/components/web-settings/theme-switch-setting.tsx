"use client";

import { DEFAULT_WEB_SETTING, useStoreWebSetting } from "@/shared/web-setting";
import {
	Button,
	Description,
	Input,
	Label,
	ListBox,
	Select,
	Tooltip,
} from "@heroui/react";
import { useCallback } from "react";
import {
	ThemeAnimationDirection,
	ThemeAnimationType,
} from "react-theme-switch-animation";
import { Content } from "../common";
import { ThemeSwitchBase } from "../theme-switch";
import type { SharedType } from "./shared";

const THEME_ANIMATION_TYPES: SharedType<ThemeAnimationType>[] = [
	{ id: ThemeAnimationType.BLUR_CIRCLE },
	{ id: ThemeAnimationType.CIRCLE },
	{ id: ThemeAnimationType.GIF },
	{ id: ThemeAnimationType.POLYGON },
	{ id: ThemeAnimationType.POLYGON_GRADIENT },
	{ id: ThemeAnimationType.QR_SCAN },
];
const THEME_ANIMATION_DIRECTIONS: SharedType<ThemeAnimationDirection>[] = [
	{ id: ThemeAnimationDirection.BTT },
	{ id: ThemeAnimationDirection.LTR },
	{ id: ThemeAnimationDirection.RTL },
	{ id: ThemeAnimationDirection.TTB },
];

export const WebSettingThemeSwitch: React.FC = () => {
	const { themeSwitch, setThemeSwitch } = useStoreWebSetting();
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
					<Label htmlFor="web-theme-switch-animation-type">
						Switch animation
					</Label>
					<Description>Change theme switching animation.</Description>
				</div>
				<Select
					id="web-theme-switch-animation-type"
					aria-label="Change web theme switching animation type"
					className="min-w-32"
					selectionMode="single"
					value={themeSwitch.animationType}
					onChange={(key) =>
						setThemeSwitch({
							animationType: key as ThemeAnimationType,
						})
					}
				>
					<Select.Trigger>
						<Select.Value />
						<Select.Indicator />
					</Select.Trigger>
					<Select.Popover>
						{renderListBox(THEME_ANIMATION_TYPES)}
					</Select.Popover>
				</Select>
			</div>
			<div className="flex items-center justify-between gap-2">
				<div className="flex flex-col gap-0.5">
					<Label htmlFor="web-theme-switch-animation-direction">
						Direction
					</Label>
					<Description>
						Change theme switching animation direction.
					</Description>
				</div>
				<Select
					id="web-theme-switch-animation-direction"
					aria-label="Change web theme switching animation direction"
					className="min-w-32"
					selectionMode="single"
					value={themeSwitch.direction}
					onChange={(key) =>
						setThemeSwitch({
							direction: key as ThemeAnimationDirection,
						})
					}
				>
					<Select.Trigger>
						<Select.Value className="uppercase" />
						<Select.Indicator />
					</Select.Trigger>
					<Select.Popover className="uppercase">
						{renderListBox(THEME_ANIMATION_DIRECTIONS)}
					</Select.Popover>
				</Select>
			</div>
			<div className="flex items-center justify-between gap-2">
				<div className="flex flex-col gap-0.5">
					<Label htmlFor="web-theme-switch-animation-duration">
						Duration
					</Label>
					<Description>
						Change theme switching animation duration.
					</Description>
				</div>

				<Input
					className="max-w-32 min-w-32"
					id="web-theme-switch-animation-duration"
					value={themeSwitch.duration}
					min={750}
					placeholder="2000"
					type="number"
					onChange={(event) =>
						setThemeSwitch({ duration: Number(event.target.value) })
					}
				/>
			</div>
			<div className="flex items-center justify-between gap-2">
				<div className="flex flex-col gap-0.5">
					<Label htmlFor="web-theme-switch-blur-amount">
						Blur amount
					</Label>
					<Description>
						Change theme switching blur amount.
					</Description>
				</div>

				<Input
					className="max-w-32 min-w-32"
					id="web-theme-switch-blur-amount"
					value={themeSwitch.blurAmount}
					min={1}
					max={5}
					placeholder="2000"
					type="number"
					onChange={(event) =>
						setThemeSwitch({
							blurAmount: Number(event.target.value),
						})
					}
				/>
			</div>
			<div className="flex items-center self-end gap-2">
				<Tooltip delay={0}>
					<ThemeSwitchBase />
					<Tooltip.Content showArrow placement="left" shouldFlip>
						<Tooltip.Arrow />
						<p>Switch theme with animation</p>
					</Tooltip.Content>
				</Tooltip>
				<Button
					variant="danger-soft"
					size="sm"
					onPress={() =>
						setThemeSwitch(DEFAULT_WEB_SETTING.themeSwitch)
					}
				>
					Reset
				</Button>
			</div>
		</Content>
	);
};
