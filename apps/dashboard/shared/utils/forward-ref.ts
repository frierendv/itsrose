import { forwardRef as baseForwardRef, type ComponentProps } from "react";
import type {
	As,
	ComponentRef,
	InternalForwardRefExoticComponent,
	PropsOf,
	RightJoinProps,
} from "./types";

/**
 * Combines element props with component custom props.
 */
export type ForwardedProps<C extends As, P extends object> = RightJoinProps<
	PropsOf<C>,
	P
>;

/**
 * Function component signature accepted by polymorphic `forwardRef`.
 */
export type ForwardRefRenderFunction<
	C extends As,
	P extends object,
> = React.ForwardRefRenderFunction<
	ComponentRef<C>,
	React.PropsWithoutRef<ForwardedProps<C, P>>
>;

/**
 * Creates a polymorphic component that forwards its ref to the inner component
 * while preserving strong TypeScript type inference for the `as` prop and custom props.
 *
 * @param component The render function to wrap with `forwardRef`
 */
export function forwardRef<
	Component extends As,
	Props extends object = ComponentProps<Component>,
	OmitKeys extends keyof any = never,
>(component: ForwardRefRenderFunction<Component, Props>) {
	const forwarded = baseForwardRef(
		component
	) as InternalForwardRefExoticComponent<Component, Props, OmitKeys>;

	const name = component?.displayName || component?.name;

	if (name) {
		forwarded.displayName = name;
	}

	return forwarded;
}
