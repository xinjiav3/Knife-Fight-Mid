// Game state variables
let canvas;
let ctx;
let socket;
let playerId;
let opponentId;
let gameId;
let isHost = false;

// Game physics
const gravity = 0.5;
const friction = 0.8;
const floorY = 400;

// Player objects
const player = {
    x: 0,
    y: 0,
    width: 40,
    height: 60,
    color: '#FF5733',
    speedX: 0,
    speedY: 0,
    health: 100,
    direction: 1,  // 1 = right, -1 = left
    attacking: false,
    attackCooldown: 0,
    isJumping: false
};

const opponent = {
    x: 0,
    y: 0,
    width: 40,
    height: 60,
    color: '#33A1FF',
    health: 100,
    direction: -1,
    attacking: false
};

// Controls
const keys = {
    left: false,
    right: false,
    up: false,
    attack: false
};

// DOM elements and screens
let lobbyScreen;
let waitingScreen;
let gameScreen;
let gameOverScreen;
let statusDisplay;
let playerHealthFill;
let opponentHealthFill;
let playerNameDisplay;
let opponentNameDisplay;

// Initialize when the window loads
window.addEventListener('load', initGame);

function initGame() {
    // Initialize canvas
    canvas = document.getElementById('game-canvas');
    ctx = canvas.getContext('2d');
    
    // Initialize screen elements
    lobbyScreen = document.getElementById('lobby');
    waitingScreen = document.getElementById('waiting');
    gameScreen = document.getElementById('game');
    gameOverScreen = document.getElementById('game-over-screen');
    statusDisplay = document.getElementById('status');
    playerHealthFill = document.getElementById('player-health-fill');
    opponentHealthFill = document.getElementById('opponent-health-fill');
    playerNameDisplay = document.getElementById('player-name-display');
    opponentNameDisplay = document.getElementById('opponent-name-display');
    
    // Set up event listeners
    setupEventListeners();
    
    // Initialize Socket.IO
    setupSocketIO();
}

// Set up UI event listeners
function setupEventListeners() {
    // Game creation/joining
    document.getElementById('create-game-btn').addEventListener('click', createGame);
    document.getElementById('join-game-btn').addEventListener('click', joinGame);
    document.getElementById('play-again-btn').addEventListener('click', returnToLobby);
    
    // Keyboard controls
    document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft') keys.left = true;
        if (e.key === 'ArrowRight') keys.right = true;
        if (e.key === 'ArrowUp' || e.key === ' ') keys.up = true;
        if (e.key === 'z' || e.key === 'x') {
            keys.attack = true;
            handleAttack();
        }
    });
    
    document.addEventListener('keyup', (e) => {
        if (e.key === 'ArrowLeft') keys.left = false;
        if (e.key === 'ArrowRight') keys.right = false;
        if (e.key === 'ArrowUp' || e.key === ' ') keys.up = false;
        if (e.key === 'z' || e.key === 'x') keys.attack = false;
    });
}

// Initialize Socket.IO connection
function setupSocketIO() {
    // Connect to the server
    socket = io();
    
    // Generate a random player ID
    playerId = 'player_' + Math.random().toString(36).substr(2, 9);
    
    // Socket.IO event handlers
    socket.on('connect', () => {
        console.log('Connected to server');
    });
    
    socket.on('game_created', (data) => {
        gameId = data.game_id;
        
        // Display the game ID for sharing
        document.getElementById('game-id-display').textContent = gameId;
        
        // Set player position from server data
        updatePlayerFromServer(data.game_data.players[playerId]);
        
        // Show waiting screen
        showScreen('waiting');
        
        // Set player as host
        isHost = true;
        
        // Set player name display
        const playerName = document.getElementById('player-name').value.trim() || 'You';
        playerNameDisplay.textContent = playerName;
    });
    
    socket.on('game_start', (data) => {
        console.log('Game starting:', data);
        
        // If not host, set player position from server data
        if (!isHost) {
            updatePlayerFromServer(data.game_data.players[playerId]);
            
            // Set player name display
            const playerName = document.getElementById('player-name').value.trim() || 'You';
            playerNameDisplay.textContent = playerName;
        }
        
        // Find opponent ID and set opponent data
        for (const pid in data.game_data.players) {
            if (pid !== playerId) {
                opponentId = pid;
                updateOpponentFromServer(data.game_data.players[pid]);
                opponentNameDisplay.textContent = data.game_data.players[pid].name;
                break;
            }
        }
        
        // Show game screen
        showScreen('game');
        
        // Start the game loop
        if (!gameLoopRunning) {
            gameLoopRunning = true;
            gameLoop();
        }
    });
    
    socket.on('player_state', (data) => {
        // Update opponent state
        if (data.player_id !== playerId) {
            updateOpponentFromServer(data.state);
        }
    });
    
    socket.on('player_attack', (data) => {
        if (data.player_id !== playerId) {
            opponent.attacking = true;
            setTimeout(() => {
                opponent.attacking = false;
            }, 300);
        }
    });
    
    socket.on('player_hit', (data) => {
        if (data.player_id === playerId) {
            // Player was hit
            player.health = data.health;
            updateHealthBars();
        } else {
            // Opponent was hit
            opponent.health = data.health;
            updateHealthBars();
        }
    });
    
    socket.on('game_over', (data) => {
        const resultDiv = document.getElementById('result');
        
        if (data.winner_id === playerId) {
            resultDiv.textContent = 'You Win!';
            resultDiv.style.color = '#4CAF50';
        } else {
            resultDiv.textContent = 'You Lose!';
            resultDiv.style.color = '#FF5733';
        }
        
        // Show game over screen after a short delay
        setTimeout(() => {
            showScreen('game-over-screen');
        }, 2000);
    });
    
    socket.on('error', (data) => {
        alert('Error: ' + data.message);
    });
}

