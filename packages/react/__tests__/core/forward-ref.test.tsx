import { render } from "@testing-library/react";
import { createRef } from "react";
import { cn, forwardRef, tv } from "../../src/core";

describe("core/forward-ref", () => {
	it("forwards ref to the underlying DOM element", () => {
		const Button = forwardRef<"button", { label: string }>((props, ref) => {
			const { label, as: Component = "button", ...rest } = props;
			return (
				<Component ref={ref} {...rest}>
					{label}
				</Component>
			);
		});

		const ref = createRef<HTMLButtonElement>();
		render(<Button ref={ref} label="Click me" />);

		expect(ref.current).toBeInstanceOf(HTMLButtonElement);
		expect(ref.current?.textContent).toBe("Click me");
	});

	it("supports polymorphic 'as' prop", () => {
		const Box = forwardRef<"div", { label?: string }>((props, ref) => {
			const { as: Component = "div", children, ...rest } = props;
			return (
				<Component ref={ref} {...rest}>
					{children}
				</Component>
			);
		});

		const ref = createRef<HTMLAnchorElement>();
		render(
			<Box as="a" href="https://itsrose.rest" ref={ref}>
				Link
			</Box>
		);

		expect(ref.current).toBeInstanceOf(HTMLAnchorElement);
		expect(ref.current?.getAttribute("href")).toBe("https://itsrose.rest");
		expect(ref.current?.tagName).toBe("A");
	});

	it("preserves displayName from render function", () => {
		const NamedComponent = forwardRef<"div">((props, ref) => (
			<div ref={ref} {...props} />
		));
		NamedComponent.displayName = "CustomNamedComponent";

		const Wrapped = forwardRef<"div">(function TestComponent(props, ref) {
			return <div ref={ref} {...props} />;
		});

		expect(Wrapped.displayName).toBe("TestComponent");
	});
});

describe("core re-exports", () => {
	it("exports cn and tv utilities", () => {
		expect(typeof cn).toBe("function");
		expect(typeof tv).toBe("function");

		const className = cn("base-class", { active: true, disabled: false });
		expect(className).toContain("base-class");
		expect(className).toContain("active");
		expect(className).not.toContain("disabled");
	});
});
