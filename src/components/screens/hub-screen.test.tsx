// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { HubScreen } from "./hub-screen";
import { squad, buildStartingXI } from "@/lib/game/mock-data";
afterEach(cleanup);
const starters=buildStartingXI("4-3-3",squad);
function setup() {
  const select=vi.fn(),open=vi.fn(),lineup=vi.fn(),quick=vi.fn();
  render(<HubScreen club="Flamengo" coach="Técnico" budget={13530} opponent="Botafogo" round={7} competition="Estadual" squad={squad} starters={starters} selectedPlayer={squad[0]} onSelectPlayer={select} onOpenPlayer={open} onEscalar={lineup} onQuickAction={quick}/>);
  return {select,open,lineup,quick};
}
function rows(){return screen.getAllByRole('row').slice(1);}
it("shows real aggregate metrics and searches without changing the squad",()=>{
 setup();expect(rows()).toHaveLength(squad.length);
 fireEvent.change(screen.getByLabelText('Buscar jogador'),{target:{value:'sem resultados'}});
 expect(screen.getByText('Nenhum atleta encontrado')).toBeTruthy();
 fireEvent.click(screen.getByRole('button',{name:'Limpar filtros'}));expect(rows()).toHaveLength(squad.length);
 fireEvent.change(screen.getByLabelText('Buscar jogador'),{target:{value:squad[0].name}});expect(rows()).toHaveLength(1);
 expect(screen.getByRole('status').textContent).toContain(`1 de ${squad.length}`);
});
it("combines starter/reserve and position filters, sorts and restores all players",()=>{
 setup();fireEvent.click(screen.getByRole('button',{name:/^Titulares/}));expect(rows()).toHaveLength(starters.length);
 fireEvent.click(screen.getByRole('button',{name:/^Reservas/}));expect(rows()).toHaveLength(squad.length-starters.length);
 fireEvent.click(screen.getByRole('button',{name:/^Todos/}));
 fireEvent.change(screen.getByLabelText('Filtrar posição'),{target:{value:'G'}});expect(rows()).toHaveLength(squad.filter(p=>p.position==='G').length);
 fireEvent.change(screen.getByLabelText('Filtrar posição'),{target:{value:'all'}});
 fireEvent.change(screen.getByLabelText('Ordenar jogadores'),{target:{value:'overall'}});
 expect(rows()[0].textContent).toContain([...squad].sort((a,b)=>b.overall-a.overall)[0].name);
});
it("retains selection, mouse/keyboard profiles, lineup and quick navigation",()=>{
 const {select,open,lineup,quick}=setup();const row=rows()[0],id=Number(row.getAttribute('data-player-row'));
 fireEvent.click(row);expect(select).toHaveBeenCalledWith(id);
 fireEvent.keyDown(row,{key:' '});expect(select).toHaveBeenLastCalledWith(id);
 fireEvent.keyDown(row,{key:'Enter'});expect(open).toHaveBeenCalledWith(id);
 fireEvent.doubleClick(row);expect(open).toHaveBeenCalledTimes(2);
 fireEvent.click(within(row).getByRole('button',{name:/Abrir perfil/}));expect(open).toHaveBeenCalledTimes(3);
 fireEvent.click(screen.getByRole('button',{name:'Ver perfil completo'}));expect(open).toHaveBeenLastCalledWith(squad[0].id);
 fireEvent.click(screen.getByRole('button',{name:'Escalar Time'}));expect(lineup).toHaveBeenCalledOnce();
 for(const label of ['Elenco','Finanças','Troféus','Treino'])fireEvent.click(screen.getByRole('button',{name:label}));
 expect(quick.mock.calls.map(c=>c[0])).toEqual(['roster','finances','trophies','training']);
});
it("switches to recorded performance without inventing match counts or synthetic form",()=>{
 setup();fireEvent.click(screen.getByRole('button',{name:'Desempenho'}));
 expect(screen.getByRole('columnheader',{name:'GOLS'})).toBeTruthy();expect(screen.getByRole('columnheader',{name:'ASSISTÊNCIAS'})).toBeTruthy();
 expect(screen.getByRole('columnheader',{name:'NOTA MÉDIA'})).toBeTruthy();expect(screen.queryByRole('columnheader',{name:'Satisf.'})).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:'Visão geral'}));expect(screen.getByRole('columnheader',{name:'CONTRATO ATÉ'})).toBeTruthy();
});
