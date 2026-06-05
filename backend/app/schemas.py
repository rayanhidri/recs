from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional

# Auth
class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str

class GoogleAuthRequest(BaseModel):
    credential: str

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
    title: str = ""
    description: str = ""
    link: str = ""
    image: str = ""
    quote_of_id: Optional[int] = None

class RecOut(BaseModel):
    id: int
    user_id: int
    category: str
    title: str
    description: str
    link: str
    image: str
    created_at: datetime
    username: Optional[str] = None
    likes_count: int = 0
    is_liked: bool = False
    user_avatar: str = ""
    quote_of_id: Optional[int] = None
    quoted_rec: Optional['RecOut'] = None
    is_saved: bool = False

    class Config:
        from_attributes = True

RecOut.model_rebuild()

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
    bio: Optional[str] = None
    avatar: Optional[str] = None
    username: Optional[str] = None

class RecUpdate(BaseModel):
    category: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    link: Optional[str] = None
    image: Optional[str] = None

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

class NotificationOut(BaseModel):
    id: int
    type: str
    rec_id: Optional[int]
    is_read: bool
    created_at: datetime
    from_username: str
    from_user_avatar: str = ""

    class Config:
        from_attributes = True

# Chat / Messages
class MessageCreate(BaseModel):
    content: str
    rec_id: Optional[int] = None

class MessageOut(BaseModel):
    id: int
    conversation_id: int
    sender_id: int
    content: str
    is_read: bool
    created_at: datetime
    sender_username: str
    sender_avatar: str = ""
    rec_id: Optional[int] = None
    rec_title: Optional[str] = None
    rec_image: Optional[str] = None
    rec_link: Optional[str] = None
    rec_category: Optional[str] = None

    class Config:
        from_attributes = True

class ConversationOut(BaseModel):
    id: int
    other_user_id: int
    other_username: str
    other_avatar: str
    last_message: str = ""
    last_message_time: Optional[datetime] = None
    unread_count: int = 0

    class Config:
        from_attributes = True
