// Game state
let gameState = {
    queens: [],
    history: [],
    regions: [],
    invalidCells: new Set(),
    hintCell: null,
    isAISolving: false,
    pyodide: null,
    boardSize: 8
};

const regionColors = [
    { base: '#8B00FF', glow: '#A020F0' }, // Electric Purple
    { base: '#FF0066', glow: '#FF1493' }, // Deep Pink
    { base: '#00FF41', glow: '#39FF14' }, // Neon Green
    { base: '#0066FF', glow: '#1E90FF' }, // Electric Blue
    { base: '#FFD700', glow: '#FFA500' }, // Gold/Orange
    { base: '#00FFFF', glow: '#00CED1' }, // Cyan
    { base: '#FF0099', glow: '#FF69B4' }, // Hot Pink
    { base: '#FF6600', glow: '#FF4500' }, // Neon Orange
    { base: '#9D00FF', glow: '#BA55D3' }, // Violet
    { base: '#00FF88', glow: '#00FA9A' }, // Spring Green
    { base: '#6600FF', glow: '#7B68EE' }, // Medium Purple
    { base: '#FFFF00', glow: '#FFD700' }  // Yellow
];

// Initialize Pyodide
async function initPyodide() {
    updateAIProgress('Loading Python solver...');
    try {
        gameState.pyodide = await loadPyodide();
        
        // Load the Python solver code
        const response = await fetch('queens_solver.py');
        const pythonCode = await response.text();
        await gameState.pyodide.runPythonAsync(pythonCode);
        
        updateAIProgress('Python solver ready!');
        setTimeout(() => updateAIProgress('Ready to assist...'), 2000);
    } catch (error) {
        console.error('Failed to load Pyodide:', error);
        updateAIProgress('Python solver unavailable');
    }
}

// Start game with selected difficulty
function startGame(boardSize) {
    gameState.boardSize = boardSize;
    document.getElementById('difficulty-screen').classList.add('hidden');
    document.getElementById('game-screen').classList.add('active');
    document.getElementById('board-size').textContent = boardSize;
    document.getElementById('board-size-display').textContent = boardSize;
    document.getElementById('board-size-display2').textContent = boardSize;
    
    // Add click handler to title for back navigation
    document.querySelector('.title').addEventListener('click', () => {
        window.location.href = 'index.html';
    });
    
    initGame();
}

// Generate random regions for the board
function generateRandomRegions(size) {
    const regions = Array(size).fill(null).map(() => Array(size).fill(-1));
    const numRegions = size; // Each region should have 'size' cells
    let currentRegion = 0;
    const cellsPerRegion = size;
    
    // Create a list of all cells
    const cells = [];
    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
            cells.push({ row: r, col: c });
        }
    }
    
    // Shuffle cells
    for (let i = cells.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [cells[i], cells[j]] = [cells[j], cells[i]];
    }
    
    // Assign regions using flood-fill approach
    let cellIndex = 0;
    for (let region = 0; region < numRegions; region++) {
        const regionCells = [];
        const queue = [];
        
        // Find first unassigned cell
        while (cellIndex < cells.length && regions[cells[cellIndex].row][cells[cellIndex].col] !== -1) {
            cellIndex++;
        }
        
        if (cellIndex >= cells.length) break;
        
        const startCell = cells[cellIndex];
        queue.push(startCell);
        regions[startCell.row][startCell.col] = region;
        regionCells.push(startCell);
        
        // Grow region to desired size
        while (regionCells.length < cellsPerRegion && queue.length > 0) {
            const cell = queue.shift();
            
            // Check neighbors
            const directions = [
                { dr: -1, dc: 0 }, { dr: 1, dc: 0 },
                { dr: 0, dc: -1 }, { dr: 0, dc: 1 }
            ];
            
            // Shuffle directions for randomness
            for (let i = directions.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [directions[i], directions[j]] = [directions[j], directions[i]];
            }
            
            for (const dir of directions) {
                const newRow = cell.row + dir.dr;
                const newCol = cell.col + dir.dc;
                
                if (newRow >= 0 && newRow < size && newCol >= 0 && newCol < size &&
                    regions[newRow][newCol] === -1 && regionCells.length < cellsPerRegion) {
                    regions[newRow][newCol] = region;
                    const newCell = { row: newRow, col: newCol };
                    regionCells.push(newCell);
                    queue.push(newCell);
                }
            }
        }
    }
    
    // Fill any remaining cells
    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
            if (regions[r][c] === -1) {
                // Assign to nearest region
                for (let region = 0; region < numRegions; region++) {
                    let hasAdjacent = false;
                    const directions = [
                        { dr: -1, dc: 0 }, { dr: 1, dc: 0 },
                        { dr: 0, dc: -1 }, { dr: 0, dc: 1 }
                    ];
                    for (const dir of directions) {
                        const nr = r + dir.dr;
                        const nc = c + dir.dc;
                        if (nr >= 0 && nr < size && nc >= 0 && nc < size && regions[nr][nc] === region) {
                            hasAdjacent = true;
                            break;
                        }
                    }
                    if (hasAdjacent) {
                        regions[r][c] = region;
                        break;
                    }
                }
                // If still not assigned, assign to any region
                if (regions[r][c] === -1) {
                    regions[r][c] = Math.floor(Math.random() * numRegions);
                }
            }
        }
    }
    
    return regions;
}

