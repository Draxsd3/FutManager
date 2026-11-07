import type { Player } from "../mock-data";

/** Reconcile ownership without recycling career IDs or replacing in-game condition/statistics. */
export function reconcileContractSquad(current: Player[], owned: Player[], knownSources: Set<string>, reservedIds: number[] = []) {
  const bySource=new Map(owned.map(p=>[p.sourceId,p]));
  const result=current.filter(p=>!p.sourceId || !knownSources.has(p.sourceId) || bySource.has(p.sourceId)).map(p=>{
    const source=bySource.get(p.sourceId);
    return source ? {...p,loan:source.loan,loanExpiresOn:source.loanExpiresOn,acquisitionType:source.acquisitionType,contractUntil:source.contractUntil,salary:source.salary,registrationStatus:source.registrationStatus === "pending" ? "pending" as const : p.registrationStatus === "pending" ? "registered" as const : p.registrationStatus} : p;
  });
  let id=Math.max(0,...current.map(p=>p.id),...reservedIds)+1;
  for(const p of owned) if(!result.some(existing=>existing.sourceId===p.sourceId)) result.push({...p,id:id++});
  return result;
}
