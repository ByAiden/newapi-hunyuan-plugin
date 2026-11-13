import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as p from '../plugin.js';

globalThis.utils = { fetch() { throw new Error('offline'); } };
const B = p.meta.baseUrl;
const V = 'hy-video-v1.5';
const G = 'hy-3d-3.0';
const X = 'hy-3d-express';
const json = value => ({body:{kind:'json',value}});
const ctx = (model=V, body={prompt:'A boat'}, extra={}) => ({model,upstreamModel:model,requestBody:body,action:'text_to_video',baseUrl:B,apiKey:'test-key',authHeader:'Bearer test-key',files:[],config:{},publicTaskId:'public-1',...extra});
const doneVideo = {task_id:'vendor-1',status:'succeeded',videos:[{url:'https://example.com/video.mp4'}],tokenhub_usage:{total_tokens:150000}};
const done3D = {status:'completed',data:[{type:'glb',url:'https://example.com/a.glb',preview_image_url:'https://example.com/a.png'}]};
const freeze = x => { if (x && typeof x === 'object') {Object.values(x).forEach(freeze);Object.freeze(x);} return x; };
const fixture = JSON.parse(readFileSync(new URL('./golden.json',import.meta.url)));
for (const c of fixture.cases) test('golden: '+c.name, () => {
  if(c.expectedError) assert.throws(()=>p[c.hook](...structuredClone(c.args)),e=>e.message.includes(c.expectedError));
  else assert.deepEqual(JSON.parse(JSON.stringify(p[c.hook](...structuredClone(c.args)))),c.expected);
});

