import JsonViewComponent from "@uiw/react-json-view";
import { githubDarkTheme } from "@uiw/react-json-view/githubDark";
import { githubLightTheme } from "@uiw/react-json-view/githubLight";
import { useTheme } from "next-themes";
import type { ComponentPropsWithoutRef } from "react";

export type JsonViewProps = ComponentPropsWithoutRef<typeof JsonViewComponent>;

export const JsonView: React.FC<JsonViewProps> = (props) => {
	const { resolvedTheme } = useTheme();

	return (
		<JsonViewComponent
			displayDataTypes={false}
			{...props}
			style={
				resolvedTheme === "light" ? githubLightTheme : githubDarkTheme
			}
		/>
	);
};
JsonView.displayName = "JsonView";
