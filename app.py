from flask import Flask, render_template, request, jsonify, send_file
from services.games_utils import GameSearch
from services.steam_utils import Steam
from services.excel_export import build_selected_games_workbook
import os
from dotenv import load_dotenv

load_dotenv() # load .env file

steam_api_key = os.getenv('STEAM_API')

app = Flask(__name__,
            static_folder='static',
            template_folder='templates')

game_search = GameSearch()
steam_util = Steam(steam_api_key)

# Routes
@app.route('/')
def home():
    """Simple home page"""
    return render_template('base.html', 
                         title='Games Backlog Creator')

@app.get('/api/search')
def api_search():
    query = request.args.get('q', '').strip()

    steamid = (request.args.get("steamid") or "").strip()
    owned_games = set()
    if steamid:
        owned_games = steam_util.get_owned_games(steamid)

    if not query or len(query) < 2:
        return jsonify({
            'success': False,
            'error': 'Please enter a search term with atleast 2 characters.'
        })
    
    results = game_search.search_games(query, limit=8)

    enriched = []
    for r in results:
        enriched.append({
            **r,
            "owned": (r["game_name"].lower() in owned_games) if r["game_name"] else False
        })    

    return jsonify({"results": enriched})

@app.post("/export")
def export():
    data = request.get_json(silent=True) or {}
    games = data.get("games", [])

    bio = build_selected_games_workbook(games)

    filename = "game_backlog.xlsx"

    return send_file(
        bio,
        mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        as_attachment=True,
        download_name=filename
    )

if __name__ == '__main__':
    app.run()