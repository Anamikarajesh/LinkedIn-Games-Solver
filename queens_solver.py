"""
Queens Puzzle Solver - Advanced AI Algorithm
Uses Backtracking with Forward Checking and MRV heuristic
Solves the Queens puzzle with region constraints as a CSP
"""

def get_domain(row, col, queens, regions, board_size):
    """
    Get the valid domain (possible values) for a cell position.
    Returns True if queen can be placed, False otherwise.
    
    Args:
        row: Row index
        col: Column index
        queens: List of existing queen positions
        regions: 2D list representing colored regions
        board_size: Size of the board
    
    Returns:
        bool: True if placement is valid
    """
    # Check row constraint
    for queen in queens:
        if queen['row'] == row:
            return False
    
    # Check column constraint
    for queen in queens:
        if queen['col'] == col:
            return False
    
    # Check region constraint
    region = regions[row][col]
    for queen in queens:
        if regions[queen['row']][queen['col']] == region:
            return False
    
    # Check adjacency constraint (no touching, including diagonally)
    for dr in range(-1, 2):
        for dc in range(-1, 2):
            if dr == 0 and dc == 0:
                continue
            new_row = row + dr
            new_col = col + dc
            for queen in queens:
                if queen['row'] == new_row and queen['col'] == new_col:
                    return False
    
    return True


def get_row_domains(row, queens, regions, board_size):
    """
    Get all valid columns for a given row (Forward Checking).
    
    Args:
        row: Row index to check
        queens: Current list of placed queens
        regions: 2D list representing colored regions
        board_size: Size of the board
    
    Returns:
        list: List of valid column indices for this row
    """
    valid_cols = []
    for col in range(board_size):
        if get_domain(row, col, queens, regions, board_size):
            valid_cols.append(col)
    return valid_cols


def select_unassigned_variable_mrv(queens, regions, board_size):
    """
    Select next variable using Minimum Remaining Values (MRV) heuristic.
    Chooses the row with the fewest valid placements.
    
    Args:
        queens: Current list of placed queens
        regions: 2D list representing colored regions
        board_size: Size of the board
    
    Returns:
        int: Row index with minimum remaining values, or None if all assigned
    """
    assigned_rows = set(q['row'] for q in queens)
    
    min_row = None
    min_domain_size = board_size + 1
    
    for row in range(board_size):
        if row in assigned_rows:
            continue
        
        # Count valid placements for this row
        domain = get_row_domains(row, queens, regions, board_size)
        domain_size = len(domain)
        
        if domain_size == 0:
            # Dead end - no valid placements
            return row  # Return immediately to backtrack
        
        if domain_size < min_domain_size:
            min_domain_size = domain_size
            min_row = row
    
    return min_row


def forward_check(row, col, queens, regions, board_size):
    """
    Check if placing a queen at (row, col) leaves valid options for remaining rows.
    This is the Forward Checking component of the algorithm.
    
    Args:
        row: Row where queen will be placed
        col: Column where queen will be placed
        queens: Current list of placed queens
        regions: 2D list representing colored regions
        board_size: Size of the board
    
    Returns:
        bool: True if future assignments are still possible
    """
    # Simulate placing the queen
    temp_queens = queens + [{'row': row, 'col': col}]
    assigned_rows = set(q['row'] for q in temp_queens)
    
    # Check if all unassigned rows still have valid domains
    for check_row in range(board_size):
        if check_row in assigned_rows:
            continue
        
        # Check if this row has at least one valid placement
        domain = get_row_domains(check_row, temp_queens, regions, board_size)
        if len(domain) == 0:
            return False  # Future assignment impossible
    
    return True


