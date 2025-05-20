from typing import Dict, List, Optional
import numpy as np
from ..models.win_rate import WinRateCalculation
from ..models.match_result import MatchResult
from ..models.deck import Deck

class WinRateCalculator:
    def __init__(self, sensitivity: float = 30.0):
        self.sensitivity = sensitivity
        self.damping_factor = 0.1

    def calculate_average_win_rate(self, deck_id: int, match_results: List[MatchResult]) -> float:
        """计算卡组的平均胜率"""
        total_win_rate = 0
        count = 0
        
        for match in match_results:
            if match.first_deck_id == deck_id:
                total_win_rate += 1 if match.winning_deck_id == deck_id else 0
                count += 1
            elif match.second_deck_id == deck_id:
                total_win_rate += 1 if match.winning_deck_id == deck_id else 0
                count += 1
                
        return total_win_rate / count if count > 0 else 0

    def calculate_weighted_win_rate(
        self,
        deck_id: int,
        match_results: List[MatchResult],
        previous_win_rates: Dict[int, float],
        environment_offsets: Optional[Dict[int, float]] = None
    ) -> float:
        """计算卡组的加权胜率"""
        total_weight = 0
        weighted_sum = 0
        
        for match in match_results:
            if match.first_deck_id == deck_id:
                opponent_id = match.second_deck_id
                win_rate = 1 if match.winning_deck_id == deck_id else 0
            elif match.second_deck_id == deck_id:
                opponent_id = match.first_deck_id
                win_rate = 1 if match.winning_deck_id == deck_id else 0
            else:
                continue
                
            if opponent_id not in previous_win_rates:
                continue
                
            opponent_offset = environment_offsets.get(opponent_id, 0) if environment_offsets else 0
            
            base_weight = np.exp(previous_win_rates[opponent_id] * (self.sensitivity * self.sensitivity) / 500)
            environment_factor = (opponent_offset / 10) + 1
            weight = base_weight * environment_factor
            
            total_weight += weight
            weighted_sum += weight * win_rate
            
        return weighted_sum / total_weight if total_weight > 0 else 0

    def calculate_final_win_rates(
        self,
        decks: List[Deck],
        match_results: List[MatchResult],
        environment_offsets: Optional[Dict[int, float]] = None
    ) -> Dict[int, WinRateCalculation]:
        """计算所有卡组的最终胜率"""
        # 计算初始平均胜率
        initial_win_rates = {
            deck.id: self.calculate_average_win_rate(deck.id, match_results)
            for deck in decks
        }
        
        current_win_rates = initial_win_rates.copy()
        max_iterations = 100
        convergence_threshold = 0.01
        
        for _ in range(max_iterations):
            new_win_rates = {}
            
            for deck in decks:
                raw_new_rate = self.calculate_weighted_win_rate(
                    deck.id,
                    match_results,
                    current_win_rates,
                    environment_offsets
                )
                new_win_rates[deck.id] = (
                    current_win_rates[deck.id] * self.damping_factor +
                    raw_new_rate * (1 - self.damping_factor)
                )
            
            # 检查收敛性
            max_change = max(
                abs(new_win_rates[deck.id] - current_win_rates[deck.id])
                for deck in decks
            )
            
            if max_change < convergence_threshold:
                break
                
            current_win_rates = new_win_rates
        
        # 构建返回结果
        return {
            deck.id: WinRateCalculation(
                deck_id=deck.id,
                average_win_rate=initial_win_rates[deck.id],
                weighted_win_rate=current_win_rates[deck.id],
                environment_offset=environment_offsets.get(deck.id, 0) if environment_offsets else 0
            )
            for deck in decks
        } 