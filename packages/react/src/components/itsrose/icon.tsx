import { PETALS } from "./constant";

export type IconProps = React.SVGProps<SVGSVGElement> & {
	size?: number | string;
};

export const Icon: React.FC<IconProps> = (props) => {
	const { size = 24, ...restProps } = props;

	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width={size}
			height={size}
			viewBox="0 0 1500 1500"
			aria-hidden="true"
			{...restProps}
		>
			{PETALS.map(({ fill, d }, index) => (
				<path key={index} fill={fill} d={d} />
			))}
		</svg>
	);
};

Icon.displayName = "ItsRose.Icon";
