import { expect, it } from "vitest";
import { GET } from "./route";
import { transfermarktSnapshotSchema } from "@/lib/importer/transfermarkt";
it("serves only a validated public collection with no-store", async () => {
  const response = await GET();
  expect(response.status).toBe(200);
  expect(response.headers.get("Cache-Control")).toBe("no-store");
  expect(transfermarktSnapshotSchema.safeParse((await response.json()).snapshot).success).toBe(true);
});
