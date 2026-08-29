"use client";

import {
	LandingArchitecture,
	LandingCta,
	LandingFaq,
	LandingFeatures,
	LandingHero,
	LandingPricing,
} from "./component";

export const LandingPage = () => (
	<div className="flex flex-col gap-12 sm:gap-16 md:gap-24 w-full">
		<LandingHero />
		<LandingFeatures />
		<LandingArchitecture />
		<LandingPricing />
		<LandingFaq />
		<LandingCta />
	</div>
);
