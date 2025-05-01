
        // Game configuration
        const TILE_SIZE = 32;
        let level = [];
        let gameWidth = 0;
        let gameHeight = 0;
        let score = 0;
        let isGameOver = false;
        let hasWon = false;
        
        // Game elements
        const player = {
            x: 0,
            y: 0,
            width: 28,
            height: 28,
            speedX: 0,
            speedY: 0,
            isJumping: false,
            moveSpeed: 5,
            jumpForce: 10,
            color: '#FF5733'
        };
        
        const enemies = [];
        const collectibles = [];
        let exitPos = { x: 0, y: 0 };
        
        // Physics
        let gravity = 0.5;
        
        // Controls
        const keys = {
            left: false,
            right: false,
            up: false
        };
        
        // Canvas setup
        const canvas = document.getElementById('game-canvas');
        const ctx = canvas.getContext('2d');
        const scoreDisplay = document.getElementById('score');
        const statusDisplay = document.getElementById('status');
        
        // Initialize event listeners
        document.getElementById('level1').addEventListener('click', () => loadLevel(1));
        document.getElementById('level2').addEventListener('click', () => loadLevel(2));
        document.getElementById('level3').addEventListener('click', () => loadLevel(3));
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft') keys.left = true;
            if (e.key === 'ArrowRight') keys.right = true;
            if (e.key === ' ' || e.key === 'ArrowUp') keys.up = true;
        });
        
        document.addEventListener('keyup', (e) => {
            if (e.key === 'ArrowLeft') keys.left = false;
            if (e.key === 'ArrowRight') keys.right = false;
            if (e.key === ' ' || e.key === 'ArrowUp') keys.up = false;
        });
        
        // Load level from Python backend
        async function loadLevel(difficulty) {
            try {
                statusDisplay.textContent = `Loading level ${difficulty}...`;
                
                // In a real implementation, this would be your Python server address
                // For this example, we'll simulate the API response
                const levelData = await simulateAPIResponse(difficulty);
                
                level = levelData.level;
                gameWidth = levelData.width * TILE_SIZE;
                gameHeight = levelData.height * TILE_SIZE;
                
                // Set player physics from level data
                player.moveSpeed = levelData.player_speed;
                player.jumpForce = levelData.jump_force;
                gravity = levelData.gravity;
                
                // Reset game state
                resetGame();
                
                // Parse the level data
                parseLevel();
                
                // Start the game loop
                if (!gameLoopRunning) {
                    gameLoopRunning = true;
                    gameLoop();
                }
                
                statusDisplay.textContent = `Level ${difficulty} loaded! Game running...`;
            } catch (error) {
                statusDisplay.textContent = `Error loading level: ${error.message}`;
                console.error('Failed to load level:', error);
            }
        }
        
        // Simulate API response from Python backend
        function simulateAPIResponse(difficulty) {
            // This simulates what we'd get from the Python level generator
            // In a real implementation, this would be an actual fetch call to your Python server
            return new Promise((resolve) => {
                setTimeout(() => {
                    // Generate a very simple level for demonstration
                    const width = 25;
                    const height = 15;
                    const simulatedLevel = Array(height).fill().map(() => Array(width).fill(0));
                    
                    // Add ground
                    for (let x = 0; x < width; x++) {
                        simulatedLevel[height-1][x] = 1;
                    }
                    
                    // Add some platforms based on difficulty
                    for (let i = 0; i < 3 + difficulty; i++) {
                        const platformLen = 3 + Math.floor(Math.random() * 5);
                        const x = Math.floor(Math.random() * (width - platformLen));
                        const y = 5 + Math.floor(Math.random() * (height - 7));
                        
                        for (let j = 0; j < platformLen; j++) {
                            simulatedLevel[y][x + j] = 1;
                        }
                    }
                    
                    // Add player starting position
                    simulatedLevel[height-2][2] = 2;
                    
                    // Add exit
                    simulatedLevel[height-2][width-3] = 3;
                    
                    // Add collectibles
                    for (let i = 0; i < difficulty * 3; i++) {
                        const x = 2 + Math.floor(Math.random() * (width - 4));
                        const y = 2 + Math.floor(Math.random() * (height - 4));
                        if (simulatedLevel[y][x] === 0) {
                            simulatedLevel[y][x] = 4;
                        }
                    }
                    
                    // Add enemies
                    for (let i = 0; i < difficulty; i++) {
                        const x = 5 + Math.floor(Math.random() * (width - 10));
                        const y = 2 + Math.floor(Math.random() * (height - 4));
                        if (simulatedLevel[y][x] === 0) {
                            simulatedLevel[y][x] = 5;
                        }
                    }
                    
                    // In a real implementation, this would come from the Python API
                    resolve({
                        level: simulatedLevel,
                        difficulty,
                        width,
                        height,
                        player_speed: 5 + (difficulty * 0.5),
                        enemy_speed: 2 + difficulty * 0.5,
                        jump_force: 10,
                        gravity: 0.5
                    });
                }, 500); // Simulate network delay
            });
        }
        
        // Parse level data into game elements
        function parseLevel() {
            enemies.length = 0;
            collectibles.length = 0;
            
            for (let y = 0; y < level.length; y++) {
                for (let x = 0; x < level[y].length; x++) {
                    const tileType = level[y][x];
                    
                    switch (tileType) {
                        case 2: // Player start
                            player.x = x * TILE_SIZE;
                            player.y = y * TILE_SIZE;
                            break;
                        case 3: // Exit
                            exitPos.x = x * TILE_SIZE;
                            exitPos.y = y * TILE_SIZE;
                            break;
                        case 4: // Collectible
                            collectibles.push({
                                x: x * TILE_SIZE + 8,
                                y: y * TILE_SIZE + 8,
                                width: 16,
                                height: 16,
                                collected: false
                            });
                            break;
                        case 5: // Enemy
                            enemies.push({
                                x: x * TILE_SIZE,
                                y: y * TILE_SIZE,
                                width: 28,
                                height: 28,
                                speedX: 2,
                                direction: 1
                            });
                            break;
                    }
                }
            }
        }
        
        // Reset game state
        function resetGame() {
            score = 0;
            isGameOver = false;
            hasWon = false;
            player.speedX = 0;
            player.speedY = 0;
            player.isJumping = false;
            updateScore();
        }
        
        // Game loop
        let gameLoopRunning = false;
        function gameLoop() {
            if (!isGameOver) {
                update();
            }
            render();
            requestAnimationFrame(gameLoop);
        }
        
        // Update game state
        function update() {
            if (isGameOver) return;
            
            // Handle player input
            player.speedX = 0;
            if (keys.left) player.speedX = -player.moveSpeed;
            if (keys.right) player.speedX = player.moveSpeed;
            
            // Jumping
            if (keys.up && !player.isJumping) {
                player.speedY = -player.jumpForce;
                player.isJumping = true;
            }
            
            // Apply gravity
            player.speedY += gravity;
            
            // Move player
            player.x += player.speedX;
            player.y += player.speedY;
            
            // Simple collision detection with level bounds
            if (player.x < 0) player.x = 0;
            if (player.x + player.width > gameWidth) player.x = gameWidth - player.width;
            
            // Check for platform collisions
            checkPlatformCollisions();
            
            // Update enemies
            updateEnemies();
            
            // Check collectible collisions
            checkCollectibleCollisions();
            
            // Check enemy collisions
            checkEnemyCollisions();
            
            // Check exit reached
            checkExitReached();
        }
        
        // Check platform collisions
        function checkPlatformCollisions() {
            // Temporary flags for collision sides
            let onGround = false;
            
            // Get player grid position
            const playerLeft = Math.floor(player.x / TILE_SIZE);
            const playerRight = Math.floor((player.x + player.width) / TILE_SIZE);
            const playerTop = Math.floor(player.y / TILE_SIZE);
            const playerBottom = Math.floor((player.y + player.height) / TILE_SIZE);
            
            // Check surrounding tiles
            for (let y = playerTop; y <= playerBottom + 1; y++) {
                for (let x = playerLeft; x <= playerRight; x++) {
                    // Make sure we're checking a valid tile
                    if (y >= 0 && y < level.length && x >= 0 && x < level[0].length) {
                        if (level[y][x] === 1) { // It's a solid tile
                            // Tile boundaries
                            const tileTop = y * TILE_SIZE;
                            const tileBottom = tileTop + TILE_SIZE;
                            const tileLeft = x * TILE_SIZE;
                            const tileRight = tileLeft + TILE_SIZE;
                            
                            // Bottom collision (landing)
                            if (player.y + player.height > tileTop && 
                                player.y < tileTop &&
                                player.speedY > 0 &&
                                player.x + player.width > tileLeft + 5 && 
                                player.x < tileRight - 5) {
                                player.y = tileTop - player.height;
                                player.speedY = 0;
                                player.isJumping = false;
                                onGround = true;
                            }
                            
                            // Top collision (hitting head)
                            else if (player.y < tileBottom && 
                                    player.y + player.height > tileBottom &&
                                    player.speedY < 0 &&
                                    player.x + player.width > tileLeft + 5 && 
                                    player.x < tileRight - 5) {
                                player.y = tileBottom;
                                player.speedY = 0;
                            }
                            
                            // Right collision
                            else if (player.x < tileRight && 
                                    player.x + player.width > tileRight &&
                                    player.y + player.height > tileTop + 5 && 
                                    player.y < tileBottom - 5) {
                                player.x = tileRight;
                            }
                            
                            // Left collision
                            else if (player.x + player.width > tileLeft && 
                                    player.x < tileLeft &&
                                    player.y + player.height > tileTop + 5 && 
                                    player.y < tileBottom - 5) {
                                player.x = tileLeft - player.width;
                            }
                        }
                    }
                }
            }
            
            // If player is falling off screen
            if (player.y > canvas.height) {
                gameOver(false);
            }
        }
        
        // Update enemy movements
        function updateEnemies() {
            enemies.forEach(enemy => {
                // Move enemy
                enemy.x += enemy.speedX * enemy.direction;
                
                // Check if enemy should turn around (edge detection or platform edge)
                const enemyTileX = Math.floor((enemy.x + (enemy.direction > 0 ? enemy.width : 0)) / TILE_SIZE);
                const enemyBottomY = Math.floor((enemy.y + enemy.height + 5) / TILE_SIZE);
                
                // Check if enemy is at edge of screen or platform
                if (enemy.x <= 0 || enemy.x + enemy.width >= gameWidth) {
                    enemy.direction *= -1;
                }
                // Check if enemy would fall off platform
                else if (enemyBottomY < level.length && 
                        enemyTileX >= 0 && 
                        enemyTileX < level[0].length &&
                        level[enemyBottomY][enemyTileX] !== 1) {
                    enemy.direction *= -1;
                }
            });
        }
        
        // Check collectible collisions
        function checkCollectibleCollisions() {
            collectibles.forEach(coin => {
                if (!coin.collected && 
                    player.x < coin.x + coin.width &&
                    player.x + player.width > coin.x &&
                    player.y < coin.y + coin.height &&
                    player.y + player.height > coin.y) {
                    
                    coin.collected = true;
                    score += 10;
                    updateScore();
                }
            });
        }
        
        // Check enemy collisions
        function checkEnemyCollisions() {
            enemies.forEach(enemy => {
                if (player.x < enemy.x + enemy.width &&
                    player.x + player.width > enemy.x &&
                    player.y < enemy.y + enemy.height &&
                    player.y + player.height > enemy.y) {
                    
                    // Game over
                    gameOver(false);
                }
            });
        }
        
        // Check if player reached the exit
        function checkExitReached() {
            if (player.x < exitPos.x + TILE_SIZE &&
                player.x + player.width > exitPos.x &&
                player.y < exitPos.y + TILE_SIZE &&
                player.y + player.height > exitPos.y) {
                
                // Level complete
                gameOver(true);
            }
        }
        
        // Game over (win or lose)
        function gameOver(won) {
            isGameOver = true;
            hasWon = won;
            
            if (won) {
                statusDisplay.textContent = `Level complete! Score: ${score}`;
            } else {
                statusDisplay.textContent = 'Game Over! Try again?';
            }
        }
        
        // Update score display
        function updateScore() {
            scoreDisplay.textContent = `Score: ${score}`;
        }
        
        // Render game
        function render() {
            // Clear canvas
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Draw sky background
            ctx.fillStyle = '#87CEEB';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Draw level
            for (let y = 0; y < level.length; y++) {
                for (let x = 0; x < level[y].length; x++) {
                    const tileType = level[y][x];
                    
                    if (tileType === 1) { // Platform/ground
                        ctx.fillStyle = '#8B4513'; // Brown for ground
                        ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
                        
                        // Add grass top if it's a ground tile
                        if (y > 0 && (level[y-1][x] === 0 || level[y-1][x] === 2 || 
                                     level[y-1][x] === 3 || level[y-1][x] === 4 || 
                                     level[y-1][x] === 5)) {
                            ctx.fillStyle = '#228B22'; // Green for grass
                            ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, 5);
                        }
                    }
                    else if (tileType === 3) { // Exit
                        ctx.fillStyle = '#FFD700'; // Gold for exit
                        ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
                        
                        // Add door details
                        ctx.fillStyle = '#8B4513'; // Brown
                        ctx.fillRect(x * TILE_SIZE + 5, y * TILE_SIZE + 10, TILE_SIZE - 10, TILE_SIZE - 10);
                        ctx.fillStyle = '#000'; // Black doorknob
                        ctx.beginPath();
                        ctx.arc(x * TILE_SIZE + 22, y * TILE_SIZE + 18, 3, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }
            }
            
            // Draw collectibles
            collectibles.forEach(coin => {
                if (!coin.collected) {
                    ctx.fillStyle = '#FFD700'; // Gold
                    ctx.beginPath();
                    ctx.arc(coin.x + 8, coin.y + 8, 8, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.strokeStyle = '#B8860B'; // Dark gold
                    ctx.lineWidth = 2;
                    ctx.stroke();
                }
            });
            
            // Draw enemies
            enemies.forEach(enemy => {
                ctx.fillStyle = '#FF0000'; // Red
                ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
                
                // Add eyes
                ctx.fillStyle = '#FFF';
                ctx.beginPath();
                ctx.arc(enemy.x + (enemy.direction > 0 ? 18 : 10), enemy.y + 10, 4, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#000';
                ctx.beginPath();
                ctx.arc(enemy.x + (enemy.direction > 0 ? 20 : 8), enemy.y + 10, 2, 0, Math.PI * 2);
                ctx.fill();
            });
            
            // Draw player
            ctx.fillStyle = player.color;
            ctx.fillRect(player.x, player.y, player.width, player.height);
            
            // Add player eyes
            ctx.fillStyle = '#FFF';
            ctx.beginPath();
            ctx.arc(player.x + (player.speedX >= 0 ? 18 : 10), player.y + 10, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#000';
            ctx.beginPath();
            ctx.arc(player.x + (player.speedX >= 0 ? 20 : 8), player.y + 10, 2, 0, Math.PI * 2);
            ctx.fill();
            
            // Draw game over message
            if (isGameOver) {
                ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                ctx.fillRect(0, canvas.height / 2 - 50, canvas.width, 100);
                
                ctx.fillStyle = hasWon ? '#00FF00' : '#FF0000';
                ctx.font = '30px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(hasWon ? 'Level Complete!' : 'Game Over!', canvas.width / 2, canvas.height / 2);
                
                ctx.font = '20px Arial';
                ctx.fillStyle = '#FFFFFF';
                ctx.fillText('Press a level button to play again', canvas.width / 2, canvas.height / 2 + 30);
            }
        }