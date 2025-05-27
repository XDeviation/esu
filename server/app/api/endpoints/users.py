from typing import List

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from ...db.mongodb import db
from ..deps import get_current_user

router = APIRouter()


class UserInfo(BaseModel):
    id: str
    name: str


class BatchUserRequest(BaseModel):
    user_ids: List[str]


@router.post("/batch", response_model=List[UserInfo])
async def get_users_batch(
    request: BatchUserRequest, current_user: dict = Depends(get_current_user)
):
    """批量获取用户信息"""
    try:
        users = await db.users.find(
            {"_id": {"$in": [ObjectId(user_id) for user_id in request.user_ids]}}
        ).to_list(None)

        # 转换数据格式
        return [
            UserInfo(id=str(user["_id"]), name=user["name"])  # 使用 id 而不是 _id
            for user in users
        ]
    except Exception as e:
        print(f"获取用户信息失败: {str(e)}")  # 添加日志输出
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="获取用户信息失败"
        )
