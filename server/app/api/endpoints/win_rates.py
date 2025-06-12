from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from motor.motor_asyncio import AsyncIOMotorDatabase

from ...core.win_rate_calculator import WinRateCalculator
from ...db.mongodb import get_database
from ...models.deck import Deck
from ...models.match_result import MatchResult
from ...models.win_rate import WinRateCalculationResponse
from ...models.prior_knowledge import DeckMatchupPrior

router = APIRouter()


@router.get("/calculate", response_model=WinRateCalculationResponse)
async def calculate_win_rates(
    sensitivity: float = Query(30.0, description="环境功利指数（1.0-100.0）"),
    prior_weight: float = Query(1.0, description="先验数据权重系数（0.1-10.0）"),
    environment_id: Optional[int] = Query(None, description="环境ID"),
    match_type_id: Optional[int] = Query(None, description="比赛类型ID"),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    """
    计算所有卡组的胜率

    - **sensitivity**: 环境功利指数（1.0-100.0）
    - **prior_weight**: 先验数据权重系数（0.1-10.0）
    - **environment_id**: 可选的环境ID
    - **match_type_id**: 可选的比赛类型ID
    """
    # 构建查询条件
    deck_query = {}
    match_query = {}

    if environment_id is not None:
        deck_query["environment_id"] = environment_id

    if match_type_id is not None:
        match_query["match_type_id"] = match_type_id

    # 获取符合条件的卡组
    decks_cursor = db.decks.find(deck_query)
    decks = []
    async for doc in decks_cursor:
        decks.append(Deck(**doc))
    if not decks:
        raise HTTPException(status_code=404, detail="No decks found")

    print("match_query:", match_query)
    # 获取符合条件的对战结果
    match_results_cursor = db.match_results.find(match_query)
    match_results = []
    async for doc in match_results_cursor:
        match_results.append(MatchResult(**doc))
    if not match_results:
        raise HTTPException(status_code=404, detail="No match results found")

    # 获取先验数据
    matchup_priors = {}
    priors_cursor = db.deck_matchup_priors.find()
    async for doc in priors_cursor:
        key = f"{doc['deck_a_id']}_{doc['deck_b_id']}"
        matchup_priors[key] = DeckMatchupPrior(**doc)

    # 创建计算器实例
    calculator = WinRateCalculator(sensitivity=sensitivity, prior_weight=prior_weight)

    # 计算胜率
    calculations = calculator.calculate_final_win_rates(
        decks=decks,
        match_results=match_results,
        environment_offsets=None,
        matchup_priors=matchup_priors,
    )

    return WinRateCalculationResponse(
        calculations=calculations, sensitivity=sensitivity
    )
