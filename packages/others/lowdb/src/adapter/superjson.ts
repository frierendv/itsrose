import SuperJSON from "superjson";
import type { AnyRecordValue } from "../types";
import { Adapter, type IAdapterOptions } from "./adapter";

export interface ISuperJSONAdapterOptions<
	T extends AnyRecordValue,
> extends Omit<IAdapterOptions<T>, "stringify" | "parse"> {}

/**
 * SuperJSON adapter used accross ItsRose workspace
 *
 * @template {AnyRecordValue} T
 * @extends {Adapter<T>}
 */
export class SuperJSONAdapter<T extends AnyRecordValue> extends Adapter<T> {
	constructor(options: ISuperJSONAdapterOptions<T>) {
		super({
			extension: "json",
			...options,
			stringify: (val) => SuperJSON.stringify(val),
			parse: (val) => SuperJSON.parse<T>(val),
		});
	}
}
