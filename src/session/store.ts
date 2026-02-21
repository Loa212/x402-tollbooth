import type { TimeSessionStore } from "../types.js";

const DEFAULT_SWEEP_INTERVAL_MS = 60_000;

/**
 * In-memory store for time-based access sessions.
 * Keys are route+payer identifiers and values are UNIX expiry timestamps in ms.
 */
export class MemoryTimeSessionStore implements TimeSessionStore {
	private sessions = new Map<string, number>();
	private sweepTimer: ReturnType<typeof setInterval> | null = null;

	/**
	 * @param sweepIntervalMs How often to purge expired sessions (ms). Must be
	 *   a positive integer. Defaults to 60 000 ms (1 minute).
	 */
	constructor(sweepIntervalMs = DEFAULT_SWEEP_INTERVAL_MS) {
		if (sweepIntervalMs <= 0) {
			sweepIntervalMs = DEFAULT_SWEEP_INTERVAL_MS;
		}
		this.sweepTimer = setInterval(() => this.sweep(), sweepIntervalMs);
		if (this.sweepTimer && "unref" in this.sweepTimer) {
			this.sweepTimer.unref();
		}
	}

	async get(key: string): Promise<number | undefined> {
		const expiry = this.sessions.get(key);
		if (expiry == null) return undefined;

		if (expiry <= Date.now()) {
			this.sessions.delete(key);
			return undefined;
		}

		return expiry;
	}

	async set(key: string, expiresAt: number): Promise<void> {
		this.sessions.set(key, expiresAt);
	}

	private sweep(): void {
		const now = Date.now();
		for (const [key, expiry] of this.sessions) {
			if (expiry <= now) {
				this.sessions.delete(key);
			}
		}
	}

	close(): void {
		if (this.sweepTimer) {
			clearInterval(this.sweepTimer);
			this.sweepTimer = null;
		}
	}
}

/**
 * Build a session store key that uniquely identifies a payer's session for a
 * given route.
 *
 * Format: `<routeKey>:<payer>` where `<payer>` is lowercased.
 *
 * Example: `"api/chat:0xabc123"` — this is the contract between the middleware
 * and any `TimeSessionStore` implementation. Both sides must produce identical
 * keys for session lookup to work correctly.
 */
export function buildSessionKey(routeKey: string, payer: string): string {
	return `${routeKey}:${payer.toLowerCase()}`;
}

/** Parse a duration string like "30s", "5m", "1h", "1d" to milliseconds. */
export function parseDuration(duration: string): number {
	const match = duration.match(/^(\d+)([smhd])$/);
	if (!match) {
		throw new Error(`Invalid duration: "${duration}"`);
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
			throw new Error(`Invalid duration unit: "${unit}"`);
	}
}
