# LinkedIn Games Solver

## Table of Contents
1. [Mini Sudoku — LinkedIn Games Solver (Mini Sudoku) - Anamika Rajesh](#mini-sudoku--linkedin-games-solver-mini-sudoku)
2. [Queens AI Solver - Sneha Nagmoti](#queens-ai-solver)
3. [Tango — Sun & Moon (LinkedIn Game Solver) - Ritika Singh Katoch](#tango--sun--moon-linkedin-game-solver)
4. [Zip — LinkedIn Game Solver - Bonta Aalaya](#zip--linkedin-game-solver)

# Mini Sudoku — LinkedIn Games Solver (Mini Sudoku)

A fully interactive 6×6 Sudoku variant with CSP instrumentation, hints, and a random puzzle generator. It is the entry point on the landing page and shares the same neon-dark look as the other LinkedIn mini-game solvers.

---

## Puzzle Rules
- 6×6 grid using digits **1–6** in every row and column.
- 3×2 sub-boxes (3 columns × 2 rows) must also contain the digits 1–6 exactly once.
- Prefilled givens remain locked; free cells accept player input or solver assignments.
- Invalid moves (duplicate in row/column/box) are immediately highlighted.

## Features
### Manual Play & UX
- Click a cell and use the glassy number pad to enter digits; `Esc` or clicking outside clears the selection.
- The `X` pad button quickly clears the active cell unless it is a given.
- Locked givens, tentative entries, and invalid states all have distinct styles for quick scanning.

### AI Assistance
- **Hint (AI):** Runs the CSP generator until it finds the next credible assignment and fills exactly one cell.
- **Solve (AI):** Streams the entire CSP search, filling the board once a solution is found and logging every event.
- **New Game:** Generates a solvable random puzzle with 6–10 givens, validating each candidate with the silent solver.

### Instrumented Progress Log
- Every solver event (`enter`, `try`, `deadend`, `backtrack`, `solution`, `done`) is timestamped and pushed to both the on-page log and `localStorage` for later inspection.
- Invalid manual moves also write to the log, making it easy to see why a number was rejected.

## AI Solver & Generation
- Uses backtracking with MRV (minimum remaining values) and lightweight forward checking for both validation and full solves.
- A fast “is this grid still solvable?” check guards every manual move so players are warned before painting themselves into a corner.
- The generator keeps sampling random givens until the silent solver certifies uniqueness/solvability.

## How to Run
1. Open `index.html` (Live Server or any static host).
2. Click **Mini Sudoku** on the landing page.
3. Play manually or click **Solve (AI)** to watch the instrumentation in action.

## Future Enhancements
- Add stronger propagation (LCV, AC-3) for even faster hints.
- Visualize the search tree or variable ordering in a side panel.
- Build smoke tests for puzzle generation and solvability checks.

---

# Queens AI Solver

> This project is an interactive, browser-based logic game for the "Queens Puzzle". It was created as an AI project, featuring a complete Constraint Satisfaction Problem (CSP) solver.

The application runs entirely in the browser, using **Pyodide** to load a Python backend for its advanced AI logic. This allows for a serverless architecture that runs a powerful AI solver directly on the client's machine.

##  Features

###  Interactive UI & Gameplay

* **Dynamic Board:** The game board and UI elements are responsive, supporting both 8x8 (Easy) and 10x10 (Hard) modes.

* **Vibrant Neon Aesthetic:** Features a dark mode UI (`#2d2d4a`) with glowing neon-colored regions and animated, glowing queens.

* **Real-time Validation:** The game instantly highlights invalid moves. If a user places a queen that conflicts with another, the cell flashes red, and the move is blocked until undone.

* **Manual Solver Mode:** Users can play the game themselves by clicking to place and remove queens.

* **Undo/Clear:** Full "Undo" support (using a move stack) and a "Clear" button allow for easy experimentation.

* **Congratulations Modal:** A pop-up appears (with a 10-second delay) when the user successfully solves the puzzle.

###  AI-Powered Assistance

* **Advanced AI Solver:** A "Solve (AI)" button that uses the full CSP solver to find a complete solution from any state.

* **Intelligent AI Hint:** A "Hint (AI)" button that analyzes the user's current board and suggests a single, optimal, valid next move.

* **Random Puzzle Generator:** A "Random Puzzle" button that loads a new, pre-vetted, solvable puzzle for the current difficulty.

* **AI Progress Log:** A dedicated panel displays the real-time status of the AI, including loading messages, hint calculations, and solver status.

##  Puzzle Rules

This is a modern logic puzzle, distinct from the classic N-Queens problem.

1. **Row Constraint:** Exactly one queen per row.

2. **Column Constraint:** Exactly one queen per column.

3. **Region Constraint:** Exactly one queen per colored region.

4. **Adjacency Constraint:** Queens cannot touch in any direction, including diagonally (i.e., they cannot be in adjacent squares).

**Difficulty Selection Screen**

**Main Game Interface (8x8)**

**Main Game Interface (10x10)**

**AI Progress Display**

##  AI Concepts & Algorithms Used

This project uses an advanced **Constraint Satisfaction Problem (CSP)** solver to showcase modern AI problem-solving techniques. The simple "dumb" backtracking is replaced with an optimized, heuristic-driven search.

### 1. Backtracking Search (The Engine)

* **Concept:** The core of the solver is a systematic, recursive algorithm that explores the "search tree" of all possible queen placements.

* **How it Works:** It tries to place a queen in a valid spot, then recursively calls itself to solve for the next variable (e.g., the next row). If it hits a "dead end" (a state from which no solution is possible), it **backtracks**, undoes the last move, and tries a different one.

### 2. Forward Checking (The Inference)

* **Concept:** This is a form of inference that makes the backtracking "smarter." Instead of finding out about a dead end 5 moves later, it looks ahead.

* **How it Works:** When the AI places a queen, it immediately propagates constraints. It checks all "unassigned" variables (e.t., future rows) to see if any of them have *zero* valid moves left. If placing a queen in row 2 makes it impossible to place a queen in row 7, the AI knows *immediately* that its move in row 2 was wrong and backtracks instantly, pruning a massive part of the search tree.

### 3. Minimum Remaining Values (MRV) Heuristic

* **Concept:** This is an intelligent heuristic for deciding *which* variable to try next. Instead of just going row-by-row, it asks: "What is the hardest part of the puzzle right now?"

* **How it Works:** At each step, the AI scans all unassigned rows and counts their valid moves. It then chooses to solve the **most constrained row** (the one with the *fewest* remaining valid placements) first. This "fail-fast" strategy finds dead ends much more quickly and dramatically speeds up the solver.

##  Limitations

* **Pyodide Load Time:** The Python runtime (Pyodide) is loaded from a CDN and can take a few seconds on the first page load. The UI buttons are disabled during this time to prevent errors.

* **Puzzle Generation:** True random puzzle *generation* is an extremely hard AI problem (even harder than solving). Randomly generated regions are almost always unsolvable. This project solves this by using a **Puzzle Bank** of pre-defined, solvable puzzles, which are loaded randomly when "Random Puzzle" is clicked.

* **AI Speed:** While fast, the AI solver is still running in the browser. For extremely large or complex boards (e.g., > 12x12), the JavaScript-to-Python communication and solving time could become noticeable.

##  How to Run

This project runs 100% in the browser but **requires a local server** to load the Python file (`queens_solver.py`) due to browser security rules (`fetch` API).

1. Make sure all three files (`queens_game.html`, `queens_game.js`, `queens_solver.py`) are in the same folder.

2. Open a terminal or command prompt in that folder.

3. Run a simple Python web server:

   ```bash
   # If you have Python 3
   python3 -m http.server
   
   # If the command above doesn't work, try
   python -m http.server
   ```

4. Open your web browser and go to: `http://localhost:8000/queens_game.html` (or `http://localhost:8000` and click the `queens_game.html` link).

## File Structure

```
queens-puzzle/
│
├── queens_game.html      # Main HTML file (game interface, UI)
├── queens_game.js        # JavaScript game logic (UI, event handlers, Pyodide bridge)
└── queens_solver.py      # Python AI solver (Backtracking, CSP logic)
```



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



# Zip — LinkedIn Game Solver

A path-finding “number snake” puzzle inspired by LinkedIn’s Zip daily challenge. Players connect all numbered cells in order while the JavaScript solver cross-checks every move and can complete the board automatically.

---

## Puzzle Rules
- Grid defaults to 6×6, but the layout utility can scale dimensions when needed.
- Numbers (1…N) must be connected **in order** using orthogonal moves only.
- The path must visit **every tile exactly once**; no revisiting or diagonal shortcuts.
- Certain puzzles include down/right walls that block movement, plus pre-set numbers that must stay in place.

## Features
### Intuitive Input
- Click to cycle numbers, drag from “1” to sketch a path, or press Backspace to clear the current selection.
- Demo puzzles can be loaded instantly; givens are locked to prevent accidental edits until the board is cleared.

### Guided Controls
- `Auto Solve` finds a full Hamiltonian path in milliseconds using the ZipGrid search engine.
- `Solve (Animated)` replays the solver’s path step-by-step, highlighting each move and logging milestones.
- `Undo Move`, `Load Demo`, and `Clear All` keep experimentation safe.

### Visual Feedback
- Cells flip between highlighted, connected, visited, or given states so players can see where the snake has been.
- A scrolling console mirrors every action (drag started, connection removed, solver progress, success/failure).

## Algorithms & Implementation
- The `ZipGrid` class in `zip.js` encodes degrees, walls, and labels using bit masks so moves can be validated in constant time.
- A depth-first search stacks candidate moves (up/down/left/right) and prunes anything that would isolate the tail or break the degree constraints.
- Heuristics such as degree decrementing, isolation checks, and label ordering dramatically reduce backtracking.
- Results can be compressed into a sequence for animation using the included `compressSequence` helper.

## How to Run
1. Open `zip.html` (or launch `index.html` and select **Zip**).
2. Draw a path manually or load a demo puzzle.
3. Click **Auto Solve** or **Solve (Animated)** to watch the pathfinder complete the puzzle.

---




