import type { IHttpResponse, IRequestBuilder, OnError } from "../types";

export class RequestBuilder<TData, TError = unknown> implements IRequestBuilder<
	TData,
	TError
> {
	constructor(
		private readonly executor: (
			handler?: OnError<any>
		) => Promise<IHttpResponse<TData, any>>,
		private readonly handler?: OnError<TError>
	) {}

	/**
	 * @public
	 * @param handler
	 * @returns {RequestBuilder}
	 */
	onError<NError>(handler: OnError<NError>): RequestBuilder<TData, NError> {
		return new RequestBuilder<TData, NError>(this.executor, handler);
	}

	/**
	 * Attaches callbacks for the resolution and/or rejection of the Promise.
	 *
	 * @public
	 * @param handler
	 * @returns {Promise<IHttpResponse<TData, any>>}
	 */
	then<TResult1 = IHttpResponse<TData, TError>, TResult2 = never>(
		onfulfilled?:
			| ((
					value: IHttpResponse<TData, TError>
			  ) => TResult1 | PromiseLike<TResult1>)
			| null,
		onrejected?:
			((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
	): Promise<TResult1 | TResult2> {
		return this.executor(this.handler).then(onfulfilled, onrejected);
	}
}
