from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean
from datetime import datetime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    password = Column(String(255), nullable=False)  
    bio = Column(Text, default="")
    avatar = Column(String(255), default="")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    
    recs = relationship("Rec", back_populates="user")
    

class Rec(Base):
    __tablename__ = "recs"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    category = Column(String(50), nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text, default="")
    link = Column(String(500), default="")
    image = Column(String(500), default="")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    
    user = relationship("User", back_populates="recs")
    likes = relationship("Like", back_populates="rec")


class Follow(Base):
    __tablename__ = "follows"
    
    id = Column(Integer, primary_key=True, index=True)
    follower_id = Column(Integer, ForeignKey("users.id"), nullable=False)  
    following_id = Column(Integer, ForeignKey("users.id"), nullable=False) 
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Like(Base):
    __tablename__ = "likes"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    rec_id = Column(Integer, ForeignKey("recs.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    

    rec = relationship("Rec", back_populates="likes")

class Comment(Base):
    __tablename__ = "comments"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    rec_id = Column(Integer, ForeignKey("recs.id"))
    content = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User")
    rec = relationship("Rec")

class Notification(Base):
    __tablename__ = "notifications"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    from_user_id = Column(Integer, ForeignKey("users.id"))
    type = Column(String(50))  # 'like', 'comment', 'follow'
    rec_id = Column(Integer, ForeignKey("recs.id"), nullable=True)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User", foreign_keys=[user_id])
    from_user = relationship("User", foreign_keys=[from_user_id])

class Conversation(Base):
    __tablename__ = "conversations"
    
    id = Column(Integer, primary_key=True, index=True)
    user1_id = Column(Integer, ForeignKey("users.id"))
    user2_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)
    
    user1 = relationship("User", foreign_keys=[user1_id])
    user2 = relationship("User", foreign_keys=[user2_id])
    messages = relationship("Message", back_populates="conversation")


class Message(Base):
    __tablename__ = "messages"
    
    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id"))
    sender_id = Column(Integer, ForeignKey("users.id"))
    content = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    conversation = relationship("Conversation", back_populates="messages")
    sender = relationship("User")