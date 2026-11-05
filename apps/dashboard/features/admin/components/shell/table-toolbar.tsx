"use client";

import { Button, Label, SearchField } from "@heroui/react";
import { useEffect, useState } from "react";
import { useDebounce } from "use-debounce";

export type TableToolbarProps = {
	/** Current search value from the URL. */
	query: string;
	onQueryChange: (value: string) => void;
	searchPlaceholder?: string;
	/** Filter selects or other controls. */
	filters?: React.ReactNode;
	/** Primary actions, right aligned. */
	actions?: React.ReactNode;
	/** Clears search and filters; shown only when `isFiltered`. */
	onClear?: () => void;
	isFiltered?: boolean;
	debounceMs?: number;
};

/**
 * Search + filter + action row shared by every admin list.
 *
 * The input keeps local state and publishes the debounced value upward, so the
 * URL (and therefore the request) is not rewritten on every keystroke.
 */
export const TableToolbar: React.FC<TableToolbarProps> = ({
	query,
	onQueryChange,
	searchPlaceholder = "Search…",
	filters,
	actions,
	onClear,
	isFiltered = false,
	debounceMs = 300,
}) => {
	const [value, setValue] = useState(query);
	const [debouncedValue] = useDebounce(value, debounceMs);

	useEffect(() => {
		if (debouncedValue !== query) {
			onQueryChange(debouncedValue);
		}
	}, [debouncedValue, onQueryChange, query]);

	return (
		<div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
			<div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-end">
				<SearchField
					className="w-full max-w-sm"
					fullWidth
					name="search"
					onChange={setValue}
					value={value}
				>
					<Label>Search</Label>
					<SearchField.Group>
						<SearchField.SearchIcon />
						<SearchField.Input placeholder={searchPlaceholder} />
						<SearchField.ClearButton />
					</SearchField.Group>
				</SearchField>

				{filters}

				{onClear && isFiltered ? (
					<Button size="sm" variant="ghost" onPress={onClear}>
						Clear filters
					</Button>
				) : null}
			</div>

			{actions ? (
				<div className="flex flex-wrap items-center gap-2">
					{actions}
				</div>
			) : null}
		</div>
	);
};

TableToolbar.displayName = "TableToolbar";
