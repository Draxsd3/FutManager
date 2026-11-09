import {expect,it} from "vitest";
import {marketFixture} from "./market-test-fixture";
import {accrueFinance,availableCents,availableCentsByClub} from "./finance";
it("bulk planning forecast equals the individual executor including debt/reservations/loans",()=>{
 const {input}=marketFixture(true);
 for(const date of ["2026-01-11","2026-04-01","2028-12-31","2029-01-01"]){
  const finance=accrueFinance(input.managers.finance!,date);
  const clubs=Object.keys(finance.clubs),player=Object.keys(finance.contracts)[0];
  finance.reservations.probe={clubId:clubs[0],cents:100000};
  finance.loans[player]={owner:{clubId:clubs[0],name:"Owner"},borrower:{clubId:clubs[1],name:"Borrower"},startsOn:date,endsOn:"2029-12-31",status:"active",source:"game",wageSharePercent:30};
  const before=structuredClone(finance),bulk=availableCentsByClub(finance);
  for(const id of clubs)expect(bulk[id]).toBe(availableCents(finance,id));
  expect(finance).toEqual(before);
 }
});
