import type {
	MatchRule,
	PricingFnRef,
	PricingModel,
	RouteConfig,
} from "../types.js";

export interface EffectiveRoutePricing {
	model: PricingModel;
	duration?: string;
	price?: string | PricingFnRef;
	match?: MatchRule[];
	fallback?: string;
}

/**
 * Normalize route pricing config while keeping backward compatibility with
 * legacy top-level fields (`price`, `match`, `fallback`).
 */
export function getEffectiveRoutePricing(
	route: RouteConfig,
): EffectiveRoutePricing {
	return {
		model: route.pricing?.model ?? "request",
		duration: route.pricing?.duration,
		price: route.pricing?.price ?? route.price,
		match: route.pricing?.match ?? route.match,
		fallback: route.pricing?.fallback ?? route.fallback,
	};
}
