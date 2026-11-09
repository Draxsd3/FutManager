/** Lossless string-token dictionary before deflate. Long financial/person IDs repeat
 * across distant JSON sections beyond zlib's 32 KiB window. No domain data is dropped. */
export const CHECKPOINT_CHARACTER_LIMIT=64_000_000;
/** Encoder and decoder share the same budget. Reject before replacing a readable save. */
export function assertCheckpointSize(size:number):void {
  if(!Number.isSafeInteger(size) || size<2 || size>CHECKPOINT_CHARACTER_LIMIT)throw new Error("Checkpoint excede o limite seguro de armazenamento.");
}
const tokenPattern=/"(?:[^"\\]|\\.)*"/g;
export function packCheckpoint(value:unknown) {
  const original=JSON.stringify(value);
  assertCheckpointSize(original.length);
  const dictionary:string[]=[],indexes=new Map<string,number>();
  const document=original.replace(tokenPattern,token=>{
    if(token.length<=20 && !token.startsWith('"#')) return token;
    let index=indexes.get(token);if(index===undefined){index=dictionary.length;indexes.set(token,index);dictionary.push(token);}
    return `"#${index}"`;
  });
  return JSON.stringify({dictionary,document,characters:original.length});
}
export function unpackCheckpoint(text:string):unknown {
  const {dictionary,document,characters}=JSON.parse(text);
  if(!Array.isArray(dictionary) || typeof document!=="string" || !Number.isSafeInteger(characters) || characters<2 || characters>64_000_000) throw new Error("Dicionário de checkpoint inválido.");
  let length=document.length;
  const restored=document.replace(tokenPattern,(token:string)=>{
    if(!token.startsWith('"#')) return token;
    if(!/^"#\d+"$/.test(token)) throw new Error("Referência inválida.");
    const original=dictionary[Number(token.slice(2,-1))];
    if(typeof original!=="string" || !/^"(?:[^"\\]|\\.)*"$/.test(original)) throw new Error("Referência inválida.");
    length+=original.length-token.length;if(length>64_000_000) throw new Error("Checkpoint excede o limite.");return original;
  });
  if(restored.length!==characters) throw new Error("Checkpoint incompleto.");return JSON.parse(restored);
}

/** 15 safe bits per UTF-16 storage unit, avoiding controls, quotes and surrogates.
 * localStorage quotas count code units, not UTF-8 wire bytes. This is local only. */
export function binaryText(bytes:Uint8Array):string {
  const output:string[]=[];let buffer=0,bits=0;
  for(const byte of bytes){buffer=(buffer<<8)|byte;bits+=8;if(bits>=15){bits-=15;output.push(String.fromCharCode(256+((buffer>>>bits)&32767)));}}
  if(bits) output.push(String.fromCharCode(256+((buffer<<(15-bits))&32767)));
  return output.join("");
}
export function textBinary(text:string,size:number):Uint8Array {
  if(!Number.isSafeInteger(size) || size<0 || size>64_000_000 || text.length!==Math.ceil(size*8/15)) throw new Error("Binário de checkpoint inválido.");
  const output=new Uint8Array(size);let buffer=0,bits=0,index=0;
  for(const char of text){const word=char.charCodeAt(0)-256;if(word<0 || word>32767) throw new Error("Caractere de checkpoint inválido.");buffer=(buffer<<15)|word;bits+=15;while(bits>=8 && index<size){bits-=8;output[index++]=(buffer>>>bits)&255;}}
  if(index!==size || (buffer&((1<<bits)-1))!==0) throw new Error("Binário incompleto.");return output;
}
