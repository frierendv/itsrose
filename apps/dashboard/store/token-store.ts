"use client";

import { createJSONStorage, persist } from "zustand/middleware";
import { createStore } from "zustand/vanilla";

type TokenState = {
	token: string | null;
	setToken: (token: string) => void;
	clearToken: () => void;
};

export const tokenStore = createStore<TokenState>()(
	persist(
		(set) => ({
			token: null,
			expiresAt: null,

			setToken: (token) => set({ token }),

			clearToken: () => set({ token: null }),
		}),
		{
			name: "secure-token-storage",
			storage: createJSONStorage(() => sessionStorage),
		}
	)
);
