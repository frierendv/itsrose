import { render, renderHook, screen } from "@testing-library/react";
import { createContext } from "../../src/core/create-context";

describe("core/create-context", () => {
	it("provides context value to children", () => {
		type TestContext = {
			count: number;
			increment: () => void;
		};

		const [TestProvider, useTest] = createContext<TestContext>({
			name: "Test",
		});

		const Consumer = () => {
			const { count } = useTest();
			return <div>Count: {count}</div>;
		};

		render(
			<TestProvider value={{ count: 42, increment: () => {} }}>
				<Consumer />
			</TestProvider>
		);

		expect(screen.getByText("Count: 42")).toBeInTheDocument();
	});

	it("throws an error when consumed outside of a provider in strict mode", () => {
		const [, useTest] = createContext<{ value: string }>({
			name: "User",
		});

		const Consumer = () => {
			useTest();
			return null;
		};

		const consoleSpy = jest
			.spyOn(console, "error")
			.mockImplementation(() => {});

		expect(() => render(<Consumer />)).toThrow(
			"useUserContext must be used within a UserProvider"
		);

		consoleSpy.mockRestore();
	});

	it("throws a default error message when no name or errorMessage is provided", () => {
		const [, useUnnamed] = createContext<{ value: string }>();

		const Consumer = () => {
			useUnnamed();
			return null;
		};

		const consoleSpy = jest
			.spyOn(console, "error")
			.mockImplementation(() => {});

		expect(() => render(<Consumer />)).toThrow(
			"useContext: `context` is undefined. Seems you forgot to wrap component within the Provider"
		);

		consoleSpy.mockRestore();
	});

	it("throws custom errorMessage when specified", () => {
		const [, useCustom] = createContext<{ value: string }>({
			errorMessage: "Custom error: Provider is missing!",
		});

		const Consumer = () => {
			useCustom();
			return null;
		};

		const consoleSpy = jest
			.spyOn(console, "error")
			.mockImplementation(() => {});

		expect(() => render(<Consumer />)).toThrow(
			"Custom error: Provider is missing!"
		);

		consoleSpy.mockRestore();
	});

	it("returns undefined when consumed outside provider with strict: false", () => {
		const [, useOptional] = createContext<string>({
			strict: false,
		});

		const { result } = renderHook(() => useOptional());
		expect(result.current).toBeUndefined();
	});

	it("returns defaultValue when provided and strict: false", () => {
		const [, useWithDefault] = createContext<string>({
			strict: false,
			defaultValue: "default-val",
		});

		const { result } = renderHook(() => useWithDefault());
		expect(result.current).toBe("default-val");
	});

	it("sets context displayName when name option is provided", () => {
		const [, , Context] = createContext<string>({
			name: "Theme",
		});

		expect(Context.displayName).toBe("Theme");
	});
});
