from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    password = Column(String(255), nullable=False)  hashé, jamais en clair
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
    follower_id = Column(Integer, ForeignKey("users.id"), nullable=False)  celui qui follow
    following_id = Column(Integer, ForeignKey("users.id"), nullable=False)  celui qui est suivi
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Like(Base):
    __tablename__ = "likes"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    rec_id = Column(Integer, ForeignKey("recs.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    

    rec = relationship("Rec", back_populates="likes")