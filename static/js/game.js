// Game state variables
let canvas;
let ctx;
let socket;
let playerId;
let opponentId;
let gameId;
let isHost = false;
let lastUpdateTime = 0;

// Game physics
const gravity = 0.5;
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
    direction: 1,  // 1 = right, -1 = left
    isJumping: false
};

const opponent = {
    x: 0,
    y: 0,
    width: 40,
    height: 60,
    color: '#33A1FF',
    direction: -1,
    connected: true
};

// Controls - will track key state even when window is not focused
const keys = {
    left: false,  // A
    right: false, // D
    up: false,    // W
    down: false   // S
};

// DOM elements and screens
let lobbyScreen;
let waitingScreen;
let gameScreen;
let gameOverScreen;
let statusDisplay;
let playerNameDisplay;
let opponentNameDisplay;

// Game loop variables
let gameLoopRunning = false;
let lastFrameTime = 0;
const UPDATE_INTERVAL = 50; // Send position updates every 50ms
let updateIntervalId = null; // For setInterval

// Initialize when the window loads
window.addEventListener('load', initGame);

function initGame() {
    // Initialize canvas
    canvas = document.getElementById('game-canvas');
    if (!canvas) {
        console.error('Canvas element not found!');
        return;
    }
    
    ctx = canvas.getContext('2d');
    
    // Initialize screen elements
    lobbyScreen = document.getElementById('lobby');
    waitingScreen = document.getElementById('waiting');
    gameScreen = document.getElementById('game');
    gameOverScreen = document.getElementById('game-over-screen');
    statusDisplay = document.getElementById('status');
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
    
    // Keyboard controls - Using WASD
    window.addEventListener('keydown', (e) => {
        switch(e.key.toLowerCase()) {
            case 'a':
                keys.left = true;
                break;
            case 'd':
                keys.right = true;
                break;
            case 'w':
                keys.up = true;
                break;
            case 's':
                keys.down = true;
                break;
        }
    });
    
    window.addEventListener('keyup', (e) => {
        switch(e.key.toLowerCase()) {
            case 'a':
                keys.left = false;
                break;
            case 'd':
                keys.right = false;
                break;
            case 'w':
                keys.up = false;
                break;
            case 's':
                keys.down = false;
                break;
        }
    });
    
    // Using visibilitychange to detect when tab is inactive
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Use blur/focus to detect when window loses/gains focus
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);
}

// Handle tab visibility change
function handleVisibilityChange() {
    if (document.hidden) {
        // Tab is now hidden - switch to interval-based updates
        console.log("Tab hidden - switching to interval-based updates");
        switchToIntervalUpdates();
    } else {
        // Tab is now visible again - switch back to requestAnimationFrame
        console.log("Tab visible again - switching to animation frame updates");
        switchToAnimationFrameUpdates();
    }
}

// Handle window blur
function handleWindowBlur() {
    console.log("Window lost focus - switching to interval-based updates");
    switchToIntervalUpdates();
}

// Handle window focus
function handleWindowFocus() {
    console.log("Window gained focus - switching to animation frame updates");
    switchToAnimationFrameUpdates();
}

// Switch to interval-based updates when tab is not focused
function switchToIntervalUpdates() {
    // Only create interval if it doesn't exist and game is running
    if (!updateIntervalId && gameLoopRunning) {
        // Clear any existing animation frame
        cancelAnimationFrame(gameLoopRunning);
        
        // Create interval that updates and sends position regularly
        updateIntervalId = setInterval(() => {
            update(16); // Approximate 60fps delta time
            sendPlayerUpdate();
        }, 16); // ~60fps update rate
    }
}

