// Usage: node test_snake.js <snake.html> <outdir>  (adds a read-only probe exposing snake/food/score/state, then plays with real key presses)
const puppeteer=require('puppeteer-core');
const fs=require('fs'),path=require('path');
const [src,out]=process.argv.slice(2);fs.mkdirSync(out,{recursive:true});
let html=fs.readFileSync(src,'utf8');
// read-only probe appended just before the IIFE closes (last "})();")
const i=html.lastIndexOf('})();');
html=html.slice(0,i)+"window.__probe=()=>({snake:snake.map(s=>({x:s.x,y:s.y})),food:food&&{x:food.x,y:food.y},score,state,dir:{x:dir.x,y:dir.y}});\n"+html.slice(i);
const inst=path.join(out,'instrumented.html');fs.writeFileSync(inst,html);
const sl=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
const b=await puppeteer.launch({executablePath:process.env.CHROME||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox']});
const p=await b.newPage();const errs=[];p.on('pageerror',e=>errs.push(String(e)));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
await p.setViewport({width:1000,height:1000});await p.goto('file://'+path.resolve(inst));await sl(800);
const R={};const pr=()=>p.evaluate(()=>window.__probe());
const dom=()=>p.evaluate(()=>({score:document.getElementById('score').textContent,overlay:(document.getElementById('overlay')||{}).innerText||''}));
await p.screenshot({path:out+'/0_ready.png'});
let s0=await pr();R.ready={state:s0.state,len:s0.snake.length,score:s0.score};
const K={'1,0':'ArrowRight','-1,0':'ArrowLeft','0,1':'ArrowDown','0,-1':'ArrowUp'};
await p.keyboard.press('Space');await sl(400);
let s=await pr();R.after_space={state:s.state,head:s.snake[0]};
const h1=s.snake[0];await sl(350);s=await pr();R.moves=JSON.stringify(s.snake[0])!==JSON.stringify(h1);R.move_detail={from:h1,to:s.snake[0]};
// autopilot: eat 6 foods via keys (BFS on grid 20)
const G=20;const eatLog=[];
async function nextTick(prevHead){for(let k=0;k<200;k++){const q=await pr();if(q.state!=='playing'||q.snake[0].x!==prevHead.x||q.snake[0].y!==prevHead.y)return q;await sl(10);}return pr();}
function bfs(q){const body=new Set(q.snake.slice(0,-1).map(c=>c.x+','+c.y));const st=q.snake[0];const prev={};const Q=[st];prev[st.x+','+st.y]=null;
 while(Q.length){const c=Q.shift();if(c.x===q.food.x&&c.y===q.food.y){let n=c,pk=c.x+','+c.y;while(prev[pk]&&!(prev[pk].x===st.x&&prev[pk].y===st.y)){n=prev[pk];pk=n.x+','+n.y;}return {x:n.x-st.x,y:n.y-st.y};}
 for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const n={x:c.x+dx,y:c.y+dy},k=n.x+','+n.y;if(n.x<0||n.y<0||n.x>=G||n.y>=G||body.has(k)||k in prev)continue;prev[k]=c;Q.push(n);}}return null;}
let target=6,steps=0;
while((s=await pr()).score<target&&s.state==='playing'&&steps<600){const d=bfs(s);if(d&&!(d.x===s.dir.x&&d.y===s.dir.y)&&!(d.x===-s.dir.x&&d.y===-s.dir.y))await p.keyboard.press(K[d.x+','+d.y]);
 else if(d&&d.x===-s.dir.x&&d.y===-s.dir.y){const side=s.dir.x?{x:0,y:s.snake[0].y<10?1:-1}:{x:s.snake[0].x<10?1:-1,y:0};await p.keyboard.press(K[side.x+','+side.y]);}
 const before=s;s=await nextTick(s.snake[0]);steps++;if(s.score>before.score){const d2=await dom();eatLog.push({score:s.score,len:s.snake.length,dom_score:d2.score});}}
R.eat=eatLog;R.eat_state=s.state;await p.screenshot({path:out+'/1_after_eating.png'});
// self collision: tight loop of 3 turns (length>=5)
s=await pr();const hd=s.snake[0],vy=hd.y<10?1:-1,vx=hd.x<10?1:-1;const turns=s.dir.x?[{x:0,y:vy},{x:-s.dir.x,y:0},{x:0,y:-vy}]:[{x:vx,y:0},{x:0,y:-s.dir.y},{x:-vx,y:0}];R.self_setup={head:hd,dir:s.dir,len:s.snake.length,turns};
for(const t of turns){if(s.state!=='playing')break;await p.keyboard.press(K[t.x+','+t.y]);s=await nextTick(s.snake[0]);}
await sl(300);s=await pr();let d=await dom();R.self_collision={state:s.state,overlay:d.overlay.replace(/\s+/g,' ').slice(0,160),score:s.score};
await p.screenshot({path:out+'/2_self_gameover.png'});
// restart
await p.keyboard.press('Space');await sl(500);s=await pr();d=await dom();R.restart={state:s.state,score:s.score,dom_score:d.score,len:s.snake.length};
// wall: keep going straight
for(let k=0;k<60&&s.state==='playing';k++){s=await nextTick(s.snake[0]);}
await sl(300);s=await pr();d=await dom();R.wall={state:s.state,head:s.snake[0],overlay:d.overlay.replace(/\s+/g,' ').slice(0,160)};
await p.screenshot({path:out+'/3_wall_gameover.png'});
await p.keyboard.press('Space');await sl(500);s=await pr();R.restart2={state:s.state,score:s.score,len:s.snake.length};
await p.screenshot({path:out+'/4_restarted.png'});
R.errors=errs;fs.writeFileSync(out+'/result.json',JSON.stringify(R,null,1));console.log(JSON.stringify(R,null,1));await b.close();})();
