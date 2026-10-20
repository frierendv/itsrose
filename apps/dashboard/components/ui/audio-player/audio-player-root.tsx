import { cn } from "@heroui/react";
import { forwardRef } from "@itsrose/react";
import { AnimatePresence, motion } from "motion/react";
import { AudioPlayerProvider } from "./context";
import type { AudioPlayerRootProps } from "./types";
import { useAudioPlayer } from "./use-audio-player";

export const AudioPlayerRoot = forwardRef<"div", AudioPlayerRootProps>(
	(props, ref) => {
		const {
			as: Comp,
			children,
			className,
			autoRenderSource = true,

			// playback props
			src,
			isPlaying,
			isDefaultPlaying,
			defaultVolume,
			defaultMuted,
			defaultPlaybackRate,
			loop,
			preload,
			onPlayingChange,
			onTimeUpdate,
			onDurationChange,
			onProgressChange,
			onVolumeChange,
			onEnded,
			onError,

			...restProps
		} = props;

		const contextValue = useAudioPlayer({
			src,
			isPlaying,
			isDefaultPlaying,
			defaultVolume,
			defaultMuted,
			defaultPlaybackRate,
			loop,
			preload,
			onPlayingChange,
			onTimeUpdate,
			onDurationChange,
			onProgressChange,
			onVolumeChange,
			onEnded,
			onError,
		});

		return (
			<AudioPlayerProvider value={contextValue}>
				<AnimatePresence>
					<motion.div
						ref={ref}
						className={cn(
							"relative flex flex-col gap-2 p-3 surface bg-surface/50 backdrop-blur-md transition-all border border-border",
							className
						)}
						initial={{ opacity: 0, y: 8, filter: "blur(6px)" }}
						animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
						exit={{ opacity: 0, y: 8, filter: "blur(6px)" }}
						transition={{
							duration: 0.25,
							ease: "easeOut",
						}}
						{...restProps}
					>
						{autoRenderSource && (
							<audio
								ref={contextValue.audioRef}
								src={src}
								className="hidden"
								aria-hidden="true"
								tabIndex={-1}
								preload={preload}
								loop={loop}
							/>
						)}
						{children}
					</motion.div>
				</AnimatePresence>
			</AudioPlayerProvider>
		);
	}
);

AudioPlayerRoot.displayName = "AudioPlayerRoot";
