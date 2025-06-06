from fastapi import APIRouter, Depends, HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase
from ...models.prior_knowledge import DeckMatchupPrior, DeckMatchupPriorResponse
from ...db.mongodb import get_database
from ...core.auth import get_current_admin_or_moderator

router = APIRouter()

@router.get("/matchup-priors", response_model=DeckMatchupPriorResponse)
async def get_matchup_priors(
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: dict = Depends(get_current_admin_or_moderator)
):
    """获取所有卡组对局的先验数据"""
    priors = {}
    async for doc in db.deck_matchup_priors.find():
        key = f"{doc['deck_a_id']}_{doc['deck_b_id']}"
        priors[key] = DeckMatchupPrior(**doc)
    return DeckMatchupPriorResponse(matchup_priors=priors)

@router.post("/matchup-priors")
async def update_matchup_prior(
    prior: DeckMatchupPrior,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: dict = Depends(get_current_admin_or_moderator)
):
    """更新卡组对局的先验数据"""
    if prior.prior_wins > prior.prior_matches:
        raise HTTPException(status_code=400, detail="胜利次数不能超过总次数")
        
    await db.deck_matchup_priors.update_one(
        {
            "deck_a_id": prior.deck_a_id,
            "deck_b_id": prior.deck_b_id
        },
        {"$set": prior.dict()},
        upsert=True
    )
    return {"message": "更新成功"} 