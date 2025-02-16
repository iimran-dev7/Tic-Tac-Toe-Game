let currentPage = 'landing';
let players = {
    player1: { name: '', symbol: 'X' },
    player2: { name: '', symbol: 'O' }
};
let currentPlayer = 'X';
let gameBoard = ['', '', '', '', '', '', '', '', ''];
let gameActive = true;
let gameMode = 'normal';
let seriesLength = 3;
let scores = {
    player1: 0,
    player2: 0
};
let draws = 0;
let normalPlayScores = { player1: 0, player2: 0 }; // Track normal play scores
let lastGameMode = 'normal';

// Add this at the beginning of the file, after the existing variables
const transitionDuration = 400; // milliseconds

// Store event listeners references
let cellEventListeners = new Map();
let restartEventListener = null;
let endGameEventListener = null;

// Add at the top with other state variables
const GameModeManager = {
    currentMode: 'normal',
    lastMode: 'normal',
    persistedMode: localStorage.getItem('gameMode') || 'normal',
    
    setMode(mode) {
        this.lastMode = this.currentMode;
        this.currentMode = mode;
        this.persistedMode = mode;
        gameMode = mode;
        localStorage.setItem('gameMode', mode);
        this.updateUI();
    },
    
    restoreLastMode() {
        this.setMode(this.persistedMode);
    },
    
    updateUI() {
        // Update match buttons
        document.querySelectorAll('.match-btn').forEach(btn => {
            btn.classList.remove('selected');
            if (btn.dataset.type === this.currentMode) {
                btn.classList.add('selected');
            }
        });
        
        // Update series options visibility
        const seriesOptions = document.querySelector('.series-options');
        if (seriesOptions) {
            seriesOptions.style.display = this.currentMode === 'series' ? 'block' : 'none';
        }
    },

    ensureCorrectGameMode() {
        // Force the game mode to match the persisted mode
        gameMode = this.persistedMode;
        this.currentMode = this.persistedMode;
        
        // Update UI to match the correct mode
        this.updateUI();
        
        // If we're in series mode, ensure series display is shown
        if (this.currentMode === 'series') {
            const seriesInfo = document.querySelector('.series-info');
            if (seriesInfo) {
                seriesInfo.style.display = 'block';
            }
        }
    }
};

// Page Navigation
document.querySelector('.start-btn').addEventListener('click', () => showPage('setup'));
document.querySelector('.play-btn').addEventListener('click', startGame);

function showPage(page) {
    const currentPageElement = document.querySelector(`#${currentPage}-page`);
    const nextPageElement = document.querySelector(`#${page}-page`);
    
    // Remove existing event listeners before transition
    removeAllEventListeners();
    
    // Handle setup page transition
    if (page === 'setup') {
        GameModeManager.restoreLastMode();
    }
    
    // Clean up series mode when going back to landing
    if (page === 'landing') {
        cleanupSeriesMode();
        resetSetupPage();
        // Restore the last game mode UI
        GameModeManager.restoreLastMode();
    }
    
    // Ensure correct game mode when entering game page
    if (page === 'game') {
        GameModeManager.ensureCorrectGameMode();
    }
    
    // Fade out current page
    currentPageElement.classList.add('fade-out');
    
    setTimeout(() => {
        currentPageElement.style.display = 'none';
        currentPageElement.classList.remove('fade-out');
        
        // Show and fade in next page
        nextPageElement.style.display = 'block';
        nextPageElement.classList.add('fade-out');
        requestAnimationFrame(() => {
            nextPageElement.classList.remove('fade-out');
        });
        
        currentPage = page;

        // Attach new event listeners after page transition if on game page
        if (page === 'game') {
            attachEventListeners();
        }
    }, transitionDuration);
}

// Setup Page Logic
const symbolBtns = document.querySelectorAll('.symbol-btn');
symbolBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        symbolBtns.forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        players.player1.symbol = btn.dataset.symbol;
        players.player2.symbol = players.player1.symbol === 'X' ? 'O' : 'X';
        document.getElementById('player2-symbol').textContent = players.player2.symbol;
    });
});

// Update match type selection logic
document.querySelectorAll('.match-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        GameModeManager.setMode(btn.dataset.type);
    });
});

