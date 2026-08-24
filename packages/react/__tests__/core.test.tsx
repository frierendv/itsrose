import React, { createRef } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createContext, forwardRef } from "../src";

describe("core/create-context", () => {
	it("creates a context, provider, and hook tuple", () => {
		const [Provider, useTestContext, Context] = createContext<{
			count: number;
		}>({
			name: "Test",
		});

		expect(Provider).toBeDefined();
		expect(typeof useTestContext).toBe("function");
		expect(Context).toBeDefined();
		expect(Context.displayName).toBe("Test");
	});

	it("retrieves the context value when rendered within Provider", () => {
		interface IUserContext {
			name: string;
		}

		const [UserProvider, useUser] = createContext<IUserContext>({
			name: "User",
		});

		let observedValue: IUserContext | undefined;

		function Consumer() {
			observedValue = useUser();
			return <span>{observedValue.name}</span>;
		}

		const html = renderToStaticMarkup(
			<UserProvider value={{ name: "Rose" }}>
				<Consumer />
			</UserProvider>
		);

		expect(html).toBe("<span>Rose</span>");
		expect(observedValue).toEqual({ name: "Rose" });
	});

	it("throws ContextError with default message when used outside provider in strict mode", () => {
		const [, useCounter] = createContext<{ count: number }>({
			name: "Counter",
			strict: true,
		});

		function Consumer() {
			useCounter();
			return null;
		}

		expect(() => {
			renderToStaticMarkup(<Consumer />);
		}).toThrow("useCounterContext must be used within a CounterProvider");
	});

	it("throws ContextError with custom errorMessage when provided", () => {
		const [, useAuth] = createContext<{ token: string }>({
			errorMessage: "Custom auth error: wrap in AuthProvider",
			strict: true,
		});

		function Consumer() {
			useAuth();
			return null;
		}

		expect(() => {
			renderToStaticMarkup(<Consumer />);
		}).toThrow("Custom auth error: wrap in AuthProvider");
	});

	it("returns undefined without throwing when strict is false", () => {
		const [, useOptional] = createContext<{ data: string }>({
			strict: false,
		});

		let observedValue: { data: string } | undefined;

		function Consumer() {
			observedValue = useOptional();
			return <div>{observedValue ? observedValue.data : "empty"}</div>;
		}

		const html = renderToStaticMarkup(<Consumer />);

		expect(html).toBe("<div>empty</div>");
		expect(observedValue).toBeUndefined();
	});

	it("uses defaultValue when provided and rendered outside Provider", () => {
		const [, useTheme] = createContext<{ theme: string }>({
			defaultValue: { theme: "dark" },
			strict: false,
		});

		let observedValue: { theme: string } | undefined;

		function Consumer() {
			observedValue = useTheme();
			return <div>{observedValue?.theme}</div>;
		}

		const html = renderToStaticMarkup(<Consumer />);

		expect(html).toBe("<div>dark</div>");
		expect(observedValue).toEqual({ theme: "dark" });
	});
});

describe("core/forward-ref", () => {
	interface IBoxProps {
		isBox?: boolean;
	}

	const Box = forwardRef<"div", IBoxProps>(
		({ as: Component = "div", isBox, ...props }, ref) => {
			return (
				<Component
					ref={ref}
					data-box={isBox ? "true" : undefined}
					{...props}
				/>
			);
		}
	);
	Box.displayName = "Box";

	it("preserves displayName", () => {
		expect(Box.displayName).toBe("Box");
	});

	it("renders default element correctly", () => {
		const html = renderToStaticMarkup(
			<Box id="test-box" isBox className="p-4">
				Hello Box
			</Box>
		);

		expect(html).toBe(
			'<div data-box="true" id="test-box" class="p-4">Hello Box</div>'
		);
	});

	it("renders with dynamic polymorphic as prop", () => {
		const html = renderToStaticMarkup(
			<Box as="a" href="https://itsrose.rest" target="_blank">
				Click Here
			</Box>
		);

		expect(html).toBe(
			'<a href="https://itsrose.rest" target="_blank">Click Here</a>'
		);
	});

	it("forwards ref to the underlying element", () => {
		let capturedRef: unknown;

		const RefConsumer = forwardRef<"button">((props, ref) => {
			capturedRef = ref;
			const { as: Component = "button", ...rest } = props;
			return <Component ref={ref} {...rest} />;
		});

		const ref = createRef<HTMLButtonElement>();
		renderToStaticMarkup(<RefConsumer ref={ref}>Button</RefConsumer>);

		expect(capturedRef).toBe(ref);
	});
});
