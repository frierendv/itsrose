"use client";

import Volume from "@gravity-ui/icons/Volume";
import VolumeLow from "@gravity-ui/icons/VolumeLow";
import VolumeSlash from "@gravity-ui/icons/VolumeSlash";
import { Slider } from "@heroui/react";
import { Button } from "@heroui/react/button";
import { Popover } from "@heroui/react/popover";
import { cn, forwardRef } from "@itsrose/react";
import { useAudioPlayerContext } from "./context";
import type { AudioPlayerVolumeProps } from "./types";

export const AudioPlayerVolume = forwardRef<"div", AudioPlayerVolumeProps>(
	(props, ref) => {
		const { volume, isMuted, setVolume } = useAudioPlayerContext();

		const {
			as: Comp = "div",
			className,
			buttonVariant = "ghost",
			size = "md",
			...restProps
		} = props;

		const isZero = isMuted || volume === 0;

		const VolumeIcon = isZero
			? VolumeSlash
			: volume < 0.5
				? VolumeLow
				: Volume;

		return (
			<Comp
				ref={ref}
				className={cn("flex items-center gap-1.5", className)}
				{...restProps}
			>
				<Popover>
					<Button
						isIconOnly
						variant={buttonVariant}
						size={size}
						aria-label="Volume control"
						className="text-muted hover:text-foreground"
					>
						<VolumeIcon aria-hidden />
						<span className="sr-only">
							{isZero ? "Unmute audio" : "Mute audio"}
						</span>
					</Button>
					<Popover.Content placement="top">
						<Popover.Dialog className="p-1">
							<Popover.Arrow />
							<Slider
								orientation="vertical"
								value={volume}
								aria-label="Volume"
								className="h-54 max-h-64"
								minValue={0}
								maxValue={1}
								step={0.01}
								onChange={(value) => setVolume(value as number)}
							>
								<Slider.Track>
									<Slider.Fill />
									<Slider.Thumb />
								</Slider.Track>
							</Slider>
						</Popover.Dialog>
					</Popover.Content>
				</Popover>
			</Comp>
		);
	}
);

AudioPlayerVolume.displayName = "AudioPlayerVolume";
