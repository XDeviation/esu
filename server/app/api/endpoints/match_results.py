from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from ...db.mongodb import db
from ...models.match_result import (
    BatchMatchResultCreate,
    MatchResult,
    MatchResultCreate,
)
from ..deps import get_current_user

router = APIRouter()


async def get_next_id():
    result = await db.counters.find_one_and_update(
        {"name": "match_result_id"}, {"$inc": {"seq": 1}}, return_document=True
    )
    return result["seq"]


@router.post("/batch", response_model=List[MatchResult])
async def create_batch_match_results(
    batch_match_result: BatchMatchResultCreate,
    current_user: dict = Depends(get_current_user),
):
    # 检查环境是否存在
    if not await db.environments.find_one(
        {"id": batch_match_result.match_results[0].environment_id}
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="环境不存在"
        )

    # 检查比赛类型是否存在
    if not await db.match_types.find_one(
        {"id": batch_match_result.match_results[0].match_type_id}
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="比赛类型不存在"
        )

    # 检查卡组是否存在
    first_deck_id = batch_match_result.match_results[0].first_deck_id
    second_deck_id = batch_match_result.match_results[0].second_deck_id

    if not await db.decks.find_one({"id": first_deck_id}):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"卡组 {first_deck_id} 不存在",
        )
    if not await db.decks.find_one({"id": second_deck_id}):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"卡组 {second_deck_id} 不存在",
        )

    # 创建对局结果列表
    created_match_results = []
    for match_result in batch_match_result.match_results:
        # 验证胜利和失败卡组
        if match_result.winning_deck_id not in [first_deck_id, second_deck_id]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="胜利卡组必须是先手或后手卡组之一",
            )
        if match_result.losing_deck_id not in [first_deck_id, second_deck_id]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="失败卡组必须是先手或后手卡组之一",
            )

        # 获取新的 ID
        match_result_id = await get_next_id()

        # 创建对局结果
        match_result_dict = match_result.model_dump()
        match_result_dict["id"] = match_result_id

        await db.match_results.insert_one(match_result_dict)
        created_match_results.append(MatchResult(**match_result_dict))

    return created_match_results


@router.post("/", response_model=MatchResult)
async def create_match_result(
    match_result: MatchResultCreate, current_user: dict = Depends(get_current_user)
):
    # 检查环境是否存在
    if not await db.environments.find_one({"id": match_result.environment_id}):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="环境不存在"
        )

    # 检查卡组是否存在
    for deck_id in [
        match_result.first_deck_id,
        match_result.second_deck_id,
        match_result.winning_deck_id,
        match_result.losing_deck_id,
    ]:
        if not await db.decks.find_one({"id": deck_id}):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail=f"卡组 {deck_id} 不存在"
            )

    # 检查比赛类型是否存在
    if not await db.match_types.find_one({"id": match_result.match_type_id}):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="比赛类型不存在"
        )

    # 验证胜利和失败卡组
    if match_result.winning_deck_id not in [
        match_result.first_deck_id,
        match_result.second_deck_id,
    ]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="胜利卡组必须是先手或后手卡组之一",
        )
    if match_result.losing_deck_id not in [
        match_result.first_deck_id,
        match_result.second_deck_id,
    ]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="失败卡组必须是先手或后手卡组之一",
        )

    # 获取新的 ID
    match_result_id = await get_next_id()

    # 创建对局结果
    match_result_dict = match_result.model_dump()
    match_result_dict["id"] = match_result_id

    await db.match_results.insert_one(match_result_dict)
    return MatchResult(**match_result_dict)


@router.get("/", response_model=List[MatchResult])
async def read_match_results(
    environment_id: int = None,
    first_deck_id: int = None,
    second_deck_id: int = None,
    winning_deck_id: int = None,
    losing_deck_id: int = None,
    match_type_id: int = None,
):
    query = {}
    if environment_id:
        query["environment_id"] = environment_id
    if first_deck_id:
        query["first_deck_id"] = first_deck_id
    if second_deck_id:
        query["second_deck_id"] = second_deck_id
    if winning_deck_id:
        query["winning_deck_id"] = winning_deck_id
    if losing_deck_id:
        query["losing_deck_id"] = losing_deck_id
    if match_type_id:
        query["match_type_id"] = match_type_id

    match_results = await db.match_results.find(query).to_list(length=None)
    return [MatchResult(**mr) for mr in match_results]


@router.get("/{match_result_id}", response_model=MatchResult)
async def read_match_result(match_result_id: int):
    match_result = await db.match_results.find_one({"id": match_result_id})
    if not match_result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="对局结果不存在"
        )
    return MatchResult(**match_result)


@router.delete("/{match_result_id}")
async def delete_match_result(
    match_result_id: int, current_user: dict = Depends(get_current_user)
):
    # 检查对局结果是否存在
    if not await db.match_results.find_one({"id": match_result_id}):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="对局结果不存在"
        )

    # 删除对局结果
    await db.match_results.delete_one({"id": match_result_id})
    return {"message": "对局结果已删除"}
