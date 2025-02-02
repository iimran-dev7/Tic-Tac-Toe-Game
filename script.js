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

// Add this at the beginning of the file, after the existing variables
const transitionDuration = 400; // milliseconds

// Page Navigation
document.querySelector('.start-btn').addEventListener('click', () => showPage('setup'));
document.querySelector('.play-btn').addEventListener('click', startGame);

function showPage(page) {
    const currentPageElement = document.querySelector(`#${currentPage}-page`);
    const nextPageElement = document.querySelector(`#${page}-page`);
    
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

// Add match type selection logic
document.querySelectorAll('.match-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.match-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        gameMode = btn.dataset.type;
        document.querySelector('.series-options').style.display = 
            gameMode === 'series' ? 'block' : 'none';
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
    players.player1.name = document.getElementById('player1-name').value || 'Player 1';
    players.player2.name = document.getElementById('player2-name').value || 'Player 2';
    
    document.querySelector('#player1-info span').textContent = players.player1.name;
    document.querySelector('#player2-info span').textContent = players.player2.name;
    
    if (gameMode === 'series') {
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
    const seriesInfo = document.querySelector('.series-info');
    seriesInfo.style.display = 'block';
    
    document.querySelector('.player1-name').textContent = players.player1.name;
    document.querySelector('.player2-name').textContent = players.player2.name;
    document.querySelector('.total-matches').textContent = seriesLength;
    
    // Reset scores and draws when starting new series
    scores = { player1: 0, player2: 0 };
    draws = 0;
    updateScoreDisplay();
}

function updateScoreDisplay() {
    document.querySelector('.player1-score').textContent = scores.player1;
    document.querySelector('.player2-score').textContent = scores.player2;
    document.querySelector('.matches-info').textContent = 
        `Matches: ${scores.player1 + scores.player2 + draws}/${seriesLength} (Draws: ${draws})`;
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
    scores[winner]++;
    updateScoreDisplay();
    
    const winsNeeded = Math.ceil(seriesLength / 2);
    const winnerName = winner === 'player1' ? players.player1.name : players.player2.name;

    if (scores[winner] >= winsNeeded || isSeriesDecided()) {
        handleSeriesEnd();
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

function handleSeriesEnd() {
    const winner = scores.player1 > scores.player2 ? 'player1' : 'player2';
    const winnerName = winner === 'player1' ? players.player1.name : players.player2.name;
    
    let resultMessage = `Series Complete!\n`;
    resultMessage += `${players.player1.name}: ${scores.player1} wins\n`;
    resultMessage += `${players.player2.name}: ${scores.player2} wins\n`;
    resultMessage += `Draws: ${draws}\n`;
    
    if (scores.player1 !== scores.player2) {
        resultMessage += `${winnerName} wins the series!`;
    } else {
        resultMessage += `Series ends in a draw!`;
    }
    
    document.getElementById('status').textContent = resultMessage;
    document.querySelector(`.${winner}-score`).parentElement.classList.add('series-winner');
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