// Initialize game
function initGame() {
    gameState.regions = generateRandomRegions(gameState.boardSize);
    gameState.queens = [];
    gameState.history = [];
    gameState.invalidCells.clear();
    gameState.hintCell = null;
    
    renderBoard();
    initPyodide();
    
    // Event listeners
    document.getElementById('solve-btn').addEventListener('click', solvePuzzle);
    document.getElementById('hint-btn').addEventListener('click', getHint);
    document.getElementById('undo-btn').addEventListener('click', undoMove);
    document.getElementById('reset-btn').addEventListener('click', resetGame);
}

// Render the board
function renderBoard() {
    const boardElement = document.getElementById('game-board');
    boardElement.innerHTML = '';
    
    const cellSize = gameState.boardSize === 8 ? 60 : 50;
    boardElement.style.gridTemplateColumns = `repeat(${gameState.boardSize}, ${cellSize}px)`;
    
    for (let row = 0; row < gameState.boardSize; row++) {
        for (let col = 0; col < gameState.boardSize; col++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.style.width = `${cellSize}px`;
            cell.style.height = `${cellSize}px`;
            cell.dataset.row = row;
            cell.dataset.col = col;
            
            const region = gameState.regions[row][col];
            const color = regionColors[region % regionColors.length];
            
            // Apply dark neon colored cells with glow
            cell.style.backgroundColor = color.base;
            cell.style.boxShadow = `
                inset 0 0 30px ${color.glow}80,
                0 0 15px ${color.glow}90,
                0 0 25px ${color.glow}60,
                0 0 35px ${color.base}50
            `;
            cell.style.border = `2px solid ${color.glow}`;
            
            cell.addEventListener('click', () => handleCellClick(row, col));
            
            boardElement.appendChild(cell);
        }
    }
    
    updateBoard();
}

// Update board display
function updateBoard() {
    const cells = document.querySelectorAll('.cell');
    
    cells.forEach(cell => {
        const row = parseInt(cell.dataset.row);
        const col = parseInt(cell.dataset.col);
        
        // Clear cell
        cell.innerHTML = '';
        cell.classList.remove('invalid', 'hint');
        
        // Check if queen is here
        if (hasQueen(row, col)) {
            cell.innerHTML = '<i class="fas fa-crown queen-icon"></i>';
        }
        
        // Check if invalid
        if (gameState.invalidCells.has(`${row}-${col}`)) {
            cell.classList.add('invalid');
        }
        
        // Check if hint
        if (gameState.hintCell && gameState.hintCell.row === row && gameState.hintCell.col === col) {
            cell.classList.add('hint');
        }
    });
    
    // Update queen count
    document.getElementById('queen-count').textContent = gameState.queens.length;
    
    // Update undo button
    document.getElementById('undo-btn').disabled = gameState.history.length === 0 || gameState.isAISolving;
}

