// @vitest-environment jsdom
import { afterEach, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { ClassicIcon, type ClassicIconName } from "./classic-icon";
import { InterfaceIcon } from "./interface-icon";
afterEach(cleanup);
const names: ClassicIconName[] = ["accept_button","add","arrow_refresh","award_star_gold_blue","book","bullet_green","bullet_yellow","calendar","cancel","chart_bar","clock_history_frame","data_table","delete","door_out","find","flag_red_dull","group","house","magnifier","medal_award_gold","money","pencil","sport","sport_soccer","star","t_shirt_print","user_add","user_delete","user_edit","user_green","user_suit"];
it("uses the same accessible decorative vector family for every legacy icon", () => {
 const {container} = render(<>{names.map(name=><ClassicIcon key={name} name={name} size={32} className="custom-tone"/>)}</>);
 expect(container.querySelectorAll("img")).toHaveLength(0);
 expect(container.querySelectorAll("svg")).toHaveLength(names.length);
 container.querySelectorAll("svg").forEach(svg=>{
  expect(svg.getAttribute("viewBox")).toBe("0 0 24 24");
  expect(svg.getAttribute("width")).toBe("32");
  expect(svg.getAttribute("height")).toBe("32");
  expect(svg.getAttribute("stroke")).toBe("currentColor");
  expect(svg.getAttribute("stroke-width")).toBe("1.65");
  expect(svg.getAttribute("aria-hidden")).toBe("true");
  expect(svg.getAttribute("focusable")).toBe("false");
  expect(svg.classList.contains("custom-tone")).toBe(true);
  expect(svg.children.length).toBeGreaterThan(0);
 });
});
it("shares identical artwork between both icon entry points and distinct action symbols",()=>{
 const {container} = render(<><ClassicIcon name="calendar"/><InterfaceIcon name="calendar"/><ClassicIcon name="add"/><ClassicIcon name="delete"/><ClassicIcon name="cancel"/></>);
 const icons=container.querySelectorAll("svg");
 expect(icons[0].innerHTML).toBe(icons[1].innerHTML);
 expect(new Set(Array.from(icons).slice(2).map(svg=>svg.innerHTML)).size).toBe(3);
});
