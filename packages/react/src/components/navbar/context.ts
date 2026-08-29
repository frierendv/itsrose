"use client";

import { createContext } from "@itsrose/react/core";
import type { UseNavbarReturn } from "./use-navbar";

export const [NavbarContextProvider, useNavbarContext] =
	createContext<UseNavbarReturn>({ name: "Navbar", strict: true });
