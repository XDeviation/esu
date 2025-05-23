from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from ...db.mongodb import db
from ...models.deck import Deck, DeckCreate
from ...models.user import UserRole
from ..deps import get_current_admin, get_current_moderator, get_current_user

router = APIRouter()


async def get_next_id():
    result = await db.counters.find_one_and_update(
        {"name": "deck_id"}, {"$inc": {"seq": 1}}, return_document=True
    )
    return result["seq"]


@router.post("/", response_model=Deck)
async def create_deck(
    deck: DeckCreate, current_user: dict = Depends(get_current_moderator)
):
    # 检查环境是否存在
    if not await db.environments.find_one({"id": deck.environment_id}):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="环境不存在"
        )

    # 获取新的 ID
    deck_id = await get_next_id()

    # 创建卡组
    deck_dict = deck.model_dump()
    deck_dict["id"] = deck_id
    deck_dict["author_id"] = current_user.email

    await db.decks.insert_one(deck_dict)
    return Deck(**deck_dict)


@router.get("/", response_model=List[Deck])
async def read_decks(
    environment_id: int = None, author_id: str = None, search: str = None
):
    query = {}
    if environment_id:
        query["environment_id"] = environment_id
    if author_id:
        query["author_id"] = author_id
    if search:
        query["$text"] = {"$search": search}

    decks = await db.decks.find(query).to_list(length=None)
    return [Deck(**deck) for deck in decks]


@router.get("/{deck_id}", response_model=Deck)
async def read_deck(deck_id: int):
    deck = await db.decks.find_one({"id": deck_id})
    if not deck:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="卡组不存在")
    return Deck(**deck)


@router.put("/{deck_id}", response_model=Deck)
async def update_deck(
    deck_id: int, deck: DeckCreate, current_user: dict = Depends(get_current_moderator)
):
    # 检查卡组是否存在
    existing = await db.decks.find_one({"id": deck_id})
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="卡组不存在")

    # 检查权限
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="没有权限修改此卡组"
        )

    # 检查环境是否存在
    if not await db.environments.find_one({"id": deck.environment_id}):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="环境不存在"
        )

    # 更新卡组
    deck_dict = deck.model_dump()
    await db.decks.update_one({"id": deck_id}, {"$set": deck_dict})

    return Deck(**{**deck_dict, "id": deck_id})


@router.delete("/{deck_id}")
async def delete_deck(deck_id: int, current_user: dict = Depends(get_current_admin)):
    # 检查卡组是否存在
    deck = await db.decks.find_one({"id": deck_id})
    if not deck:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="卡组不存在")

    # 检查权限
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="只有管理员才能执行此操作"
        )

    # 删除所有相关的对局记录
    await db.match_results.delete_many(
        {
            "$or": [
                {"first_deck_id": deck_id},
                {"second_deck_id": deck_id},
                {"winning_deck_id": deck_id},
                {"losing_deck_id": deck_id},
            ]
        }
    )

    # 删除卡组
    await db.decks.delete_one({"id": deck_id})
    return {"message": "卡组及相关战绩记录已删除"}
