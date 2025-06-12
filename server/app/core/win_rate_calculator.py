from typing import Dict, List, Optional

import numpy as np

from ..models.deck import Deck
from ..models.match_result import MatchResult
from ..models.win_rate import WinRateCalculation
from ..models.prior_knowledge import DeckMatchupPrior


class WinRateCalculator:
    def __init__(self, sensitivity: float = 30.0, min_valid_matches: int = 10, prior_weight: float = 1.0):
        self.sensitivity = sensitivity
        self.damping_factor = 0.1
        self.min_valid_matches = min_valid_matches
        self.prior_weight = prior_weight

    def calculate_average_win_rate(
        self, deck_id: int, match_results: List[MatchResult], matchup_priors: Dict[str, DeckMatchupPrior]
    ) -> float:
        """计算卡组的平均胜率，考虑先验数据"""
        total_win_rate = 0
        count = 0

        # 按对手卡组分组统计
        opponent_stats = {}
        for match in match_results:
            if match.first_deck_id == deck_id:
                opponent_id = match.second_deck_id
                is_win = match.winning_deck_id == deck_id
            elif match.second_deck_id == deck_id:
                opponent_id = match.first_deck_id
                is_win = match.winning_deck_id == deck_id
            else:
                continue

            if opponent_id not in opponent_stats:
                opponent_stats[opponent_id] = {"wins": 0, "total": 0}

            opponent_stats[opponent_id]["total"] += 1
            if is_win:
                opponent_stats[opponent_id]["wins"] += 1

        # 计算加权平均胜率，考虑先验数据
        total_weight = 0
        weighted_sum = 0

        for opponent_id, stats in opponent_stats.items():
            # 获取先验数据
            prior_key = f"{deck_id}_{opponent_id}"
            reverse_prior_key = f"{opponent_id}_{deck_id}"
            
            # 合并实际数据和先验数据
            total_matches = stats["total"]
            total_wins = stats["wins"]
            
            # 检查正向先验数据
            if prior_key in matchup_priors:
                prior = matchup_priors[prior_key]
                total_matches += prior.prior_matches * self.prior_weight
                total_wins += prior.prior_wins * self.prior_weight
            # 检查反向先验数据
            elif reverse_prior_key in matchup_priors:
                prior = matchup_priors[reverse_prior_key]
                total_matches += prior.prior_matches * self.prior_weight
                total_wins += (prior.prior_matches - prior.prior_wins) * self.prior_weight
            
            # 计算后验胜率
            win_rate = total_wins / total_matches if total_matches > 0 else 0
            weight = total_matches

            total_weight += weight
            weighted_sum += weight * win_rate

        return weighted_sum / total_weight if total_weight > 0 else 0

    def calculate_weighted_win_rate(
        self,
        deck_id: int,
        match_results: List[MatchResult],
        previous_win_rates: Dict[int, float],
        environment_offsets: Optional[Dict[int, float]] = None,
        matchup_priors: Optional[Dict[str, DeckMatchupPrior]] = None,
    ) -> float:
        """计算卡组的加权胜率"""
        total_weight = 0
        weighted_sum = 0

        # 按对手卡组分组统计
        opponent_stats = {}
        for match in match_results:
            if match.first_deck_id == deck_id:
                opponent_id = match.second_deck_id
                is_win = match.winning_deck_id == deck_id
            elif match.second_deck_id == deck_id:
                opponent_id = match.first_deck_id
                is_win = match.winning_deck_id == deck_id
            else:
                continue

            if opponent_id not in opponent_stats:
                opponent_stats[opponent_id] = {"wins": 0, "total": 0}

            opponent_stats[opponent_id]["total"] += 1
            if is_win:
                opponent_stats[opponent_id]["wins"] += 1

        # 获取所有可能的对手卡组ID
        all_opponent_ids = set(previous_win_rates.keys())
        
        for opponent_id in all_opponent_ids:
            if opponent_id == deck_id:
                continue

            opponent_offset = (
                environment_offsets.get(opponent_id, 0) if environment_offsets else 0
            )

            # 计算基础权重
            base_weight = np.exp(
                previous_win_rates[opponent_id]
                * (self.sensitivity * self.sensitivity)
                / 500
            )
            environment_factor = (opponent_offset / 10) + 1
            weight = base_weight * environment_factor

            # 获取实际对局数据
            stats = opponent_stats.get(opponent_id, {"wins": 0, "total": 0})
            total_matches = stats["total"]
            total_wins = stats["wins"]
            
            # 获取先验数据
            prior_key = f"{deck_id}_{opponent_id}"
            reverse_prior_key = f"{opponent_id}_{deck_id}"
            
            # 检查正向先验数据
            if matchup_priors and prior_key in matchup_priors:
                prior = matchup_priors[prior_key]
                total_matches += prior.prior_matches * self.prior_weight
                total_wins += prior.prior_wins * self.prior_weight
            # 检查反向先验数据
            elif matchup_priors and reverse_prior_key in matchup_priors:
                prior = matchup_priors[reverse_prior_key]
                total_matches += prior.prior_matches * self.prior_weight
                total_wins += (prior.prior_matches - prior.prior_wins) * self.prior_weight
            
            # 计算后验胜率
            win_rate = total_wins / total_matches if total_matches > 0 else 0

            total_weight += weight
            weighted_sum += weight * win_rate

        return weighted_sum / total_weight if total_weight > 0 else 0

    def calculate_final_win_rates(
        self,
        decks: List[Deck],
        match_results: List[MatchResult],
        environment_offsets: Optional[Dict[int, float]] = None,
        matchup_priors: Optional[Dict[str, DeckMatchupPrior]] = None,
    ) -> Dict[int, WinRateCalculation]:
        """计算所有卡组的最终胜率"""
        # 计算初始平均胜率
        initial_win_rates = {
            deck.id: self.calculate_average_win_rate(deck.id, match_results, matchup_priors or {})
            for deck in decks
        }

        current_win_rates = initial_win_rates.copy()
        max_iterations = 100
        convergence_threshold = 0.01

        for _ in range(max_iterations):
            new_win_rates = {}

            for deck in decks:
                raw_new_rate = self.calculate_weighted_win_rate(
                    deck.id, match_results, current_win_rates, environment_offsets, matchup_priors
                )
                new_win_rates[deck.id] = current_win_rates[
                    deck.id
                ] * self.damping_factor + raw_new_rate * (1 - self.damping_factor)

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
                environment_offset=(
                    environment_offsets.get(deck.id, 0) if environment_offsets else 0
                ),
            )
            for deck in decks
        }
