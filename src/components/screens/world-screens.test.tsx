// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { WorldScreens } from "./world-screens";
import { createDefaultDatabase, buildSquadFromDatabase } from "@/lib/game/editor-data";
afterEach(cleanup);

it("filtra jogadores listados para venda ou empréstimo e envia uma proposta, não uma contratação imediata", async () => {
  const database = createDefaultDatabase(), club = database.clubs[0];
  const player = database.players.find((item) => item.clubId !== club.id && item.marketStatus === "sale")!;
  const offer = vi.fn().mockReturnValue("O clube fez uma contraproposta.");
  const action = vi.fn();
  const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
  render(<WorldScreens section="search" database={database} club={club.name} coach="Treinador" squad={buildSquadFromDatabase(database, club.name)!} budget={100000} records={{}} negotiations={[]} historyView="players" onHistoryView={vi.fn()} onOpenPlayer={vi.fn()} onTransferOffer={offer} onTransferAction={action} onBack={vi.fn()} />);
  fireEvent.change(screen.getByLabelText("Buscar jogadores"), { target: { value: player.name } });
  expect(screen.getAllByText("À VENDA").length).toBeGreaterThan(0);
  const seller = database.clubs.find((item) => item.id === player.clubId)!;
  fireEvent.click(screen.getByRole("button", { name: `Fazer proposta por ${player.name} do ${seller.name}` }));
  fireEvent.click(screen.getByRole("button", { name: "Enviar proposta" }));
  expect(offer).toHaveBeenCalledWith(player.id, expect.any(Number), 0, expect.any(Number));
  expect(action).not.toHaveBeenCalled();
  expect((await screen.findByRole("status")).textContent).toContain("contraproposta");
  confirm.mockRestore();
});

it("filtra somente empréstimos quando essa disponibilidade é selecionada", async () => {
  const database = createDefaultDatabase(), club = database.clubs[0];
  const player = database.players.find((item) => item.clubId !== club.id && item.marketStatus === "loan")!;
  render(<WorldScreens section="search" database={database} club={club.name} coach="Treinador" squad={buildSquadFromDatabase(database, club.name)!} budget={100000} records={{}} negotiations={[]} historyView="players" onHistoryView={vi.fn()} onOpenPlayer={vi.fn()} onTransferOffer={vi.fn()} onTransferAction={vi.fn()} onBack={vi.fn()} />);
  fireEvent.change(screen.getByLabelText("Disponibilidade"), { target: { value: "loan" } });
  fireEvent.change(screen.getByLabelText("Buscar jogadores"), { target: { value: player.name } });
  expect(screen.getAllByText("PARA EMPRÉSTIMO").length).toBeGreaterThan(0);
  expect(screen.queryByText("À VENDA")).toBeNull();
});

it("separa a busca das negociações e mantém as ações de contraproposta e confirmação", async () => {
  const database = createDefaultDatabase(), club = database.clubs[0];
  const player = database.players.find((item) => item.clubId !== club.id && item.marketStatus === "sale")!;
  const seller = database.clubs.find((item) => item.id === player.clubId)!;
  const deal = { id: "deal-1", playerId: player.id, playerName: player.name, sourceClubId: seller.id, sourceClub: seller.name, buyerClubId: club.id, kind: "sale" as const, askingFeeBrl: 1000000, offerFeeBrl: 900000, counterFeeBrl: 1000000, status: "countered" as const, attempts: 1, wageSharePercent: 0, message: "Clube enviou contraproposta." };
  const action = vi.fn().mockReturnValue("Acordo registrado.");
  const props = { section: "search" as const, database, club: club.name, coach: "Treinador", squad: [], budget: 100000, records: {}, historyView: "players" as const, onHistoryView: vi.fn(), onOpenPlayer: vi.fn(), onTransferOffer: vi.fn(), onTransferAction: action, onBack: vi.fn() };
  const { rerender } = render(<WorldScreens {...props} negotiations={[deal]} />);
  expect(screen.getByRole("button", { name: /Negociações.*1 em andamento/ })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: /Negociações/ }));
  fireEvent.click(screen.getByRole("button", { name: "Ver proposta" }));
  expect(screen.getByRole("dialog", {name: `Perfil de ${player.name}`})).toBeTruthy();
  expect(screen.getByText("Contraproposta recebida")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Aceitar contraproposta" }));
  expect(action).toHaveBeenCalledWith("deal-1", { type: "accept-counter" });
  await waitFor(() => expect((screen.getByRole("button", { name: "Aceitar contraproposta" }) as HTMLButtonElement).disabled).toBe(false));
  rerender(<WorldScreens {...props} negotiations={[{ ...deal, status: "agreed", agreedFeeBrl: 1000000 }]} />);
  const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
  fireEvent.click(screen.getByRole("button", { name: "Confirmar contratação" }));
  expect(action).toHaveBeenCalledWith("deal-1", { type: "complete" });
  confirm.mockRestore();
  fireEvent.click(screen.getByRole("button", { name: "Fechar" }));
  fireEvent.click(screen.getByRole("button", { name: /Buscar jogadores/ }));
  expect(screen.getByLabelText("Buscar jogadores")).toBeTruthy();
});

