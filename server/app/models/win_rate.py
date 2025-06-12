from typing import Dict, Optional

from pydantic import BaseModel


class WinRateCalculation(BaseModel):
    deck_id: int
    average_win_rate: float
    weighted_win_rate: float
    environment_offset: float = 0.0


class WinRateCalculationRequest(BaseModel):
    sensitivity: float = 30.0
    prior_weight: float = 1.0  # 先验数据权重系数
    environment_offsets: Optional[Dict[int, float]] = None
    environment_id: Optional[int] = None
    match_type_id: Optional[int] = None


class WinRateCalculationResponse(BaseModel):
    calculations: Dict[int, WinRateCalculation]
    sensitivity: float
