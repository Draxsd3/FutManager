import { beforeEach, expect, it, vi } from "vitest";
import { prepareLiveTransfermarktSync } from "./transfermarkt-sync";
import { createDefaultDatabase } from "@/lib/game/editor-data";
import type { LiveCheckpoint, LiveOptions } from "./transfermarkt-live";
const state = vi.hoisted(() => ({ checkpoint: null as unknown, collect: vi.fn(), save: vi.fn(), options: undefined as unknown }));
vi.mock("./transfermarkt-live", async original => ({ ...await original<typeof import("./transfermarkt-live")>(), collectNationalSnapshot: state.collect }));
vi.mock("./database-cache", () => ({ readTransfermarktCheckpoint: async () => state.checkpoint, saveTransfermarktCheckpoint: state.save, readTransfermarktCorrections: async () => [] }));
vi.mock("@/lib/supabase/client", () => ({ createBrowserSupabaseClient: vi.fn() }));
beforeEach(() => {
  state.checkpoint = { collectionVersion: 2 }; state.save.mockReset().mockImplementation(async (_user, value) => { state.checkpoint = value; });
  state.collect.mockReset().mockImplementation(async (options: LiveOptions) => { state.options = options; throw new Error("stop before network"); });
});
it("Rodar always clears staging and queries the entire live manifest with every new enrichment enabled, not the seed", async () => {
  await expect(prepareLiveTransfermarktSync(createDefaultDatabase(), "user", vi.fn())).rejects.toThrow("stop before network");
  expect(state.save).toHaveBeenCalledWith("user", null);
});
it("only Retomar may reuse a compatible checkpoint; an old pipeline cannot skip newly added fields", async () => {
  const checkpoint = state.checkpoint;
  await expect(prepareLiveTransfermarktSync(createDefaultDatabase(), "user", vi.fn(), undefined, true)).rejects.toThrow("stop before network");
  const options = state.options as LiveOptions;
  expect(state.save).not.toHaveBeenCalled();
  expect(await options.load!()).toBe(checkpoint);
  expect(options.enrichLoans).toBe(true); expect(options.enrichHonours).toBe(true); expect(options.seed).toBeUndefined();
  state.checkpoint = { collectionVersion: 1 } as LiveCheckpoint;
  expect(await options.load!()).toBeNull();
});
