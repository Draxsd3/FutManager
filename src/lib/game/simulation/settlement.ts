import { assessMove } from "./market-rules";
import { playerEligible } from "./players";
import { isUnemployed } from "./coaches";
import { reconcileContractSquad } from "./contract-squad";
import { buildSquadFromDatabase, type CareerSave, type EditorDatabase } from "../editor-data";
import { applyNegotiation, createPlayerCareer, type MarketAction } from "../career";
import { initializeCareerMarket } from "../manager-jobs";
import { proposeLoanExtension, recoverCareerLoans } from "../loans";
import { worldDatabase } from "../world-market";
import { respondToTransferNegotiation, type TransferNegotiation, type TransferNegotiationAction } from "../transfers";
import { civilDate, engineState } from "./foundation";
import { adoptFinance, availableCents, accrueFinance, brlToCents, projectFinance, reserveDeal, renewEmployment, settleTransfer, type FinanceState } from "./finance";

export const localEmploymentKey = (careerId: string,clubId: string,id: number) => `local:${careerId}:${clubId}:${id}`;

export function migrateFinanceSave(save: CareerSave, database: EditorDatabase): CareerSave {
  const p=save.progress;
  if (!p?.competitionSeason) return save;
  const market=p.managerMarket ?? initializeCareerMarket(database,p.competitionSeason,save.managerName,save.budget);
  const loans=recoverCareerLoans(p.careerSquad ?? [],p.transferNegotiations ?? [],database,p.loanContracts);
  const db=worldDatabase(database,p.transferNegotiations ?? [],loans,p.worldMarket,market.finance);
  let managers=adoptFinance(market,db,save.inGameDate,loans,isUnemployed(market) ? undefined : {clubId:save.clubId,budget:save.budget});
  const localPlayers=(p.careerSquad ?? []).filter(player=>!player.sourceId && !managers.finance!.contracts[localEmploymentKey(save.id,save.clubId,player.id)]);
  if(localPlayers.length) {
    const finance=structuredClone(managers.finance!);
    for(const player of localPlayers) {
      const key=localEmploymentKey(save.id,save.clubId,player.id), record=p.playerCareers[player.id], end=record?.contractUntil ?? player.contractUntil;
      let endsOn: string | null=null;
      try { if(end >= save.inGameDate) endsOn=civilDate(end); } catch { /* Unknown legacy expiry does not free the player. */ }
      const salary=record?.salary ?? player.salary;
      finance.contracts[key]={id:`employment:${key}`,playerId:key,clubId:save.clubId,startsOn:save.inGameDate,endsOn,monthlyCents:Number.isFinite(salary) && salary >= 0 ? brlToCents(salary*1000) : null,accruedThrough:save.inGameDate,origin:"legacy",status:"active"};
      finance.registrations[key]={clubId:save.clubId,status:"registered",reason:"Identidade local preservada da carreira; sem cadastro externo inventado."};
    }
    managers=projectFinance({...managers,finance});
  }
  // Adopt known saved human renewals without replacing exact source salary with display rounding.
  if (!market.finance) for (const player of p.careerSquad ?? []) {
    const c=player.sourceId && managers.finance?.contracts[player.sourceId], record=p.playerCareers[player.id];
    if(c && record) {
      if(Number.isFinite(record.salary) && record.salary >= 0 && record.salary !== Math.round((c.monthlyCents ?? 0)/100000)) c.monthlyCents=brlToCents(record.salary*1000);
      if (/^\d{4}-\d{2}-\d{2}$/.test(record.contractUntil) && record.contractUntil >= save.inGameDate) c.endsOn=record.contractUntil;
    }
  }
  return {...save,progress:{...p,managerMarket:market.finance ? managers : projectFinance(managers)}};
}
function context(save: CareerSave, database: EditorDatabase) {
  const migrated=migrateFinanceSave(save,database), p=migrated.progress;
  if(isUnemployed(p?.managerMarket)) throw new Error("Você está sem clube e não pode negociar atletas.");
  if (p?.page === "matchOverview") throw new Error("Conclua a partida antes de alterar contratos e transferências.");
  if(!p?.managerMarket?.finance) throw new Error("Finanças da carreira indisponíveis.");
  return {save:migrated,p,market:p.managerMarket,finance:p.managerMarket.finance,db:worldDatabase(database,p.transferNegotiations ?? [],p.loanContracts ?? {},p.worldMarket,p.managerMarket.finance)};
}
function checkpoint(save: CareerSave, database: EditorDatabase, finance: FinanceState, deals: TransferNegotiation[], operationId: string): CareerSave {
  const p=save.progress!, engine=engineState(p.engine,save.id,save.inGameDate);
  if(engine.operations.some(op=>op.id===operationId)) return save;
  const closed=new Set(deals.filter(d=>d.status==="completed").map(d=>d.playerId));
  finance=structuredClone(finance);
  deals=deals.map(d=>{
    if(closed.has(d.playerId) && (d.status==="countered" || d.status==="agreed")) {
      delete finance.reservations[d.id];
      return {...d,status:"rejected" as const,revision:(d.revision ?? 0)+1,message:"Outro acordo foi liquidado; vínculo indisponível."};
    }
    return d;
  });
  const managerMarket=projectFinance({...p.managerMarket!,finance});
  const world=p.worldMarket ? {...p.worldMarket,listings:{...p.worldMarket.listings}} : undefined;
  for(const deal of deals) if(deal.status === "completed" && world) delete world.listings[deal.playerId];
  const effective=worldDatabase(database,deals,finance.loans,world,finance);
  const all=buildSquadFromDatabase(effective,save.clubName,true) ?? [];
  const squad=reconcileContractSquad(p.careerSquad ?? [],all,new Set(effective.players.map(p=>p.id)),Object.keys(p.playerCareers).map(Number));
  const records={...p.playerCareers};
  for(const player of squad) if(!records[player.id]) records[player.id]=createPlayerCareer(player,save.clubName,Number(save.inGameDate.slice(0,4)));
  const eligible=new Set(squad.filter(player=>playerEligible(player)).map(p=>p.id));
  const positions=Object.fromEntries(Object.entries(p.manualPositions).filter(([id])=>eligible.has(Number(id))));
  const budget=managerMarket.clubs[save.clubId].budget;
  engine.revision++;
  engine.operations.push({id:operationId,from:save.inGameDate,to:save.inGameDate,revision:engine.revision});
  engine.events.push({id:`${operationId}:committed`,operationId,date:save.inGameDate,type:"finance-committed",entityIds:[save.clubId],revision:engine.revision});
  return {...save,budget,playerCareers:records,manualPositions:positions,progress:{...p,engine,budget,managerMarket,worldMarket:world,transferNegotiations:deals,loanContracts:finance.loans,careerSquad:squad,playerCareers:records,starters:p.starters.filter(id=>eligible.has(id)),matchBenchIds:p.matchBenchIds?.filter(id=>eligible.has(id)),manualPositions:positions}};
}
export function settleCareerTransfer(save: CareerSave, database: EditorDatabase, id: string): CareerSave {
  const {save:current,p,finance,db}=context(save,database), deal=p.transferNegotiations?.find(d=>d.id===id);
  if(!deal || deal.buyerClubId!==save.clubId) throw new Error("Negociação indisponível para este clube.");
  if(deal.status === "completed" && finance.settlements[id]) return save;
  const result=settleTransfer(finance,db,deal,save.inGameDate);
  return checkpoint(current,database,result.finance,p.transferNegotiations!.map(d=>d.id===id ? result.deal : d),`settle:${id}`);
}
export function updateCareerNegotiation(save: CareerSave, database: EditorDatabase, deal: TransferNegotiation, action?: TransferNegotiationAction): CareerSave {
  const {save:current,p,finance,db}=context(save,database);
  if (deal.buyerClubId!==save.clubId) throw new Error("Negociação de outro clube.");
  const existing=p.transferNegotiations?.find(d=>d.id===deal.id);
  if(existing && JSON.stringify(existing)!==JSON.stringify(deal)) throw new Error("A versão da proposta mudou. Reabra a negociação.");
  if(deal.expiresOn && deal.expiresOn<save.inGameDate && action?.type!=="reject") throw new Error("A proposta expirou.");
  let response: TransferNegotiation;
  if (action?.type === "player-offer") {
    if (deal.negotiationPhase !== "player" || deal.status !== "agreed") throw new Error("Negocie primeiro com o clube.");
    const player = db.players.find(p => p.id === deal.playerId);
    if (!player || player.clubId !== deal.sourceClubId || player.loan?.status === "active") throw new Error("O vínculo do atleta mudou; reavalie a negociação.");
    if (!Number.isFinite(action.monthlyWageBrl) || action.monthlyWageBrl <= 0) throw new Error("Informe um salário válido.");
    const assessment = assessMove(player, db.players.filter(p => p.clubId === deal.buyerClubId), deal.kind, action.monthlyWageBrl);
    response = {...deal, assessment, agreedMonthlyWageBrl: assessment.accepted ? action.monthlyWageBrl : undefined, negotiationPhase: assessment.accepted ? "ready" : "player", message: assessment.accepted ? `Jogador aceitou: ${assessment.reason} Revise e confirme a contratação.` : `Jogador recusou: ${assessment.reason} Ajuste o salário e tente novamente.`};
  } else response=action ? respondToTransferNegotiation(deal,action).negotiation : deal;
  if(response===deal && action) return current;
  const next={...response,revision:(existing?.revision ?? 0)+1,createdOn:deal.createdOn ?? save.inGameDate,origin:deal.origin ?? "human" as const,expiresOn:deal.expiresOn ?? new Date(Date.parse(`${save.inGameDate}T12:00:00Z`)+14*86400000).toISOString().slice(0,10)};
  const reserved=reserveDeal(finance,next,db);
  const deals=[next,...(p.transferNegotiations ?? []).filter(d=>d.id!==deal.id)];
  return checkpoint(current,database,reserved,deals,`negotiate:${deal.id}:${next.revision}:${next.status}:${next.attempts}`);
}
export function applyCareerPlayerAction(save: CareerSave, database: EditorDatabase, id: number, action: MarketAction): {save: CareerSave; message: string} {
  const {save:current,p,finance,db}=context(save,database), player=p.careerSquad?.find(p=>p.id===id);
  if(!player || player.loan?.status === "active") throw new Error("Atleta indisponível para negociação definitiva.");
  const record=p.playerCareers[id] ?? createPlayerCareer(player,save.clubName);
  const result=applyNegotiation(record,action,save.inGameDate,save.clubName);
  if(result.record===record) return {save,message:result.message};
  let state=finance, deals=p.transferNegotiations ?? [];
  if(result.transfer) {
    const buyer=db.clubs.find(c=>c.name===result.transfer!.club);
    if(!buyer || !player.sourceId) throw new Error("Clube comprador ou identidade de origem indisponível.");
    const deal: TransferNegotiation={id:(p.transferNegotiations?.find(d=>d.id===result.transfer!.id && d.sourceClubId===save.clubId)?.id ?? `outgoing:${save.id}:${player.sourceId}:${result.transfer.id}`),playerId:player.sourceId,playerName:player.name,sourceClubId:save.clubId,sourceClub:save.clubName,buyerClubId:buyer.id,kind:"sale",askingFeeBrl:result.transfer.fee*1e6,offerFeeBrl:result.transfer.fee*1e6,agreedFeeBrl:result.transfer.fee*1e6,agreedMonthlyWageBrl:result.transfer.monthlyWageBrl,agreedWageSharePercent:100,wageSharePercent:100,status:"agreed",attempts:0,createdOn:save.inGameDate,origin:"human",revision:1,message:"Oferta recebida aceita pelo clube vendedor."};
    const settled=settleTransfer(state,db,deal,save.inGameDate); state=settled.finance; deals=[settled.deal,...deals.filter(d=>d.id!==deal.id)];
  } else if(action.type === "contract") {
    state=renewEmployment(state,player.sourceId ?? localEmploymentKey(save.id,save.clubId,player.id),save.clubId,save.inGameDate,result.record.contractUntil,result.record.salary*1000);
  }
  const records={...p.playerCareers,[id]:result.record};
  const next={...current,playerCareers:records,progress:{...p,playerCareers:records}};
  if(["list","loan","unlist"].includes(action.type) && player.sourceId) {
    next.progress.worldMarket={...p.worldMarket,listings:{...p.worldMarket?.listings,[player.sourceId]:result.record.marketStatus === "normal" ? "normal" : result.record.marketStatus === "loan" ? "loan" : "sale"},events:p.worldMarket?.events ?? []};
  }
  const operation=`player:${id}:${JSON.stringify(action)}:${save.inGameDate}:${p.engine?.revision ?? 0}`;
  return {save:checkpoint(next,database,state,deals,operation),message:result.message};
}
export function extendCareerLoan(save: CareerSave, database: EditorDatabase, id: string, months: number, fee: number, share: number): {save: CareerSave; message: string} {
  const {save:current,p,finance}=context(save,database), loan=finance.loans[id], c=finance.contracts[id];
  if(!loan || !c || c.monthlyCents===null) throw new Error("Empréstimo ou salário indisponível.");
  // Legacy helper only evaluates consent here; its old cash projection is deliberately discarded.
  const result=proposeLoanExtension(loan,save.inGameDate,Number.MAX_SAFE_INTEGER,c.monthlyCents/100,save.clubId,months,fee,share);
  if(result.loan===loan) return {save,message:result.message};
  if(result.loan.renewal?.status !== "accepted") return {save,message:result.message};
  if(!c.endsOn || !result.loan.endsOn || c.endsOn < result.loan.endsOn) throw new Error("Contrato do proprietário não cobre a prorrogação.");
  const s=accrueFinance(finance,save.inGameDate), owner=loan.owner.clubId!, buyer=loan.borrower.clubId!, cents=brlToCents(fee);
  if(!s.clubs[owner] || !s.clubs[buyer]) throw new Error("Clubes do empréstimo indisponíveis.");
  // Preserve the existing split until its scheduled end; changing it retroactively is unsupported.
  if((loan.wageSharePercent ?? 50)!==share) throw new Error("A prorrogação mantém a participação salarial vigente.");
  s.loans[id]=result.loan;
  if(availableCents(s,buyer) < cents) throw new Error("Saldo disponível insuficiente para prorrogar o empréstimo.");
  const operation=`extend:${id}:${loan.endsOn}:${months}:${fee}:${share}`;
  s.clubs[buyer].cashCents-=cents; s.clubs[owner].cashCents+=cents;
  for(const [clubId,delta] of [[buyer,-cents],[owner,cents]] as const) s.ledger.push({id:`${operation}:${clubId}`,date:save.inGameDate,clubId,kind:"transfer",amountCents:cents,cashDeltaCents:delta,reference:operation});
  return {save:checkpoint(current,database,s,p.transferNegotiations ?? [],operation),message:result.message};
}