test('manifest is a plain JSON literal and community release',()=>{
  const src=readFileSync(new URL('../plugin.js',import.meta.url),'utf8');
  const match=src.match(/export const meta = (\{[\s\S]*?\n\});/);
  assert.deepEqual(JSON.parse(match[1]),p.meta);
  assert.equal(p.meta.version,'1.0.1');
  assert.match(p.meta.key,/^[a-z0-9_]{1,30}$/);
  assert.ok(p.meta.key.endsWith('_hunyuan'));
  assert.equal(p.meta.channelTypes,undefined);
  assert.equal(p.meta.author.url,'https://github.com/'+p.meta.author.name);
  assert.ok(!src.includes('TERM'+'_') && !src.includes('{'.repeat(2)));
  assert.deepEqual(p.meta.protocols,[{name:'openai_video',models:[V]}]);
});
test('usage profiles cover every model with complete examples',()=>{
  const covered=new Set();
  for(const profile of p.meta.usageProfiles){
    profile.models.forEach(m=>covered.add(m));
    for(const ex of profile.examples) assert.deepEqual(Object.keys(ex.facts).sort(),Object.keys(profile.schema).sort());
  }
  for(const ex of p.meta.usageExamples) assert.deepEqual(Object.keys(ex.facts).sort(),Object.keys(p.meta.usageSchema).sort());
  assert.deepEqual(p.meta.models.filter(m=>!covered.has(m)),[V]);
});
test('video defaults are explicit and mapped models use upstream name',()=>{
  const r=p.buildSubmitRequest(ctx('alias',{prompt:'Boat'},{upstreamModel:V}));
  assert.equal(r.body.model,V); assert.equal(r.body.duration,5); assert.equal(r.body.resolution,'720p');
  assert.equal(new URL(r.url).host,new URL(B).host);
});
test('protocol maps seconds size and input_reference',()=>{
  const i=p.protocols.openai_video.decodeRequest({...json({prompt:'Boat',seconds:'5',size:'720x1280'}),model:V});
  assert.equal(p.buildSubmitRequest(ctx(V,i.requestBody)).body.aspect_ratio,'9:16');
  const j=p.protocols.openai_video.decodeRequest({...json({input_reference:'https://example.com/a.png'}),model:V});
  assert.equal(j.action,'image_to_video');
  assert.equal(p.buildSubmitRequest(ctx(V,j.requestBody)).body.image_url,'https://example.com/a.png');
});
test('multipart upload uses the host supplied file ref',()=>{
  const i=p.protocols.openai_video.decodeRequest({model:V,body:{kind:'multipart',fields:{seconds:['5'],revise:['false']},files:[{field:'input_reference',ref:'opaque-ref',mimeType:'image/png',size:10}]}});
  assert.deepEqual(i.requestBody.image,{__fileRef:'opaque-ref',encoding:'dataUrl',mimeType:'image/png',maxBytes:10485760});
  assert.equal(p.buildSubmitRequest(ctx(V,i.requestBody)).body.revise,false);
});
test('video validation rejects wrong fields and modalities',()=>{
  for(const body of [{prompt:'x',file_id:'x'},{prompt:'x',resolution:'1080p'},{prompt:'x',n:2},{prompt:'x',revise:'false'},{prompt:'x',seed:1.5},{prompt:'x',footnote:'x'.repeat(17)},{image_url:'file:///x'},{image:'bad'},{prompt:4},{prompt:'x',image:'data:image/png;base64,a',image_url:'https://example.com/a.png'}]) assert.throws(()=>p.buildSubmitRequest(ctx(V,body)));
  assert.throws(()=>p.buildSubmitRequest(ctx('hy-video-1.5')),/unsupported model/);
});
test('protocol rejects duplicate fields files and conflicting options',()=>{
  for(const body of [{seconds:5,duration:5,prompt:'x'},{size:'1920x1080',prompt:'x'},{size:'720x1280',aspect_ratio:'16:9',prompt:'x'},{input_reference:'https://example.com/a.png',size:'1280x720'}]) assert.throws(()=>p.protocols.openai_video.decodeRequest({...json(body),model:V}));
  assert.throws(()=>p.protocols.openai_video.decodeRequest({model:V,body:{kind:'multipart',fields:{prompt:['a','b']},files:[]}}),/once/);
});
test('3D defaults and optional credit calculations',()=>{
  assert.deepEqual(p.extractUsage(ctx(G,{prompt:'猫'})),{credits:20});
  assert.deepEqual(p.extractUsage(ctx(G,{prompt:'猫',generate_type:'Geometry'})),{credits:15});
  assert.deepEqual(p.extractUsage(ctx(G,{prompt:'猫',generate_type:'LowPoly',enable_pbr:true})),{credits:35});
  assert.deepEqual(p.extractUsage(ctx(X,{prompt:'猫'})),{credits:15});
  assert.deepEqual(p.extractUsage(ctx(X,{prompt:'猫',enable_pbr:true})),{credits:25});
  assert.equal(p.extractUsage(ctx(G,{prompt:'猫'},{usagePurpose:'billing_ratios'})),null);
});
test('3D Sketch accepts prompt plus image only on 3.0',()=>{
  const body={prompt:'A cat',image_url:'https://example.com/a.png',generate_type:'Sketch'};
  assert.equal(p.buildSubmitRequest(ctx(G,body)).body.generate_type,'Sketch');
  assert.throws(()=>p.buildSubmitRequest(ctx('hy-3d-3.1',body)),/not available/);
});
test('3D rejects invalid fields combinations and bounds',()=>{
  const bodies=[{prompt:'x',face_count:2999},{prompt:'x',face_count:1500001},{prompt:'x',polygon_type:'triangle'},{prompt:'x',generate_type:'Geometry',enable_pbr:true},{prompt:'x',generate_type:'LowPoly',face_count:10000},{prompt:'x',result_format:'glb'},{prompt:'x'.repeat(1025)},{prompt:'x',callback_url:'https://example.com'},{image_base64:'bad!!!'},{prompt:'x',multi_view_images:[]}];
  for(const body of bodies) assert.throws(()=>p.buildSubmitRequest(ctx(G,body)));
  assert.throws(()=>p.buildSubmitRequest(ctx(X,{prompt:'x',enable_geometry:true,result_format:'obj'})),/cannot/);
  assert.throws(()=>p.buildSubmitRequest(ctx(X,{prompt:'x',face_count:3000})),/not supported/);
});
test('multi-view needs front image unique documented views',()=>{
  const a={view_type:'back',view_image_url:'https://example.com/back.png'};
  assert.throws(()=>p.buildSubmitRequest(ctx(G,{image_url:'https://example.com/front.png',multi_view_images:[a,a]})),/repeated/);
  assert.throws(()=>p.buildSubmitRequest(ctx(G,{prompt:'x',multi_view_images:[a]})),/front view/);
});
test('submission envelopes require ids and reject 200 errors',()=>{
  for(const model of [V,G]) for(const body of [{},{error:{message:'blocked'}},{status:'failed',id:'123',task_id:'123'}]) assert.throws(()=>p.parseSubmitResponse(ctx(model),{statusCode:200,body}));
});
test('all task states include UNKNOWN and success requires actual files',()=>{
  for(const [model,statuses,done] of [[V,{queued:'QUEUED',running:'IN_PROGRESS',failed:'FAILURE'},doneVideo],[G,{queued:'QUEUED',in_progress:'IN_PROGRESS',failed:'FAILURE'},done3D]]){
    for(const [s,want] of Object.entries(statuses)) assert.equal(p.parseTaskResult(ctx(model),{status:s}).status,want);
    assert.equal(p.parseTaskResult(ctx(model),done).status,'SUCCESS');
    assert.equal(p.parseTaskResult(ctx(model),{status:'future_status'}).status,'UNKNOWN');
    assert.equal(p.parseTaskResult(ctx(model),{}).status,'UNKNOWN');
    assert.equal(p.parseTaskResult(ctx(model),{status:model===V?'succeeded':'completed'}).status,'FAILURE');
  }
});
test('video usage settlement ignores absent zero invalid and caps outliers',()=>{
  for(const value of [null,0,-1,'bad']) assert.equal(p.extractUsageOnComplete(ctx(V),{status:'SUCCESS'},{tokenhub_usage:{total_tokens:value}}),null);
  assert.deepEqual(p.extractUsageOnComplete(ctx(V),{status:'SUCCESS'},{tokenhub_usage:{total_tokens:999999}}),{video_tokens:150000});
  assert.equal(p.extractUsageOnComplete(ctx(V),{status:'FAILURE'},doneVideo),null);
});
test('artifact downloads refresh video URL and strip credentials',()=>{
  let calls=0;
  globalThis.utils.fetch = req => {calls++;assert.equal(req.method,'GET');assert.equal(new URL(req.url).host,new URL(B).host);return {status:200,body:{...doneVideo,videos:[{url:'https://example.com/fresh.mp4'}]}};};
  const request=p.buildContentRequest({...ctx(),artifactKey:'video',upstreamTaskId:'vendor-1',data:doneVideo,clientRequest:{method:'HEAD'}});
  assert.equal(calls,1);assert.equal(request.url,'https://example.com/fresh.mp4');assert.equal(request.credentialless,true);assert.equal(request.headers,undefined);
  globalThis.utils.fetch=()=>{throw new Error('offline');};
  assert.equal(p.buildContentRequest({...ctx(G),artifactKey:'glb',data:done3D,clientRequest:{method:'GET'}}).url,'https://example.com/a.glb');
  assert.throws(()=>p.buildContentRequest({...ctx(G),artifactKey:'unknown',data:done3D,clientRequest:{method:'GET'}}),/artifact_not_found/);
});
test('native presenters return gateway ids and artifact URLs only',()=>{
  const task={task_id:'public-1',status:'SUCCESS',created_at:123,updated_at:124,data:doneVideo};
  const rendered=p.native.videoTask({artifacts:{video:{url:'https://gateway.example/video'}}},task);
  assert.equal(rendered.task_id,'public-1');assert.equal(rendered.videos[0].url,'https://gateway.example/video');assert.equal(rendered.tokenhub_usage,undefined);
  const j=p.native.jobStatus({artifacts:{glb:{url:'https://gateway.example/glb'},preview_glb:{url:'https://gateway.example/preview'}}},{...task,data:done3D});
  assert.equal(j.id,'public-1');assert.equal(j.data[0].url,'https://gateway.example/glb');
  assert.deepEqual(p.native.query3D(json({id:'public-1',model:G})),{kind:'query',taskIds:['public-1']});
});
test('hooks do not mutate request or task input',()=>{
  const c=freeze(ctx(G,{prompt:'猫',enable_pbr:true}));p.buildSubmitRequest(c);p.extractUsage(c);
  const d=freeze(structuredClone(done3D));p.parseTaskResult(c,d);p.listArtifacts(freeze({status:'SUCCESS',data:d}));
});

test("code never references meta, so the gateway can read it statically", async () => {
  const { readFileSync } = await import("node:fs");
  const src = readFileSync(new URL("../plugin.js", import.meta.url), "utf8");
  const rest = src.slice(src.indexOf("\n};\n", src.indexOf("export const meta = {")));
  assert.doesNotMatch(rest, /(^|[^A-Za-z0-9_$.])meta([^A-Za-z0-9_$]|$)/m);
  assert.ok(rest.includes(JSON.stringify(p.meta.models)));
});