// Check if queen exists at position
function hasQueen(row, col) {
    return gameState.queens.some(q => q.row === row && q.col === col);
}

// Validate queen placement
function isValidPlacement(row, col, queens = gameState.queens) {
    // Check row
    if (queens.some(q => q.row === row)) return false;
    
    // Check column
    if (queens.some(q => q.col === col)) return false;
    
    // Check region
    const region = gameState.regions[row][col];
    if (queens.some(q => gameState.regions[q.row][q.col] === region)) return false;
    
    // Check adjacent cells (including diagonals)
    for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;
            const newRow = row + dr;
            const newCol = col + dc;
            if (queens.some(q => q.row === newRow && q.col === newCol)) {
                return false;
            }
        }
    }
    
    return true;
}

// Handle cell click
function handleCellClick(row, col) {
    if (gameState.isAISolving) return;
    
    const existingQueen = gameState.queens.find(q => q.row === row && q.col === col);
    
    if (existingQueen) {
        // Remove queen
        gameState.history.push([...gameState.queens]);
        gameState.queens = gameState.queens.filter(q => !(q.row === row && q.col === col));
        gameState.invalidCells.clear();
        gameState.hintCell = null;
    } else {
        // Try to place queen
        if (isValidPlacement(row, col)) {
            gameState.history.push([...gameState.queens]);
            gameState.queens.push({ row, col });
            gameState.invalidCells.clear();
            gameState.hintCell = null;
            
            // Check if puzzle is solved
            if (gameState.queens.length === gameState.boardSize) {
                setTimeout(() => {
                    document.getElementById('congrats-modal').classList.add('show');
                }, 1000);
            }
        } else {
            // Invalid placement
            gameState.invalidCells.add(`${row}-${col}`);
        }
    }
    
    updateBoard();
}

// Undo move
function undoMove() {
    if (gameState.history.length > 0) {
        gameState.queens = gameState.history.pop();
        gameState.invalidCells.clear();
        gameState.hintCell = null;
        updateBoard();
    }
}

// Reset game
function resetGame() {
    gameState.queens = [];
    gameState.history = [];
    gameState.invalidCells.clear();
    gameState.hintCell = null;
    document.getElementById('congrats-modal').classList.remove('show');
    updateBoard();
}

// Update AI progress display
function updateAIProgress(message) {
    document.getElementById('ai-progress').textContent = message;
}

// Get hint
async function getHint() {
    if (gameState.isAISolving) return;
    
    updateAIProgress('Analyzing puzzle...');
    
    try {
        if (gameState.pyodide) {
            // Use Python solver for hint
            const regionsStr = JSON.stringify(gameState.regions);
            const queensStr = JSON.stringify(gameState.queens);
            
            const hint = await gameState.pyodide.runPythonAsync(`
import json
regions = json.loads('${regionsStr}')
queens = json.loads('${queensStr}')
result = get_hint(regions, queens)
json.dumps(result)
            `);
            
            const hintData = JSON.parse(hint);
            
            if (hintData) {
                gameState.hintCell = hintData;
                updateAIProgress('Hint found!');
            } else {
                updateAIProgress('No valid hints available');
            }
        } else {
            // Fallback: JavaScript hint
            let found = false;
            for (let row = 0; row < gameState.boardSize && !found; row++) {
                for (let col = 0; col < gameState.boardSize && !found; col++) {
                    if (!hasQueen(row, col) && isValidPlacement(row, col)) {
                        gameState.hintCell = { row, col };
                        updateAIProgress('Hint found!');
                        found = true;
                    }
                }
            }
            if (!found) {
                updateAIProgress('No valid hints available');
            }
        }
    } catch (error) {
        console.error('Hint error:', error);
        updateAIProgress('Error getting hint');
    }
    
    updateBoard();
    setTimeout(() => {
        if (document.getElementById('ai-progress').textContent !== 'Ready to assist...') {
            updateAIProgress('Ready to assist...');
        }
    }, 2000);
}

