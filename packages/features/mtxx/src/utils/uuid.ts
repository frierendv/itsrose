import { randomUUID } from "crypto";

const DOMAIN_NAME = "itsrose_mtxx";
export const generateUUID = () => {
	return DOMAIN_NAME + randomUUID();
};
