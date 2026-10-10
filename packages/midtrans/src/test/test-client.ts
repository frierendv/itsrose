import { randomUUID } from "node:crypto";
import { MidtransClient } from "../client";

const prod = {
	environment: "production" as const,
	merchantId: "G718485673",
	serverKey: "Mid-server-vYffBTbD69SHDTqymdUuxIcK",
	clientKey: "Mid-client-wbejZd6ee0hsat_z",
};
const sandbox = {
	environment: "sandbox" as const,
	merchantId: "G718485673",
	clientKey: "SB-Mid-client-8e6wq3rXXIrHpPT0",
	serverKey: "SB-Mid-server-DAy0ni50yjC-qS0Oi2wNFGYq",
};

export const client = new MidtransClient(sandbox);

export const randomOrderId = () => randomUUID();
export const userId = "eb7760d0-91ea-4625-9e9a-3dcbdbc23199";
export const today = new Date().toISOString();
export const tomorrow = new Date(Date.now() + 86400000).toISOString();
