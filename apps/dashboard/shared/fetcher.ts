type FetcherResponseFormat = "json" | "text" | "blob";

type FetcherResultMap = {
	json: unknown;
	text: string;
	blob: Blob;
};

type FetcherRequestInit<TFormat extends FetcherResponseFormat = "json"> =
	RequestInit & {
		as?: TFormat;
	};

export const fetcher = async <
	TFormat extends FetcherResponseFormat = "json",
	TResult = FetcherResultMap[TFormat],
>(
	input: RequestInfo,
	init?: FetcherRequestInit<TFormat>
): Promise<TResult> => {
	const format = init?.as ?? "json";
	const response = await fetch(input, init);

	if (!response.ok) {
		throw new Error(
			`Fetch error: ${response.status} ${response.statusText}`
		);
	}

	return (await response[format]()) as TResult;
};
