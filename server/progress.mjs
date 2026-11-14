const respond=(value,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'private, no-store','Vary':'Cookie'}});
export async function progress(request,env){
 const user=request.headers.get('oai-authenticated-user-id');
 if(!user)return respond({error:'signin'},401);
 const path='voyage/v1/'+encodeURIComponent(user)+'.json';
 if(request.method==='GET'){
   const obj=await env.BUCKET.get(path);
   return respond(obj?{revision:obj.etag,state:await obj.json()}:{revision:null,state:null});
 }
 if(request.method!=='PUT')return respond({error:'method'},405);
 const origin=request.headers.get('Origin');if(origin&&origin!==new URL(request.url).origin)return respond({error:'origin'},403);
 if(!request.headers.get('Content-Type')?.startsWith('application/json'))return respond({error:'type'},415);
 const raw=await request.text();if(raw.length>4000000)return respond({error:'size'},413);
 let body;try{body=JSON.parse(raw)}catch{return respond({error:'json'},400)}
 if(!body?.state?.voyage||!body.state.items||!Array.isArray(body.state.history)||!(body.revision===null||typeof body.revision==='string'))return respond({error:'shape'},400);
 const onlyIf=body.revision===null?{etagDoesNotMatch:'*'}:{etagMatches:body.revision};
 const saved=await env.BUCKET.put(path,JSON.stringify(body.state),{onlyIf,httpMetadata:{contentType:'application/json'}});
 return saved?respond({revision:saved.etag}):respond({error:'updated'},409);
}