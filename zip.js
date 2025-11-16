// zip.js - JavaScript interface for Zip Solver (Sequential Path)
let pyodideReady = null;
let pyodide = null;

async function initPyodideAndSolver() {
    if (!pyodideReady) {
        pyodideReady = loadPyodide({
            indexURL: "https://cdn.jsdelivr.net/pyodide/v0.24.1/full/"
        }).then(async (py) => {
            pyodide = py;
            
            // Load the solver code
            const solverCode = await (await fetch("zip_solver.py")).text();
            await py.runPythonAsync(solverCode);
            
            return py;
        });
    }
    return pyodideReady;
}

function getGrid() {
    const sizeInput = document.getElementById("sizeInput");
    const size = sizeInput ? parseInt(sizeInput.value) : 6;
    const grid = [];
    
    for (let r = 0; r < size; r++) {
        const row = [];
        for (let c = 0; c < size; c++) {
            const cell = document.getElementById(`cell-${r}-${c}`);
            if (cell) {
                const val = cell.innerText.trim();
                row.push(val === "" ? 0 : parseInt(val));
            } else {
                row.push(0);
            }
        }
        grid.push(row);
    }
    return grid;
}

function getColorForNumber(num, total) {
    // Blue to red gradient
    const ratio = (num - 1) / (total - 1);
    const hue = 240 - (ratio * 180); // 240=blue, 60=yellow-red
    return `hsl(${hue}, 70%, 50%)`;
}

function visualizeSolution(solution, givenGrid) {
    const size = givenGrid.length;
    const total = size * size;
    
    // Clear all non-given cells first
    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
            const cell = document.getElementById(`cell-${r}-${c}`);
            if (cell && givenGrid[r][c] === 0) {
                cell.innerText = '';
                cell.style.backgroundColor = '';
                cell.style.color = '';
                cell.classList.remove('given', 'solved');
            }
        }
    }
    
    // Fill in the solution
    for (const [numStr, pos] of Object.entries(solution)) {
        const num = parseInt(numStr);
        const [r, c] = pos;
        const cell = document.getElementById(`cell-${r}-${c}`);
        
        if (cell) {
            const color = getColorForNumber(num, total);
            cell.style.backgroundColor = color;
            cell.style.color = '#000';
            cell.style.fontWeight = '700';
            
            // Show number only if it was given, otherwise leave visible what was solved
            if (givenGrid[r][c] === 0) {
                cell.innerText = num;
                cell.classList.add('solved');
            }
        }
    }
}

async function solvePuzzle() {
    try {
        const py = await initPyodideAndSolver();
        const grid = getGrid();
        
        // Call Python solver
        py.globals.set("grid", grid);
        const result = await py.runPythonAsync(`solve_zip(grid)`);
        const solution = result ? result.toJs() : null;
        
        if (!solution) {
            alert("No solution found! Make sure:\n- You have number 1 placed\n- Given numbers can be connected in sequence\n- Grid has a valid Hamiltonian path");
            return;
        }
        
        visualizeSolution(solution, grid);
    } catch (error) {
        console.error("Error solving puzzle:", error);
        alert("Error solving puzzle: " + error.message);
    }
}

async function hintPuzzle() {
    try {
        const py = await initPyodideAndSolver();
        const grid = getGrid();
        
        py.globals.set("grid", grid);
        const result = await py.runPythonAsync(`hint_zip(grid)`);
        const hint = result ? result.toJs() : null;
        
        if (!hint) {
            alert("No hint available. Check if puzzle is valid.");
            return;
        }
        
        const [num, pos] = hint;
        const [r, c] = pos;
        const cell = document.getElementById(`cell-${r}-${c}`);
        
        if (cell) {
            // Highlight the cell
            cell.style.boxShadow = '0 0 20px 6px rgba(255,204,0,0.9)';
            cell.style.transform = 'scale(1.2)';
            cell.style.transition = 'all 0.3s';
            
            setTimeout(() => {
                cell.style.boxShadow = '';
                cell.style.transform = '';
            }, 2000);
            
            alert(`💡 Hint: Place number ${num} at row ${r+1}, column ${c+1}`);
        }
    } catch (error) {
        console.error("Error getting hint:", error);
        alert("Error getting hint: " + error.message);
    }
}

async function generateDemo() {
    try {
        const py = await initPyodideAndSolver();
        const sizeInput = document.getElementById("sizeInput");
        const size = sizeInput ? parseInt(sizeInput.value) : 6;
        
        // Generate puzzle
        const result = await py.runPythonAsync(`generate_puzzle(${size}, ${size}, 5)`);
        const generated = result.toJs();
        
        // Clear board first
        clearBoard();
        
        // Place generated numbers
        for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
                const row = generated[r];
                if (row && row[c] > 0) {
                    const cell = document.getElementById(`cell-${r}-${c}`);
                    if (cell) {
                        cell.innerText = row[c];
                        cell.classList.add('given');
                        cell.style.backgroundColor = 'rgba(74,74,255,0.2)';
                        cell.style.color = '#fff';
                        cell.style.fontWeight = '900';
                    }
                }
            }
        }
    } catch (error) {
        console.error("Error generating demo:", error);
        alert("Error generating demo: " + error.message);
    }
}

function clearBoard() {
    const sizeInput = document.getElementById("sizeInput");
    const size = sizeInput ? parseInt(sizeInput.value) : 6;
    
    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
            const cell = document.getElementById(`cell-${r}-${c}`);
            if (cell) {
                cell.innerText = '';
                cell.classList.remove('given', 'solved');
                cell.style.backgroundColor = '';
                cell.style.color = '';
                cell.style.fontWeight = '';
            }
        }
    }
}

function buildBoard() {
    const sizeInput = document.getElementById("sizeInput");
    const size = sizeInput ? parseInt(sizeInput.value) : 6;
    const board = document.getElementById("board");
    
    if (!board) return;
    
    board.innerHTML = "";
    board.style.gridTemplateColumns = `repeat(${size}, 56px)`;
    board.style.gridTemplateRows = `repeat(${size}, 56px)`;

    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
            const cell = document.createElement("div");
            cell.id = `cell-${r}-${c}`;
            cell.className = "cell";
            cell.contentEditable = true;
            cell.setAttribute('data-r', r);
            cell.setAttribute('data-c', c);
            
            // Input validation - only allow numbers
            cell.addEventListener('input', (e) => {
                const text = e.target.innerText.trim();
                if (text && !/^[0-9]+$/.test(text)) {
                    e.target.innerText = "";
                } else if (text) {
                    const num = parseInt(text);
                    const maxNum = size * size;
                    if (num < 1 || num > maxNum) {
                        e.target.innerText = "";
                    }
                }
            });
            
            board.appendChild(cell);
        }
    }
}

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
    const buildBtn = document.getElementById("buildBtn");
    const solveBtn = document.getElementById("solveBtn");
    const hintBtn = document.getElementById("hintBtn");
    const clearBtn = document.getElementById("clearBtn");
    const demoBtn = document.getElementById("demoBtn");
    
    if (buildBtn) buildBtn.onclick = buildBoard;
    if (solveBtn) solveBtn.onclick = solvePuzzle;
    if (hintBtn) hintBtn.onclick = hintPuzzle;
    if (clearBtn) clearBtn.onclick = clearBoard;
    if (demoBtn) demoBtn.onclick = generateDemo;
    
    // Build initial board
    buildBoard();
    
    // Initialize Pyodide in background
    initPyodideAndSolver().then(() => {
        console.log("Pyodide initialized successfully");
    }).catch(err => {
        console.error("Failed to initialize Pyodide:", err);
    });
});