document.getElementById('series-length').addEventListener('change', (e) => {
    const customSeriesDiv = document.getElementById('custom-series');
    if (e.target.value === 'custom') {
        customSeriesDiv.style.display = 'block';
        seriesLength = parseInt(document.getElementById('custom-length').value) || 3;
    } else {
        customSeriesDiv.style.display = 'none';
        seriesLength = parseInt(e.target.value);
    }
});

document.getElementById('custom-length').addEventListener('input', (e) => {
    let value = parseInt(e.target.value);
    // Limit the input between 1 and 99
    if (value < 1) value = 1;
    if (value > 99) value = 99;
    e.target.value = value;
    seriesLength = value;
});

function startGame() {
    // Get player names with fallbacks
    players.player1.name = document.getElementById('player1-name').value || 'Player 1';
    players.player2.name = document.getElementById('player2-name').value || 'Player 2';
    
    // Update player info display with safety checks
    const player1InfoSpan = document.querySelector('#player1-info span');
    const player2InfoSpan = document.querySelector('#player2-info span');
    
    if (player1InfoSpan) player1InfoSpan.textContent = players.player1.name;
    if (player2InfoSpan) player2InfoSpan.textContent = players.player2.name;
    
    // Ensure we're using the correct game mode
    GameModeManager.ensureCorrectGameMode();
    
    // Initialize game based on current mode
    if (GameModeManager.currentMode === 'series') {
        setupSeriesDisplay();
    }
    
    showPage('game');
    initializeGame();
}

function initializeGame() {
    gameBoard = ['', '', '', '', '', '', '', '', ''];
    gameActive = true;
    currentPlayer = 'X';
    document.querySelectorAll('.cell').forEach(cell => {
        cell.textContent = '';
        cell.classList.remove('winner-animation', 'filled');
        cell.removeAttribute('data-symbol');
    });
    document.getElementById('status').textContent = '';
    updateCurrentPlayerIndicator();
}

function setupSeriesDisplay() {
    // Get all required elements
    const seriesInfo = document.querySelector('.series-info');
    const player1NameElement = document.querySelector('.player1-name');
    const player2NameElement = document.querySelector('.player2-name');
    const totalMatchesElement = document.querySelector('.total-matches');
    const player1ScoreContainer = document.querySelector('.player-score:first-child .player1-name');
    const player2ScoreContainer = document.querySelector('.player-score:last-child .player2-name');
    
    // Safety check for elements
    if (!seriesInfo || !player1NameElement || !player2NameElement || !totalMatchesElement) {
        console.error('Required elements for series display not found');
        return;
    }

    // Show series info and update display
    seriesInfo.style.display = 'block';
    
    // Update player names in all locations
    if (player1ScoreContainer) player1ScoreContainer.textContent = players.player1.name;
    if (player2ScoreContainer) player2ScoreContainer.textContent = players.player2.name;
    player1NameElement.textContent = players.player1.name;
    player2NameElement.textContent = players.player2.name;
    totalMatchesElement.textContent = seriesLength;
    
    // Reset scores and draws when starting new series
    scores = { player1: 0, player2: 0 };
    draws = 0;
    updateScoreDisplay();
}

function updateScoreDisplay() {
    const player1ScoreElement = document.querySelector('.player1-score');
    const player2ScoreElement = document.querySelector('.player2-score');
    const matchesInfoElement = document.querySelector('.matches-info');
    
    if (player1ScoreElement) player1ScoreElement.textContent = scores.player1;
    if (player2ScoreElement) player2ScoreElement.textContent = scores.player2;
    if (matchesInfoElement) {
        matchesInfoElement.textContent = 
            `Matches: ${scores.player1 + scores.player2 + draws}/${seriesLength} (Draws: ${draws})`;
    }
}

// Function to attach event listeners
function attachEventListeners() {
    // Attach cell event listeners
    document.querySelectorAll('.cell').forEach(cell => {
        const listener = () => handleCellClick(cell);
        cellEventListeners.set(cell, listener);
        cell.addEventListener('click', listener);
    });

    // Attach restart button listener
    const restartButton = document.getElementById('restart');
    if (restartButton) {
        restartEventListener = () => {
            if (gameMode === 'series') {
                resetSeries();
            } else {
                initializeGame();
            }
        };
        restartButton.addEventListener('click', restartEventListener);
    }

    // Attach end game button listener
    const endGameButton = document.getElementById('end-game');
    if (endGameButton) {
        endGameEventListener = () => endGame();
        endGameButton.addEventListener('click', endGameEventListener);
    }
}

