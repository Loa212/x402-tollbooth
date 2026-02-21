import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { MemoryTimeSessionStore, parseDuration } from "../session/store.js";

describe("parseDuration", () => {
	test("parses seconds", () => {
		expect(parseDuration("30s")).toBe(30_000);
	});

	test("parses minutes", () => {
		expect(parseDuration("5m")).toBe(300_000);
	});

	test("parses hours", () => {
		expect(parseDuration("1h")).toBe(3_600_000);
	});

	test("parses days", () => {
		expect(parseDuration("1d")).toBe(86_400_000);
	});

	test("throws on invalid format", () => {
		expect(() => parseDuration("10")).toThrow("Invalid duration");
		expect(() => parseDuration("abc")).toThrow("Invalid duration");
	});
});

describe("MemoryTimeSessionStore", () => {
	let store: MemoryTimeSessionStore;

	beforeEach(() => {
		store = new MemoryTimeSessionStore();
	});

	afterEach(() => {
		store.close();
	});

	test("returns undefined for unknown keys", async () => {
		expect(await store.get("missing")).toBeUndefined();
	});

	test("stores and returns active sessions", async () => {
		const expiresAt = Date.now() + 1_000;
		await store.set("route:payer", expiresAt);
		expect(await store.get("route:payer")).toBe(expiresAt);
	});

	test("expires stale sessions on read", async () => {
		await store.set("route:payer", Date.now() - 1);
		expect(await store.get("route:payer")).toBeUndefined();
	});
});
