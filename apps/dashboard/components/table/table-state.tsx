import Tray from "@gravity-ui/icons/Tray";
import { EmptyState } from "@heroui/react/empty-state";
import { Spinner, type SpinnerRootProps } from "@heroui/react/spinner";

export type TableEmptyStateProps = {
	/**
	 * Text label displayed.
	 *
	 * @default "Empty"
	 */
	label?: string;
};

export const TableEmptyState: React.FC<TableEmptyStateProps> = ({
	label = "Empty",
}) => (
	<EmptyState className="flex w-full h-full flex-col gap-2 items-center text-center pt-4 pb-4">
		<Tray className="size-6 text-muted" />
		<span className="text-sm text-muted">{label}</span>
	</EmptyState>
);
TableEmptyState.displayName = "TableEmptyState";

export const TableLoadingState: React.FC<SpinnerRootProps> = ({
	size = "lg",
	...props
}) => (
	<div className="flex w-full h-full flex-col gap-2 items-center text-center pt-4 pb-4">
		<Spinner size={size} {...props} />
	</div>
);
