import { expect, it } from "vitest";
import { marketFixture } from "./simulation/market-test-fixture";
import { convertCareerMarketValues, convertDatabaseMarketValues, EUR_BRL_RATE, EUR_BRL_VERSION, euroValueInBrl } from "./market-currency";
import { buildSquadFromDatabase } from "./editor-data";

it("converte euros para reais com cotação fixa, sem inventar valor ausente e sem reconverter",()=>{
 const f=marketFixture(), p=f.database.players[0], metadata={id:"external",collectedAt:"2026-01-01",season:"2026",marketValueEur:9000000,estimatedFields:["marketValueBrl","overall"]};
 const source={...f.database,players:[{...p,transfermarkt:metadata}, {...f.database.players[1],transfermarkt:{...metadata,id:"missing",marketValueEur:null}}]};
 const converted=convertDatabaseMarketValues(source);
 expect(euroValueInBrl(9000000)).toBe(53651637); expect(EUR_BRL_RATE).toBe(5.961293);
 expect(converted.players[0].marketValueBrl).toBe(53651637);
 expect(converted.players[0].transfermarkt).toMatchObject({marketValueEur:9000000,marketValueFxVersion:EUR_BRL_VERSION,estimatedFields:["overall"]});
 expect(converted.players[1]).toEqual(source.players[1]); expect(convertDatabaseMarketValues(converted)).toBe(converted);
 const edited={...converted,players:[{...converted.players[0],marketValueBrl:123},converted.players[1]]};
 expect(convertDatabaseMarketValues(edited).players[0].marketValueBrl).toBe(123);
 expect(euroValueInBrl(null)).toBeNull(); expect(euroValueInBrl(-1)).toBeNull(); expect(euroValueInBrl(0)).toBe(0);
});

it("migra carreira uma única vez preservando contratos, resultados, propostas e jogadores sem fonte",()=>{
 const f=marketFixture(), p=f.database.players.find(x=>x.clubId===f.human.id)!, other=f.database.players.find(x=>x.clubId===f.human.id && x.id!==p.id)!;
 const source={...f.database,players:f.database.players.map(x=>x.id===p.id ? {...x,transfermarkt:{id:"321",collectedAt:"2026-01-01",season:"2026",marketValueEur:25000}} : x)};
 const save={...f.save,progress:{...f.save.progress!,universeSnapshot:source}};
 const previous=structuredClone(save), result=convertCareerMarketValues(save,source), expected=euroValueInBrl(25000)!;
 expect(result.progress!.universeSnapshot!.players.find(x=>x.id===p.id)?.marketValueBrl).toBe(expected);
 expect(result.progress!.careerSquad!.find(x=>x.sourceId===p.id)?.marketValue).toBe(expected/1e6);
 expect(result.progress!.careerSquad!.find(x=>x.sourceId===other.id)).toEqual(save.progress.careerSquad!.find(x=>x.sourceId===other.id));
 expect(result.progress!.managerMarket).toEqual(save.progress.managerMarket); expect(result.progress!.competitionSeason).toEqual(save.progress.competitionSeason);
 expect(save).toEqual(previous); expect(convertCareerMarketValues(result,source)).toBe(result);
 expect(buildSquadFromDatabase(result.progress!.universeSnapshot!,f.human.name,true)!.find(x=>x.sourceId===p.id)!.marketValue).toBe(expected/1e6);
});
