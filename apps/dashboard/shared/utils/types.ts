import type * as React from "react";

/**
 * Represents any valid React element type (HTML tag string or React component).
 */
export type As<Props = any> = React.ElementType<Props>;

/**
 * Extracts the ref type associated with an element type.
 */
export type ComponentRef<T extends As> = React.ComponentRef<T>;

/**
 * Omits common component props from a target type.
 */
export type OmitCommonProps<
	Target,
	OmitAdditionalProps extends keyof any = never,
> = Omit<Target, OmitAdditionalProps>;

/**
 * Right-joins source props with override props (override props take precedence).
 */
export type RightJoinProps<
	SourceProps extends object,
	OverrideProps extends object,
> = OmitCommonProps<SourceProps, keyof OverrideProps> & OverrideProps;

/**
 * Merges component props with element `as` props and custom additional props.
 */
export type MergeWithAs<
	ComponentProps extends object,
	AsProps extends object,
	AdditionalProps extends object = Record<string, unknown>,
	AsComponent extends As = As,
> = (
	| RightJoinProps<ComponentProps, AdditionalProps>
	| RightJoinProps<AsProps, AdditionalProps>
) & {
	as?: AsComponent;
};

/**
 * Component interface for polymorphic forwardRef components.
 */
export type InternalForwardRefExoticComponent<
	Component extends As,
	Props extends object = object,
	OmitKeys extends keyof any = never,
> = {
	<AsComponent extends As = Component>(
		props: MergeWithAs<
			React.ComponentPropsWithoutRef<Component>,
			Omit<React.ComponentPropsWithoutRef<AsComponent>, OmitKeys>,
			Props,
			AsComponent
		> &
			React.RefAttributes<ComponentRef<AsComponent> | HTMLElement>
	): React.ReactElement | null;
	readonly $$typeof: symbol;
	defaultProps?: Partial<Props> | undefined;
	propTypes?: Record<string, unknown> | undefined;
	displayName?: string | undefined;
};

/**
 * Extracts the props of a React element or component type, including the `as` prop.
 */
export type PropsOf<T extends As> = React.ComponentPropsWithoutRef<T> & {
	as?: T;
};

export type HTMLProps<
	T extends As = "div",
	OmitKeys extends keyof any = never,
> = Omit<PropsOf<T>, "ref" | OmitKeys> & {
	as?: As;
};
