# tango_solver.py — Python CSP solver for Sun & Moon (Takuzu-like) + equal/opposite pairs
from typing import List, Tuple, Optional

N = 6  # 6x6 board
Pair = Tuple[int,int,int,int]  # (r1,c1,r2,c2)

def count_in_row(g, r, v): return sum(1 for x in g[r] if x==v)
def count_in_col(g, c, v): return sum(1 for r in range(N) if g[r][c]==v)

def adjacency_ok_line(line: List[Optional[int]]) -> bool:
    for i in range(len(line)-2):
        a,b,c = line[i], line[i+1], line[i+2]
        if a is not None and b is not None and c is not None and a==b==c:
            return False
    return True

def adjacency_ok(g: List[List[Optional[int]]]) -> bool:
    for r in range(N):
        if not adjacency_ok_line(g[r]): return False
    for c in range(N):
        if not adjacency_ok_line([g[r][c] for r in range(N)]): return False
    return True

def balance_ok_partial(g: List[List[Optional[int]]]) -> bool:
    half = N//2
    for r in range(N):
        if count_in_row(g,r,1)>half or count_in_row(g,r,0)>half: return False
    for c in range(N):
        if count_in_col(g,c,1)>half or count_in_col(g,c,0)>half: return False
    return True

def equality_ok(g, equals: List[Pair]) -> bool:
    for (r1,c1,r2,c2) in equals:
        a, b = g[r1][c1], g[r2][c2]
        if a is not None and b is not None and a!=b: return False
    return True

def opposite_ok(g, opps: List[Pair]) -> bool:
    for (r1,c1,r2,c2) in opps:
        a, b = g[r1][c1], g[r2][c2]
        if a is not None and b is not None and a==b: return False
    return True

def partial_valid(g, equals, opps) -> bool:
    return adjacency_ok(g) and balance_ok_partial(g) and equality_ok(g,equals) and opposite_ok(g,opps)

def complete(g) -> bool:
    for r in range(N):
        for c in range(N):
            if g[r][c] not in (0,1):
                return False
    return True

def solved(g, equals, opps) -> bool:
    if not complete(g): return False
    half=N//2
    for r in range(N):
        if count_in_row(g,r,1)!=half: return False
    for c in range(N):
        if count_in_col(g,c,1)!=half: return False
    return partial_valid(g,equals,opps)

def build_domains(g, equals, opps):
    dom = {}
    for r in range(N):
        for c in range(N):
            dom[(r,c)] = [g[r][c]] if g[r][c] in (0,1) else [0,1]

    changed=True
    half=N//2
    while changed:
        changed=False
        # balance pruning
        for r in range(N):
            suns = count_in_row(g,r,1); moons= count_in_row(g,r,0)
            for c in range(N):
                if g[r][c] in (0,1): continue
                cand = dom[(r,c)]
                new = [v for v in cand if not ((v==1 and suns+1>half) or (v==0 and moons+1>half))]
                if new!=cand:
                    dom[(r,c)] = new; changed=True
                    if not new: return None
        for c in range(N):
            suns = count_in_col(g,c,1); moons= count_in_col(g,c,0)
            for r in range(N):
                if g[r][c] in (0,1): continue
                cand = dom[(r,c)]
                new = [v for v in cand if not ((v==1 and suns+1>half) or (v==0 and moons+1>half))]
                if new!=cand:
                    dom[(r,c)] = new; changed=True
                    if not new: return None

        # adjacency pruning
        for r in range(N):
            for c in range(N):
                if g[r][c] in (0,1): continue
                cand = dom[(r,c)]
                line = g[r][:]
                def okv(v):
                    line[c]=v
                    return adjacency_ok_line(line)
                new=[v for v in cand if okv(v)]
                if new!=cand:
                    dom[(r,c)]=new; changed=True
                    if not new: return None
                line[c]=None
        for c in range(N):
            col = [g[r][c] for r in range(N)]
            for r in range(N):
                if g[r][c] in (0,1): continue
                cand = dom[(r,c)]
                def okv(v):
                    col[r]=v
                    res=adjacency_ok_line(col)
                    col[r]=None
                    return res
                new=[v for v in cand if okv(v)]
                if new!=cand:
                    dom[(r,c)]=new; changed=True
                    if not new: return None

        # equals/opposites propagation
        for (r1,c1,r2,c2) in equals:
            a=g[r1][c1]; b=g[r2][c2]
            if a in (0,1) and b not in (0,1):
                if a in dom[(r2,c2)]: 
                    if dom[(r2,c2)] != [a]: dom[(r2,c2)] = [a]; changed=True
                else: return None
            if b in (0,1) and a not in (0,1):
                if b in dom[(r1,c1)]: 
                    if dom[(r1,c1)] != [b]: dom[(r1,c1)] = [b]; changed=True
                else: return None
        for (r1,c1,r2,c2) in opps:
            a=g[r1][c1]; b=g[r2][c2]
            if a in (0,1) and b not in (0,1):
                opt = 1-a
                if opt in dom[(r2,c2)]: 
                    if dom[(r2,c2)] != [opt]: dom[(r2,c2)] = [opt]; changed=True
                else: return None
            if b in (0,1) and a not in (0,1):
                opt = 1-b
                if opt in dom[(r1,c1)]: 
                    if dom[(r1,c1)] != [opt]: dom[(r1,c1)] = [opt]; changed=True
                else: return None
    return dom

def choose_cell(g, dom):
    best=None; bestlen=99
    for r in range(N):
        for c in range(N):
            if g[r][c] in (0,1): continue
            l=len(dom[(r,c)])
            if l<bestlen:
                best=(r,c); bestlen=l
    return best

def backtrack(g, equals, opps):
    dom = build_domains(g, equals, opps)
    if dom is None: return None
    if solved(g, equals, opps): return g
    cell = choose_cell(g, dom)
    if cell is None: return None
    r,c = cell
    for v in dom[(r,c)]:
        g[r][c]=v
        if partial_valid(g, equals, opps):
            res = backtrack(g, equals, opps)
            if res is not None: return res
        g[r][c]=None
    return None

def solve_grid(grid: List[List[Optional[int]]], equals: List[Pair], opps: List[Pair]):
    g = [[grid[r][c] if grid[r][c] in (0,1) else None for c in range(N)] for r in range(N)]
    res = backtrack(g, equals, opps)
    return res

def hint_cell(grid: List[List[Optional[int]]], equals: List[Pair], opps: List[Pair]):
    sol = solve_grid(grid, equals, opps)
    if sol is None: return None
    for r in range(N):
        for c in range(N):
            if grid[r][c] not in (0,1):
                return (r,c, sol[r][c])
    return None
