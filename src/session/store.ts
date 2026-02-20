import type { TimeSessionStore } from "../types.js";

/**
 * In-memory store for time-based access sessions.
 * Keys are route+payer identifiers and values are UNIX expiry timestamps in ms.
 */
export class MemoryTimeSessionStore implements TimeSessionStore {
	private sessions = new Map<string, number>();
	private sweepTimer: ReturnType<typeof setInterval> | null = null;

	constructor() {
		this.sweepTimer = setInterval(() => this.sweep(), 60_000);
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

	destroy(): void {
		if (this.sweepTimer) {
			clearInterval(this.sweepTimer);
			this.sweepTimer = null;
		}
	}
}

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
