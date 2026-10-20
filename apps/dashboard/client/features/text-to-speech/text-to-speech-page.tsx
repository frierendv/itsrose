"use client";

import dynamic from "next/dynamic";
import { memo } from "react";

const ResultPlayer = dynamic(
	() => import("./components/result-player").then((m) => m.ResultPlayer),
	{ ssr: false }
);
const Sidebar = dynamic(
	() => import("./components/sidebar").then((m) => m.Sidebar),
	{ ssr: false }
);
const PromptEditor = dynamic(
	() => import("./components/prompt-editor").then((m) => m.PromptEditor),
	{ ssr: false }
);

export const TextToSpeechPage = memo(() => {
	return (
		<div className="relative flex flex-col min-h-[calc(100svh-8rem)]">
			<div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start flex-1">
				{/* Left Pane: Prompt Editor (7 of 12 cols on desktop) */}
				<div className="lg:col-span-7 flex flex-col gap-5">
					<PromptEditor />
				</div>

				{/* Right Pane: Audio Inspector Sidebar (5 of 12 cols on desktop) */}
				<div className="lg:col-span-5 flex flex-col">
					<Sidebar />
				</div>
			</div>

			{/* Floating Audio Result Player */}
			<ResultPlayer />
		</div>
	);
});

TextToSpeechPage.displayName = "TextToSpeechPage";
