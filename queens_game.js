//
// queens_game.js (Pyodide, SA+Retry, Conflict-Lock & Icon Update)
//
document.addEventListener('DOMContentLoaded', async () => {
    
    // --- 1. Get All DOM Elements ---
    const boardContainer = document.getElementById('board-container');
    const boardSizeInput = document.getElementById('board-size');
    const logBox = document.getElementById('ai-progress-log');
    
    // Buttons
    const solveButton = document.getElementById('solve-button');
    const hintButton = document.getElementById('hint-button');
    const clearButton = document.getElementById('clear-button');
    const undoButton = document.getElementById('undo-button');

    // Modal
    const modalOverlay = document.getElementById('congrats-modal-overlay');
    const modalMessage = document.getElementById('congrats-message');
    const modalPlayAgain = document.getElementById('modal-play-again');
    const modalGoHome = document.getElementById('modal-go-home');

    // NEW: Warning Bar
    const warningBar = document.getElementById('warning-bar');

    // --- 2. State Variables ---
    let pyodide = null;
    let aiSolver = null;
    let userBoard = []; // 2D array [r][c] = 0 (empty) or 1 (queen)
    let moveHistory = []; // Our "Undo" stack
    let isAISolving = false;
    let currentN = 8;
    let hasConflict = false; // NEW: State to lock the board

    // --- 3. Core UI Functions ---

    function log(message) {
        if (logBox) {
            logBox.innerHTML = `<div>[${new Date().toLocaleTimeString()}] ${message}</div>` + logBox.innerHTML;
        } else {
            console.error('Log box not found!');
        }
    }

    // Toggles the loading state for all buttons
    function toggleLoading(isSolving) {
        isAISolving = isSolving;
        // Don't disable the board size input, but disable all action buttons
        [solveButton, hintButton, clearButton, undoButton].forEach(btn => btn.disabled = isSolving);
        
        // If N is too large, hint button remains disabled even after loading
        if (currentN > 14 && !isSolving) {
            hintButton.disabled = true;
        }

        if (isSolving) {
            log('AI is working. Please wait...');
            solveButton.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Solving...';
        } else {
            solveButton.innerHTML = '<i class="fa-solid fa-bolt"></i> Solve (AI)';
        }
    }

    function showCongratsModal(solverType) {
        if (solverType === 'AI') {
            modalMessage.textContent = 'The AI found a solution!';
        } else {
            modalMessage.textContent = 'You did it! A perfect solution!';
        }
        // --- THIS IS THE CHANGE ---
        // We add a 1-second delay before showing the modal
        // so the user can see the solved board first.
        setTimeout(() => {
            modalOverlay.classList.add('active');
        }, 10000); // 1000ms = 1 second
        // --- END CHANGE ---
    }

    function hideCongratsModal() {
        modalOverlay.classList.remove('active');
        handleClear(); // Clear board to play again
    }

    function handleClear() {
        log('Board cleared.');
        drawBoard(currentN); // This will also reset userBoard and moveHistory
        hideWarning(); // NEW: Hide warning on clear
    }

    // --- NEW: Warning Bar Functions ---
    function showWarning(message) {
        warningBar.textContent = message;
        warningBar.classList.add('active');
    }

    function hideWarning() {
        warningBar.classList.remove('active');
    }

    // --- 4. Board Drawing and Interaction ---

    function drawBoard(n) {
        if (!boardContainer) {
            log('FATAL: board-container not found.');
            return;
        }
        
        currentN = n;
        boardContainer.innerHTML = ''; 
        // Initialize userBoard state
        userBoard = Array(n).fill(0).map(() => Array(n).fill(0));
        moveHistory = [];
        undoButton.disabled = true;
        hasConflict = false; // NEW: Reset conflict state

        boardContainer.style.gridTemplateColumns = `repeat(${n}, 1fr)`;

        // Function to set dynamic font size based on cell width
        const setCellSizes = () => {
            if (boardContainer.clientWidth === 0) return; // Wait if not rendered
            const cellSize = boardContainer.clientWidth / n;
            // Calculate font size relative to cell size
            const fontSize = Math.max(12, cellSize * 0.6); 
            boardContainer.querySelectorAll('.board-cell').forEach(cell => {
                cell.style.fontSize = `${fontSize}px`;
            });
        };

        for (let r = 0; r < n; r++) {
            for (let c = 0; c < n; c++) {
                const cell = document.createElement('div');
                cell.classList.add('board-cell');
                cell.classList.add((r + c) % 2 === 0 ? 'cell-light' : 'cell-dark');
                cell.dataset.row = r;
                cell.dataset.col = c;
                boardContainer.appendChild(cell);
            }
        }
        // Set sizes once after render, and again on resize
        setTimeout(setCellSizes, 0);
        window.onresize = setCellSizes;
    }

    function handleBoardClick(e) {
        // --- THIS IS THE FIX ---
        // We use .closest() to find the cell, even if the user clicks the icon inside it.
        const cell = e.target.closest('.board-cell');

        // Don't allow clicks while AI is working or if a cell wasn't clicked
        if (!cell || isAISolving) {
            return; 
        }
        // --- END FIX ---
        
        const r = parseInt(cell.dataset.row, 10);
        const c = parseInt(cell.dataset.col, 10);

        // --- NEW: Conflict Lock Logic ---
        // If a conflict exists, only allow moves that REMOVE a queen.
        if (hasConflict && userBoard[r][c] === 0) {
            showWarning("You must resolve the conflict before placing a new queen!");
            // Vibrate to give feedback
            if (window.navigator.vibrate) window.navigator.vibrate(100);
            return; // Block the move
        }
        // --- END NEW ---

        // Toggle queen
        if (userBoard[r][c] === 1) {
            userBoard[r][c] = 0;
            cell.innerHTML = ''; // CHANGED: Use innerHTML
            cell.classList.remove('queen', 'conflict');
            moveHistory.push({ type: 'remove', r, c });
        } else {
            userBoard[r][c] = 1;
            cell.innerHTML = '<i class="fa-solid fa-chess-queen"></i>'; // CHANGED: Use icon
            cell.classList.add('queen');
            moveHistory.push({ type: 'place', r, c });
        }
        
        undoButton.disabled = false;
        checkAllConflicts(); // Check for conflicts after every move
    }

    function handleUndo() {
        const lastMove = moveHistory.pop();
        if (!lastMove) {
            undoButton.disabled = true;
            return;
        }

        const { r, c, type } = lastMove;
        const cell = boardContainer.querySelector(`.board-cell[data-row="${r}"][data-col="${c}"]`);
        
        if (type === 'place') { // Undo a "place" move
            userBoard[r][c] = 0;
            cell.innerHTML = ''; // CHANGED: Use innerHTML
            cell.classList.remove('queen', 'conflict');
        } else { // Undo a "remove" move
            userBoard[r][c] = 1;
            cell.innerHTML = '<i class="fa-solid fa-chess-queen"></i>'; // CHANGED: Use icon
            cell.classList.add('queen');
        }

        if (moveHistory.length === 0) {
            undoButton.disabled = true;
        }
        checkAllConflicts(); // Re-check conflicts after undoing
    }

    // This is the "wrong move signal"
    function checkAllConflicts() {
        const n = currentN;
        if (n === 0) return;

        // 1. Clear all previous conflicts
        boardContainer.querySelectorAll('.board-cell.conflict').forEach(cell => {
            cell.classList.remove('conflict');
        });

        let conflictCells = new Set();
        let queens = [];
        for (let r = 0; r < n; r++) {
            for (let c = 0; c < n; c++) {
                if (userBoard[r][c] === 1) {
                    queens.push({ r, c });
                }
            }
        }

        // 2. Check each queen against every other queen
        for (let i = 0; i < queens.length; i++) {
            for (let j = i + 1; j < queens.length; j++) {
                const q1 = queens[i];
                const q2 = queens[j];
                
                // Check row, column, or diagonal
                if (q1.r === q2.r || q1.c === q2.c || Math.abs(q1.r - q2.r) === Math.abs(q1.c - q2.c)) {
                    conflictCells.add(`${q1.r},${q1.c}`);
                    conflictCells.add(`${q2.r},${q2.c}`);
                }
            }
        }

        // 3. Add the .conflict class to all conflicting cells
        conflictCells.forEach(coord => {
            const [r, c] = coord.split(',');
            const cell = boardContainer.querySelector(`.board-cell[data-row="${r}"][data-col="${c}"]`);
            if (cell) {
                cell.classList.add('conflict');
            }
        });

        // --- NEW: Update Conflict State & Warning Bar ---
        if (conflictCells.size > 0) {
            hasConflict = true;
            showWarning("A queen is in conflict! Press Undo to remove.");
        } else {
            hasConflict = false;
            hideWarning();
        }
        // --- END NEW ---

        // 4. Check for Win Condition
        if (conflictCells.size === 0 && queens.length === n && n > 0) {
            log('User solution found!');
            showCongratsModal('User'); // Trigger congrats modal (now with delay)
        }
    }

    function placeQueens(solution) {
        solution.forEach(queen => {
            const cell = boardContainer.querySelector(`.board-cell[data-row="${queen.row}"][data-col="${queen.col}"]`);
            if (cell) {
                cell.innerHTML = '<i class="fa-solid fa-chess-queen"></i>'; // CHANGED: Use icon
                cell.classList.add('queen');
            }
        });
    }

    // --- 5. Pyodide Initialization ---

    async function initializePyodide() {
        log('Loading Python runtime...');
        toggleLoading(true);
        try {
            pyodide = await loadPyodide();
            log('Python runtime ready. Loading AI script...');
            
            const response = await fetch('queens_solver.py');
            if (!response.ok) throw new Error(`Failed to fetch queens_solver.py`);
            const pythonScript = await response.text();
            
            pyodide.runPython(pythonScript);
            
            // We are loading the Simulated Annealing (SA) solver
            aiSolver = {
                solve: pyodide.globals.get('solve_n_queens_sa'), 
                hint: pyodide.globals.get('get_smart_hint') 
            };

            log('AI Solver is ready.');
            toggleLoading(false);
            
        } catch (error) {
            log(`FATAL: ${error.message}`);
            console.error(error);
            toggleLoading(false);
        }
    }

    // --- 6. AI Button Handlers ---

    /**
     * This is the new auto-retrying solver function, as you designed.
     */
    async function handleSolve() {
        toggleLoading(true);
        log(`Solving for N=${currentN} using Simulated Annealing...`);
        drawBoard(currentN); // Clear board for AI solution
        hideWarning(); // NEW: Hide warning

        const MAX_RETRIES = 5; // Set the retry limit
        
        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            log(`AI Attempt ${attempt} of ${MAX_RETRIES}...`);
            
            try {
                // This wrapper prevents the browser from freezing during the Python call,
                // allowing the log to update.
                const runOneAttempt = () => {
                    return new Promise((resolve, reject) => {
                        setTimeout(() => {
                            try {
                                const resultJson = aiSolver.solve(currentN);
                                const result = JSON.parse(resultJson);
                                resolve(result);
                            } catch (e) {
                                reject(e);
                            }
                        }, 10); // 10ms delay to allow UI to refresh
                    });
                };

                const result = await runOneAttempt();

                if (result.status === 'success') {
                    log('Solution found! Placing queens.');
                    placeQueens(result.solution);
                    showCongratsModal('AI'); // Trigger congrats modal (now with delay)
                    toggleLoading(false);
                    return; // Success! Exit the function.
                } else {
                    // Log the failure of this attempt and let the loop try again
                    log(`Attempt ${attempt} failed. Retrying...`);
                }

            } catch (error) {
                console.error('Error running SA solver:', error);
                log('Solver script failed catastrophically.');
                toggleLoading(false);
                return;
            }
        } // end for loop
        
        // If we get here, all retries failed
        log(`AI failed to find a solution after ${MAX_RETRIES} attempts. You got unlucky! Please try again.`);
        toggleLoading(false);
    }

    /**
     * This is the smart hint, which also runs asynchronously
     */
    async function handleHint() {
        // --- NEW: Block hint if in conflict state ---
        if (hasConflict) {
            showWarning("You must resolve the conflict before getting a hint.");
            return;
        }
        // --- END NEW ---

        toggleLoading(true);
        log(`Getting smart hint for N=${currentN}...`);

        try {
            const boardJson = JSON.stringify(userBoard);
            
            // Wrapper to prevent freezing on very large hint calculations
            const runHintAttempt = () => {
                return new Promise((resolve, reject) => {
                    setTimeout(() => {
                        try {
                            const resultJson = aiSolver.hint(boardJson);
                            const result = JSON.parse(resultJson);
                            resolve(result);
                        } catch(e) {
                            reject(e);
                        }
                    }, 10);
                });
            };

            const result = await runHintAttempt();

            if (result.status === 'success') {
                const hint = result.hint;
                log(`Hint: Place queen at (Row: ${hint.row}, Col: ${hint.col})`);
                
                // Place the hint and add to undo stack
                userBoard[hint.row][hint.col] = 1;
                const cell = boardContainer.querySelector(`.board-cell[data-row="${hint.row}"][data-col="${hint.col}"]`);
                if (cell) {
                    cell.innerHTML = '<i class="fa-solid fa-chess-queen"></i>'; // CHANGED: Use icon
                    cell.classList.add('queen');
                }
                moveHistory.push({ type: 'place', r: hint.row, c: hint.col });
                undoButton.disabled = false;
                
                checkAllConflicts();
                
            } else {
                log(`Hint Error: ${result.message}`);
            }
        } catch (error) {
            console.error('Error running Python hinter:', error);
            log('Failed to get hint.');
        }
        toggleLoading(false);
    }

    // --- 7. Event Listeners ---
    
    // Board
    boardContainer.addEventListener('click', handleBoardClick);
    
    // N-Value Input
    boardSizeInput.addEventListener('change', () => {
        const n = parseInt(boardSizeInput.value, 10);
        
        let newN = n;
        if (n < 4) { // 4 is the first solvable N
            newN = 4;
        } else if (n > 25) { // Cap at 25 for performance
            newN = 25;
        }
        boardSizeInput.value = newN;
        
        // Disable HINT button if N is too large (it's too slow)
        if (newN > 14) {
            hintButton.disabled = true;
            log("Hint AI disabled for N > 14 (too slow).");
        } else if (!isAISolving) { // Only re-enable if AI isn't busy
            hintButton.disabled = false;
        }
        
        drawBoard(newN);
        hideWarning(); // NEW: Hide warning
    });

    // Buttons
    clearButton.addEventListener('click', handleClear);
    undoButton.addEventListener('click', handleUndo);
    solveButton.addEventListener('click', handleSolve);
    hintButton.addEventListener('click', handleHint);

    // Modal
    modalPlayAgain.addEventListener('click', hideCongratsModal);
    modalGoHome.addEventListener('click', () => {
        location.href = 'index.html'; // Go to home page
    });
    // Close modal if user clicks background
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) {
            hideCongratsModal();
        }
    });

    // --- 8. Start Everything ---
    drawBoard(currentN); // Draw initial 8x8 board
    initializePyodide(); // Start loading Python in the background
});