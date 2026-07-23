const superjsonMock = {
	stringify(val: unknown): string {
		return JSON.stringify(val);
	},
	parse<T>(val: string): T {
		return JSON.parse(val, (_key, value) => {
			if (
				typeof value === "string" &&
				/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)
			) {
				return new Date(value);
			}
			return value;
		}) as T;
	},
};

export default superjsonMock;
