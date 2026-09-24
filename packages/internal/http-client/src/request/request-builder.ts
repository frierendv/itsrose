import type { IHttpResponse, IRequestBuilder, OnError } from "../types";

export type RequestExecutor<TData> = (
	handler?: OnError<any>
) => Promise<IHttpResponse<TData, any>>;

/**
 * Fluent request builder returned by HTTP methods.
 * Implements the standard `Promise` interface and supports `.onError(...)` and `.unwrap()`.
 *
 * @template TData Response payload type.
 * @template TError Formatted error type.
 */
export class RequestBuilder<TData = unknown, TError = unknown>
	implements
		IRequestBuilder<TData, TError>,
		Promise<IHttpResponse<TData, TError>>
{
	private promise?: Promise<IHttpResponse<TData, TError>>;

	constructor(
		private readonly executor: RequestExecutor<TData>,
		private readonly handler?: OnError<TError>
	) {}

	/**
	 * Handles errors that occur during the request and returns a new `RequestBuilder`
	 * with the customized error type.
	 *
	 * @param handler Error handler callback.
	 * @returns A new RequestBuilder instance with the new error type.
	 */
	public onError<TNewError>(
		handler: OnError<TNewError>
	): RequestBuilder<TData, TNewError> {
		return new RequestBuilder<TData, TNewError>(this.executor, handler);
	}

	/**
	 * Returns the memoized execution Promise for this request.
	 * Executes the underlying request once on first invocation.
	 */
	public toPromise(): Promise<IHttpResponse<TData, TError>> {
		if (!this.promise) {
			this.promise = this.executor(this.handler) as Promise<
				IHttpResponse<TData, TError>
			>;
		}
		return this.promise;
	}

	/**
	 * Attaches callbacks for the resolution and/or rejection of the Promise.
	 */
	public then<TResult1 = IHttpResponse<TData, TError>, TResult2 = never>(
		onfulfilled?:
			| ((
					value: IHttpResponse<TData, TError>
			  ) => TResult1 | PromiseLike<TResult1>)
			| null,
		onrejected?:
			((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
	): Promise<TResult1 | TResult2> {
		return this.toPromise().then(onfulfilled, onrejected);
	}

	/**
	 * Attaches a callback for only the rejection of the Promise.
	 */
	public catch<TResult = never>(
		onrejected?:
			((reason: unknown) => TResult | PromiseLike<TResult>) | null
	): Promise<IHttpResponse<TData, TError> | TResult> {
		return this.toPromise().catch(onrejected);
	}

	/**
	 * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected).
	 */
	public finally(
		onfinally?: (() => void) | null
	): Promise<IHttpResponse<TData, TError>> {
		return this.toPromise().finally(onfinally);
	}

	/**
	 * Unwraps and returns the response payload data.
	 * Throws the request error if one occurred.
	 *
	 * @throws The request error or formatted error.
	 * @returns The response data.
	 */
	public async unwrap(): Promise<TData> {
		const res = await this.toPromise();
		if (res.error !== undefined) {
			throw res.error;
		}
		return res.data;
	}

	get [Symbol.toStringTag](): string {
		return "RequestBuilder";
	}
}