// Function to remove all event listeners
function removeAllEventListeners() {
    // Remove cell event listeners
    cellEventListeners.forEach((listener, cell) => {
        cell.removeEventListener('click', listener);
    });
    cellEventListeners.clear();

    // Remove restart button listener
    const restartButton = document.getElementById('restart');
    if (restartButton && restartEventListener) {
        restartButton.removeEventListener('click', restartEventListener);
        restartEventListener = null;
    }

    // Remove end game button listener
    const endGameButton = document.getElementById('end-game');
    if (endGameButton && endGameEventListener) {
        endGameButton.removeEventListener('click', endGameEventListener);
        endGameEventListener = null;
    }
}

// Game Logic
document.querySelectorAll('.cell').forEach(cell => {
    cell.addEventListener('click', () => handleCellClick(cell));
});

document.getElementById('restart').addEventListener('click', () => {
    if (gameMode === 'series') {
        resetSeries();
    } else {
        initializeGame();
    }
});

// Add End Game functionality
document.getElementById('end-game').addEventListener('click', endGame);

function endGame() {
    // Store the current game mode before cleanup
    const currentMode = GameModeManager.currentMode;
    
    // Prevent multiple clicks while transitioning
    const endGameButton = document.getElementById('end-game');
    if (!endGameButton || endGameButton.disabled) return;
    endGameButton.disabled = true;

    // Clear any ongoing timers
    const statusElement = document.getElementById('status');
    if (statusElement) statusElement.textContent = '';
    if (window[Symbol.for('countdownInterval')]) {
        clearInterval(window[Symbol.for('countdownInterval')]);
    }

    // Remove all event listeners
    removeAllEventListeners();

    // Reset all game state
    gameBoard = ['', '', '', '', '', '', '', '', ''];
    gameActive = false;
    currentPlayer = 'X';
    seriesLength = 3;
    scores = { player1: 0, player2: 0 };
    draws = 0;
    normalPlayScores = { player1: 0, player2: 0 };

    // Reset player data
    players = {
        player1: { name: '', symbol: 'X' },
        player2: { name: '', symbol: 'O' }
    };

    // Reset UI elements
    document.querySelectorAll('.cell').forEach(cell => {
        cell.textContent = '';
        cell.classList.remove('winner-animation', 'filled');
        cell.removeAttribute('data-symbol');
    });

    // Reset series display and scores
    cleanupSeriesMode();

    // Reset player info displays with safety checks
    const player1Info = document.querySelector('#player1-info span');
    const player2Info = document.querySelector('#player2-info span');
    const player1InfoDiv = document.querySelector('#player1-info');
    const player2InfoDiv = document.querySelector('#player2-info');

    if (player1Info) player1Info.textContent = '';
    if (player2Info) player2Info.textContent = '';
    if (player1InfoDiv) player1InfoDiv.classList.remove('active-player');
    if (player2InfoDiv) player2InfoDiv.classList.remove('active-player');

    // Reset player setup form
    const player1Input = document.getElementById('player1-name');
    const player2Input = document.getElementById('player2-name');
    if (player1Input) player1Input.value = '';
    if (player2Input) player2Input.value = '';

    // Reset symbol selection
    document.querySelectorAll('.symbol-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
    const defaultSymbolBtn = document.querySelector('.symbol-btn[data-symbol="X"]');
    if (defaultSymbolBtn) defaultSymbolBtn.classList.add('selected');
    
    const player2Symbol = document.getElementById('player2-symbol');
    if (player2Symbol) player2Symbol.textContent = 'O';

    // Reset setup page state
    resetSetupPage();

    // Ensure the correct mode is restored
    GameModeManager.setMode(currentMode);
    
    // Navigate back to landing page
    showPage('landing');

    // Re-enable the button after transition
    setTimeout(() => {
        if (endGameButton) {
            endGameButton.disabled = false;
        }
        gameActive = true;
    }, transitionDuration + 100);
}

function handleCellClick(cell) {
    const index = cell.dataset.cellIndex;
    
    if (gameBoard[index] === '' && gameActive) {
        gameBoard[index] = currentPlayer;
        cell.setAttribute('data-symbol', currentPlayer);
        cell.classList.add('filled');
        
        if (checkWin()) {
            if (gameMode === 'series') {
                handleSeriesWin(currentPlayer === players.player1.symbol ? 'player1' : 'player2');
            } else {
                handleWin(currentPlayer === players.player1.symbol ? 'player1' : 'player2');
            }
        } else if (gameBoard.every(cell => cell !== '')) {
            if (gameMode === 'series') {
                handleSeriesDraw();
            } else {
                handleDraw();
            }
        } else {
            currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
            updateCurrentPlayerIndicator();
        }
    }
}

function checkWin() {
    const winPatterns = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
        [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
        [0, 4, 8], [2, 4, 6] // Diagonals
    ];

    return winPatterns.some(pattern => {
        if (
            gameBoard[pattern[0]] !== '' &&
            gameBoard[pattern[0]] === gameBoard[pattern[1]] &&
            gameBoard[pattern[1]] === gameBoard[pattern[2]]
        ) {
            pattern.forEach(index => {
                document.querySelector(`[data-cell-index="${index}"]`).classList.add('winner-animation');
            });
            return true;
        }
        return false;
    });
}

function celebrateWin() {
    // Reduce duration to 1 second
    const duration = 1000;
    const animationEnd = Date.now() + duration;
    
    function randomInRange(min, max) {
        return Math.random() * (max - min) + min;
    }
    
    // Add intense burst of confetti
    confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#1ABC9C', '#E74C3C', '#2ECC71', '#3498DB']
    });

    // Add a winner overlay
    const winnerOverlay = document.createElement('div');
    winnerOverlay.className = 'winner-overlay';
    winnerOverlay.innerHTML = `
        <div class="winner-message">
            <h2>🎉 Winner! 🎉</h2>
            <p>${document.getElementById('status').textContent}</p>
        </div>
    `;
    document.getElementById('game-page').appendChild(winnerOverlay);

    // Remove overlay after 3 seconds
    setTimeout(() => {
        winnerOverlay.classList.add('fade-out');
        setTimeout(() => winnerOverlay.remove(), 500);
    }, 3000);
}

