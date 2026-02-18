import type { RateLimitResult, RateLimitStore } from "../types.js";

/**
 * In-memory sliding window rate limiter.
 *
 * Each key maps to a sorted array of request timestamps.
 * On each check, expired entries are pruned and the count
 * is compared against the limit.
 */
export class MemoryRateLimitStore implements RateLimitStore {
	private windows = new Map<string, number[]>();
	private sweepTimer: ReturnType<typeof setInterval> | null = null;

	constructor() {
		// Sweep stale keys every 60s to prevent unbounded memory growth
		this.sweepTimer = setInterval(() => this.sweep(), 60_000);
		// Allow the process to exit without waiting for the timer
		if (this.sweepTimer && "unref" in this.sweepTimer) {
			this.sweepTimer.unref();
		}
	}

	async check(
		key: string,
		limit: number,
		windowMs: number,
	): Promise<RateLimitResult> {
		const now = Date.now();
		const cutoff = now - windowMs;

		let timestamps = this.windows.get(key);
		if (!timestamps) {
			timestamps = [];
			this.windows.set(key, timestamps);
		}

		// Remove expired entries
		while (timestamps.length > 0 && timestamps[0] < cutoff) {
			timestamps.shift();
		}

		if (timestamps.length >= limit) {
			// Denied — oldest entry determines when the window resets
			const resetMs = timestamps[0] + windowMs - now;
			return {
				allowed: false,
				remaining: 0,
				limit,
				resetMs: Math.max(resetMs, 0),
			};
		}

		// Allowed — record this request
		timestamps.push(now);
		return {
			allowed: true,
			remaining: limit - timestamps.length,
			limit,
			resetMs: windowMs,
		};
	}

	/** Remove keys with no remaining timestamps. */
	private sweep(): void {
		const now = Date.now();
		for (const [key, timestamps] of this.windows) {
			// If the newest entry is older than any reasonable window (1h),
			// the key is stale
			if (
				timestamps.length === 0 ||
				timestamps[timestamps.length - 1] < now - 3_600_000
			) {
				this.windows.delete(key);
			}
		}
	}

	/** Stop the sweep timer (useful in tests). */
	destroy(): void {
		if (this.sweepTimer) {
			clearInterval(this.sweepTimer);
			this.sweepTimer = null;
		}
	}
}

/** Parse a duration string like "30s", "5m", "1h", "1d" to milliseconds. */
export function parseWindow(window: string): number {
	const match = window.match(/^(\d+)([smhd])$/);
	if (!match) {
		throw new Error(`Invalid rate limit window: "${window}"`);
	}

	const value = Number.parseInt(match[1], 10);
	const unit = match[2];

	switch (unit) {
		case "s":
			return value * 1_000;
		case "m":
			return value * 60_000;
		case "h":
			return value * 3_600_000;
		case "d":
			return value * 86_400_000;
		default:
			throw new Error(`Invalid rate limit window unit: "${unit}"`);
	}
}
