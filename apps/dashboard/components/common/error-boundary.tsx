"use client";

import { Button } from "@heroui/react/button";
import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = {
	children: ReactNode;
	fallback?: ReactNode;
};

type State = {
	hasError: boolean;
	error?: Error;
};

/**
 * ErrorBoundary component for graceful error handling in React applications
 *
 * Catches JavaScript errors anywhere in the child component tree,
 * logs those errors, and displays a fallback UI instead of crashing.
 *
 * @example
 * ```tsx
 * <ErrorBoundary>
 *   <YourComponent />
 * </ErrorBoundary>
 * ```
 *
 * @example With custom fallback
 * ```tsx
 * <ErrorBoundary fallback={<CustomErrorUI />}>
 *   <YourComponent />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<Props, State> {
	constructor(props: Props) {
		super(props);
		this.state = { hasError: false };
	}

	static getDerivedStateFromError(error: Error): State {
		return { hasError: true, error };
	}

	componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
		console.error("Error caught by boundary:", error, errorInfo);
	}

	render(): ReactNode {
		if (this.state.hasError) {
			const { fallback } = this.props;
			if (fallback) {
				return fallback;
			}

			return (
				<div className="flex flex-col items-center justify-center min-h-100 p-4">
					<div className="max-w-md text-center space-y-4">
						<h2 className="text-2xl font-bold text-danger">
							Error
						</h2>
						<p className="text-default-600">
							An error occurred while processing your request.
						</p>
						{process.env.NODE_ENV === "development" && (
							<details className="text-left bg-default-100 p-4 rounded-lg">
								<summary className="cursor-pointer font-semibold mb-2">
									Detail Error
								</summary>
								<pre className="text-xs overflow-auto">
									{this.state.error?.stack}
								</pre>
							</details>
						)}
						<Button
							variant="primary"
							onPress={() => window.location.reload()}
						>
							Retry
						</Button>
					</div>
				</div>
			);
		}

		return this.props.children;
	}
}
