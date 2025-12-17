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
    likes_count: int = 0
    is_liked: bool = False

    class Config:
        from_attributes = True

# Follow
class FollowOut(BaseModel):
    follower_id: int
    following_id: int

class UserProfile(BaseModel):
    id: int
    username: str
    bio: str
    avatar: str
    recs_count: int
    tuned_in: int
    tuned_to: int
    is_following: bool = False

    class Config:
        from_attributes = True

class UserUpdate(BaseModel):
    bio: str | None = None
    avatar: str | None = None
    
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
    likes_count: int = 0
    is_liked: bool = False
    user_avatar: str = ""

    class Config:
        from_attributes = True

class CommentCreate(BaseModel):
    content: str

class CommentOut(BaseModel):
    id: int
    user_id: int
    rec_id: int
    content: str
    created_at: datetime
    username: str
    user_avatar: str = ""

    class Config:
        from_attributes = True