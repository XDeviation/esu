from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from ...db.mongodb import db
from ...models.match_type import MatchType, MatchTypeCreate
from ..deps import get_current_user, get_current_moderator
from ...models.user import UserRole, UserInDB

router = APIRouter()


async def get_next_id():
    result = await db.counters.find_one_and_update(
        {"name": "match_type_id"}, {"$inc": {"seq": 1}}, return_document=True
    )
    return result["seq"]


@router.post("/", response_model=MatchType)
async def create_match_type(
    match_type: MatchTypeCreate, current_user: dict = Depends(get_current_moderator)
):
    # 检查比赛类型名称是否已存在
    if await db.match_types.find_one({"name": match_type.name}):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="比赛类型名称已存在"
        )

    # 获取新的 ID
    match_type_id = await get_next_id()

    # 创建比赛类型
    match_type_dict = match_type.model_dump()
    match_type_dict["id"] = match_type_id

    await db.match_types.insert_one(match_type_dict)
    return MatchType(**match_type_dict)


@router.get("/", response_model=List[MatchType])
async def read_match_types(current_user: UserInDB = Depends(get_current_user)):
    # 如果是普通玩家，过滤掉需要权限的比赛类型
    if current_user.role == UserRole.PLAYER:
        match_types = await db.match_types.find({"require_permission": False}).to_list(length=None)
    else:
        match_types = await db.match_types.find().to_list(length=None)
    return [MatchType(**mt) for mt in match_types]


@router.get("/{match_type_id}", response_model=MatchType)
async def read_match_type(match_type_id: int, current_user: UserInDB = Depends(get_current_user)):
    match_type = await db.match_types.find_one({"id": match_type_id})
    if not match_type:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="比赛类型不存在"
        )
    
    # 如果是普通玩家且比赛类型需要权限，则返回404
    if current_user.role == UserRole.PLAYER and match_type.get("require_permission", False):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="比赛类型不存在"
        )
    
    return MatchType(**match_type)


@router.put("/{match_type_id}", response_model=MatchType)
async def update_match_type(
    match_type_id: int,
    match_type: MatchTypeCreate,
    current_user: dict = Depends(get_current_moderator)
):
    # 检查比赛类型是否存在
    existing = await db.match_types.find_one({"id": match_type_id})
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="比赛类型不存在"
        )

    # 检查名称是否与其他比赛类型重复
    if await db.match_types.find_one({"name": match_type.name, "id": {"$ne": match_type_id}}):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="比赛类型名称已存在"
        )

    # 更新比赛类型
    match_type_dict = match_type.model_dump()
    await db.match_types.update_one(
        {"id": match_type_id}, {"$set": match_type_dict}
    )

    return MatchType(**{**match_type_dict, "id": match_type_id})


@router.delete("/{match_type_id}")
async def delete_match_type(
    match_type_id: int, current_user: dict = Depends(get_current_moderator)
):
    # 检查比赛类型是否存在
    if not await db.match_types.find_one({"id": match_type_id}):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="比赛类型不存在"
        )

    # 删除所有使用此比赛类型的对局记录
    await db.match_results.delete_many({"match_type_id": match_type_id})
    await db.match_types.delete_one({"id": match_type_id})
    return {"message": "比赛类型及相关战绩记录已删除"}
