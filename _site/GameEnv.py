
from flask import Flask, jsonify
import random
import json

app = Flask(__name__)

def generate_platform_level(difficulty=1, width=30, height=15):
    """
    Generate a simple platformer level.
    
    Parameters:
    - difficulty: controls number of obstacles and platforms (1-5)
    - width: level width in tiles
    - height: level height in tiles
    
    Returns a 2D grid where:
    - 0: empty space
    - 1: solid platform/ground
    - 2: player starting position
    - 3: level exit/goal
    - 4: collectible item
    - 5: enemy
    """
    # Initialize empty level
    level = [[0 for _ in range(width)] for _ in range(height)]
    
    # Add ground
    for x in range(width):
        level[height-1][x] = 1
    
    # Add some platforms based on difficulty
    num_platforms = 5 + (difficulty * 2)
    for _ in range(num_platforms):
        platform_len = random.randint(3, 8)
        x = random.randint(0, width - platform_len - 1)
        y = random.randint(height // 2, height - 3)
        
        for i in range(platform_len):
            level[y][x + i] = 1
    
    # Add some floating platforms
    num_floating = 3 + difficulty
    for _ in range(num_floating):
        platform_len = random.randint(2, 5)
        x = random.randint(0, width - platform_len - 1)
        y = random.randint(2, height // 2)
        
        for i in range(platform_len):
            level[y][x + i] = 1
    
    # Add player starting position (on ground, near left)
    start_x = random.randint(1, 5)
    level[height-2][start_x] = 2
    
    # Add exit point (on ground, near right)
    exit_x = random.randint(width - 6, width - 2)
    level[height-2][exit_x] = 3
    
    # Add collectibles
    num_collectibles = difficulty * 2
    for _ in range(num_collectibles):
        x = random.randint(1, width - 2)
        y = random.randint(1, height - 3)
        # Only place if space is empty
        if level[y][x] == 0:
            level[y][x] = 4
    
    # Add enemies based on difficulty
    num_enemies = difficulty
    for _ in range(num_enemies):
        x = random.randint(8, width - 2)
        y = random.randint(1, height - 3)
        # Only place if space is empty
        if level[y][x] == 0:
            level[y][x] = 5
    
    return level

@app.route('/generate_level/<int:difficulty>')
def get_level(difficulty):
    """API endpoint that returns a generated level as JSON"""
    if difficulty < 1:
        difficulty = 1
    elif difficulty > 5:
        difficulty = 5
        
    level_data = generate_platform_level(difficulty)
    
    # Add metadata
    level_package = {
        "level": level_data,
        "difficulty": difficulty,
        "width": len(level_data[0]),
        "height": len(level_data),
        "player_speed": 5 + (difficulty * 0.5),
        "enemy_speed": 2 + difficulty,
        "jump_force": 10,
        "gravity": 0.5
    }
    
    return jsonify(level_package)

@app.route('/')
def index():
    """Return simple instruction page"""
    return """
    <h1>Platform Level Generator API</h1>
    <p>Use /generate_level/[difficulty] to get a level (difficulty 1-5)</p>
    <p>Example: <a href="/generate_level/2">/generate_level/2</a></p>
    """

if __name__ == "__main__":
    app.run(debug=True)