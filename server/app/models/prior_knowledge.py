from pydantic import BaseModel
from typing import Dict

class DeckMatchupPrior(BaseModel):
    deck_a_id: int
    deck_b_id: int
    prior_matches: int  # 虚拟观测次数
    prior_wins: int     # 虚拟胜利次数

class DeckMatchupPriorResponse(BaseModel):
    matchup_priors: Dict[str, DeckMatchupPrior]  # key: "deck_a_id_deck_b_id" 