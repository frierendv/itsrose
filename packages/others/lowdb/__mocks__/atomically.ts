import { promises as fs } from "node:fs";

export async function readFile(
	filePath: string,
	encoding: BufferEncoding
): Promise<string> {
	return fs.readFile(filePath, encoding);
}

export async function writeFile(
	filePath: string,
	data: string,
	encoding: BufferEncoding
): Promise<void> {
	return fs.writeFile(filePath, data, encoding);
}