// Update player object from server data
function updatePlayerFromServer(serverPlayer) {
    player.x = serverPlayer.x;
    player.y = serverPlayer.y;
    player.color = serverPlayer.color;
    player.health = serverPlayer.health;
    player.direction = serverPlayer.direction;
}

// Update opponent object from server data
function updateOpponentFromServer(serverPlayer) {
    opponent.x = serverPlayer.x;
    opponent.y = serverPlayer.y;
    opponent.color = serverPlayer.color;
    opponent.health = serverPlayer.health;
    opponent.direction = serverPlayer.direction;
    
    // If attack state changes, handle the animation
    if (serverPlayer.attacking && !opponent.attacking) {
        opponent.attacking = true;
        setTimeout(() => {
            opponent.attacking = false;
        }, 300);
    }
}

// Create a new game
function createGame() {
    const playerName = document.getElementById('player-name').value.trim() || 'Player';
    
    socket.emit('create_game', {
        player_id: playerId,
        player_name: playerName
    });
}

// Join an existing game
function joinGame() {
    const playerName = document.getElementById('player-name').value.trim() || 'Player';
    const gameIdInput = document.getElementById('game-id-input').value.trim();
    
    if (gameIdInput) {
        gameId = gameIdInput;
        
        socket.emit('join_game', {
            player_id: playerId,
            player_name: playerName,
            game_id: gameId
        });
    } else {
        alert('Please enter a Game ID');
    }
}

// Send player update to server
function sendPlayerUpdate() {
    if (socket && gameId) {
        socket.emit('player_update', {
            game_id: gameId,
            player_id: playerId,
            update_data: {
                x: player.x,
                y: player.y,
                direction: player.direction
            }
        });
    }
}

// Handle player attack
function handleAttack() {
    if (player.attackCooldown <= 0) {
        player.attacking = true;
        player.attackCooldown = 30; // 30 frames cooldown
        
        // Send attack to server
        socket.emit('attack', {
            game_id: gameId,
            player_id: playerId
        });
        
        // Reset attack state after animation
        setTimeout(() => {
            player.attacking = false;
        }, 300);
    }
}

// Update health bars
function updateHealthBars() {
    playerHealthFill.style.width = player.health + '%';
    opponentHealthFill.style.width = opponent.health + '%';
    
    // Change color based on health
    if (player.health < 30) {
        playerHealthFill.style.backgroundColor = '#FF5733';
    } else if (player.health < 60) {
        playerHealthFill.style.backgroundColor = '#FFC300';
    }
    
    if (opponent.health < 30) {
        opponentHealthFill.style.backgroundColor = '#FF5733';
    } else if (opponent.health < 60) {
        opponentHealthFill.style.backgroundColor = '#FFC300';
    }
}

// Return to lobby
function returnToLobby() {
    showScreen('lobby');
}

// Show the specified screen and hide others
function showScreen(screenId) {
    const screens = ['lobby', 'waiting', 'game', 'game-over-screen'];
    
    screens.forEach(id => {
        const screen = document.getElementById(id);
        if (id === screenId) {
            screen.classList.remove('hidden');
        } else {
            screen.classList.add('hidden');
        }
    });
}

// Game loop
let gameLoopRunning = false;
function gameLoop() {
    update();
    render();
    requestAnimationFrame(gameLoop);
}

// Update game state
function update() {
    // Decrease attack cooldown
    if (player.attackCooldown > 0) {
        player.attackCooldown--;
    }
    
    // Handle player movement
    player.speedX = 0;
    
    if (keys.left) {
        player.speedX = -5;
        player.direction = -1;
    }
    if (keys.right) {
        player.speedX = 5;
        player.direction = 1;
    }
    
    // Jumping
    if (keys.up && !player.isJumping) {
        player.speedY = -12;
        player.isJumping = true;
    }
    
    // Apply gravity
    player.speedY += gravity;
    
    // Move player
    player.x += player.speedX;
    player.y += player.speedY;
    
    // Keep player in bounds
    if (player.x < 0) player.x = 0;
    if (player.x + player.width > canvas.width) player.x = canvas.width - player.width;
    
    // Floor collision
    if (player.y + player.height > floorY) {
        player.y = floorY - player.height;
        player.speedY = 0;
        player.isJumping = false;
    }
    
    // Send updates to server
    sendPlayerUpdate();
}

// Render game
function render() {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw background
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw floor
    ctx.fillStyle = '#444';
    ctx.fillRect(0, floorY, canvas.width, canvas.height - floorY);
    
    // Draw opponent
    drawPlayer(opponent);
    
    // Draw player
    drawPlayer(player);
}

// Draw a player
function drawPlayer(playerObj) {
    // Draw body
    ctx.fillStyle = playerObj.color;
    ctx.fillRect(playerObj.x, playerObj.y, playerObj.width, playerObj.height);
    
    // Draw eyes (facing direction)
    ctx.fillStyle = '#FFF';
    if (playerObj.direction > 0) {
        ctx.fillRect(playerObj.x + 25, playerObj.y + 15, 8, 8);
    } else {
        ctx.fillRect(playerObj.x + 5, playerObj.y + 15, 8, 8);
    }
    
    // Draw knife if attacking
    if (playerObj.attacking) {
        ctx.fillStyle = '#DDD';
        if (playerObj.direction > 0) {
            // Knife on right side
            ctx.fillRect(playerObj.x + playerObj.width, playerObj.y + 30, 20, 5);
        } else {
            // Knife on left side
            ctx.fillRect(playerObj.x - 20, playerObj.y + 30, 20, 5);
        }
    }
}