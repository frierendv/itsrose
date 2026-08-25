"use client";

import { DEFAULT_WEB_SETTING, useStoreWebSetting } from "@/shared/web-setting";
import Check from "@gravity-ui/icons/Check";
import Power from "@gravity-ui/icons/Power";
import {
	Button,
	Description,
	Label,
	ListBox,
	Select,
	Switch,
} from "@heroui/react";
import { useTheme } from "next-themes";
import { useCallback } from "react";
import { Content } from "../common";
import type { SharedType } from "./shared";

const NEXT_THEMES: SharedType<string>[] = [
	{ id: "system" },
	{ id: "light" },
	{ id: "dark" },
];

export const WebSettingTheme: React.FC = () => {
	const { setTheme, theme } = useStoreWebSetting();
	const { setTheme: setWebTheme, theme: resolvedTheme } = useTheme();

	const renderSwitchContent = useCallback(
		(enabled?: boolean) => (
			<Switch.Content>
				<Switch.Control>
					<Switch.Thumb>
						<Switch.Icon>
							{enabled ? (
								<Check className="size-3 text-inherit" />
							) : (
								<Power className="size-3 text-inherit opacity-70" />
							)}
						</Switch.Icon>
					</Switch.Thumb>
				</Switch.Control>
			</Switch.Content>
		),
		[]
	);
	const renderThemeListBox = useCallback(
		() => (
			<ListBox items={NEXT_THEMES}>
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
					<Label htmlFor="theme-enabled-color-schema">
						Enable color schema
					</Label>
					<Description>
						When enable Inject color-scheme style in html tag.
					</Description>
				</div>
				<Switch
					aria-label="enable system theme"
					id="theme-enabled-color-schema"
					onChange={(enableColorScheme) =>
						setTheme({ enableColorScheme })
					}
					isSelected={!!theme.enableColorScheme}
				>
					{renderSwitchContent(theme.enableColorScheme)}
				</Switch>
			</div>
			<div className="flex items-center justify-between gap-2">
				<div className="flex flex-col gap-0.5">
					<Label htmlFor="system-theme-enabled">
						Enable system theme
					</Label>
					<Description>When enabled use device theme.</Description>
				</div>
				<Switch
					aria-label="enable system theme"
					id="system-theme-enabled"
					onChange={(enableSystem) => setTheme({ enableSystem })}
					isSelected={!!theme.enableSystem}
				>
					{renderSwitchContent(theme.enableSystem)}
				</Switch>
			</div>
			<div className="flex items-center justify-between gap-2">
				<div className="flex flex-col gap-0.5">
					<Label htmlFor="web-theme">Theme</Label>
					<Description>Change theme on web.</Description>
				</div>
				<Select
					id="web-theme"
					aria-label="web theme"
					className="min-w-32"
					selectionMode="single"
					value={resolvedTheme}
					onChange={(key) => setWebTheme(key?.toString() as string)}
				>
					<Select.Trigger>
						<Select.Value />
						<Select.Indicator />
					</Select.Trigger>
					<Select.Popover>{renderThemeListBox()}</Select.Popover>
				</Select>
			</div>
			<div className="flex items-center justify-between gap-2">
				<div className="flex flex-col gap-0.5">
					<Label htmlFor="default-theme">Default theme</Label>
					<Description>Change default theme on web.</Description>
				</div>
				<Select
					id="default-theme"
					aria-label="default web theme"
					className="min-w-32"
					selectionMode="single"
					value={theme.defaultTheme}
					onChange={(key) => {
						const valueKey = key as string;
						setTheme({ defaultTheme: valueKey });
						if (!theme.enableSystem && valueKey === "system") {
							setTheme({ enableSystem: true });
						}
					}}
				>
					<Select.Trigger>
						<Select.Value />
						<Select.Indicator />
					</Select.Trigger>
					<Select.Popover>
						<Select.Popover>{renderThemeListBox()}</Select.Popover>
					</Select.Popover>
				</Select>
			</div>
			<Button
				variant="danger-soft"
				size="sm"
				className="self-end"
				onPress={() => setTheme(DEFAULT_WEB_SETTING.theme)}
			>
				Reset
			</Button>
		</Content>
	);
};
