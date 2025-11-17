# zip_solver.py - Enhanced LinkedIn Zip Puzzle Solver
import random

def neighbors(r, c, H, W):
    """Return valid orthogonal neighbors"""
    for dr, dc in ((1,0), (-1,0), (0,1), (0,-1)):
        nr, nc = r + dr, c + dc
        if 0 <= nr < H and 0 <= nc < W:
            yield nr, nc

def find_cell(grid, value):
    """Find the position of a specific value in the grid"""
    H, W = len(grid), len(grid[0])
    for r in range(H):
        for c in range(W):
            if grid[r][c] == value:
                return (r, c)
    return None

def get_all_given_positions(grid):
    """Get all cells with given numbers"""
    H, W = len(grid), len(grid[0])
    givens = {}
    for r in range(H):
        for c in range(W):
            if grid[r][c] > 0:
                givens[grid[r][c]] = (r, c)
    return givens

def validate_givens_adjacency(givens, H, W):
    """Check if given numbers that are consecutive are adjacent"""
    sorted_nums = sorted(givens.keys())
    for i in range(len(sorted_nums) - 1):
        curr_num = sorted_nums[i]
        next_num = sorted_nums[i + 1]
        
        # Only check if they're consecutive
        if next_num == curr_num + 1:
            r1, c1 = givens[curr_num]
            r2, c2 = givens[next_num]
            dist = abs(r1 - r2) + abs(c1 - c2)
            if dist != 1:
                return False
    return True

def solve_zip_backtrack(grid, current_num, target_num, path, givens):
    """Enhanced backtracking with intelligent neighbor ordering"""
    H, W = len(grid), len(grid[0])
    
    # Base case: we've placed all numbers
    if current_num > target_num:
        return path
    
    # If this number is already given
    if current_num in givens:
        r, c = givens[current_num]
        # Check if it's adjacent to previous number
        if len(path) > 0:
            prev_r, prev_c = path[-1]
            if abs(r - prev_r) + abs(c - prev_c) != 1:
                return None  # Given number is not adjacent to path
        return solve_zip_backtrack(grid, current_num + 1, target_num, path + [(r, c)], givens)
    
    # Current number is not given, need to place it
    if len(path) == 0:
        return None  # Should have at least number 1 given
    
    last_r, last_c = path[-1]
    
    # Get neighbors and prioritize those leading toward next given
    nbr_list = list(neighbors(last_r, last_c, H, W))
    
    # If next given number exists, prioritize neighbors closer to it
    if current_num + 1 in givens:
        target_r, target_c = givens[current_num + 1]
        nbr_list.sort(key=lambda pos: abs(pos[0] - target_r) + abs(pos[1] - target_c))
    
    # Try each neighbor
    for nr, nc in nbr_list:
        if grid[nr][nc] == 0:  # Empty cell
            # Place the number
            grid[nr][nc] = current_num
            result = solve_zip_backtrack(grid, current_num + 1, target_num, path + [(nr, nc)], givens)
            if result is not None:
                return result
            # Backtrack
            grid[nr][nc] = 0
    
    return None

def solve_zip_with_restarts(grid, max_restarts=3):
    """Try solving with random restarts for difficult puzzles"""
    H, W = len(grid), len(grid[0])
    target_num = H * W
    
    givens = get_all_given_positions(grid)
    
    # Validate givens first
    if not validate_givens_adjacency(givens, H, W):
        return None
    
    if 1 not in givens:
        return None
    
    for attempt in range(max_restarts):
        grid_copy = [row[:] for row in grid]
        result = solve_zip_backtrack(grid_copy, 1, target_num, [], givens)
        
        if result is not None and len(result) == target_num:
            solution = {}
            for i, (r, c) in enumerate(result):
                solution[i + 1] = (r, c)
            return solution
    
    return None

def solve_zip(input_grid):
    """Main solver function - returns path as dictionary {num: (r,c)}"""
    H, W = len(input_grid), len(input_grid[0])
    target_num = H * W
    
    # Create working copy
    grid = [row[:] for row in input_grid]
    givens = get_all_given_positions(grid)
    
    # Validate basic requirements
    if 1 not in givens:
        return None  # No starting point
    
    if not validate_givens_adjacency(givens, H, W):
        return None  # Given numbers not properly connected
    
    # Try direct backtracking first
    result = solve_zip_backtrack(grid, 1, target_num, [], givens)
    
    if result is not None and len(result) == target_num:
        solution = {}
        for i, (r, c) in enumerate(result):
            solution[i + 1] = (r, c)
        return solution
    
    # If failed, try with random restarts
    return solve_zip_with_restarts(input_grid, max_restarts=3)

def hint_zip(input_grid):
    """Provide a hint for the next move"""
    solution = solve_zip(input_grid)
    
    if solution is None:
        return None
    
    H, W = len(input_grid), len(input_grid[0])
    
    # Find the first empty cell in the solution path
    for num in sorted(solution.keys()):
        r, c = solution[num]
        if input_grid[r][c] == 0:
            return (num, (r, c))
    
    return None