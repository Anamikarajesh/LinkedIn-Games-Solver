// Tango — Sun & Moon (6×6) front-end (Pyodide-powered)
const N = 6;
const gridEl = document.getElementById('grid');
const logEl = document.getElementById('log');
const padEl = document.getElementById('pad');
const eqListEl = document.getElementById('eqList');
const opListEl = document.getElementById('opList');
const connEl = document.getElementById('connectors');

let selected=null;
let givens=new Set();
let py=null, pySolve=null, pyHint=null;
let pyReady = null;

// Randomizable constraints (will be filled at runtime)
let EQUALS = [];
let OPPOS = [];

function renderPairs(){
  eqListEl.innerHTML = "";
  for(const p of EQUALS){
    const [r1,c1,r2,c2]=p;
    const span = document.createElement('span');
    span.className = 'pair-tag equal';
    span.textContent = `(${r1+1},${c1+1}) = (${r2+1},${c2+1})`;
    eqListEl.appendChild(span);
  }
  opListEl.innerHTML = "";
  for(const p of OPPOS){
    const [r1,c1,r2,c2]=p;
    const span = document.createElement('span');
    span.className = 'pair-tag oppo';
    span.textContent = `(${r1+1},${c1+1}) × (${r2+1},${c2+1})`;
    opListEl.appendChild(span);
  }
}

function createGrid(){
  gridEl.innerHTML="";
  for(let r=0;r<N;r++){
    for(let c=0;c<N;c++){
      const cell = document.createElement('div');
      cell.className='cell';
      cell.dataset.r=r; cell.dataset.c=c;
      cell.addEventListener('click',()=>selectCell(cell));
      gridEl.appendChild(cell);
    }
  }
}

function selectCell(cell){
  if(selected) selected.classList.remove('selected');
  selected=cell; selected.classList.add('selected');
}

function id(r,c){ return r*N+c; }
function setCell(r,c,val,opts={prefill:false}){
  const el = gridEl.children[id(r,c)];
  if(val===null || val===undefined){
    el.textContent='';
    el.classList.remove('prefilled');
    if(opts.prefill) givens.delete(id(r,c));
  } else {
    el.textContent = (val===1? '☀️':'🌙');
    if(opts.prefill){
      givens.add(id(r,c)); el.classList.add('prefilled');
    }
  }
  validateCell(r,c);
  checkSolved();
}

function getCell(r,c){
  const t = gridEl.children[id(r,c)].textContent.trim();
  if(t==='☀️') return 1;
  if(t==='🌙') return 0;
  return null;
}

function readGrid(){
  const g = Array.from({length:N},()=>Array(N).fill(null));
  for(let r=0;r<N;r++) for(let c=0;c<N;c++) g[r][c]=getCell(r,c);
  return g;
}

document.querySelectorAll('button[data-sym]').forEach(b=>{
  b.addEventListener('click', ()=>{
    if(!selected) return;
    const r=+selected.dataset.r, c=+selected.dataset.c;
    if(givens.has(id(r,c))) return;
    setCell(r,c, parseInt(b.dataset.sym,10));
  });
});

document.getElementById('clearCell').addEventListener('click', ()=>{
  if(!selected) return;
  const r=+selected.dataset.r, c=+selected.dataset.c;
  if(givens.has(id(r,c))) return;
  setCell(r,c, null);
});

// deselect on click outside
document.addEventListener('click', (e)=>{
  if(!selected) return;
  if(gridEl.contains(e.target) || padEl.contains(e.target)) return;
  selected.classList.remove('selected'); selected=null;
});

function log(s){
  const d=document.createElement('div');
  d.textContent=`[${new Date().toLocaleTimeString()}] ${s}`;
  logEl.prepend(d);
}

// Draw connectors at correct positions (based on actual cell sizes)
function centerOfCell(r,c){
  const cell = gridEl.children[id(r,c)];
  const a = gridEl.getBoundingClientRect();
  const b = cell.getBoundingClientRect();
  return { x: b.left - a.left + b.width/2, y: b.top - a.top + b.height/2 };
}

