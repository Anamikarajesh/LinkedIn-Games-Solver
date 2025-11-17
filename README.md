# N-Queens AI Solver

> This project is an interactive, browser-based game for solving the N-Queens problem. It was created as a component of the "LinkedIn Game Solver" team project.

The application runs entirely in the browser, using **Pyodide** to load a Python backend for its AI logic. This allows for a serverless architecture that's easy to run and test.

---

##  Features

* **Fully Interactive UI:** Users can play the game themselves by clicking to place and remove queens.
* **Dynamic Board:** The chessboard and queen icons are fully responsive and resize perfectly based on the N-value.
* **Real-time Conflict Highlighting:** When a user places a queen that conflicts with another, both queens are immediately highlighted in red, and the user is notified.
* **Conflict Lock:** To enforce the rules, the game prevents the user from placing new queens while a conflict exists on the board.
* **Undo Move:** A dedicated "Undo" button allows the user to take back their last move, whether it was placing a queen, removing one, or receiving an AI hint.
* **AI Solver:** A "Solve (AI)" button that uses a **Simulated Annealing** algorithm to find a complete solution.
* **Smart AI Hint:** A "Hint (AI)" button that uses a **Backtracking** algorithm to analyze the user's current board and suggest a single valid next move.
* **Robust Solver Logic:** The "Solve (AI)" button automatically retries the algorithm multiple times to ensure a solution is found, hiding the "unlucky" attempts from the user.
* **AI Progress Log:** A panel that displays the real-time status of the AI, including which algorithm is running, its attempts, and any successes or errors.
* **Congratulations Modal:** A pop-up appears when the user or the AI successfully solves the puzzle. It appears after a 1-second delay so the user can see the final board state.

---

##  Screenshots



A screenshot of the main game board and controls
<img width="1878" height="944" alt="image" src="https://github.com/user-attachments/assets/efecdb77-00d9-46d8-911c-e242a8d8c618" />


A screenshot showing the red conflict highlighting and the warning bar
<img width="1897" height="934" alt="image" src="https://github.com/user-attachments/assets/bc0b9139-9307-484b-bbd3-824cec3934fe" />

A screenshot showing the congratulations pop-up over a solved board
<img width="1918" height="944" alt="image" src="https://github.com/user-attachments/assets/0a354e54-a030-408a-be31-c0dc790503e2" />

Ai progress display
<img width="834" height="836" alt="image" src="https://github.com/user-attachments/assets/6e31f81d-897b-4f5f-bd9a-b7acfbfcdcf4" />


---

##  AI Concepts & Algorithms Used

This project uses two different families of AI algorithms to showcase different approaches to solving a Constraint Satisfaction Problem (CSP).

### Solve (AI): Simulated Annealing (SA)

* **Concept:** Simulated Annealing is a probabilistic local search algorithm inspired by the process of annealing in metallurgy. It's a "smart guesser."

* **How it Works:**
    1.  It starts with a random, invalid board.
    2.  It "jiggles" a random queen to a new spot and calculates the number of conflicts (the "energy").
    3.  If the new move is better (fewer conflicts), it's always accepted.
    4.  If the new move is worse, it might still be accepted based on a probability. This "luck" allows it to escape bad starting positions (local minima) and find the true solution (global minimum).

* **Our Implementation:** SA is very fast and lightweight, making it ideal for large N values in a browser. Its only weakness is that it's "unlucky" and can fail. We solved this by creating an auto-retry loop in JavaScript. When the user clicks "Solve," the `handleSolve()` function will call the Python solver up to 5 times until it gets a successful solution, making it feel robust to the user.

### Hint (AI): Backtracking

* **Concept:** Backtracking is a systematic, brute-force search algorithm. It is a classic "complete" solver, meaning it is guaranteed to find a solution if one exists.

* **How it Works:**
    1.  It takes the user's current board as its starting point.
    2.  It finds the first empty column and tries to place a queen in the first row.
    3.  It checks if this placement is "safe."
    4.  If safe, it recursively moves to the next column.
    5.  If not safe (or if a future step leads to a dead end), it *backtracks*, removes the queen, and tries the next row.

* **Our Implementation:** This is the perfect "smart hint" because it doesn't just give a random answer; it gives the first correct step of a real solution based on the user's current progress.

---

##  Limitations

* **Hint AI Performance:** Backtracking has a time complexity of $O(N!)$, which is incredibly slow. To prevent the user's browser from freezing, the "Hint (AI)" button is automatically disabled for N > 14.
* **Board Size Cap:** The board size is capped at N = 25. While the SA solver could theoretically handle larger N, drawing a 100x100 grid in a browser would be unusable and crash the page.
* **Pyodide Load Time:** The Python runtime (Pyodide) can take a few seconds to load when the page is first opened. The UI buttons are disabled during this time to prevent errors.

---

##  How to Run

No server is needed! This project runs 100% in the browser.

1.  Make sure all files (`index.html`, `queens_game.html`, `queens_game.js`, `queens_solver.py`, etc.) are in the same folder.
2.  Install a simple local server extension for your code editor (like **Live Server** for VS Code).
3.  Right-click `index.html` and "Open with Live Server".
4.  Click the link for the "N-Queens Solver".
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


# Tango — Sun & Moon (LinkedIn Game Solver)

A fully interactive AI solver for the **Tango (Sun & Moon)** puzzle, built as part of the *LinkedIn Games Solver* team project.  
Runs **entirely in the browser** using **Pyodide** to execute Python logic client-side.

---

##  Puzzle Rules

Tango is played on a **6×6 grid**. Each cell contains either a:

- ☀️ **Sun** → represented as `1`
- 🌙 **Moon** → represented as `0`

You must fill the grid obeying:

### 1️ Adjacency Rule
No 3 identical symbols can appear consecutively in any row or column.  
(☀️☀️ is OK, ☀️☀️☀️ is not.)

### 2️ Balance Rule
Each row and each column contains **exactly three Suns and three Moons**.

### Equality / Opposite Rules
Some cell pairs have special relations:

- `=` → both cells **must be the same**  
- `×` → both cells **must be opposite**

### Unique Solution
Every generated puzzle has exactly **one** solution.

---

##  Features

###  Interactive UI
- Click a cell to place ☀️ or 🌙  
- Prefilled cells are locked  
- Invalid moves highlight in **red**

###  Random Puzzle Generator
- Each new puzzle generates:
  - A **new solved grid**
  - Random placement of `=` and `×` between adjacent cells
  - A random set of visible starting cells

###  Live Error Checking
The UI instantly detects:
- Triple adjacency violations  
- More than 3 Suns/Moons in row/col  
- Broken equal/opposite constraints  

### AI Solver (Python via Pyodide)
Uses a CSP-based solver implementing:
- **Backtracking**
- **MRV heuristic**
- **Forward checking**
  
### AI Hint System
Shows exactly **one correct next move**.

### Step-by-Step Solve Animation
AI fills each missing cell one by one with small delays.

---

##  Algorithms Used

### Backtracking + MRV + Forward Checking
The solver is a full CSP engine:

- **Variables** → 36 cells  
- **Domains** → {0, 1}  
- **Constraints** → adjacency, balance, equal/opposite relations  

The MRV heuristic chooses the next cell that has the smallest valid domain, dramatically improving search speed.

---



