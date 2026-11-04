// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { preparePlayerPhoto } from "./player-photo";

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it("validates file formats and sizes before decoding", async () => {
  await expect(preparePlayerPhoto(new File(["x"], "bad.txt", { type: "text/plain" }))).rejects.toThrow("JPG, PNG ou WebP");
  await expect(preparePlayerPhoto(new File([new Uint8Array(5 * 1024 * 1024 + 1)], "large.png", { type: "image/png" }))).rejects.toThrow("até 5 MB");
});

it("resizes the portrait and releases the temporary URL", async () => {
  const revoke = vi.fn();
  vi.stubGlobal("URL", { createObjectURL: vi.fn(() => "blob:player"), revokeObjectURL: revoke });
  class FakeImage {
    naturalWidth = 1024; naturalHeight = 512;
    onload: (() => void) | null = null; onerror: (() => void) | null = null;
    set src(_value: string) { queueMicrotask(() => this.onload?.()); }
  }
  vi.stubGlobal("Image", FakeImage);
  const draw = vi.fn();
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({ drawImage: draw } as unknown as CanvasRenderingContext2D);
  const encode = vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue("data:image/webp;base64,abc");
  expect(await preparePlayerPhoto(new File(["image"], "portrait.png", { type: "image/png" }))).toBe("data:image/webp;base64,abc");
  expect(draw).toHaveBeenCalledWith(expect.any(FakeImage), 0, 0, 256, 128);
  expect(encode).toHaveBeenCalledWith("image/webp", 0.8);
  expect(revoke).toHaveBeenCalledWith("blob:player");
});
