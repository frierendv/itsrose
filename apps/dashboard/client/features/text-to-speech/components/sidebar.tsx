"use client";

import { Tabs } from "@heroui/react/tabs";
import { memo, useCallback } from "react";
import { useTTSStore } from "../store/use-tts-store";
import { HistoryList } from "./history-list";
import { ModelSelector } from "./model-selector";
import { VoiceSelector } from "./voice-selector";
import { VoiceSettings } from "./voice-settings";

export const Sidebar = memo(() => {
	const stopPreview = useTTSStore((s) => s.stopPreview);

	const handleTabChange = useCallback(() => {
		stopPreview();
	}, [stopPreview]);

	return (
		<Tabs
			className="flex flex-col flex-1 h-full w-full"
			variant="secondary"
			onSelectionChange={handleTabChange}
		>
			<Tabs.ListContainer>
				<Tabs.List
					aria-label="Audio studio tools"
					className="w-full grid grid-cols-4"
				>
					<Tabs.Tab id="voices">
						<span>Voices</span>
						<Tabs.Indicator />
					</Tabs.Tab>

					<Tabs.Tab id="models">
						<span>Models</span>
						<Tabs.Indicator />
					</Tabs.Tab>

					<Tabs.Tab id="settings">
						<span>Settings</span>
						<Tabs.Indicator />
					</Tabs.Tab>

					<Tabs.Tab id="history">
						<span>History</span>
						<Tabs.Indicator />
					</Tabs.Tab>
				</Tabs.List>
			</Tabs.ListContainer>

			<Tabs.Panel id="voices">
				<VoiceSelector />
			</Tabs.Panel>

			<Tabs.Panel id="models">
				<ModelSelector />
			</Tabs.Panel>

			<Tabs.Panel id="settings">
				<VoiceSettings />
			</Tabs.Panel>

			<Tabs.Panel id="history">
				<HistoryList />
			</Tabs.Panel>
		</Tabs>
	);
});

Sidebar.displayName = "Sidebar";
