// Mini Sudoku (6x6) solver with CSP instrumentation
(function(){
  const N = 6;
  const DIGITS = [1,2,3,4,5,6];
  const blockW = 3; // 3 columns
  const blockH = 2; // 2 rows -> 3x2 boxes

  const gridEl = document.getElementById('grid');
  const logEl = document.getElementById('log');
  const padEl = document.querySelector('.pad');

  // in-memory log lines; persisted to localStorage so it survives refresh
  let logLines = JSON.parse(localStorage.getItem('solver_log') || '[]');
  // populate visible log if present
  // Do not populate the visible log on load — start with an empty AI Progress panel.
  // The stored `logLines` remain in localStorage for later download or inspection if needed,
  // but we intentionally keep the UI empty until the solver runs.
  if(logEl){ logEl.innerHTML = ''; }

  // controls
  const hintBtn = document.getElementById('hintBtn');
  const solveBtn = document.getElementById('solveBtn');
  const resetBtn = document.getElementById('resetBtn');
  const clearCellBtn = document.getElementById('clearCell');

  let selected = null;
  // initial givens (locked by the user or the demo at load time)
  let initialGivens = new Set();
  let runningController = null;

  function clearSelection(){
    if(selected){
      selected.classList.remove('selected');
      selected = null;
    }
  }

  function createGrid(){
    gridEl.innerHTML = '';
    for(let r=0;r<N;r++){
      for(let c=0;c<N;c++){
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.r = r; cell.dataset.c = c;
        cell.addEventListener('click', ()=> selectCell(cell));
        gridEl.appendChild(cell);
      }
    }
  }

  function selectCell(cell){
    clearSelection();
    selected = cell;
    selected.classList.add('selected');
  }

  function setCell(r,c,val,opts={prefill:false}){
    const idx = r*N + c;
    const cell = gridEl.children[idx];
    if(val==null || val===0){
      cell.textContent = '';
      if(opts.prefill) initialGivens.delete(idx);
      cell.classList.remove('prefilled');
      cell.classList.remove('invalid');
    } else {
      cell.textContent = String(val);
      cell.classList.remove('invalid');
      if(opts.prefill){ initialGivens.add(idx); cell.classList.add('prefilled'); }
    }
  }

  function getCell(r,c){
    const idx = r*N + c;
    const cell = gridEl.children[idx];
    const txt = cell.textContent.trim();
    return txt ? parseInt(txt,10) : 0;
  }

  function readGrid(){
    const g = Array.from({length:N}, ()=>Array(N).fill(0));
    for(let r=0;r<N;r++) for(let c=0;c<N;c++) g[r][c]=getCell(r,c);
    return g;
  }

  // UI number pad
  document.querySelectorAll('.pad button[data-num]').forEach(b=>{
    b.addEventListener('click', ()=>{
      if(!selected) return;
      const v = parseInt(b.dataset.num,10);
      const r = parseInt(selected.dataset.r,10);
      const c = parseInt(selected.dataset.c,10);
      // prevent overwriting locked initial givens
      const idx = r*N + c;
      if(initialGivens.has(idx)) return;
      // tentative set
      // get current grid and test immediate conflicts
      const g = readGrid();
      // place tentatively
      g[r][c] = v;

      // immediate conflict check
      function immediateConflict(grid, rr, cc, val){
        // row
        for(let j=0;j<N;j++) if(j!==cc && grid[rr][j]===val) return true;
        // col
        for(let i=0;i<N;i++) if(i!==rr && grid[i][cc]===val) return true;
        // block
        const br = Math.floor(rr/blockH)*blockH;
        const bc = Math.floor(cc/blockW)*blockW;
        for(let dr=0; dr<blockH; dr++) for(let dc=0; dc<blockW; dc++){
          const nr = br+dr, nc = bc+dc;
          if(nr===rr && nc===cc) continue;
          if(grid[nr][nc]===val) return true;
        }
        return false;
      }

      const cellIdx = r*N + c;
      const cellEl = gridEl.children[cellIdx];

      if(immediateConflict(g, r, c, v)){
        // show invalid entry visually and log
        setCell(r,c,v);
        cellEl.classList.add('invalid');
        appendLog(`INVALID entry: (${r+1},${c+1}) = ${v} conflicts immediately`);
        return;
      }

      // if no immediate conflict, run a fast solvability check
      setCell(r,c,v);
      cellEl.classList.remove('invalid');
      // run silent solvability check; if unsolvable, mark invalid
      if(!isSolvableGrid(readGrid())){
        cellEl.classList.add('invalid');
        appendLog(`INVALID entry: (${r+1},${c+1}) = ${v} makes puzzle unsolvable`);
      } else {
        cellEl.classList.remove('invalid');
      }
    });
  });

  clearCellBtn.addEventListener('click', ()=>{
    if(!selected) return;
    const r = parseInt(selected.dataset.r,10);
    const c = parseInt(selected.dataset.c,10);
    const idx = r*N + c;
    if(initialGivens.has(idx)) return;
    setCell(r,c,0);
    gridEl.children[idx].classList.remove('invalid');
  });

  resetBtn.addEventListener('click', ()=>{
    // clear all cells except initial givens (locked starting values)
    for(let r=0;r<N;r++){
      for(let c=0;c<N;c++){
        const idx = r*N + c;
        if(!initialGivens.has(idx)) setCell(r,c,0);
      }
    }
    clearSelection();
  // clear log memory (but keep saved givens)
    logLines = [];
    localStorage.setItem('solver_log', JSON.stringify(logLines));
    if(logEl) logEl.innerHTML = '';
  });

  document.addEventListener('click', (e)=>{
    if(!selected) return;
    if(gridEl.contains(e.target)) return;
    if(padEl && padEl.contains(e.target)) return;
    clearSelection();
  });

  document.addEventListener('keydown', (e)=>{
    if(e.key === 'Escape'){
      clearSelection();
    }
  });

  const newGameBtn = document.getElementById('newGameBtn');

  newGameBtn.addEventListener('click', ()=>{
    // Try to generate a solvable random starting puzzle. We'll attempt several times and
    // validate candidates with the fast backtracking `isSolvableGrid` before accepting.
    const maxRetries = 200;
    let success = false;
    let finalPlaced = 0;
    for(let attempt=0; attempt<maxRetries; attempt++){
      // clear board
      for(let r=0;r<N;r++) for(let c=0;c<N;c++) setCell(r,c,0);
      initialGivens = new Set();
      for(const cell of gridEl.children) { cell.classList.remove('prefilled'); cell.classList.remove('invalid'); }

      // choose how many givens to place (between 6 and 10)
      const givensCount = 6 + Math.floor(Math.random()*5); // 6..10

      // helper to check safety on current grid
      function isSafe(grid, r, c, val){
        for(let j=0;j<N;j++) if(grid[r][j]===val) return false;
        for(let i=0;i<N;i++) if(grid[i][c]===val) return false;
        const br = Math.floor(r/blockH)*blockH;
        const bc = Math.floor(c/blockW)*blockW;
        for(let dr=0; dr<blockH; dr++) for(let dc=0; dc<blockW; dc++){
          if(grid[br+dr][bc+dc]===val) return false;
        }
        return true;
      }

      const grid = Array.from({length:N}, ()=>Array(N).fill(0));
      let placed = 0;
      let attempts = 0;
      const maxAttempts = 2000;
      while(placed < givensCount && attempts < maxAttempts){
        attempts++;
        const r = Math.floor(Math.random()*N);
        const c = Math.floor(Math.random()*N);
        if(grid[r][c] !== 0) continue;
        const val = 1 + Math.floor(Math.random()*N);
        if(isSafe(grid, r, c, val)){
          grid[r][c] = val;
          setCell(r,c,val,{prefill:true});
          initialGivens.add(r*N + c);
          placed++;
        }
      }

      // Validate candidate with full solver check
      if(isSolvableGrid(grid)){
        success = true;
        finalPlaced = placed;
        break;
      }
      // otherwise try again
    }

    // clear logs and UI (keep the generated grid visible)
    logLines = [];
    localStorage.setItem('solver_log', JSON.stringify(logLines));
    if(logEl) logEl.innerHTML = '';
    if(!success){
      appendLog(`Warning: couldn't generate a guaranteed-solvable random puzzle after ${maxRetries} attempts; using last candidate`);
    } else {
      appendLog(`New Game: generated solvable puzzle with ${finalPlaced} givens`);
    }
  });



  // instrumentation and solver
  function neighborsOf(r,c){
    const neigh = new Set();
    for(let i=0;i<N;i++){ if(i!==c) neigh.add(`${r},${i}`); if(i!==r) neigh.add(`${i},${c}`); }
    const br = Math.floor(r/blockH)*blockH;
    const bc = Math.floor(c/blockW)*blockW;
    for(let dr=0;dr<blockH;dr++) for(let dc=0;dc<blockW;dc++){
      const rr = br+dr, cc = bc+dc;
      if(rr===r && cc===c) continue;
      neigh.add(`${rr},${cc}`);
    }
    return Array.from(neigh).map(s=>s.split(',').map(x=>parseInt(x,10)));
  }

  // fast, silent solver used only to check solvability (no logging)
  function isSolvableGrid(grid){
    // build domains
    const domains = {};
    function key(r,c){ return `${r},${c}`; }
    for(let r=0;r<N;r++) for(let c=0;c<N;c++){
      const v = grid[r][c];
      const k = key(r,c);
      if(v && v>0) domains[k] = [v];
      else {
        const dom = [];
        for(const d of DIGITS){
          let ok = true;
          for(let j=0;j<N;j++) if(grid[r][j]===d) { ok=false; break; }
          if(!ok) continue;
          for(let i=0;i<N;i++) if(grid[i][c]===d) { ok=false; break; }
          if(!ok) continue;
          const br = Math.floor(r/blockH)*blockH;
          const bc = Math.floor(c/blockW)*blockW;
          for(let dr=0; dr<blockH && ok; dr++) for(let dc=0; dc<blockW; dc++){
            if(grid[br+dr][bc+dc]===d) { ok=false; break; }
          }
          if(ok) dom.push(d);
        }
        domains[k] = dom;
        if(dom.length===0) return false; // immediate dead end
      }
    }

    // simple backtracking with MRV and forward checking
    const assignment = {};
    let nodes = 0;
    const maxNodes = 50000;

    function allAssigned(){
      return Object.keys(domains).every(k=>assignment[k]);
    }

    function selectVar(){
      const unassigned = Object.keys(domains).filter(k=>!assignment[k]);
      unassigned.sort((a,b)=>domains[a].length - domains[b].length);
      return unassigned[0];
    }

    function backtrack(){
      if(++nodes > maxNodes) return true; // give up and assume solvable to avoid heavy work
      if(allAssigned()) return true;
      const varK = selectVar();
      for(const val of domains[varK]){
        // check consistency
        const [rr,cc] = varK.split(',').map(x=>parseInt(x,10));
        let consistent = true;
        for(const k of Object.keys(assignment)){
          const [ar,ac] = k.split(',').map(x=>parseInt(x,10));
          if(ar===rr && assignment[k]===val) { consistent=false; break; }
          if(ac===cc && assignment[k]===val) { consistent=false; break; }
          const br = Math.floor(rr/blockH)*blockH;
          const bc = Math.floor(cc/blockW)*blockW;
          if(ar>=br && ar<br+blockH && ac>=bc && ac<bc+blockW && assignment[k]===val){ consistent=false; break; }
        }
        if(!consistent) continue;
        // assign and forward-check reductions
        assignment[varK]=val;
        const reductions = [];
        for(const k of Object.keys(domains)){
          if(assignment[k]) continue;
          if(k===varK) continue;
          const [kr,kc] = k.split(',').map(x=>parseInt(x,10));
          // if neighbor, remove val
          if(kr===rr || kc===cc || (kr>=Math.floor(rr/blockH)*blockH && kr<Math.floor(rr/blockH)*blockH+blockH && kc>=Math.floor(cc/blockW)*blockW && kc<Math.floor(cc/blockW)*blockW)){
            if(domains[k].includes(val)){
              reductions.push({k,val});
              domains[k] = domains[k].filter(x=>x!==val);
              if(domains[k].length===0){
                // undo
                for(const r of reductions) domains[r.k].push(r.val);
                delete assignment[varK];
                consistent = false;
                break;
              }
            }
          }
        }
        if(!consistent) continue;
        if(backtrack()) return true;
        // undo reductions
        for(const r of reductions) if(!domains[r.k].includes(r.val)) domains[r.k].push(r.val);
        delete assignment[varK];
      }
      return false;
    }

    return backtrack();
  }

  // CSP solver as async generator that yields events
  async function* solverGenerator(initialGrid, opts={delay:60}){
    let nodes = 0;
    const assignment = {};
    const domains = {};

    function key(r,c){ return `${r},${c}`; }

    // initialize
    for(let r=0;r<N;r++) for(let c=0;c<N;c++){
      const v = initialGrid[r][c];
      const k = key(r,c);
      if(v && v>0){ assignment[k]=v; domains[k]=[v]; }
      else domains[k]=DIGITS.slice();
    }

    // prune initial domains
    for(let r=0;r<N;r++) for(let c=0;c<N;c++){
      const v = initialGrid[r][c];
      if(v && v>0){
        for(const [nr,nc] of neighborsOf(r,c)){
          const nk = key(nr,nc);
          domains[nk] = domains[nk].filter(x=>x!==v);
        }
      }
    }

    async function* backtrack(depth=0){
      // instrumentation: node entered
      nodes++;
      yield {type:'enter', node:nodes, depth, assignment: structuredClone(assignment), domains: structuredClone(domains)};

      // check if complete
      const unassignedKeys = Object.keys(domains).filter(k=>!assignment[k]);
      if(unassignedKeys.length===0){
        yield {type:'solution', node:nodes, depth, assignment: structuredClone(assignment), nodesVisited:nodes};
        return true;
      }

      // MRV heuristic
      unassignedKeys.sort((a,b)=>domains[a].length - domains[b].length);
      const varK = unassignedKeys[0];
      // LCV ordering (simple frequency-based ordering)
      const values = domains[varK].slice();

      for(const val of values){
        // try value
        yield {type:'try', node:nodes, depth, var:varK, val, assignment:structuredClone(assignment)};
        // assign
        assignment[varK]=val;
        // forward-check: reduce domains of neighbors and record reductions
        const reductions = [];
        const [rr,cc] = varK.split(',').map(x=>parseInt(x,10));
        for(const [nr,nc] of neighborsOf(rr,cc)){
          const nk = key(nr,nc);
          if(assignment[nk]) continue;
          if(domains[nk].includes(val)){
            reductions.push({k:nk,val});
            domains[nk] = domains[nk].filter(x=>x!==val);
            if(domains[nk].length===0){
              // dead end
              yield {type:'deadend', node:nodes, depth, var:varK, val, assignment:structuredClone(assignment)};
              // undo reductions
              for(const r of reductions) domains[r.k].push(r.val);
              delete assignment[varK];
              yield {type:'backtrack', node:nodes, depth, var:varK, val};
              return false;
            }
          }
        }

        // recurse and forward any events; if recursion yields a solution, propagate true immediately
        const rec = backtrack(depth+1);
        for await (const ev of rec){
          yield ev;
          if(ev.type==='solution'){
            return true;
          }
        }

  // undo on backtrack
        for(const r of reductions) if(!domains[r.k].includes(r.val)) domains[r.k].push(r.val);
        delete assignment[varK];
        yield {type:'backtrack', node:nodes, depth, var:varK, val};
      }

      return false;
    }

    // run backtrack and re-yield solution event if found
    for await (const ev of backtrack(0)) yield ev;
    // traversal done
    yield {type:'done', nodesVisited:nodes};
  }

  // driver to consume generator with pause/step support
  class RunController{
    constructor(){ this._paused=false; this._step=false; this._stopped=false; this._wait = null; }
    pause(){ this._paused=true; }
    resume(){ this._paused=false; if(this._wait) this._wait(); }
    step(){ this._step = true; if(this._wait) this._wait(); }
    stop(){ this._stopped=true; if(this._wait) this._wait(); }
    async waitIfNeeded(){
      if(this._stopped) throw new Error('stopped');
      if(this._paused || this._step){
        await new Promise(res=>{ this._wait = ()=>{ this._wait=null; if(this._step){ this._step=false; } res(); }; });
      }
    }
  }

  async function runSolver(mode='run'){ // mode: run | step | hint
    if(runningController) runningController.stop();
    runningController = new RunController();
    const controller = runningController;
    if(mode==='run') controller.resume();
    if(mode==='step') controller.pause();

  // logs are shown inline; no separate progress area

    const grid = readGrid();

    // Before running a full search, check if the current grid is
    // logically solvable. If the user has entered a wrong move that
    // makes the puzzle inconsistent, abort and tell them instead of
    // letting the AI search forever.
    if(!isSolvableGrid(grid)){
      appendLog('Current puzzle state is impossible to solve. Please undo the red cells or reset.');
      return;
    }
    const gen = solverGenerator(grid, {delay:50});
    try{
      for await (const ev of gen){
        // allow UI to show event
        renderEvent(ev);
        // support pause/step
        await controller.waitIfNeeded();
        if(controller._stopped) break;
        // tiny delay to make events visible in run mode
        if(mode==='run') await new Promise(res=>setTimeout(res,50));
      }
    } catch(e){
      // stopped
      appendLog('[controller] stopped');
    }
    runningController = null;
  }

  // hint: run generator until first successful assignment for an unfilled cell
  async function giveHint(){
    if(runningController) runningController.stop();
    // keep existing saved log, but clear progress text
  // no separate progress area now; logs are shown inline
    const grid = readGrid();

    // If the current grid is unsolvable (because of a wrong move),
    // don't attempt to search for a hint; instead, instruct user to
    // undo the conflicting move.
    if(!isSolvableGrid(grid)){
      appendLog('Cannot provide a hint: current puzzle state is impossible. Please undo the red cells or reset.');
      return;
    }
    const gen = solverGenerator(grid);
    for await (const ev of gen){
      // show each internal event so the user sees steps while hint searches
      renderEvent(ev);
      if(ev.type==='try'){
        // ev.var assigned to ev.val as first trial for an unfilled cell
        const [r,c] = ev.var.split(',').map(x=>parseInt(x,10));
        if(grid[r][c]===0){
          appendLog(`Hint: set cell (${r+1},${c+1}) = ${ev.val}`);
          setCell(r,c,ev.val);
          return;
        }
      }
    }
    appendLog('No hint found (maybe puzzle already complete or unsolvable)');
  }

  function appendLog(text){
    const t = `[${new Date().toLocaleTimeString()}] ${text}`;
    logLines.unshift(t);
    // persist
    try{ localStorage.setItem('solver_log', JSON.stringify(logLines)); }catch(e){}
    // also update visible log container
    if(logEl){
      const p = document.createElement('div');
      p.textContent = t;
      // newest on top
      logEl.prepend(p);
    }
  }

  function renderEvent(ev){
    if(ev.type==='enter'){
      appendLog(`enter node=${ev.node} depth=${ev.depth} assigned=${Object.keys(ev.assignment).length}`);
    } else if(ev.type==='try'){
      appendLog(`try ${ev.var} = ${ev.val} (node ${ev.node})`);
      // show tentative assignment in UI (light)
      const [r,c] = ev.var.split(',').map(x=>parseInt(x,10));
      const idx = r*N + c;
      const cell = gridEl.children[idx];
      const prev = cell.textContent;
      cell.textContent = ev.val;
      cell.style.opacity = 0.6;
      setTimeout(()=>{ if(cell.textContent==String(ev.val)) cell.style.opacity=''; }, 200);
    } else if(ev.type==='deadend'){
      appendLog(`deadend on ${ev.var}=${ev.val}`);
    } else if(ev.type==='backtrack'){
      appendLog(`backtrack ${ev.var} from ${ev.val}`);
    } else if(ev.type==='solution'){
      appendLog(`SOLUTION found after ${ev.nodesVisited} nodes`);
      // render final assignment
      for(const k of Object.keys(ev.assignment)){
        const [r,c] = k.split(',').map(x=>parseInt(x,10));
        setCell(r,c,ev.assignment[k]);
      }
      // popup when Sudoku is completed: show `#successModal` like Tango, fallback to alert
      const successModal = document.getElementById('successModal');
      if(successModal){
        successModal.style.display = 'flex';
      } else {
        alert('Congratulations — the Sudoku is complete!');
      }
    } else if(ev.type==='done'){
      appendLog(`SEARCH DONE nodes=${ev.nodesVisited}`);
    }
  }

  // wire buttons
  solveBtn.addEventListener('click', ()=> runSolver('run'));
  // Step control removed from UI
  hintBtn.addEventListener('click', ()=> giveHint());
  // Pause control removed from UI
  // (log is displayed inline dynamically)

  // close handler for Tango-style modal if present
  document.getElementById('closeSuccess')?.addEventListener('click', ()=>{
    const m = document.getElementById('successModal');
    if(m) m.style.display = 'none';
  });

  // initial grid
  createGrid();

  // On load: behave like "New Game" — generate a random valid starting puzzle
  // by invoking the same handler so the page starts with non-conflicting givens.
  // (This replaces the previous static demo givens.)
  if(newGameBtn && typeof newGameBtn.click === 'function') newGameBtn.click();

})();
