import { expect,it } from "vitest";
import { packCheckpoint,unpackCheckpoint,binaryText,textBinary } from "./checkpoint-dictionary";
it("round trips long keys, escape collisions, unicode, strings, arrays and primitives without loss",()=>{
  const value={"#0":"#123",key:"Nome com acentuação, \\ e \" aspas",array:[null,true,42,"00000000-long-shared-person-id-123456","00000000-long-shared-person-id-123456"],"00000000-long-shared-person-id-123456":{nested:"#word"}};
  expect(unpackCheckpoint(packCheckpoint(value))).toEqual(value);
  expect(()=>unpackCheckpoint('{"dictionary":[],"document":"\\\"#1\\\"","characters":4}')).toThrow();
});
it("encodes arbitrary binary in safe UTF-16 units with validated padding/length",()=>{
  for(const size of [0,1,2,3,4,7,15,31,257,2048]){const bytes=Uint8Array.from({length:size},(_,i)=>(i*31+size)%256),encoded=binaryText(bytes);expect(textBinary(encoded,size)).toEqual(bytes);expect(encoded.length).toBe(Math.ceil(size*8/15));expect([...encoded].every(c=>c.charCodeAt(0)>=256 && c.charCodeAt(0)<=33023)).toBe(true);}
  expect(()=>textBinary("bad",1)).toThrow();expect(()=>textBinary("",-1)).toThrow();
});
