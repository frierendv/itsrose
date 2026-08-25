"use client";

import { motion, useScroll, useTransform } from "motion/react";
import React, { useEffect, useRef, useState } from "react";

export const ContainerScroll = ({
	titleComponent,
	children,
	className = "",
}: {
	titleComponent?: string | React.ReactNode;
	children: React.ReactNode;
	className?: string;
}) => {
	const containerRef = useRef<HTMLDivElement>(null);
	const { scrollYProgress } = useScroll({
		target: containerRef,
		offset: ["start start", "end end"],
	});
	const [isMobile, setIsMobile] = useState<boolean>(false);

	useEffect(() => {
		const checkMobile = () => {
			setIsMobile(window.innerWidth <= 768);
		};
		checkMobile();
		window.addEventListener("resize", checkMobile);
		return () => {
			window.removeEventListener("resize", checkMobile);
		};
	}, []);

	const scaleDimensions = () => {
		return isMobile ? [0.88, 1] : [0.94, 1];
	};

	const rotate = useTransform(scrollYProgress, [0, 0.4], [16, 0]);
	const scale = useTransform(scrollYProgress, [0, 0.4], scaleDimensions());
	const translateY = useTransform(scrollYProgress, [0, 0.4], [40, 0]);

	return (
		<div
			className={`relative flex items-center justify-center w-full ${className}`}
			ref={containerRef}
		>
			<div
				className="w-full relative"
				style={{
					perspective: "1200px",
				}}
			>
				{titleComponent && (
					<motion.div
						style={{
							translateY,
						}}
						className="w-full text-center mb-6 sm:mb-10"
					>
						{titleComponent}
					</motion.div>
				)}
				<motion.div
					style={{
						rotateX: rotate,
						scale,
					}}
					className="max-w-4xl mx-auto w-full transition-transform duration-200"
				>
					{children}
				</motion.div>
			</div>
		</div>
	);
};
