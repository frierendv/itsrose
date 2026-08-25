import { createContext } from "@itsrose/react/core";

export type SidebarContextProps = {
	state: "expanded" | "collapsed";
	open: boolean;
	setOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
	openMobile: boolean;
	setOpenMobile: (open: boolean | ((prev: boolean) => boolean)) => void;
	isMobile: boolean;
	toggleSidebar: () => void;
};

export const [SidebarContextProvider, useSidebar] =
	createContext<SidebarContextProps>({
		name: "SidebarContext",
		errorMessage: "useSidebar must be within SidebarProvider",
	});
