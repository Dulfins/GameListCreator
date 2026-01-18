import requests

class Steam():
    def __init__(self, api_key: str):
        self.STEAM_API_KEY = api_key
        self.appid_by_name = {}

    def get_owned_games(self, steam_id: str) -> set[int]:
        url = "http://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/"

        params = {
            "key": self.STEAM_API_KEY,
            "steamid": steam_id,
            "include_appinfo": 1,
            "include_played_free_games": 1,
        }
        r = requests.get(url, params=params, timeout=15)
        r.raise_for_status()

        games = r.json().get("response", {}).get("games", [])
        
        return {game["name"].lower() for game in games}
        
