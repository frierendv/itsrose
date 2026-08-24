import {
	forwardRef as reactForwardRef,
	type ForwardRefRenderFunction as ReactForwardRefRenderFunction,
} from "react";
import type {
	As,
	PolymorphicComponent,
	PolymorphicComponentProps,
	PolymorphicRef,
	PropsOf,
} from "./types";

/**
 * Signature for a polymorphic render function passed to `forwardRef`.
 *
 * @template DefaultElement The default HTML tag or component when `as` is omitted.
 * @template Props Custom props accepted by the component.
 */
export type ForwardRefRenderFunction<
	DefaultElement extends As,
	Props extends object = object,
> = ReactForwardRefRenderFunction<
	PolymorphicRef<DefaultElement>,
	PolymorphicComponentProps<DefaultElement, Props>
>;

/**
 * Creates a polymorphic component that forwards its ref to the inner component
 * while preserving strong TypeScript type inference for the `as` prop and custom props.
 *
 * @example
 * ```tsx
 * interface ButtonProps {
 *   variant?: "primary" | "secondary";
 * }
 *
 * const Button = forwardRef<"button", ButtonProps>(({ as: Component = "button", variant, ...props }, ref) => {
 *   return <Component ref={ref} {...props} />;
 * });
 *
 * // Usage:
 * <Button variant="primary" onClick={(e) => {}} />
 * <Button as="a" href="https://example.com" target="_blank" />
 * ```
 *
 * @param render The render function wrapped with `forwardRef`.
 * @returns A polymorphic component with typed `as` and `ref` support.
 */
export function forwardRef<
	DefaultElement extends As,
	Props extends object = PropsOf<DefaultElement>,
>(
	render: ForwardRefRenderFunction<DefaultElement, Props>
): PolymorphicComponent<DefaultElement, Props> {
	const Component = reactForwardRef(render);

	const name = render?.displayName || render?.name;

	if (name) {
		Component.displayName = name;
	}

	return Component as PolymorphicComponent<DefaultElement, Props>;
}
