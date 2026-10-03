import type { ErrorHandler, HttpExecutor, HttpResponse } from "../types";

/**
 * HTTP promise returned by HTTP client methods.
 * Implements the standard {@link Promise} interface.
 *
 * @template TData Response payload type.
 * @template TError Formatted error type.
 * @template TThrow Whether throwing on network/transport error is enabled.
 */
export class HttpPromise<TData = unknown, TError = unknown> implements Promise<
	HttpResponse<TData, TError>
> {
	private promise?: Promise<HttpResponse<TData, TError>>;

	constructor(
		private readonly executor: HttpExecutor<TData, TError>,
		private readonly handler?: ErrorHandler<TError>
	) {}

	/**
	 * Resolves or returns the memoized underlying execution promise for this request.
	 * Executes the request once upon first invocation.
	 */
	private _toPromise(): Promise<HttpResponse<TData, TError>> {
		if (!this.promise) {
			this.promise = this.executor(this.handler);
		}
		return this.promise;
	}

	/**
	 * Configures a custom error handler and returns a new {@link HttpPromise}.
	 *
	 * @param handler handler callback.
	 * @returns A new HttpPromise instance.
	 */
	public onError<TNewError>(
		handler: ErrorHandler<TNewError>
	): HttpPromise<TData, TNewError> {
		return new HttpPromise<TData, TNewError>(
			this.executor as unknown as HttpExecutor<TData, TNewError>,
			handler
		);
	}

	/**
	 * Attaches callbacks for the resolution and/or rejection of the Promise.
	 */
	public then<TResult1 = HttpResponse<TData, TError>, TResult2 = never>(
		onfulfilled?:
			| ((
					value: HttpResponse<TData, TError>
			  ) => TResult1 | PromiseLike<TResult1>)
			| null,
		onrejected?:
			((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
	): Promise<TResult1 | TResult2> {
		return this._toPromise().then(onfulfilled, onrejected);
	}

	/**
	 * Attaches a callback for only the rejection of the Promise.
	 */
	public catch<TResult = never>(
		onrejected?:
			((reason: unknown) => TResult | PromiseLike<TResult>) | null
	): Promise<HttpResponse<TData, TError> | TResult> {
		return this._toPromise().catch(onrejected);
	}

	/**
	 * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected).
	 */
	public finally(
		onfinally?: (() => void) | null
	): Promise<HttpResponse<TData, TError>> {
		return this._toPromise().finally(onfinally);
	}

	get [Symbol.toStringTag](): string {
		return "HttpPromise";
	}
}
