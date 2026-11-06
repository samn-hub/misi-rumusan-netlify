import { getDatabase } from "@netlify/database";
const KEY = [1,2,0,2,1,0,2,1];
const json = (v,status=200)=>Response.json(v,{status,headers:{'Cache-Control':'no-store'}});
async function ranking(){
 const db=getDatabase();
 const rows=await db.sql`SELECT alias,xp,lamps FROM (
   SELECT DISTINCT ON (pupil) id,alias,xp,lamps,created FROM results
   WHERE lamps=8 ORDER BY pupil,xp DESC,created,id
 ) best ORDER BY xp DESC,created,id LIMIT 10`;
 return json(rows);
}
function clean(v,max){
 return typeof v==='string'?v.normalize('NFKC').trim().replace(/\s+/g,' ').slice(0,max):'';
}
async function post(req){
 if(req.headers.get('origin') && req.headers.get('origin')!==new URL(req.url).origin)return json({},403);
 const body=await req.json().catch(()=>null);
 if(!body)return json({error:'Permintaan tidak sah.'},400);
 if(body.mode==='guru'||body.mode==='padam'){
   const secret=process.env.GURU_CODE;
   if(!secret || req.headers.get('authorization')!=='Bearer '+secret)return json({error:'Kod akses guru tidak tepat.'},403);
   if(body.mode==='padam'){
     if(typeof body.id!=='string'|| !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(body.id))return json({},400);
     await getDatabase().sql`DELETE FROM results WHERE id=${body.id}`;
     return json({ok:true});
   }
   const rows=await getDatabase().sql`SELECT id,name,classroom,alias,xp,lamps,answers,created::double precision AS created FROM results ORDER BY created DESC,id`;
   return json(rows);
 }
 const {id,a,tiles}=body;
 const name=clean(body.name,80), classroom=clean(body.group,40).toUpperCase();
 if(!name||!classroom||typeof id!=='string'|| !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(id)||
    !Array.isArray(a)||a.length!==8||!a.every(v=>[-1,0,1,2].includes(v))||
    !Array.isArray(tiles)||tiles.length!==8||!tiles.every(t=>Array.isArray(t)&&t.length<=3&&t.every(v=>[0,1,2].includes(v))&&new Set(t).size===t.length))return json({error:'Jawapan tidak sah.'},400);
 const xp=a.reduce((v,n,i)=>v+(n===KEY[i]?100:0),0);
 const lamps=tiles.filter((t,i)=>a[i]>=0 && t.join(',')==='0,1,2').length;
 const alias=['Pari','Penyu','Helang','Merak','Rusa','Kancil','Enggang','Dolphin'][parseInt(id[0],16)%8]+' '+id.slice(0,6).toUpperCase();
 const pupil=JSON.stringify([name.toLocaleLowerCase('ms'),classroom]);
 const db=getDatabase();
 await db.sql`INSERT INTO results(id,pupil,name,classroom,alias,xp,lamps,answers,created)
 VALUES(${id},${pupil},${name},${classroom},${alias},${xp},${lamps},${JSON.stringify({a,tiles})},${Date.now()})
 ON CONFLICT(id) DO NOTHING`;
 const [saved]=await db.sql`SELECT xp,lamps,alias FROM results WHERE id=${id}`;
 return json({...saved,status:saved.lamps===8?'Lengkap':'Sebahagian'});
}
export const config={path:'/api/misi'};
export default async function handler(request){
 try {
   if(request.method==='GET')return await ranking();
   if(request.method==='POST')return await post(request);
   return json({},405);
 } catch {
   return json({error:'Rekod belum dapat dicapai. Semak sambungan pangkalan data.'},503);
 }
}
