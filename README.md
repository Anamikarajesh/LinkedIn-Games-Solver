# Mini Sudoku — LinkedIn Games Solver (Mini Sudoku)

This is a small static web app that implements a 6x6 (mini) Sudoku solver with CSP instrumentation. It is intended as the first of several LinkedIn game solvers (mini-sudoku, queens, tango, zip).

Features:
- Manual play: click a cell, use the number pad to fill. Prefilled cells are protected.
- Hint (AI): runs the CSP search until it finds the next promising assignment and fills that cell.
- Step (AI): run the search in step-mode so you can observe internal events (enter node, try value, backtrack).
- Solve (AI): run the solver to completion and fill the board with a solution (if found).
- Progress panel and log: shows node counts, current node, events and internal steps.

How to open
1. Open `index.html` in your browser (no server is required).
2. Enter the puzzle from the LinkedIn screenshot into the grid by clicking the cells and using the number pad. Mark the givens as prefilled by using the initial state (the provided demo pre-fills a few cells).
3. Use the buttons: `Hint`, `Step`, `Solve`, `Pause`, `Clear`.

Implementation notes
- Solver: CSP backtracking with MRV (minimum remaining values) and simple forward-checking. The solver yields instrumentation events using an async generator so the UI can update while it searches.
- The search yields events: `enter` (node visited), `try` (variable=value attempted), `deadend`, `backtrack`, `solution`, and `done`.

Next steps / Improvements
- Add a more robust LCV heuristic and constraint propagation (AC-3) for performance.
- Add a visual tree explorer showing current path in the search tree.
- Add other LinkedIn game solvers (queens, tango, zip) and a common UI.
