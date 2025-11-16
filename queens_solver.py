import json
import random
import math

# --- SOLVER 1: SIMULATED ANNEALING (for "Solve AI") ---
# This is the fast, lightweight, "unlucky" solver.
# We've tuned its parameters to be fast.

class SimulatedAnnealingSolver:
    def __init__(self, n, initial_temp=1000, alpha=0.998, max_steps=1000000):
        self.n = n
        self.initial_temp = initial_temp
        self.alpha = alpha
        self.max_steps = max_steps
        self.state = list(range(n))

    def calculate_conflicts(self, state):
        """Calculates the total number of attacking queen pairs."""
        conflicts = 0
        n = len(state)
        for i in range(n):
            for j in range(i + 1, n):
                # Check for row conflicts
                if state[i] == state[j]:
                    conflicts += 1
                # Check for diagonal conflicts
                elif abs(state[i] - state[j]) == abs(i - j):
                    conflicts += 1
        return conflicts

    def get_random_neighbor(self, state):
        """Moves one queen to a new random row in its column."""
        new_state = list(state)
        n = len(new_state)
        col = random.randrange(n)
        new_row = random.randrange(n)
        
        while new_row == new_state[col]:
            new_row = random.randrange(n)
            
        new_state[col] = new_row
        return new_state

    def random_state(self):
        """Generates a random state (one queen per column)."""
        return [random.randrange(self.n) for _ in range(self.n)]

    def solve(self):
        """Attempts to solve using simulated annealing."""
        current_state = self.random_state()
        current_cost = self.calculate_conflicts(current_state)
        temp = self.initial_temp

        for i in range(self.max_steps):
            if current_cost == 0:
                # Found a solution
                return self.format_solution(current_state)
            
            temp *= self.alpha
            if temp < 0.001:
                break # Cooled down too much

            new_state = self.get_random_neighbor(current_state)
            new_cost = self.calculate_conflicts(new_state)
            delta_e = new_cost - current_cost

            if delta_e < 0 or random.random() < math.exp(-delta_e / temp):
                current_state = new_state
                current_cost = new_cost
        
        # Failed this attempt
        return {"status": "error", "message": f"SA failed after {self.max_steps} iterations."}

    def format_solution(self, state):
        solution = []
        for col, row in enumerate(state):
            solution.append({"row": row, "col": col})
        return {"status": "success", "solution": solution}

# --- SOLVER 2: BACKTRACKING (for "Hint AI") ---
# This is the smart hint solver (unchanged)

class BacktrackingSolver:
    def __init__(self, board):
        self.n = len(board)
        self.board = board
        self.solution_hint = None

    def is_safe(self, r, c):
        # Optimized check: only check for queens already on the board
        for i in range(1, self.n):
            if 0 <= r-i < self.n and self.board[r-i][c] == 1: return False # Up
            if 0 <= r+i < self.n and self.board[r+i][c] == 1: return False # Down
            if 0 <= c-i < self.n and self.board[r][c-i] == 1: return False # Left
            if 0 <= c+i < self.n and self.board[r][c+i] == 1: return False # Right
            if 0 <= r-i < self.n and 0 <= c-i < self.n and self.board[r-i][c-i] == 1: return False # Up-Left
            if 0 <= r+i < self.n and 0 <= c-i < self.n and self.board[r+i][c-i] == 1: return False # Down-Left
            if 0 <= r-i < self.n and 0 <= c+i < self.n and self.board[r-i][c+i] == 1: return False # Up-Right
            if 0 <= r+i < self.n and 0 <= c+i < self.n and self.board[r+i][c+i] == 1: return False # Down-Right
        return True

    def solve(self):
        # Find first column that is completely empty
        empty_col = -1
        for c in range(self.n):
            if all(self.board[r][c] == 0 for r in range(self.n)):
                empty_col = c
                break
        
        # If no empty cols, board must be full (or user-solved)
        if empty_col == -1: 
            return True # Assume valid, as is_safe checks placements

        # Try to place a queen in this empty col
        for r in range(self.n):
            if self.is_safe(r, empty_col): # Check if this spot is safe given user's board
                self.board[r][empty_col] = 1 # Place
                
                if self.solution_hint is None:
                    # This is the first valid move we're trying. This is our hint.
                    self.solution_hint = {"row": r, "col": empty_col}
                
                if self.solve(): # Recurse
                    return True # Found a full solution
                
                # Backtrack
                self.board[r][empty_col] = 0
                if self.solution_hint == {"row": r, "col": empty_col}:
                    # This hint didn't work out, clear it so we can try the next
                    self.solution_hint = None
        
        return False # No solution found from this path

# --- Global Functions for Pyodide (JavaScript) to call ---

def solve_n_queens_sa(n_val):
    try:
        # We can use generous parameters because it's fast
        if n_val <= 12:
            solver = SimulatedAnnealingSolver(n_val, initial_temp=1000, alpha=0.998, max_steps=500000)
        else: # For N > 12
            solver = SimulatedAnnealingSolver(n_val, initial_temp=5000, alpha=0.999, max_steps=1500000)
            
        result = solver.solve()
        return json.dumps(result)
    except Exception as e:
        return json.dumps({"status": "error", "message": f"Python error in SA: {str(e)}"})

def get_smart_hint(board_json):
    try:
        board = json.loads(board_json)
        solver = BacktrackingSolver(board)
        
        if solver.solve():
            if solver.solution_hint:
                return json.dumps({"status": "success", "hint": solver.solution_hint})
            else:
                return json.dumps({"status": "error", "message": "Board is already solved!"})
        else:
            return json.dumps({"status": "error", "message": "No solution possible from this board."})
            
    except Exception as e:
        return json.dumps({"status": "error", "message": f"Python error in Hint: {str(e)}"})