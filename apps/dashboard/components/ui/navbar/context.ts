"use client";

import { createContext } from "@itsrose/react/core";
import type { UseNavbarReturn } from "./use-navbar";

export const [NavbarContextProvider, useNavbarContext] =
	createContext<UseNavbarReturn>({
		name: "NavbarContext",
		strict: true,
		errorMessage:
			"useNavbar: `context` is undefined. Seems you forgot to wrap component within <Navbar />",
	});