// Solve puzzle
async function solvePuzzle() {
    gameState.isAISolving = true;
    gameState.queens = [];
    gameState.hintCell = null;
    updateAIProgress('AI solving puzzle...');
    updateBoard();
    
    // Disable buttons
    document.getElementById('solve-btn').disabled = true;
    document.getElementById('hint-btn').disabled = true;
    
    try {
        let solution;
        
        if (gameState.pyodide) {
            // Use Python solver
            const regionsStr = JSON.stringify(gameState.regions);
            const resultStr = await gameState.pyodide.runPythonAsync(`
import json
regions = json.loads('${regionsStr}')
result = solve_queens(regions)
json.dumps(result)
            `);
            solution = JSON.parse(resultStr);
        } else {
            // Fallback: JavaScript solver
            solution = await solveQueensJS(gameState.regions);
        }
        
        if (solution) {
            // Animate solution
            for (let i = 0; i < solution.length; i++) {
                await new Promise(resolve => setTimeout(resolve, 500));
                gameState.queens.push(solution[i]);
                updateAIProgress(`Placing queen ${i + 1}/${gameState.boardSize}...`);
                updateBoard();
            }
            
            updateAIProgress('Puzzle solved!');
            setTimeout(() => {
                document.getElementById('congrats-modal').classList.add('show');
                updateAIProgress('Ready to assist...');
            }, 1000);
        } else {
            updateAIProgress('No solution found');
            setTimeout(() => updateAIProgress('Ready to assist...'), 2000);
        }
    } catch (error) {
        console.error('Solve error:', error);
        updateAIProgress('Error solving puzzle');
        setTimeout(() => updateAIProgress('Ready to assist...'), 2000);
    }
    
    gameState.isAISolving = false;
    document.getElementById('solve-btn').disabled = false;
    document.getElementById('hint-btn').disabled = false;
    updateBoard();
}

// JavaScript fallback solver using CSP with Forward Checking and MRV
function solveQueensJS(regions) {
    function getRowDomains(row, queens) {
        const validCols = [];
        for (let col = 0; col < gameState.boardSize; col++) {
            if (isValidPlacement(row, col, queens)) {
                validCols.push(col);
            }
        }
        return validCols;
    }
    
    function selectUnassignedVariableMRV(queens) {
        const assignedRows = new Set(queens.map(q => q.row));
        let minRow = null;
        let minDomainSize = gameState.boardSize + 1;
        
        for (let row = 0; row < gameState.boardSize; row++) {
            if (assignedRows.has(row)) continue;
            
            const domain = getRowDomains(row, queens);
            const domainSize = domain.length;
            
            if (domainSize === 0) return row; // Dead end
            
            if (domainSize < minDomainSize) {
                minDomainSize = domainSize;
                minRow = row;
            }
        }
        return minRow;
    }
    
    function forwardCheck(row, col, queens) {
        const tempQueens = [...queens, { row, col }];
        const assignedRows = new Set(tempQueens.map(q => q.row));
        
        for (let checkRow = 0; checkRow < gameState.boardSize; checkRow++) {
            if (assignedRows.has(checkRow)) continue;
            
            const domain = getRowDomains(checkRow, tempQueens);
            if (domain.length === 0) return false;
        }
        return true;
    }
    
    function solveCSP(queens) {
        if (queens.length === gameState.boardSize) return queens;
        
        const row = selectUnassignedVariableMRV(queens);
        if (row === null) return queens;
        
        const validCols = getRowDomains(row, queens);
        
        for (const col of validCols) {
            if (forwardCheck(row, col, queens)) {
                const result = solveCSP([...queens, { row, col }]);
                if (result !== null) return result;
            }
        }
        return null;
    }
    
    return solveCSP([]);
}

// Play again function
function playAgain() {
    document.getElementById('congrats-modal').classList.remove('show');
    
    // Generate new random regions
    gameState.regions = generateRandomRegions(gameState.boardSize);
    resetGame();
    renderBoard();
}