function drawConnectors(){
  connEl.innerHTML='';
  function place(x,y,text,cls){
    const d=document.createElement('div'); d.className='conn '+cls; d.textContent=text;
    d.style.left=(x-6)+'px'; d.style.top=(y-10)+'px'; connEl.appendChild(d);
  }
  for(const [r1,c1,r2,c2] of EQUALS){
    if(Math.abs(r1-r2)+Math.abs(c1-c2)===1){
      const a=centerOfCell(r1,c1), b=centerOfCell(r2,c2);
      place((a.x+b.x)/2,(a.y+b.y)/2,'=','eq');
    }
  }
  for(const [r1,c1,r2,c2] of OPPOS){
    if(Math.abs(r1-r2)+Math.abs(c1-c2)===1){
      const a=centerOfCell(r1,c1), b=centerOfCell(r2,c2);
      place((a.x+b.x)/2,(a.y+b.y)/2,'×','op');
    }
  }
}

// Live validation
function markInvalid(r,c,flag){
  const el = gridEl.children[id(r,c)];
  if(flag) el.classList.add('invalid'); else el.classList.remove('invalid');
}

function validateCell(r,c){
  const v = getCell(r,c);
  if(v===null){ markInvalid(r,c,false); return true; }
  let ok=true;

  const row=[]; for(let j=0;j<N;j++) row.push(getCell(r,j));
  const col=[]; for(let i=0;i<N;i++) col.push(getCell(i,c));

  for(let i=0;i<=N-3;i++){
    if(row[i]!==null && row[i+1]!==null && row[i+2]!==null && row[i]===row[i+1] && row[i+1]===row[i+2]) ok=false;
    if(col[i]!==null && col[i+1]!==null && col[i+2]!==null && col[i]===col[i+1] && col[i+1]===col[i+2]) ok=false;
  }

  const half=N/2;
  if(row.filter(x=>x===1).length>half || row.filter(x=>x===0).length>half) ok=false;
  if(col.filter(x=>x===1).length>half || col.filter(x=>x===0).length>half) ok=false;

  for(const [r1,c1,r2,c2] of EQUALS){
    const a=getCell(r1,c1), b=getCell(r2,c2);
    if(a!==null && b!==null && a!==b) ok=false;
  }
  for(const [r1,c1,r2,c2] of OPPOS){
    const a=getCell(r1,c1), b=getCell(r2,c2);
    if(a!==null && b!==null && a===b) ok=false;
  }
  markInvalid(r,c,!ok);
  return ok;
}

// Lazy Pyodide loader (loads on first use)
async function ensurePy(){
  if(pyReady) return pyReady;
  log('Loading Pyodide (this may take a few seconds)...');
  document.getElementById('loader').style.display = 'block';
  pyReady = (async ()=>{
    py = await loadPyodide();
    const code = await (await fetch('tango_solver.py')).text();
    await py.runPythonAsync(code);
    pySolve = py.globals.get('solve_grid');
    pyHint = py.globals.get('hint_cell');
    document.getElementById('hintBtn').disabled=false;
    document.getElementById('solveBtn').disabled=false;
    document.getElementById('loader').style.display = 'none';
    log('Python engine ready.');
    return py;
  })();
  return pyReady;
}

// Solve step-by-step
document.getElementById('solveBtn').addEventListener('click', async ()=>{
  const start = readGrid();
  await ensurePy();
  const solObj = pySolve(start, EQUALS, OPPOS);
  const sol = solObj && solObj.toJs ? solObj.toJs() : null;
  if(!sol){ log('No solution.'); return; }
  const cells = [];
  for(let r=0;r<N;r++) for(let c=0;c<N;c++){
    const cur = getCell(r,c);
    if(cur===null || cur!==sol[r][c]) cells.push([r,c,sol[r][c]]);
  }
  for(const [r,c,v] of cells){
    await new Promise(res=>setTimeout(res,180));
    setCell(r,c,v);
  }
  log('Solved step-by-step.');
});

