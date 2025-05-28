from typing import Dict, List, Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from ...db.mongodb import db
from ...models.deck import Deck
from ...models.match_result import MatchResult
from ..deps import get_current_user

router = APIRouter()


class DeckStatistics(BaseModel):
    deck_id: str
    deck_name: str
    total_matches: int
    wins: int
    losses: int
    win_rate: float


class StatisticsResponse(BaseModel):
    environment_id: int
    environment_name: str
    deck_statistics: List[DeckStatistics]


class MatchupStats(BaseModel):
    opponent_name: str
    total: int
    wins: int
    losses: int
    win_rate: float
    first_hand_total: int
    first_hand_wins: int
    second_hand_total: int
    second_hand_wins: int


class DeckMatchups(BaseModel):
    deck_name: str
    matchups: Dict[str, MatchupStats]


class MatchupStatisticsResponse(BaseModel):
    environment_id: int
    environment_name: str
    matchup_statistics: Dict[str, DeckMatchups]


@router.get("/environments/{environment_id}/statistics")
async def get_environment_statistics(
    environment_id: int, current_user: dict = Depends(get_current_user)
):
    """
    获取特定环境下的所有卡组战绩统计
    """
    try:
        # 验证环境ID是否有效
        environment = await db.environments.find_one({"id": environment_id})
        if not environment:
            raise HTTPException(status_code=404, detail="Environment not found")

        # 获取该环境下的所有卡组
        decks = await db.decks.find({"environment_id": environment_id}).to_list(None)

        # 获取该环境下的所有对战记录
        match_results = await db.match_results.find(
            {"environment_id": environment_id}
        ).to_list(None)

        # 统计每个卡组的战绩
        deck_statistics = []
        for deck in decks:
            deck_id = deck["id"]
            deck_matches = [
                m
                for m in match_results
                if m["winning_deck_id"] == deck_id or m["losing_deck_id"] == deck_id
            ]

            wins = sum(
                1
                for m in deck_matches
                if m["winning_deck_id"] == deck_id and m["losing_deck_id"] != deck_id
            )
            losses = sum(
                1
                for m in deck_matches
                if m["losing_deck_id"] == deck_id and m["winning_deck_id"] != deck_id
            )
            total_matches = wins + losses

            win_rate = (wins / total_matches * 100) if total_matches > 0 else 0

            deck_statistics.append(
                {
                    "deck_id": str(deck_id),
                    "deck_name": deck["name"],
                    "total_matches": total_matches,
                    "wins": wins,
                    "losses": losses,
                    "win_rate": round(win_rate, 2),
                }
            )

        return {
            "environment_id": environment_id,
            "environment_name": environment["name"],
            "deck_statistics": deck_statistics,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/deck-matchups", response_model=MatchupStatisticsResponse)
async def get_deck_matchups(
    environment_id: int,
    match_type_id: Optional[int] = None,
    hand: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
):
    """
    获取特定环境下所有卡组之间的相互胜率
    """
    try:
        # 验证环境ID是否有效
        environment = await db.environments.find_one({"id": environment_id})
        if not environment:
            raise HTTPException(status_code=404, detail="环境不存在")

        # 获取该环境下的所有卡组
        decks = await db.decks.find({"environment_id": environment_id}).to_list(None)
        deck_map = {str(deck["id"]): deck["name"] for deck in decks}

        # 构建查询条件
        match_query = {"environment_id": environment_id}
        if match_type_id is not None:
            # 检查比赛类型是否存在
            match_type = await db.match_types.find_one({"id": match_type_id})
            if not match_type:
                raise HTTPException(status_code=404, detail="比赛类型不存在")

            # 如果是私有比赛类型，检查用户是否有权限访问
            if match_type.get("is_private", False):
                if current_user.id not in match_type.get("users", []):
                    raise HTTPException(
                        status_code=403, detail="无权访问该比赛类型的统计数据"
                    )

            match_query["match_type_id"] = match_type_id

        # 获取该环境下的所有对战记录
        match_results = await db.match_results.find(match_query).to_list(None)

        # 统计卡组间的对战数据
        matchup_stats = {}
        for deck in decks:
            deck_id = deck["id"]
            deck_name = deck["name"]

            # 获取该卡组的所有对战记录
            deck_matches = [
                m
                for m in match_results
                if m["winning_deck_id"] == deck_id or m["losing_deck_id"] == deck_id
            ]
            # 统计对阵其他卡组的战绩
            opponent_stats = {}
            for match in deck_matches:
                # 确定对手ID
                if match["winning_deck_id"] == deck_id:
                    opponent_id = str(match["losing_deck_id"])
                else:
                    opponent_id = str(match["winning_deck_id"])

                # 确定是否先手（处理三种情况）
                first_deck_id = match["first_deck_id"]
                second_deck_id = match["second_deck_id"]

                # 如果first_deck_id和second_deck_id都为0，说明没有先后手信息
                if first_deck_id == 0 and second_deck_id == 0:
                    is_first_hand = None
                else:
                    is_first_hand = first_deck_id == deck_id

                # 根据hand参数过滤对战记录
                if hand == "first" and not is_first_hand:
                    continue
                if hand == "second" and is_first_hand:
                    continue

                if opponent_id in deck_map:
                    if opponent_id not in opponent_stats:
                        opponent_stats[opponent_id] = {
                            "opponent_name": deck_map[opponent_id],
                            "total": 0,
                            "wins": 0,
                            "losses": 0,
                            "win_rate": 0,
                            "first_hand_total": 0,
                            "first_hand_wins": 0,
                            "second_hand_total": 0,
                            "second_hand_wins": 0,
                        }

                    stats = opponent_stats[opponent_id]
                    stats["total"] += 1

                    # 统计先后手数据
                    if is_first_hand is None:
                        # 没有先后手信息，不统计先后手数据
                        pass
                    elif is_first_hand:
                        stats["first_hand_total"] += 1
                    else:
                        stats["second_hand_total"] += 1

                    if match["winning_deck_id"] == deck_id:
                        stats["wins"] += 1
                        if is_first_hand is not None:  # 只有在有先后手信息时才统计
                            if is_first_hand:
                                stats["first_hand_wins"] += 1
                            else:
                                stats["second_hand_wins"] += 1
                    elif match["losing_deck_id"] == deck_id:
                        stats["losses"] += 1

                    stats["win_rate"] = (
                        round((stats["wins"] / stats["total"]) * 100, 2)
                        if stats["total"] > 0
                        else 0
                    )

            matchup_stats[str(deck_id)] = {
                "deck_name": deck_name,
                "matchups": opponent_stats,
            }

        return {
            "environment_id": environment_id,
            "environment_name": environment["name"],
            "matchup_statistics": matchup_stats,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/statistics", response_model=StatisticsResponse)
async def get_statistics(
    environment_id: int,
    match_type_id: Optional[int] = None,
    current_user: dict = Depends(get_current_user),
):
    try:
        # 获取环境信息
        environment = await db.environments.find_one({"id": environment_id})
        if not environment:
            raise HTTPException(status_code=404, detail="环境不存在")

        # 获取该环境下的所有卡组
        decks = await db.decks.find({"environment_id": environment_id}).to_list(None)

        # 构建查询条件
        match_query = {"environment_id": environment_id}
        if match_type_id is not None:
            # 检查比赛类型是否存在
            match_type = await db.match_types.find_one({"id": match_type_id})
            if not match_type:
                raise HTTPException(status_code=404, detail="比赛类型不存在")

            # 如果是私有比赛类型，检查用户是否有权限访问
            if match_type.get("is_private", False):
                if current_user.id not in match_type.get("users", []):
                    raise HTTPException(
                        status_code=403, detail="无权访问该比赛类型的统计数据"
                    )

            match_query["match_type_id"] = match_type_id

        # 获取该环境下的所有对局
        match_results = await db.match_results.find(match_query).to_list(None)

        deck_statistics = []
        for deck in decks:
            deck_id = deck["id"]
            deck_matches = [
                m
                for m in match_results
                if m["winning_deck_id"] == deck_id or m["losing_deck_id"] == deck_id
            ]

            wins = sum(
                1
                for m in deck_matches
                if m["winning_deck_id"] == deck_id and m["losing_deck_id"] != deck_id
            )
            losses = sum(
                1
                for m in deck_matches
                if m["losing_deck_id"] == deck_id and m["winning_deck_id"] != deck_id
            )
            total_matches = wins + losses

            win_rate = (wins / total_matches * 100) if total_matches > 0 else 0

            deck_statistics.append(
                {
                    "deck_id": str(deck_id),
                    "deck_name": deck["name"],
                    "total_matches": total_matches,
                    "wins": wins,
                    "losses": losses,
                    "win_rate": round(win_rate, 2),
                }
            )

        return {
            "environment_id": environment_id,
            "environment_name": environment["name"],
            "deck_statistics": deck_statistics,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