function updateCurrentPlayerIndicator() {
    const player1Info = document.querySelector('#player1-info');
    const player2Info = document.querySelector('#player2-info');
    
    if (currentPlayer === players.player1.symbol) {
        player1Info.classList.add('active-player');
        player2Info.classList.remove('active-player');
    } else {
        player2Info.classList.add('active-player');
        player1Info.classList.remove('active-player');
    }
}

function handleWin(winner) {
    const winnerName = winner === 'player1' ? players.player1.name : players.player2.name;
    document.getElementById('status').textContent = `${winnerName} wins!`;
    gameActive = false;
    celebrateWin();

    // Update normal play scores
    if (gameMode === 'normal') {
        normalPlayScores[winner]++;
        updateNormalPlayScoreDisplay();
    }

    startCountdown();
}

function handleDraw() {
    document.getElementById('status').textContent = 'Match Drawn!';
    gameActive = false;
    startCountdown();
}

function startCountdown() {
    let countdown = 3;
    const statusElement = document.getElementById('status');
    
    const countdownInterval = setInterval(() => {
        statusElement.textContent = `Next game starting in ${countdown}...`;
        countdown--;

        if (countdown < 0) {
            clearInterval(countdownInterval);
            initializeGame();
        }
    }, 1000);
}

function updateNormalPlayScoreDisplay() {
    document.querySelector('.player1-score').textContent = normalPlayScores.player1;
    document.querySelector('.player2-score').textContent = normalPlayScores.player2;
}

function isSeriesDecided() {
    const winsNeeded = Math.ceil(seriesLength / 2); // Number of wins needed to win series
    const remainingGames = seriesLength - (scores.player1 + scores.player2 + draws);

    // Check if either player has won enough games or if it's impossible to win
    return scores.player1 >= winsNeeded || 
           scores.player2 >= winsNeeded || 
           (scores.player1 + scores.player2 + draws >= seriesLength);
}

