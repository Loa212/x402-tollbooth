import { decodePaymentSignature, HEADERS } from "./headers.js";

/**
 * Decode the payer address from the x402 payment-signature header.
 */
export function extractPayerFromPaymentHeader(
	request: Request,
): string | undefined {
	const paymentHeader = request.headers.get(HEADERS.PAYMENT_SIGNATURE);
	if (!paymentHeader) {
		return undefined;
	}

	try {
		const payload = decodePaymentSignature(paymentHeader) as Record<
			string,
			unknown
		>;
		const payer =
			getNestedString(payload, "payload", "authorization", "from") ??
			getNestedString(payload, "from") ??
			getNestedString(payload, "payer");

		return payer ? payer.toLowerCase() : undefined;
	} catch {
		return undefined;
	}
}

function getNestedString(
	obj: Record<string, unknown>,
	...keys: string[]
): string | undefined {
	let current: unknown = obj;
	for (const key of keys) {
		if (current == null || typeof current !== "object") return undefined;
		current = (current as Record<string, unknown>)[key];
	}
	return typeof current === "string" && current.length > 0
		? current
		: undefined;
}
