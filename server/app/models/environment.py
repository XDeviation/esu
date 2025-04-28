from pydantic import BaseModel


class EnvironmentBase(BaseModel):
    name: str


class EnvironmentCreate(EnvironmentBase):
    pass


class Environment(EnvironmentBase):
    id: int

    class Config:
        from_attributes = True
