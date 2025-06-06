import secrets
import string
from typing import List
import logging

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from ...db.mongodb import db
from ...models.match_type import MatchType, MatchTypeCreate
from ...models.user import UserRole
from ..deps import get_current_user, get_current_user_or_guest

router = APIRouter()
logger = logging.getLogger(__name__)


class JoinGroupRequest(BaseModel):
    invite_code: str


async def generate_invite_code(length: int = 8) -> str:
    """生成指定长度的随机邀请码"""
    alphabet = string.ascii_letters + string.digits  # 使用字母和数字
    while True:
        code = "".join(secrets.choice(alphabet) for _ in range(length))
        # 检查邀请码是否已存在
        if not await db.match_types.find_one({"invite_code": code}):
            return code


async def get_next_id():
    result = await db.counters.find_one_and_update(
        {"name": "match_type_id"}, {"$inc": {"seq": 1}}, return_document=True
    )
    return result["seq"]


@router.post("/", response_model=MatchType)
async def create_match_type(
    match_type: MatchTypeCreate, current_user: dict = Depends(get_current_user)
):
    # 检查比赛类型名称是否已存在
    if await db.match_types.find_one({"name": match_type.name}):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="地区环境名称已存在"
        )

    # 获取新的 ID
    match_type_id = await get_next_id()

    # 创建比赛类型
    match_type_dict = match_type.model_dump()
    match_type_dict["id"] = match_type_id
    match_type_dict["creator_id"] = current_user.id  # 添加创建者ID

    # 如果是私有分组，生成邀请码
    if match_type_dict.get("is_private", False):
        match_type_dict["invite_code"] = await generate_invite_code()
        match_type_dict["users"] = [current_user.id]  # 创建者自动加入分组
    else:
        match_type_dict["invite_code"] = None
        match_type_dict["users"] = []

    await db.match_types.insert_one(match_type_dict)
    return MatchType(**match_type_dict)


@router.get("/", response_model=List[MatchType])
async def read_match_types(current_user: dict = Depends(get_current_user_or_guest)):
    try:
        # 如果是管理员，返回所有比赛类型
        if current_user.role == UserRole.ADMIN:
            all_match_types = await db.match_types.find().to_list(length=None)
            # 确保每个记录都有 creator_id 字段
            for mt in all_match_types:
                if "creator_id" not in mt:
                    mt["creator_id"] = None
            return [MatchType(**mt) for mt in all_match_types]

        # 如果是游客，只返回公开的比赛类型
        if current_user.role == UserRole.GUEST:
            public_match_types = await db.match_types.find(
                {
                    "$or": [
                        {"is_private": False},
                        {"is_private": None},
                        {"is_private": {"$exists": False}},
                    ]
                }
            ).to_list(length=None)
            
            # 确保每个记录都有 creator_id 字段
            for mt in public_match_types:
                if "creator_id" not in mt:
                    mt["creator_id"] = None
                # 对于游客，不返回私有信息
                mt["users"] = []
                mt["invite_code"] = None
            return [MatchType(**mt) for mt in public_match_types]

        # 普通用户可以看到公开的比赛类型和自己所在的私有比赛类型
        # 获取所有公开的比赛类型（包括 is_private 为 false 或 null 的情况）
        public_match_types = await db.match_types.find(
            {
                "$or": [
                    {"is_private": False},
                    {"is_private": None},
                    {"is_private": {"$exists": False}},
                ]
            }
        ).to_list(length=None)

        # 获取用户所在的私有比赛类型
        private_match_types = await db.match_types.find(
            {"is_private": True, "users": str(current_user.id)}
        ).to_list(length=None)

        # 合并结果
        all_match_types = public_match_types + private_match_types

        # 确保每个记录都有 creator_id 字段
        for mt in all_match_types:
            if "creator_id" not in mt:
                mt["creator_id"] = None

        return [MatchType(**mt) for mt in all_match_types]
    except Exception as e:
        logger.error(f"获取比赛类型列表失败: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取比赛类型列表失败: {str(e)}"
        )


@router.get("/{match_type_id}", response_model=MatchType)
async def read_match_type(
    match_type_id: int,
    current_user: dict = Depends(get_current_user_or_guest)
):
    match_type = await db.match_types.find_one({"id": match_type_id})
    if not match_type:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="地区环境不存在"
        )
    
    # 如果是私有比赛类型，检查权限
    if match_type.get("is_private", False):
        # 管理员可以查看所有比赛类型
        if current_user.role == UserRole.ADMIN:
            return MatchType(**match_type)
        
        # 检查用户是否在比赛类型的用户列表中
        if current_user.role != UserRole.GUEST and current_user.id not in match_type.get("users", []):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="无权访问此地区环境"
            )
    
    # 对于游客，不返回私有信息
    if current_user.role == UserRole.GUEST:
        match_type["users"] = []
        match_type["invite_code"] = None
    
    return MatchType(**match_type)


@router.put("/{match_type_id}", response_model=MatchType)
async def update_match_type(
    match_type_id: int,
    match_type: MatchTypeCreate,
    current_user: dict = Depends(get_current_user),
):
    # 检查比赛类型是否存在
    existing = await db.match_types.find_one({"id": match_type_id})
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="比赛类型不存在"
        )

    # 检查新名称是否与其他比赛类型重复
    if match_type.name != existing["name"]:
        if await db.match_types.find_one({"name": match_type.name}):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="比赛类型名称已存在"
            )

    # 更新比赛类型
    match_type_dict = match_type.model_dump()
    await db.match_types.update_one({"id": match_type_id}, {"$set": match_type_dict})

    return MatchType(**{**match_type_dict, "id": match_type_id})


@router.delete("/{match_type_id}")
async def delete_match_type(
    match_type_id: int, current_user: dict = Depends(get_current_user)
):
    # 检查比赛类型是否存在
    match_type = await db.match_types.find_one({"id": match_type_id})
    if not match_type:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="地区环境不存在"
        )

    # 检查权限
    # 如果没有 creator_id，则只有管理员可以删除
    if not match_type.get("creator_id"):
        if current_user.role != UserRole.ADMIN:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="只有管理员可以删除此地区环境"
            )
    elif match_type.get("creator_id") != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="您只能删除自己创建的地区环境"
        )

    # 检查是否有对局使用此比赛类型
    if await db.match_results.find_one({"match_type_id": match_type_id}):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="无法删除正在使用的地区环境"
        )

    # 删除比赛类型
    await db.match_types.delete_one({"id": match_type_id})
    return {"message": "地区环境已删除"}


@router.post("/join", response_model=MatchType)
async def join_match_type(
    join_request: JoinGroupRequest, current_user: dict = Depends(get_current_user)
):
    # 查找对应邀请码的比赛类型
    match_type = await db.match_types.find_one(
        {"invite_code": join_request.invite_code}
    )
    if not match_type:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="邀请码无效或已过期"
        )

    # 检查用户是否已经在分组中
    if current_user.id in match_type.get("users", []):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="您已经在该分组中"
        )

    # 将用户添加到分组
    await db.match_types.update_one(
        {"id": match_type["id"]},
        {"$addToSet": {"users": current_user.id}},  # 使用 addToSet 避免重复添加
    )

    # 返回更新后的比赛类型信息
    updated_match_type = await db.match_types.find_one({"id": match_type["id"]})
    return MatchType(**updated_match_type)
