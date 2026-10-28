// @vitest-environment node
import {beforeEach,expect,it,vi} from 'vitest';
import {EventEmitter} from 'node:events';
import {Readable} from 'node:stream';
import {gzipSync} from 'node:zlib';
const mocks=vi.hoisted(()=>({lookup:vi.fn(),request:vi.fn()}));vi.mock('node:dns/promises',()=>({lookup:mocks.lookup}));vi.mock('node:https',()=>({request:mocks.request}));
import {httpsTransport,readBounded} from '../../server/registration-proxy/transport.ts';
import {LOGIN} from '../../server/registration-proxy/policy.ts';
beforeEach(()=>{vi.clearAllMocks();mocks.lookup.mockResolvedValue([{address:'8.8.8.8',family:4}]);});
it('pins a verified public IP, retains the official TLS identity, and bounds decompressed bodies',async()=>{
  mocks.request.mockImplementation((_options,callback)=>{const client=Object.assign(new EventEmitter(),{write:vi.fn(),end:()=>{const stream=Object.assign(Readable.from([gzipSync('synthetic compressed response')]),{statusCode:200,rawHeaders:['content-type','text/html','content-encoding','gzip']});callback(stream);}});return client;});
  const result=await httpsTransport({url:new URL(LOGIN),method:'GET',headers:{}},new AbortController().signal);expect(mocks.request.mock.calls[0][0]).toMatchObject({hostname:'8.8.8.8',servername:'unitreg.utar.edu.my',rejectUnauthorized:true,port:443});expect(new TextDecoder().decode(await readBounded(result.body,100,new AbortController().signal))).toBe('synthetic compressed response');
  const oversized=new Response('x'.repeat(101));await expect(readBounded(oversized.body,100,new AbortController().signal)).rejects.toThrow();
});
it('never opens a socket for private/mixed DNS results or a forbidden origin',async()=>{
  mocks.lookup.mockResolvedValue([{address:'8.8.8.8',family:4},{address:'127.0.0.1',family:4}]);await expect(httpsTransport({url:new URL(LOGIN),method:'GET',headers:{}},new AbortController().signal)).rejects.toThrow();expect(mocks.request).not.toHaveBeenCalled();
  await expect(httpsTransport({url:new URL('https://evil.example/'),method:'GET',headers:{}},new AbortController().signal)).rejects.toThrow();expect(mocks.request).not.toHaveBeenCalled();
});
it('cancels an unfinished body on timeout and leaves no locked reader',async()=>{
  const cancel=vi.fn(),controller=new AbortController(),body=new ReadableStream<Uint8Array>({cancel});const pending=readBounded(body,100,controller.signal);controller.abort();await expect(pending).rejects.toThrow();expect(cancel).toHaveBeenCalledOnce();expect(body.locked).toBe(false);
});
