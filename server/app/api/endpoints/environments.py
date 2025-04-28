from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from ...db.mongodb import db
from ...models.environment import Environment, EnvironmentCreate
from ..deps import get_current_user

router = APIRouter()


async def get_next_id():
    result = await db.counters.find_one_and_update(
        {"name": "environment_id"}, {"$inc": {"seq": 1}}, return_document=True
    )
    return result["seq"]


@router.post("/", response_model=Environment)
async def create_environment(
    environment: EnvironmentCreate, current_user: dict = Depends(get_current_user)
):
    # 检查环境名称是否已存在
    if await db.environments.find_one({"name": environment.name}):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="环境名称已存在"
        )

    # 获取新的 ID
    environment_id = await get_next_id()

    # 创建环境
    environment_dict = environment.model_dump()
    environment_dict["id"] = environment_id

    await db.environments.insert_one(environment_dict)
    return Environment(**environment_dict)


@router.get("/", response_model=List[Environment])
async def read_environments():
    environments = await db.environments.find().to_list(length=None)
    return [Environment(**env) for env in environments]


@router.get("/{environment_id}", response_model=Environment)
async def read_environment(environment_id: int):
    environment = await db.environments.find_one({"id": environment_id})
    if not environment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="环境不存在")
    return Environment(**environment)


@router.put("/{environment_id}", response_model=Environment)
async def update_environment(
    environment_id: int,
    environment: EnvironmentCreate,
    current_user: dict = Depends(get_current_user),
):
    # 检查环境是否存在
    existing = await db.environments.find_one({"id": environment_id})
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="环境不存在")

    # 检查新名称是否与其他环境重复
    if environment.name != existing["name"]:
        if await db.environments.find_one({"name": environment.name}):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="环境名称已存在"
            )

    # 更新环境
    environment_dict = environment.model_dump()
    await db.environments.update_one({"id": environment_id}, {"$set": environment_dict})

    return Environment(**{**environment_dict, "id": environment_id})


@router.delete("/{environment_id}")
async def delete_environment(
    environment_id: int, current_user: dict = Depends(get_current_user)
):
    # 检查环境是否存在
    if not await db.environments.find_one({"id": environment_id}):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="环境不存在")

    # 检查是否有卡组使用此环境
    if await db.decks.find_one({"environment_id": environment_id}):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="无法删除正在使用的环境"
        )

    # 删除环境
    await db.environments.delete_one({"id": environment_id})
    return {"message": "环境已删除"}
