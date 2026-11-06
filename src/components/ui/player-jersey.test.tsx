// @vitest-environment jsdom
import { afterEach, expect, it } from "vitest";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { squad } from "@/lib/game/mock-data";
import { clubCrestAsset, clubKitAsset } from "@/lib/game/assets";
import { KIT_TEMPLATE } from "@/lib/kits/template";
import { PlayerJersey } from "./player-jersey";

afterEach(cleanup);

const goalkeeper = squad.find((player) => player.position === "G")!;
const outfieldPlayer = squad.find((player) => player.position !== "G")!;

it("uses the exact imported primary, reserve and third artwork for outfield players without dyeing or cropping", () => {
  for (const kit of [1, 2, 3] as const) {
    const { container, unmount } = render(<PlayerJersey player={outfieldPlayer} club="Flamengo" kit={kit} />);
    const svg = container.querySelector("svg")!;
    const image = container.querySelector("image")!;
    expect(svg.getAttribute("data-jersey-role")).toBe("outfield");
    expect(image.getAttribute("href")).toBe(clubKitAsset("Flamengo", kit));
    expect(image.hasAttribute("filter")).toBe(false);
    expect(image.getAttribute("preserveAspectRatio")).toBe("xMidYMid meet");
    expect(container.querySelector("text")).toBeNull();
    unmount();
  }
});

it("renders every goalkeeper with the realistic contrasting mold and club crest on the chest", () => {
  const { container, rerender } = render(<PlayerJersey player={goalkeeper} club="Flamengo" kit={1} />);
  const svg = container.querySelector("svg")!;
  const fabric = container.querySelector("image[data-jersey-fabric='true']")!;
  const crest = container.querySelector("image[data-jersey-crest='true']")!;

  expect(svg.getAttribute("data-jersey-role")).toBe("goalkeeper");
  expect(svg.querySelectorAll("[data-jersey-sleeves=long] path")).toHaveLength(2);
  expect(svg.getAttribute("data-gk-color")).toBe("#eab308");
  expect(fabric.getAttribute("href")).toBe(KIT_TEMPLATE.image);
  expect(fabric.hasAttribute("filter")).toBe(true);
  expect(crest.getAttribute("href")).toBe(clubCrestAsset("Flamengo"));

  rerender(<PlayerJersey player={goalkeeper} club="Flamengo" kit={2} />);
  expect(container.querySelector("svg")?.getAttribute("data-gk-color")).toBe("#252930");
  expect(container.querySelector("image[data-jersey-crest='true']")?.getAttribute("href")).toBe(
    clubCrestAsset("Flamengo"),
  );

  rerender(<PlayerJersey player={goalkeeper} club="Palmeiras" kit={1} />);
  expect(container.querySelector("image[data-jersey-crest='true']")?.getAttribute("href")).toBe(
    clubCrestAsset("Palmeiras"),
  );
});

it("renders a vector club shield on the goalkeeper chest when a custom club has no crest asset or fails to load", () => {
  const { container, rerender } = render(
    <PlayerJersey
      player={goalkeeper}
      club="Clube Criado no Editor"
      kit={1}
      clubColors={{ primaryColor: "#c8102e", secondaryColor: "#111111", shortName: "CCE" }}
    />,
  );
  expect(container.querySelector("g[data-jersey-crest='fallback']")?.textContent).toBe("CCE");

  rerender(<PlayerJersey player={goalkeeper} club="Porto Velho-RO" kit={1} />);
  expect(container.querySelector("image[data-jersey-crest='true']")?.getAttribute("href")).toBe(
    clubCrestAsset("Porto Velho-RO"),
  );

  rerender(<PlayerJersey player={goalkeeper} club="Flamengo" kit={1} />);
  const crest = container.querySelector("image[data-jersey-crest='true']")!;
  fireEvent.error(crest);
  expect(container.querySelector("g[data-jersey-crest='fallback']")).not.toBeNull();

  rerender(<PlayerJersey player={goalkeeper} club="Palmeiras" kit={1} />);
  expect(container.querySelector("image[data-jersey-crest='true']")?.getAttribute("href")).toBe(
    clubCrestAsset("Palmeiras"),
  );
});

it("keeps a fabric fallback only for absent or broken outfield assets, without leaking a failure to another club", () => {
  const { container, rerender } = render(<PlayerJersey player={outfieldPlayer} club="Clube sem arte importada" />);
  expect(container.querySelector("image")?.getAttribute("href")).toBe(KIT_TEMPLATE.image);
  expect(container.querySelector("image")?.hasAttribute("filter")).toBe(true);
  rerender(<PlayerJersey player={outfieldPlayer} club="Flamengo" />);
  fireEvent.error(container.querySelector("image")!);
  expect(container.querySelector("image")?.getAttribute("href")).toBe(KIT_TEMPLATE.image);
  rerender(<PlayerJersey player={outfieldPlayer} club="Palmeiras" />);
  expect(container.querySelector("image")?.getAttribute("href")).toBe(clubKitAsset("Palmeiras"));
});
