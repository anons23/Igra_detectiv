const fs=require('fs');
const path=require('path');
const vm=require('vm');

const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

function fail(message){console.error(`FAIL: ${message}`);process.exitCode=1;}
function ok(message){console.log(`PASS: ${message}`);}

for(const file of ['index.html','game.js','data/case001.js','style.css']){
  if(!fs.existsSync(path.join(root,file))) fail(`missing ${file}`);
  else ok(`file exists: ${file}`);
}

for(const file of ['game.js','data/case001.js']){
  try{new vm.Script(read(file),{filename:file});ok(`JavaScript syntax: ${file}`)}catch(error){fail(`JavaScript syntax ${file}: ${error.message}`)}
}

try{
  const context={};
  vm.createContext(context);
  new vm.Script(read('data/case001.js'),{filename:'data/case001.js'}).runInContext(context);
  const c=context.CASE001;
  if(!c) throw new Error('CASE001 is not defined');
  if(!Array.isArray(c.suspects)||c.suspects.length<2) throw new Error('suspects are missing');
  if(!Array.isArray(c.locations)||!c.locations.length) throw new Error('locations are missing');
  if(!Array.isArray(c.evidence)||!c.evidence.length) throw new Error('evidence is missing');
  if(!Array.isArray(c.timeline)||!c.timeline.length) throw new Error('timeline is missing');
  for(const location of c.locations){
    if(!location.id||!location.bg||!Array.isArray(location.hotspots)) throw new Error(`invalid location: ${location.id}`);
    const bg=path.join(root,location.bg);
    if(!fs.existsSync(bg)) throw new Error(`missing background for ${location.id}: ${location.bg}`);
    for(const hotspot of location.hotspots){
      if(hotspot.type==='travel' && !c.locations.some(x=>x.id===hotspot.target)) throw new Error(`broken travel target: ${location.id}/${hotspot.id}`);
      if(hotspot.type==='evidence' && !c.evidence.some(x=>x.id===hotspot.evidence)) throw new Error(`broken evidence reference: ${location.id}/${hotspot.id}`);
    }
  }
  for(const key of ['killer','motive','weapon','place','time','method']) if(!c.answer?.[key]) throw new Error(`missing answer field: ${key}`);
  if(!c.suspects.some(s=>s.id===c.answer.killer)) throw new Error('answer killer does not match a suspect');
  ok('CASE001 data integrity');
}catch(error){fail(`CASE001 data integrity: ${error.message}`)}

try{
  const html=read('index.html');
  for(const src of [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map(m=>m[1]).filter(x=>!x.startsWith('http')&&!x.startsWith('#'))){
    const clean=src.split('?')[0];
    if(clean && !fs.existsSync(path.join(root,clean))) fail(`broken local asset reference: ${src}`);
  }
  ok('local HTML asset references');
}catch(error){fail(`HTML validation: ${error.message}`)}

if(process.exitCode) process.exit(process.exitCode);
console.log('All automated checks passed.');