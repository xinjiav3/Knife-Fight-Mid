from flask import Flask, render_template, send_from_directory, request
from flask_socketio import SocketIO, emit, join_room, leave_room
import os
import random

app = Flask(__name__, static_folder='static', template_folder='templates')
app.config['SECRET_KEY'] = 'your-secret-key'
socketio = SocketIO(app, cors_allowed_origins="*")

if __name__ == '__main__':
    socketio.run(app, host='localhost', port=5000, debug=False)

# Store active games
games = {}

@app.route('/')
def index():
    """Serve the main game page"""
    return render_template('index.html')

@app.route('/static/<path:path>')
def serve_static(path):
    """Serve static files"""
    return send_from_directory('static', path)

# Socket.IO - Basic connection events
@socketio.on('connect')
def handle_connect():
    print('Client connected')

@socketio.on('disconnect')
def handle_disconnect():
    print('Client disconnected')
    # Find and remove the player from any games they're in
    for game_id in list(games.keys()):
        game = games[game_id]
        for player_id in list(game['players'].keys()):
            if request.sid == game['players'][player_id]['sid']:
                del game['players'][player_id]
                emit('player_left', {'player_id': player_id}, to=game_id)
                
                # If no players remain, clean up the game
                if not game['players']:
                    del games[game_id]
                break

@socketio.on('create_game')
def handle_create_game(data):
    """Create a new game room"""
    player_id = data['player_id']
    player_name = data.get('player_name', f'Player {player_id}')
    
    # Generate a unique game ID
    game_id = f"game_{len(games) + 1}"
    
    # Create basic game state
    games[game_id] = {
        'players': {
            player_id: {
                'sid': request.sid,
                'name': player_name,
                'x': 100,
                'y': 300,
                'health': 100,
                'color': '#FF5733',  # First player color
                'direction': 1,  # 1 = right, -1 = left
                'attacking': False
            }
        },
        'state': 'waiting'  # waiting, playing, finished
    }
    
    # Join the room
    join_room(game_id)
    
    # Send game info back to the creator
    emit('game_created', {
        'game_id': game_id, 
        'player_id': player_id,
        'game_data': games[game_id]
    })

@socketio.on('join_game')
def handle_join_game(data):
    """Join an existing game room"""
    player_id = data['player_id']
    player_name = data.get('player_name', f'Player {player_id}')
    game_id = data['game_id']
    
    if game_id in games and len(games[game_id]['players']) < 2:
        # Add player to the game
        games[game_id]['players'][player_id] = {
            'sid': request.sid,
            'name': player_name,
            'x': 600,
            'y': 300,
            'health': 100,
            'color': '#33A1FF',  # Second player color
            'direction': -1,  # 1 = right, -1 = left
            'attacking': False
        }
        
        # Set game state to playing
        games[game_id]['state'] = 'playing'
        
        # Join the room
        join_room(game_id)
        
        # Start the game for all players
        emit('game_start', {
            'game_id': game_id,
            'game_data': games[game_id]
        }, to=game_id)
    else:
        # Game not found or full
        emit('error', {'message': 'Game not found or full'})

@socketio.on('player_update')
def handle_player_update(data):
    """Update a player's position and state"""
    game_id = data['game_id']
    player_id = data['player_id']
    update_data = data['update_data']
    
    if game_id in games and player_id in games[game_id]['players']:
        # Update player data
        player = games[game_id]['players'][player_id]
        for key, value in update_data.items():
            player[key] = value
        
        # Broadcast to all other players in the room
        emit('player_state', {
            'player_id': player_id,
            'state': update_data
        }, to=game_id, include_self=False)

@socketio.on('attack')
def handle_attack(data):
    """Handle a player's attack"""
    game_id = data['game_id']
    attacker_id = data['player_id']
    
    if game_id in games and attacker_id in games[game_id]['players']:
        # Get attacker position
        attacker = games[game_id]['players'][attacker_id]
        attacker['attacking'] = True
        
        # Check for hit on other player
        for player_id, player in games[game_id]['players'].items():
            if player_id != attacker_id:
                # Simple hit detection - In a real game, you'd want better collision detection
                hit = False
                attack_range = 60
                
                # Checking if other player is in attack range based on direction
                if attacker['direction'] > 0:  # Facing right
                    if player['x'] > attacker['x'] and player['x'] < attacker['x'] + attack_range:
                        hit = True
                else:  # Facing left
                    if player['x'] < attacker['x'] and player['x'] > attacker['x'] - attack_range:
                        hit = True
                
                # If hit, reduce health
                if hit:
                    player['health'] -= 20
                    
                    # Broadcast hit
                    emit('player_hit', {
                        'player_id': player_id,
                        'health': player['health'],
                        'attacker_id': attacker_id
                    }, to=game_id)
                    
                    # Check for game over
                    if player['health'] <= 0:
                        emit('game_over', {
                            'winner_id': attacker_id,
                            'winner_name': attacker['name']
                        }, to=game_id)
                        games[game_id]['state'] = 'finished'
                
                break
        
        # Broadcast attack animation
        emit('player_attack', {
            'player_id': attacker_id
        }, to=game_id)

if __name__ == "__main__":
    port = int(os.environ.get('PORT', 5001))
    socketio.run(app, host='0.0.0.0', port=port, debug=True)