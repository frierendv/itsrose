"use client";

import { useAudioPlayer } from "@/components/ui/audio-player";
import { cn } from "@itsrose/react/core";
import type { PropsWithChildren } from "react";

/**
 * The dashboard's content column.
 *
 * The floating player is fixed above the page's bottom edge, so while it
 * holds a track the column reserves the player's height; otherwise the bar
 * would cover the last action row on a short viewport. The reservation sits
 * on a client wrapper because only a client component can read the player
 * context, and the layout around it stays free of that dependency.
 */
export const AppContent: React.FC<PropsWithChildren> = ({ children }) => {
	const { track } = useAudioPlayer();

	return (
		<div
			className={cn(
				"flex flex-col gap-4 p-2 px-2 md:gap-6 md:p-4 md:px-6 lg:gap-8",
				track && "pb-24 md:pb-24"
			)}
			data-layout="app"
		>
			{children}
		</div>
	);
};

AppContent.displayName = "AppContent";
