from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional

# Auth
class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

# User
class UserOut(BaseModel):
    id: int
    username: str
    email: str
    bio: str
    avatar: str
    created_at: datetime

    class Config:
        from_attributes = True

# Rec
class RecCreate(BaseModel):
    category: str
    title: str
    description: str = ""
    link: str = ""
    image: str = ""

class RecOut(BaseModel):
    id: int
    user_id: int
    category: str
    title: str
    description: str
    link: str
    image: str
    created_at: datetime
    username: str | None = None

    class Config:
        from_attributes = True