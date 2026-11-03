import { useCallback, useEffect, useRef, useState } from "react";

export type ClipboardStatus = "idle" | "copied" | "error";

export interface UseClipboardOptions {
	/** Automatically reset status after this many milliseconds. Set to 0 to disable. */
	resetAfter?: number;

	/** Use the legacy document.execCommand fallback when Clipboard API fails. */
	fallback?: boolean;

	/** Called when text is copied successfully. */
	onSuccess?: (text: string) => void;

	/** Called when copying fails. */
	onError?: (error: Error, text: string) => void;
}

export interface UseClipboardReturn {
	/** Current clipboard operation status. */
	status: ClipboardStatus;

	/** Whether the most recent operation succeeded. */
	copied: boolean;

	/** Whether the most recent operation failed. */
	error: boolean;

	/** Copy text to the clipboard. */
	copy: (text: string) => Promise<boolean>;

	/** Reset status to idle. */
	reset: () => void;

	/** Whether the Clipboard API is available. */
	supported: boolean;
}

function normalizeError(error: unknown): Error {
	return error instanceof Error
		? error
		: new Error(String(error ?? "Clipboard operation failed"));
}

async function fallbackCopy(text: string): Promise<void> {
	const textarea = document.createElement("textarea");

	textarea.value = text;
	textarea.setAttribute("readonly", "");
	textarea.style.position = "fixed";
	textarea.style.top = "0";
	textarea.style.left = "-9999px";
	textarea.style.opacity = "0";

	document.body.appendChild(textarea);

	try {
		textarea.select();
		textarea.setSelectionRange(0, textarea.value.length);

		if (!document.execCommand("copy")) {
			throw new Error("Legacy clipboard copy failed");
		}
	} finally {
		textarea.remove();
	}
}

export function useClipboard(
	options: UseClipboardOptions = {}
): UseClipboardReturn {
	const { resetAfter = 2000, fallback = true, onSuccess, onError } = options;

	const [status, setStatus] = useState<ClipboardStatus>("idle");

	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const mountedRef = useRef(true);
	const operationRef = useRef(0);

	const supported =
		typeof navigator !== "undefined" &&
		typeof navigator.clipboard?.writeText === "function";

	const clearTimer = useCallback(() => {
		if (timerRef.current !== null) {
			clearTimeout(timerRef.current);
			timerRef.current = null;
		}
	}, []);

	const reset = useCallback(() => {
		clearTimer();
		operationRef.current++;
		setStatus("idle");
	}, [clearTimer]);

	const copy = useCallback(
		async (text: string): Promise<boolean> => {
			const operation = ++operationRef.current;

			clearTimer();
			setStatus("idle");

			try {
				if (
					typeof navigator !== "undefined" &&
					typeof navigator.clipboard?.writeText === "function"
				) {
					try {
						await navigator.clipboard.writeText(text);
					} catch (error) {
						if (!fallback || typeof document === "undefined") {
							throw error;
						}

						await fallbackCopy(text);
					}
				} else if (fallback && typeof document !== "undefined") {
					await fallbackCopy(text);
				} else {
					throw new Error("Clipboard API is unavailable");
				}

				if (mountedRef.current && operationRef.current === operation) {
					setStatus("copied");

					if (resetAfter > 0) {
						timerRef.current = setTimeout(() => {
							if (
								mountedRef.current &&
								operationRef.current === operation
							) {
								setStatus("idle");
							}

							timerRef.current = null;
						}, resetAfter);
					}
				}

				onSuccess?.(text);
				return true;
			} catch (cause) {
				const error = normalizeError(cause);

				if (mountedRef.current && operationRef.current === operation) {
					setStatus("error");
				}

				onError?.(error, text);
				return false;
			}
		},
		[clearTimer, fallback, onError, onSuccess, resetAfter]
	);

	useEffect(() => {
		mountedRef.current = true;

		return () => {
			mountedRef.current = false;
			operationRef.current++;
			clearTimer();
		};
	}, [clearTimer]);

	return {
		status,
		copied: status === "copied",
		error: status === "error",
		copy,
		reset,
		supported,
	};
}