// Switch back to animation frame updates when tab is focused
function switchToAnimationFrameUpdates() {
    // Clear interval if it exists
    if (updateIntervalId) {
        clearInterval(updateIntervalId);
        updateIntervalId = null;
        
        // Restart animation frame loop if game is running
        if (gameLoopRunning) {
            requestAnimationFrame(gameLoop);
        }
    }
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
    
    socket.on('player_joined', (data) => {
        console.log('Player joined:', data);
        
        // Update status
        statusDisplay.textContent = `${data.player_name} has joined the game!`;
        
        // Set opponent name
        opponentNameDisplay.textContent = data.player_name;
        
        // Store opponent ID
        opponentId = data.player_id;
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
            
            // Start with the appropriate update method based on visibility
            if (document.hidden || document.visibilityState === 'hidden') {
                switchToIntervalUpdates();
            } else {
                requestAnimationFrame(gameLoop);
            }
        }
    });
    
    socket.on('player_state', (data) => {
        // Update opponent state
        if (data.player_id !== playerId && opponentId === data.player_id) {
            updateOpponentFromServer(data.state);
            
            // Make sure to render after receiving opponent updates
            // This ensures the opponent is drawn even when the tab is not focused
            render();
        }
    });
    
    socket.on('player_disconnected', (data) => {
        if (data.player_id === opponentId) {
            opponent.connected = false;
            statusDisplay.textContent = "Opponent disconnected!";
            render(); // Force a render to show disconnection message
        }
    });
    
    socket.on('error', (data) => {
        alert('Error: ' + data.message);
    });
}

// Update player object from server data
function updatePlayerFromServer(serverPlayer) {
    if (!serverPlayer) return;
    
    player.x = serverPlayer.x;
    player.y = serverPlayer.y;
    player.color = serverPlayer.color;
    player.direction = serverPlayer.direction;
}

// Update opponent object from server data
function updateOpponentFromServer(serverPlayer) {
    if (!serverPlayer) return;
    
    opponent.x = serverPlayer.x || opponent.x;
    opponent.y = serverPlayer.y || opponent.y;
    opponent.color = serverPlayer.color || opponent.color;
    opponent.direction = serverPlayer.direction || opponent.direction;
}

// Create a new game
function createGame() {
    const playerName = document.getElementById('player-name').value.trim() || 'Player';
    const customGameId = document.getElementById('custom-game-id')?.value.trim() || '';
    
    socket.emit('create_game', {
        player_id: playerId,
        player_name: playerName,
        custom_game_id: customGameId
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

// Return to lobby
function returnToLobby() {
    showScreen('lobby');
    
    // Stop game loop
    gameLoopRunning = false;
    
    // Clear any interval
    if (updateIntervalId) {
        clearInterval(updateIntervalId);
        updateIntervalId = null;
    }
}

// Show the specified screen and hide others
function showScreen(screenId) {
    const screens = ['lobby', 'waiting', 'game', 'game-over-screen'];
    
    screens.forEach(id => {
        const screen = document.getElementById(id);
        if (screen) {
            if (id === screenId) {
                screen.classList.remove('hidden');
            } else {
                screen.classList.add('hidden');
            }
        }
    });
}

// Game loop
function gameLoop(timestamp) {
    if (!gameLoopRunning) return;
    
    // Calculate delta time
    const deltaTime = timestamp - lastFrameTime || 16;
    lastFrameTime = timestamp;
    
    // Update game state
    update(deltaTime);
    
    // Only send updates to server periodically
    if (!lastUpdateTime || timestamp - lastUpdateTime >= UPDATE_INTERVAL) {
        sendPlayerUpdate();
        lastUpdateTime = timestamp;
    }
    
    // Render game
    render();
    
    // Continue loop if still using animation frames
    if (gameLoopRunning && !updateIntervalId) {
        requestAnimationFrame(gameLoop);
    }
}

// Update game state
function update(deltaTime) {
    // Handle player movement - now using WASD controls
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
}

// Render game
function render() {
    if (!ctx) return;
    
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
    
    // Draw disconnected message
    if (!opponent.connected) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 100, canvas.width, 60);
        
        ctx.fillStyle = '#FFF';
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Opponent Disconnected', canvas.width / 2, 140);
    }
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
}