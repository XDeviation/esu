from typing import List
from fastapi import APIRouter, Depends, HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase

from ...core.win_rate_calculator import WinRateCalculator
from ...models.win_rate import WinRateCalculationRequest, WinRateCalculationResponse
from ...db.mongodb import get_database
from ...models.deck import Deck
from ...models.match_result import MatchResult

router = APIRouter()

@router.post("/calculate", response_model=WinRateCalculationResponse)
async def calculate_win_rates(
    request: WinRateCalculationRequest,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    计算所有卡组的胜率
    
    - **sensitivity**: 环境功利指数（1.0-100.0）
    - **environment_offsets**: 可选的环境偏移值字典
    """
    # 获取所有卡组
    decks_cursor = db.decks.find()
    decks = []
    async for doc in decks_cursor:
        decks.append(Deck(**doc))
    if not decks:
        raise HTTPException(status_code=404, detail="No decks found")
    
    # 获取所有对战结果
    match_results_cursor = db.match_results.find()
    match_results = []
    async for doc in match_results_cursor:
        match_results.append(MatchResult(**doc))
    if not match_results:
        raise HTTPException(status_code=404, detail="No match results found")
    
    # 创建计算器实例
    calculator = WinRateCalculator(sensitivity=request.sensitivity)
    
    # 计算胜率
    calculations = calculator.calculate_final_win_rates(
        decks=decks,
        match_results=match_results,
        environment_offsets=request.environment_offsets
    )
    
    return WinRateCalculationResponse(
        calculations=calculations,
        sensitivity=request.sensitivity
    ) 