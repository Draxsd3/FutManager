// @vitest-environment jsdom
import { afterEach, expect, it } from "vitest";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { squad } from "@/lib/game/mock-data";
import { clubKitAsset } from "@/lib/game/assets";
import { KIT_TEMPLATE } from "@/lib/kits/template";
import { PlayerJersey } from "./player-jersey";
afterEach(cleanup);
it("uses the exact imported primary, reserve and third artwork without dyeing or cropping", () => {
  for (const kit of [1, 2, 3] as const) {
    const { container, unmount } = render(<PlayerJersey player={squad[0]} club="Flamengo" kit={kit} />);
    const image = container.querySelector("image")!;
    expect(image.getAttribute("href")).toBe(clubKitAsset("Flamengo", kit));
    expect(image.hasAttribute("filter")).toBe(false);
    expect(image.getAttribute("preserveAspectRatio")).toBe("xMidYMid meet");
    expect(container.querySelector("text")).toBeNull();
    unmount();
  }
});
it("uses the managed club for every player, including goalkeepers, and updates on club changes", () => {
  const { container, rerender } = render(<PlayerJersey player={{ ...squad[0], position: "G" }} club="Flamengo" />);
  expect(container.querySelector("image")?.getAttribute("href")).toBe(clubKitAsset("Flamengo"));
  rerender(<PlayerJersey player={squad[0]} club="Palmeiras" />);
  expect(container.querySelector("image")?.getAttribute("href")).toBe(clubKitAsset("Palmeiras"));
});
it("keeps a fabric fallback only for absent or broken assets, without leaking a failure to another club", () => {
  const { container, rerender } = render(<PlayerJersey player={squad[0]} club="Clube sem arte importada" />);
  expect(container.querySelector("image")?.getAttribute("href")).toBe(KIT_TEMPLATE.image);
  expect(container.querySelector("image")?.hasAttribute("filter")).toBe(true);
  rerender(<PlayerJersey player={squad[0]} club="Flamengo" />);
  fireEvent.error(container.querySelector("image")!);
  expect(container.querySelector("image")?.getAttribute("href")).toBe(KIT_TEMPLATE.image);
  rerender(<PlayerJersey player={squad[0]} club="Palmeiras" />);
  expect(container.querySelector("image")?.getAttribute("href")).toBe(clubKitAsset("Palmeiras"));
});