def solve_queens_csp(regions, queens=None):
    """
    Solve Queens puzzle using CSP with Backtracking, Forward Checking, and MRV.
    
    Algorithm:
    1. Use MRV heuristic to select the most constrained variable (row)
    2. For each valid value in that variable's domain
    3. Apply Forward Checking to ensure future assignments are possible
    4. Recursively solve remaining subproblem
    5. Backtrack if no solution found
    
    Args:
        regions: 2D list representing colored regions
        queens: Current list of placed queens (for recursion)
    
    Returns:
        list: Solution as list of queen positions, or None if no solution
    """
    if queens is None:
        queens = []
    
    board_size = len(regions)
    
    # Base case: all rows assigned
    if len(queens) == board_size:
        return queens
    
    # MRV: Select row with minimum remaining values
    row = select_unassigned_variable_mrv(queens, regions, board_size)
    
    if row is None:
        # All variables assigned
        return queens
    
    # Get valid domain for selected row (Forward Checking already applied in MRV)
    valid_cols = get_row_domains(row, queens, regions, board_size)
    
    # Try each value in domain
    for col in valid_cols:
        # Forward Checking: verify this placement doesn't eliminate all options for other rows
        if forward_check(row, col, queens, regions, board_size):
            # Make assignment
            new_queens = queens + [{'row': row, 'col': col}]
            
            # Recursive call
            result = solve_queens_csp(regions, new_queens)
            
            if result is not None:
                return result
            
            # Implicit backtrack (by trying next value in loop)
    
    # No solution found from this state
    return None


def solve_queens(regions, queens=None, row=0):
    """
    Main entry point for solving - uses advanced CSP algorithm.
    
    Args:
        regions: 2D list representing colored regions
        queens: Current list of placed queens (ignored, kept for API compatibility)
        row: Current row (ignored, kept for API compatibility)
    
    Returns:
        list: Solution as list of queen positions, or None if no solution
    """
    return solve_queens_csp(regions)


def get_hint(regions, queens):
    """
    Get a hint for the next valid queen placement using intelligent search.
    Uses MRV heuristic to suggest the most constrained row first.
    
    Args:
        regions: 2D list representing colored regions
        queens: Current list of placed queens
    
    Returns:
        dict: Next valid position as {'row': r, 'col': c}, or None if no hint
    """
    board_size = len(regions)
    assigned_rows = set(q['row'] for q in queens)
    
    # If no queens placed yet, start with MRV
    if len(queens) == 0:
        row = select_unassigned_variable_mrv(queens, regions, board_size)
        if row is not None:
            valid_cols = get_row_domains(row, queens, regions, board_size)
            if valid_cols:
                return {'row': row, 'col': valid_cols[0]}
    
    # Use MRV to find best row to place next queen
    best_row = select_unassigned_variable_mrv(queens, regions, board_size)
    
    if best_row is not None:
        # Get valid columns for this row
        valid_cols = get_row_domains(best_row, queens, regions, board_size)
        
        # Return first valid placement that passes forward checking
        for col in valid_cols:
            if forward_check(best_row, col, queens, regions, board_size):
                return {'row': best_row, 'col': col}
        
        # If forward checking failed, return first valid placement
        if valid_cols:
            return {'row': best_row, 'col': valid_cols[0]}
    
    # Fallback: find any valid placement
    for row in range(board_size):
        if row in assigned_rows:
            continue
        for col in range(board_size):
            if get_domain(row, col, queens, regions, board_size):
                return {'row': row, 'col': col}
    
    return None


def validate_solution(queens, regions):
    """
    Validate if a solution is correct.
    
    Args:
        queens: List of queen positions
        regions: 2D list representing colored regions
    
    Returns:
        bool: True if solution is valid, False otherwise
    """
    board_size = len(regions)
    
    # Check if we have correct number of queens
    if len(queens) != board_size:
        return False
    
    # Check each constraint
    for i, queen in enumerate(queens):
        for j, other in enumerate(queens):
            if i >= j:
                continue
            
            # Same row
            if queen['row'] == other['row']:
                return False
            
            # Same column
            if queen['col'] == other['col']:
                return False
            
            # Same region
            if regions[queen['row']][queen['col']] == regions[other['row']][other['col']]:
                return False
            
            # Adjacent (including diagonal)
            if abs(queen['row'] - other['row']) <= 1 and abs(queen['col'] - other['col']) <= 1:
                return False
    
    return True