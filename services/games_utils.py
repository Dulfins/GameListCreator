from howlongtobeatpy import HowLongToBeat

class GameSearch:
    def __init__(self):
        self.hltb = HowLongToBeat()
        self.cache = {}

    def search_games(self, query: str, limit: int = 5):
        cache_key = f"search:{query}:{limit}"
        
        if cache_key in self.cache:
            return self.cache[cache_key]
        
        try:
            results = self.hltb.search(query)

            if not results:
                return []
            
            filtered_results = [{
                'game_name': result.game_name,
                'main_story': str(result.main_story) if result.main_story > 0 else "N/A",
                'main_extra': str(result.main_extra) if result.main_extra > 0 else "N/A",
                'score': str(result.review_score) if result.review_score > 0 else "N/A",
                'image_url': result.game_image_url} 
                for result in results if result.main_story > 0][:limit]

            self.cache[cache_key] = filtered_results
            return filtered_results

        except Exception as e:
            print(f"Error searching games: {e}")
            return []
