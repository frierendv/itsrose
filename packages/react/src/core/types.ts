import type {
	ComponentProps,
	ComponentRef,
	ElementType,
	PropsWithoutRef,
	ReactNode,
	Ref,
} from "react";

/**
 * Represents any valid React element type (HTML tag name or React component).
 *
 * @template Props Custom props accepted by the element type.
 */
export type As<Props = {}> = ElementType<Props>;

/**
 * Extracts the props of a React element or component type.
 *
 * @template Component Target component or element tag.
 */
export type PropsOf<Component extends As> = ComponentProps<Component>;

/**
 * Extracts the supported ref type for a polymorphic component or element tag.
 *
 * @template Component Target component or element tag.
 */
export type PolymorphicRef<Component extends As> = ComponentRef<Component>;

/**
 * Merges two prop types where `OverrideProps` take precedence over overlapping keys in `SourceProps`.
 *
 * @template SourceProps The base props object.
 * @template OverrideProps The overriding props object.
 */
export type RightJoinProps<
	SourceProps extends object,
	OverrideProps extends object,
> = Omit<SourceProps, keyof OverrideProps> & OverrideProps;

/**
 * Merges base component props with polymorphic `as` props and custom component props,
 * ensuring correct precedence: `AdditionalProps` > `AsProps` > `ComponentProps`.
 *
 * @template AsComponent The dynamic component type passed to `as`.
 * @template ComponentProps Base component props.
 * @template AsProps Props from the dynamic `as` element.
 */
export type MergeWithAs<
	AsComponent extends As,
	ComponentProps extends object,
	AsProps extends object,
> = RightJoinProps<AsProps, ComponentProps> & {
	as?: AsComponent;
};

/**
 * Polymorphic props for a component accepting an `as` prop without `ref`.
 *
 * @template Component Target element or component type.
 * @template Props Custom props accepted by the component.
 */
export type PolymorphicComponentProps<
	Component extends As,
	Props extends object = object,
> = PropsWithoutRef<MergeWithAs<Component, Props, PropsOf<Component>>>;

/**
 * Polymorphic props for a component including strongly typed `ref` forwarded to the dynamic element.
 *
 * @template Component Target element or component type.
 * @template Props Custom props accepted by the component.
 */
export type PolymorphicComponentPropsWithRef<
	Component extends As,
	Props extends object = object,
> = PolymorphicComponentProps<Component, Props> & {
	ref?: Ref<PolymorphicRef<Component>>;
};

/**
 * Interface representing a polymorphic React component created with `forwardRef`.
 *
 * @template DefaultElement The default HTML tag or component when `as` is not specified.
 * @template Props Custom props accepted by the component.
 */
export interface PolymorphicComponent<
	DefaultElement extends As,
	Props extends object = object,
> extends React.NamedExoticComponent<Props> {
	<Component extends As = DefaultElement>(
		props: PolymorphicComponentPropsWithRef<Component, Props>
	): ReactNode;
}

/**
 * Backward compability
 */
export type HTMLProps<T extends As> = PropsOf<T>;