function handleSeriesWin(winner) {
    const currentWinner = winner;
    scores[currentWinner]++;
    updateScoreDisplay();
    
    const winsNeeded = Math.ceil(seriesLength / 2);
    const winnerName = currentWinner === 'player1' ? players.player1.name : players.player2.name;

    if (scores[currentWinner] >= winsNeeded || isSeriesDecided()) {
        handleSeriesEnd(currentWinner);
    } else {
        document.getElementById('status').textContent = 
            `${winnerName} wins this game! (${scores.player1}-${scores.player2}, Draws: ${draws})`;
        startCountdown();
    }
}

function handleSeriesDraw() {
    draws++;
    updateScoreDisplay();

    if (!isSeriesDecided()) {
        document.getElementById('status').textContent = 
            `Game Drawn! (${scores.player1}-${scores.player2}, Draws: ${draws})`;
        startCountdown();
    } else {
        handleSeriesEnd();
    }
}

function handleSeriesEnd(winner) {
    const winnerName = winner === 'player1' ? players.player1.name : players.player2.name;
    
    let resultMessage = `Series Complete!\n`;
    resultMessage += `${players.player1.name}: ${scores.player1} wins\n`;
    resultMessage += `${players.player2.name}: ${scores.player2} wins\n`;
    resultMessage += `Draws: ${draws}\n`;
    
    if (scores.player1 !== scores.player2) {
        resultMessage += `${winnerName} wins the series!`;
        document.querySelector(`.${winner}-score`).parentElement.classList.add('series-winner');
    } else {
        resultMessage += `Series ends in a draw!`;
    }
    
    document.getElementById('status').textContent = resultMessage;
    gameActive = false;
    celebrateWin();
}

function resetSeries() {
    scores = { player1: 0, player2: 0 };
    draws = 0;
    document.querySelectorAll('.player-score').forEach(el => 
        el.classList.remove('series-winner'));
    updateScoreDisplay();
    initializeGame();
}

// Add cleanup function for series mode
function cleanupSeriesMode() {
    const seriesElements = {
        info: document.querySelector('.series-info'),
        player1Name: document.querySelector('.player1-name'),
        player2Name: document.querySelector('.player2-name'),
        player1Score: document.querySelector('.player1-score'),
        player2Score: document.querySelector('.player2-score'),
        totalMatches: document.querySelector('.total-matches'),
        matchesInfo: document.querySelector('.matches-info')
    };

    // Reset all series-related elements
    if (seriesElements.info) seriesElements.info.style.display = 'none';
    if (seriesElements.player1Name) seriesElements.player1Name.textContent = '';
    if (seriesElements.player2Name) seriesElements.player2Name.textContent = '';
    if (seriesElements.player1Score) seriesElements.player1Score.textContent = '0';
    if (seriesElements.player2Score) seriesElements.player2Score.textContent = '0';
    if (seriesElements.totalMatches) seriesElements.totalMatches.textContent = '3';
    if (seriesElements.matchesInfo) {
        seriesElements.matchesInfo.textContent = 'Matches: 0/3 (Draws: 0)';
    }
}

// Update resetSetupPage function
function resetSetupPage() {
    // Reset match type buttons without changing the game mode
    document.querySelectorAll('.match-btn').forEach(btn => {
        btn.classList.remove('selected');
    });

    // Reset series options
    const seriesOptions = document.querySelector('.series-options');
    if (seriesOptions) {
        seriesOptions.style.display = 'none';
    }

    // Reset series length dropdown
    const seriesLengthSelect = document.getElementById('series-length');
    if (seriesLengthSelect) {
        seriesLengthSelect.value = '3';
    }

    // Reset custom series input
    const customSeriesDiv = document.getElementById('custom-series');
    const customLengthInput = document.getElementById('custom-length');
    if (customSeriesDiv) customSeriesDiv.style.display = 'none';
    if (customLengthInput) customLengthInput.value = '';
}

// Initialize event listeners when the page loads
document.addEventListener('DOMContentLoaded', () => {
    // Restore the last game mode from storage
    GameModeManager.restoreLastMode();
    
    // Attach initial event listeners for the landing page
    const startButton = document.querySelector('.start-btn');
    if (startButton) {
        startButton.addEventListener('click', () => showPage('setup'));
    }
});