it("mostra estado vazio das negociações e disponibiliza filtros avançados", async () => {
  const database = createDefaultDatabase(), club = database.clubs[0];
  render(<WorldScreens section="search" database={database} club={club.name} coach="Teste" squad={[]} budget={1000} records={{}} negotiations={[]} historyView="players" onHistoryView={vi.fn()} onOpenPlayer={vi.fn()} onTransferOffer={vi.fn()} onTransferAction={vi.fn()} onBack={vi.fn()} />);
  fireEvent.click(screen.getByText("Mais filtros"));
  expect(screen.getByLabelText("Idade máxima")).toBeTruthy();
  expect(screen.getByLabelText("Taxa máxima em milhões")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: /Negociações/ }));
  expect(screen.getByText("Nenhuma negociação ainda")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Buscar jogadores" }));
  expect(screen.getByLabelText("Disponibilidade")).toBeTruthy();
});

it("explora por perfil sem nome, combina atuação/nacionalidade e limpa a busca", async () => {
  const database = createDefaultDatabase(), club = database.clubs[0];
  const foreign = { ...database.clubs[1], country: "Portugal", name: "Clube Lisboa" };
  database.clubs = [club, foreign];
  database.players = [{ ...database.players[0], id: "scout", name: "Talento Observado", clubId: foreign.id, nationalities: ["Argentina", "Itália"], marketStatus: "normal", primaryPosition: "G", age: 21 }];
  render(<WorldScreens section="search" database={database} club={club.name} coach="Teste" squad={[]} budget={1000} records={{}} negotiations={[]} historyView="players" onHistoryView={vi.fn()} onOpenPlayer={vi.fn()} onTransferOffer={vi.fn()} onTransferAction={vi.fn()} onBack={vi.fn()} />);
  expect(screen.getByText("Talento Observado")).toBeTruthy();
  expect(screen.getByRole("button", {name: /Fazer proposta por Talento/}).hasAttribute("disabled")).toBe(false);
  fireEvent.click(screen.getByText("Mais filtros"));
  fireEvent.change(screen.getByLabelText("País onde atua"),{target: {value: "Portugal"}});
  fireEvent.change(screen.getByLabelText("Nacionalidade"),{target: {value: "Itália"}});
  fireEvent.change(screen.getByLabelText("Posição"),{target: {value: "G"}});
  expect(screen.getByText("Talento Observado")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", {name: "Sem clube"}));
  expect(screen.getByText("Nenhum jogador encontrado")).toBeTruthy();
  fireEvent.click(screen.getByRole("button",{name: "Limpar busca"}));
  expect(screen.getByText("Talento Observado")).toBeTruthy();
  expect((screen.getByLabelText("Nacionalidade") as HTMLSelectElement).value).toBe("");
});

it("encontra livres sem nome e envia proposta sem taxa, sem contratar automaticamente", async () => {
  const database = createDefaultDatabase(), club = database.clubs[0];
  database.players = [{ ...database.players[0], id: "free", name: "Atleta Livre", clubId: "", marketStatus: "normal" }];
  const offer = vi.fn().mockReturnValue("Condições aceitas. Confirme para assinar."), action = vi.fn();
  const confirm = vi.spyOn(window,"confirm").mockReturnValue(true);
  render(<WorldScreens section="search" database={database} club={club.name} coach="Teste" squad={[]} budget={1000} records={{}} negotiations={[]} historyView="players" onHistoryView={vi.fn()} onOpenPlayer={vi.fn()} onTransferOffer={offer} onTransferAction={action} onBack={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", {name: "Sem clube"}));
  expect(screen.getByText("SEM CONTRATO")).toBeTruthy();
  fireEvent.click(screen.getByRole("button",{name: "Fazer proposta por Atleta Livre do Sem clube"}));
  expect(screen.getByLabelText("Valor da proposta").hasAttribute("disabled")).toBe(true);
  fireEvent.click(screen.getByRole("button",{name: "Enviar proposta"}));
  expect(offer).toHaveBeenCalledWith("free",0,0,expect.any(Number));
  expect(action).not.toHaveBeenCalled();
  confirm.mockRestore();
});

it("mostra passe, pedido contextual, multa e custo real antes da proposta e da contraproposta", async () => {
  const { within } = await import("@testing-library/react");
  const { createCareerSeason } = await import("@/lib/game/season");
  const { initializeCareerMarket } = await import("@/lib/game/manager-jobs");
  const { adoptFinance } = await import("@/lib/game/simulation/finance");
  const { transferAskingPrice, simulatedReleaseClauseBrl, formatBrl } = await import("@/lib/game/transfers");
  const database = createDefaultDatabase(), club = database.clubs[0];
  const player = database.players.find(p => p.clubId !== club.id && p.marketStatus === "sale")!;
  player.contractEndsOn = "2026-06-30";
  const date = "2026-01-01";
  const market = initializeCareerMarket(database, createCareerSeason(database, club.id, 2026)!, "Teste", 10000);
  const managerMarket = adoptFinance(market, database, date, {}, { clubId: club.id, budget: 10000 });
  const props = { section: "search" as const, database, club: club.name, coach: "Teste", squad: [], budget: 10000, records: {}, negotiations: [], historyView: "players" as const, managerMarket, gameDate: date, onHistoryView: vi.fn(), onOpenPlayer: vi.fn(), onTransferOffer: vi.fn(), onTransferAction: vi.fn(), onBack: vi.fn() };
  render(<WorldScreens {...props} />);
  fireEvent.change(screen.getByLabelText("Buscar jogadores"), { target: { value: player.name } });
  const seller = database.clubs.find(c => c.id === player.clubId)!;
  const button = screen.getByRole("button", { name: `Fazer proposta por ${player.name} do ${seller.name}` });
  const card = button.closest("article")!;
  expect(within(card).getByText(`PASSE (MERCADO) ${formatBrl(player.marketValueBrl)}`)).toBeTruthy();
  expect(within(card).getByText(`MULTA SIMULADA ${formatBrl(simulatedReleaseClauseBrl(player,date)!)}`)).toBeTruthy();
  expect(within(card).getByText(formatBrl(transferAskingPrice(player, database.players, date)))).toBeTruthy();
  fireEvent.click(button);
  const summary = screen.getByLabelText("Resumo financeiro da proposta");
  expect(within(summary).getByText("Caixa atual").nextElementSibling?.textContent).toBe(formatBrl(managerMarket.finance!.clubs[club.id].cashCents/100));
  expect(summary.textContent).not.toContain("12 meses");
  expect(screen.queryByLabelText("Salário mensal proposto")).toBeNull();
});

it("explica o saldo insuficiente antes de aceitar uma contraproposta", async () => {
  const { createCareerSeason } = await import("@/lib/game/season");
  const { initializeCareerMarket } = await import("@/lib/game/manager-jobs");
  const { adoptFinance } = await import("@/lib/game/simulation/finance");
  const db = createDefaultDatabase(), buyer = db.clubs[0], p = db.players.find(p => p.clubId !== buyer.id && p.marketStatus === "sale")!;
  const market = initializeCareerMarket(db, createCareerSeason(db, buyer.id, 2026)!, "Teste", 12775);
  const managerMarket = adoptFinance(market, db, "2026-01-01", {}, { clubId: buyer.id, budget: 12775 });
  managerMarket.finance!.clubs[buyer.id].cashCents = 1_277_500_000;
  managerMarket.finance!.reservations["other"] = { clubId: buyer.id, cents: 1_000_000_000 };
  const deal = { id: "counter", playerId: p.id, playerName: p.name, sourceClubId: p.clubId, sourceClub: "Clube", buyerClubId: buyer.id, kind: "sale" as const, askingFeeBrl: 5963025, offerFeeBrl: 4900000, counterFeeBrl: 5963025, status: "countered" as const, attempts: 1, wageSharePercent: 0, message: "Contraproposta" };
  render(<WorldScreens section="search" database={db} club={buyer.name} coach="Teste" squad={[]} budget={12775} records={{}} negotiations={[deal]} historyView="players" managerMarket={managerMarket} gameDate="2026-01-01" onHistoryView={vi.fn()} onOpenPlayer={vi.fn()} onTransferOffer={vi.fn()} onTransferAction={vi.fn()} onBack={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", {name: /Negociações/}));
  fireEvent.click(screen.getByRole("button", {name:"Ver proposta"}));
  const quote = screen.getByLabelText("Resumo financeiro da proposta");
  expect(quote.textContent).toContain("R$ 5.963.025");
  expect(quote.textContent).toContain("R$ 12.775.000");
  expect(quote.textContent).toContain("Caixa suficiente para pagar a taxa à vista");
  expect(quote.textContent).not.toContain("12 meses");
  fireEvent.click(screen.getByRole("button", {name:"Fazer contraproposta"}));
  const quotes = screen.getAllByLabelText("Resumo financeiro da proposta");
  expect(quotes).toHaveLength(2);
  fireEvent.change(screen.getByLabelText(`Nova proposta para ${p.name}`), {target:{value:"2"}});
  expect(quotes[1].textContent).toContain("R$ 2.000.000");
});

it("abre ficha com camisa, partidas e transferências registradas, sem inventar histórico real", async () => {
  const { within } = await import("@testing-library/react");
  const { createCareerSeason } = await import("@/lib/game/season");
  const database = createDefaultDatabase(), club = database.clubs[0];
  const player = database.players.find(p => p.clubId !== club.id && p.marketStatus === "sale")!;
  const season = createCareerSeason(database, club.id, 2026)!;
  const fixture = season.fixtures[0];
  fixture.status = "played"; fixture.homeScore = 2; fixture.awayScore = 1;
  fixture.playerContributions = [{playerId: player.id, playerName: player.name, clubId: player.clubId, minutes: 90, goals: 1, assists: 1, rating: 7.5}];
  const transfer = {id:"historic",playerId:player.id,playerName:player.name,sourceClubId:club.id,sourceClub:club.name,buyerClubId:player.clubId,kind:"sale" as const,askingFeeBrl:1,offerFeeBrl:1,wageSharePercent:0,status:"completed" as const,attempts:0,message:"Concluída",completedOn:"2026-02-01"};
  render(<WorldScreens section="search" database={database} club={club.name} coach="Teste" squad={[]} budget={1000} records={{}} negotiations={[]} allTransfers={[transfer]} competitionSeason={season} historyView="players" onHistoryView={vi.fn()} onOpenPlayer={vi.fn()} onTransferOffer={vi.fn()} onTransferAction={vi.fn()} onBack={vi.fn()} />);
  fireEvent.change(screen.getByLabelText("Buscar jogadores"), {target:{value:player.name}});
  const seller=database.clubs.find(c=>c.id===player.clubId)!;
  const offerButton=screen.getByRole("button", {name:`Fazer proposta por ${player.name} do ${seller.name}`});
  const profileButton=within(offerButton.closest("article")!).getByRole("button", {name:player.name});
  profileButton.focus(); fireEvent.click(profileButton);
  const modal=screen.getByRole("dialog", {name:`Perfil de ${player.name}`});
  expect(within(modal).getByRole("img", {name:`Camisa de ${player.name}`})).toBeTruthy();
  fireEvent.click(within(modal).getByRole("button", {name:"Temporada"}));
  expect(within(modal).getByText(/1 jogos · 1 gols · 1 assistências · 90 minutos/)).toBeTruthy();
  fireEvent.click(within(modal).getByRole("button", {name:"Histórico"}));
  expect(within(modal).getByText(/não contém histórico completo/)).toBeTruthy();
  expect(within(modal).getByText(/2026-02-01/)).toBeTruthy();
  fireEvent.click(within(modal).getByRole("button", {name:"Mercado"}));
  expect(within(modal).getByLabelText("Valor da proposta")).toBeTruthy();
  fireEvent.keyDown(modal, {key:"Escape"});
  expect(screen.queryByRole("dialog")).toBeNull(); expect(document.activeElement).toBe(profileButton);
});

it("diferencia análise do atleta da contraproposta do clube e protege ação pendente", async () => {
  const database = createDefaultDatabase(), club = database.clubs[0], player = database.players.find(p => p.clubId !== club.id && p.marketStatus === "sale")!;
  const deal = {id:"counter",playerId:player.id,playerName:player.name,sourceClubId:player.clubId,sourceClub:"Clube",buyerClubId:club.id,kind:"sale" as const,askingFeeBrl:1000000,offerFeeBrl:800000,counterFeeBrl:1000000,wageSharePercent:0,status:"countered" as const,attempts:0,message:"Contraproposta",assessment:{accepted:true,role:"titular" as const,reason:"Salário e papel compatíveis.",representation:"unknown" as const}};
  let done!: (value: string) => void;
  const action = vi.fn(() => new Promise<string>(resolve => {done = resolve;}));
  render(<WorldScreens section="search" database={database} club={club.name} coach="Teste" squad={[]} budget={1000} records={{}} negotiations={[deal]} historyView="players" onHistoryView={vi.fn()} onOpenPlayer={vi.fn()} onTransferOffer={vi.fn()} onTransferAction={action} onBack={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", {name:/Negociações/})); fireEvent.click(screen.getByRole("button", {name:"Ver proposta"}));
  expect(screen.getByText(/Condições avaliadas como aceitas/)).toBeTruthy();
  expect(screen.getByText(/Não aceitou os termos; enviou contraproposta/)).toBeTruthy();
  const accept=screen.getByRole("button", {name:"Aceitar contraproposta"}) as HTMLButtonElement;
  fireEvent.click(accept); expect(accept.disabled).toBe(true); fireEvent.click(accept); expect(action).toHaveBeenCalledTimes(1);
  done("Acordo salvo."); await screen.findByText("Acordo salvo.");
});

it("apresenta etapa salarial apenas após aceite do clube e mantém confirmação bloqueada", async () => {
 const database=createDefaultDatabase(), club=database.clubs[0], player=database.players.find(p=>p.clubId!==club.id && p.marketStatus==="sale")!;
 const deal={id:"two-stage",playerId:player.id,playerName:player.name,sourceClubId:player.clubId,sourceClub:"Clube",buyerClubId:club.id,kind:"sale" as const,askingFeeBrl:1000000,offerFeeBrl:1000000,agreedFeeBrl:1000000,wageSharePercent:0,status:"agreed" as const,negotiationPhase:"player" as const,attempts:0,message:"Clube aceitou."};
 const action=vi.fn().mockResolvedValue("Jogador recusou.");
 render(<WorldScreens section="search" database={database} club={club.name} coach="Teste" squad={[]} budget={1000} records={{}} negotiations={[deal]} historyView="players" onHistoryView={vi.fn()} onOpenPlayer={vi.fn()} onTransferOffer={vi.fn()} onTransferAction={action} onBack={vi.fn()} />);
 fireEvent.click(screen.getByRole("button", {name:/Negociações/})); fireEvent.click(screen.getByRole("button", {name:"Ver proposta"}));
 expect(screen.getByText(/Etapa 2 · Negociar com o jogador/)).toBeTruthy();
 expect(screen.getByText("Salário atual no jogo")).toBeTruthy();
 expect(screen.getByText("Contrato atual")).toBeTruthy();
 expect(screen.getByText("Salário desejado · referência simulada")).toBeTruthy();
 expect(screen.getByText("1 ano (duração fixa)")).toBeTruthy();
 expect(screen.getByLabelText("Resumo financeiro da proposta").textContent).not.toContain("12 meses");
 expect(screen.queryByRole("button", {name:"Confirmar contratação"})).toBeNull();
 fireEvent.change(screen.getByLabelText("Salário para o jogador"), {target:{value:"12345"}});
 fireEvent.click(screen.getByRole("button", {name:"Enviar proposta ao jogador"}));
 expect(action).toHaveBeenCalledWith("two-stage",{type:"player-offer",monthlyWageBrl:12345});
 expect(await screen.findByText("Jogador recusou.")).toBeTruthy();
});
