import { expect,it,vi } from "vitest";
import { handleMarketAi,generateGeminiChoice,type AiAccount,type AiServices,type Claim } from "./market-ai";
import { marketFixture } from "../game/simulation/market-test-fixture";
import { simulateWorldMarket } from "../game/world-market";
const fixture=marketFixture();
const context=simulateWorldMarket(fixture.input).world.marketState!.pilotContext!;
const reply={decisionId:context.decisionId,stateRevision:context.stateRevision,actionId:"wait",reason:"Preservar recursos."};
function request(body: unknown={careerId:fixture.save.id,context},authorized=true) {return new Request("https://game.example/api/market/decision",{method:"POST",headers:{"Content-Type":"application/json",...(authorized ? {Authorization:"Bearer test-session"} : {})},body:JSON.stringify(body)});}
function services() {
 const cache=new Map<string,{hash: string;result?: Claim["result"]}>();
 const account: AiAccount={
  claim:vi.fn(async(_career: string,id: string,hash: string): Promise<Claim>=>{const old=cache.get(id);if(old) return {status:old.hash!==hash ? "conflict" : old.result ? "cached" : "busy",result:old.result};cache.set(id,{hash});return {status:"claimed"};}),
  finish:vi.fn(async(_career,id,hash,result)=>{cache.set(id,{hash,result});}),
 };
 const service: AiServices={enabled:true,authenticate:vi.fn(async()=>account),generate:vi.fn(async()=>reply)};
 return {account,service};
}
it("requires authentication, opt-in configuration and ownership before any provider call",async()=>{
 const {service,account}=services();
 expect((await handleMarketAi(request(undefined,false),service)).status).toBe(401);
 expect((await handleMarketAi(request(),{...service,enabled:false})).status).toBe(503);
 expect(service.authenticate).not.toHaveBeenCalled();
 expect((await handleMarketAi(request(),{...service,authenticate:async()=>null})).status).toBe(401);
 vi.mocked(account.claim).mockResolvedValue({status:"forbidden"});
 expect((await handleMarketAi(request(),service)).status).toBe(403);
 expect(service.generate).not.toHaveBeenCalled();
});
it("bounds input bytes/strict schema and never accepts account, URLs, tools or arbitrary commands",async()=>{
 const {service}=services();
 for(const body of [{careerId:fixture.save.id,context,userId:"other"},{careerId:fixture.save.id,context:{...context,url:"https://evil.example"}},{careerId:fixture.save.id,context:{...context,options:[]}}]) expect((await handleMarketAi(request(body),service)).status).toBe(400);
 const big=new Request("https://game.example/api/market/decision",{method:"POST",headers:{Authorization:"Bearer test-session"},body:"x".repeat(18001)});
 expect((await handleMarketAi(big,service)).status).toBe(413);
 expect(service.authenticate).not.toHaveBeenCalled();
});
it("persists one response per identity/hash; retry is cached and changed context conflicts",async()=>{
 const {service}=services();
 expect(await (await handleMarketAi(request(),service)).json()).toEqual(reply);
 expect(await (await handleMarketAi(request(),service)).json()).toEqual(reply);
 expect(service.generate).toHaveBeenCalledTimes(1);
 expect((await handleMarketAi(request({careerId:fixture.save.id,context:{...context,spendingLimitCents:context.spendingLimitCents+1}}),service)).status).toBe(409);
});
it("atomic busy/quota statuses never produce a second provider attempt",async()=>{
 const {service,account}=services();
 for(const [status,code] of [["busy",409],["quota",429]] as const) {
  vi.mocked(account.claim).mockResolvedValue({status}); expect((await handleMarketAi(request(),service)).status).toBe(code);
 }
 expect(service.generate).not.toHaveBeenCalled();
});
it("invalid/malicious output fails closed, caches failure and redacts provider diagnostics",async()=>{
 const {service,account}=services();
 vi.mocked(service.generate).mockResolvedValue({...reply,actionId:"pay-a-million",command:"mutate-save"});
 const response=await handleMarketAi(request(),service);
 expect(response.status).toBe(503); expect(account.finish).toHaveBeenCalledWith(fixture.save.id,context.decisionId,expect.any(String),{error:"provider-failed"});
 expect((await handleMarketAi(request(),service)).status).toBe(503); expect(service.generate).toHaveBeenCalledTimes(1);
 const other=services();vi.mocked(other.service.generate).mockRejectedValue(new Error("private credential/provider details"));
 expect(await (await handleMarketAi(request(),other.service)).text()).not.toContain("private");
});
it("Gemini adapter uses a fixed endpoint, header secret, allowlisted action enum and bounded JSON output",async()=>{
 const fetcher=vi.fn(async()=>Response.json({candidates:[{finishReason:"STOP",content:{parts:[{text:JSON.stringify(reply)}]}}]}));
 const controller=new AbortController();
 expect(await generateGeminiChoice(context,controller.signal,{key:"unit-test-only",model:"explicit-test-model"},fetcher)).toEqual(reply);
 const [url,init]=fetcher.mock.calls[0] as unknown as [string,RequestInit];
 expect(url).toBe("https://generativelanguage.googleapis.com/v1beta/models/explicit-test-model:generateContent");
 expect(url).not.toContain("unit-test-only"); expect(init.signal).toBe(controller.signal);
 expect(JSON.parse(String(init.body)).generationConfig.responseJsonSchema.properties.actionId.enum).toEqual(context.options.map(o=>o.actionId));
 await expect(generateGeminiChoice(context,controller.signal,{key:"unit-test-only",model:"../invalid"},fetcher)).rejects.toThrow();
 for(const response of [new Response("diagnostics",{status:429}),Response.json({candidates:[{finishReason:"MAX_TOKENS"}]}),new Response("x".repeat(16385))]) await expect(generateGeminiChoice(context,controller.signal,{key:"unit-test-only",model:"explicit-test-model"},async()=>response)).rejects.toThrow();
});
