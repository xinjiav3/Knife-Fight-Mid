from flask import Flask, render_template, send_from_directory, request
from flask_socketio import SocketIO, emit, join_room, leave_room
import os

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

@app.route('/navigation/<path:path>')
def serve_navigation(path):
    """Serve navigation files"""
    return send_from_directory('navigation', path)

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
                # Mark player as disconnected but don't remove them yet
                games[game_id]['players'][player_id]['connected'] = False
                emit('player_disconnected', {'player_id': player_id}, to=game_id)
                
                # If no players remain connected, clean up the game after a delay
                if not any(player['connected'] for player in game['players'].values()):
                    del games[game_id]
                break

@socketio.on('create_game')
def handle_create_game(data):
    """Create a new game room"""
    player_id = data['player_id']
    player_name = data.get('player_name', f'Player {player_id}')
    
    # Check if a custom game ID was provided
    custom_game_id = data.get('custom_game_id', '')
    
    if custom_game_id and custom_game_id in games:
        # Game ID already exists
        emit('error', {'message': 'Game ID already in use. Please try another.'})
        return
    
    # Generate a unique game ID or use custom one
    if custom_game_id:
        game_id = custom_game_id
    else:
        # Generate a random game ID if none was provided
        game_id = f"game_{len(games) + 1}"
    
    # Create game state
    games[game_id] = {
        'players': {
            player_id: {
                'sid': request.sid,
                'name': player_name,
                'x': 100,
                'y': 300,
                'color': '#FF5733',  # First player color
                'direction': 1,      # 1 = right, -1 = left
                'connected': True
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
    
    if game_id in games:
        if len(games[game_id]['players']) < 2:
            # Add player to the game
            games[game_id]['players'][player_id] = {
                'sid': request.sid,
                'name': player_name,
                'x': 600,
                'y': 300,
                'color': '#33A1FF',  # Second player color
                'direction': -1,     # 1 = right, -1 = left
                'connected': True
            }
            
            # Set game state to playing
            games[game_id]['state'] = 'playing'
            
            # Join the room
            join_room(game_id)
            
            # Notify all players that someone joined
            emit('player_joined', {
                'player_id': player_id,
                'player_name': player_name
            }, to=game_id)
            
            # Start the game for all players
            emit('game_start', {
                'game_id': game_id,
                'game_data': games[game_id]
            }, to=game_id)
        else:
            # Game is full
            emit('error', {'message': 'Game is full'})
    else:
        # Game not found
        emit('error', {'message': 'Game not found'})

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

if __name__ == "__main__":
    port = int(os.environ.get('PORT', 5001))  # Changed to 5001 to avoid conflicts
    socketio.run(app, host='0.0.0.0', port=port, debug=True)