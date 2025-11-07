# Mini Sudoku — LinkedIn Games Solver (Mini Sudoku)

This is a small static web app that implements a 6x6 (mini) Sudoku solver with CSP instrumentation. It is intended as the first of several LinkedIn game solvers (mini-sudoku, queens, tango, zip).

Features:
- Punchy dark UI with hoverable game cards and glassy in-grid styling.
- Manual play: click a cell, use the number pad to fill; givens stay locked and invalid entries highlight in red.
- Hint (AI): runs the CSP search until it finds the next promising assignment and fills that cell.
- Solve (AI): runs the solver to completion and fills the board with a solution (if found).
- New Game: generates a random, solvable 6×6 puzzle with 6–10 givens.
- AI Progress log: streams solver events (`enter`, `try`, `deadend`, `backtrack`, `solution`, `done`) with timestamps.

How to use
1. Open `index.html` in your browser (no server required).
2. Choose **Mini Sudoku** from the landing page to load the solver.
3. Click a cell to select it (press `Esc` or click outside the grid to deselect). Use the number pad to enter values; invalid moves flash red until corrected.
4. Use the buttons: `Hint`, `Solve`, `Clear` (clears non-givens), `New Game`, and `X` on the pad to clear the active cell.

Implementation notes
- Solver: CSP backtracking with MRV (minimum remaining values) and simple forward-checking. A lightweight solvability check is used for user entries and new game generation.
- The search yields events: `enter`, `try`, `deadend`, `backtrack`, `solution`, and `done`. Events are logged live and mirrored to `localStorage` for later inspection.
- UI selection state clears automatically when clicking away or pressing `Esc`, and invalid flags are removed as soon as the cell is cleared or corrected.

Next steps / Improvements
- Add a more robust LCV heuristic and constraint propagation (AC-3) for performance.
- Add a visual tree explorer showing the current path in the search tree.
- Flesh out the Queens, Tango, and Zip solvers referenced on the landing page.
- Add unit tests or snapshot-based smoke tests for the generator and validity checks.