// Random Puzzle with RANDOM = and ×
document.getElementById('randomBtn').addEventListener('click', async ()=>{
  givens.clear();
  for(let r=0;r<N;r++) for(let c=0;c<N;c++) setCell(r,c,null);

  await ensurePy();
  const empty = Array.from({length:N},()=>Array(N).fill(null));
  const solObj = pySolve(empty, EQUALS, OPPOS);
  const sol = solObj && solObj.toJs ? solObj.toJs() : null;
  if(!sol){ log('Cannot generate puzzle.'); return; }

  // Create new random constraints
  EQUALS = [];
  OPPOS = [];
  const directions = [[0,1],[1,0]];
  for (let r=0;r<N;r++){
    for (let c=0;c<N;c++){
      for (const [dr,dc] of directions){
        const r2 = r+dr, c2 = c+dc;
        if(r2 < N && c2 < N && Math.random() < 0.15){
          if(sol[r][c] === sol[r2][c2]) EQUALS.push([r,c,r2,c2]);
          else OPPOS.push([r,c,r2,c2]);
        }
      }
    }
  }
  // limit opposites to avoid too many ×
  if(OPPOS.length > 6) OPPOS = OPPOS.slice(0,6);

  renderPairs();
  drawConnectors();

  const cells = [];
  for(let r=0;r<N;r++) for(let c=0;c<N;c++) cells.push([r,c]);
  for(let i=cells.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [cells[i],cells[j]]=[cells[j],cells[i]]; }

  const minGive = Math.floor(N*N*0.25), maxGive = Math.floor(N*N*0.4);
  const giveCount = Math.floor(Math.random()*(maxGive-minGive+1))+minGive;
  for(let k=0;k<giveCount;k++){
    const [r,c]=cells[k];
    setCell(r,c, sol[r][c], {prefill:true});
  }
  drawConnectors();
  // validate all prefills
  for(let r=0;r<N;r++) for(let c=0;c<N;c++) validateCell(r,c);
  log('Random puzzle ready.');
});

// Hint (random empty from solution)
document.getElementById('hintBtn').addEventListener('click', async ()=>{
  const g = readGrid();
  await ensurePy();
  const solObj = pySolve(g, EQUALS, OPPOS);
  const sol = solObj && solObj.toJs ? solObj.toJs() : null;
  if(!sol){ log('No hint (unsatisfiable).'); return; }
  const empties = [];
  for(let r=0;r<N;r++) for(let c=0;c<N;c++) if(getCell(r,c)===null) empties.push([r,c]);
  if(empties.length===0){ log('Board already complete.'); return; }
  const pick = empties[Math.floor(Math.random()*empties.length)];
  const [rr,cc] = pick; const val = sol[rr][cc];
  setCell(rr,cc,val);
  log(`Hint: (${rr+1},${cc+1}) ${(val===1?'☀️':'🌙')}`);
});

// RESET
document.getElementById('resetBtn').addEventListener('click', ()=>{
  for(let r=0;r<N;r++) for(let c=0;c<N;c++)
    if(!givens.has(id(r,c))) setCell(r,c,null);
  logEl.innerHTML='';
});

// Check full board solved and show modal
function checkSolved(){
  for(let r=0;r<N;r++) for(let c=0;c<N;c++){
    if(getCell(r,c)===null) return false;
    if(gridEl.children[id(r,c)].classList.contains('invalid')) return false;
  }
  (async ()=>{
    await ensurePy();
    const g = readGrid();
    const solObj = pySolve(g, EQUALS, OPPOS);
    const sol = solObj && solObj.toJs ? solObj.toJs() : null;
    if(!sol) return false;
    for(let r=0;r<N;r++) for(let c=0;c<N;c++) if(sol[r][c] !== getCell(r,c)) return false;
    document.getElementById('successModal').style.display = 'flex';
    return true;
  })();
  return true;
}

document.getElementById('closeSuccess')?.addEventListener('click', ()=>{
  document.getElementById('successModal').style.display = 'none';
});

// Init: create grid and generate one random puzzle on load
createGrid();
renderPairs();
// initial random generation (calls ensurePy then sets up a puzzle)
(async ()=>{ await ensurePy(); document.getElementById('randomBtn').click(); })();
window.addEventListener('resize', drawConnectors);
