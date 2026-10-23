const prefix='data:image/png;base64,';
export function decodePng(data:unknown):Uint8Array{
  if(typeof data!=='string'||!data.startsWith(prefix)||data.length>14_000_000)throw new Error('Choose a PNG image no larger than 10 MiB.');
  const encoded=data.slice(prefix.length);
  if(!/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)||encoded.length%4)throw new Error('Invalid PNG encoding.');
  const text=atob(encoded);if(text.length>10*1024*1024)throw new Error('PNG is too large.');
  const bytes=Uint8Array.from(text,c=>c.charCodeAt(0));
  if(bytes.length<45||[137,80,78,71,13,10,26,10,0,0,0,13,73,72,68,82].some((b,i)=>bytes[i]!==b))throw new Error('Invalid PNG image.');
  const header=new DataView(bytes.buffer);const width=header.getUint32(16),height=header.getUint32(20);
  if(!width||!height||width>16384||height>16384||width*height>24_000_000)throw new Error('PNG dimensions are too large.');
  return bytes;
}
