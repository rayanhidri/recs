from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from typing import List
from ..database import get_db
from ..models import Rec, User, Follow, Like
from ..schemas import RecCreate, RecOut
from ..auth import get_current_user_id

router = APIRouter(prefix="/recs", tags=["recs"])

def get_rec_with_details(rec, username, db, user_id):
    likes_count = db.query(func.count(Like.id)).filter(Like.rec_id == rec.id).scalar()
    is_liked = db.query(Like).filter(Like.user_id == user_id, Like.rec_id == rec.id).first() is not None
    user = db.query(User).filter(User.username == username).first()
    user_avatar = user.avatar if user else ""
    return RecOut(**rec.__dict__, username=username, likes_count=likes_count, is_liked=is_liked, user_avatar=user_avatar)
    likes_count = db.query(func.count(Like.id)).filter(Like.rec_id == rec.id).scalar()
    is_liked = db.query(Like).filter(Like.user_id == user_id, Like.rec_id == rec.id).first() is not None
    return RecOut(**rec.__dict__, username=username, likes_count=likes_count, is_liked=is_liked)

@router.post("/", response_model=RecOut)
def create_rec(rec: RecCreate, db: Session = Depends(get_db), user_id: int = Depends(get_current_user_id)):
    new_rec = Rec(**rec.dict(), user_id=user_id)
    db.add(new_rec)
    db.commit()
    db.refresh(new_rec)
    
    user = db.query(User).filter(User.id == user_id).first()
    return get_rec_with_details(new_rec, user.username, db, user_id)

@router.get("/feed", response_model=List[RecOut])
def get_feed(db: Session = Depends(get_db), user_id: int = Depends(get_current_user_id), skip: int = 0, limit: int = 20):
    following_ids = db.query(Follow.following_id).filter(Follow.follower_id == user_id).subquery()
    
    recs = db.query(Rec, User.username).join(User).filter(
        Rec.user_id.in_(following_ids)
    ).order_by(desc(Rec.created_at)).offset(skip).limit(limit).all()
    
    return [get_rec_with_details(rec, username, db, user_id) for rec, username in recs]

@router.get("/user/{username}", response_model=List[RecOut])
def get_user_recs(username: str, db: Session = Depends(get_db), user_id: int = Depends(get_current_user_id), skip: int = 0, limit: int = 20):
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    recs = db.query(Rec).filter(Rec.user_id == user.id).order_by(desc(Rec.created_at)).offset(skip).limit(limit).all()
    return [get_rec_with_details(rec, username, db, user_id) for rec in recs]

@router.post("/{rec_id}/like")
def like_rec(rec_id: int, db: Session = Depends(get_db), user_id: int = Depends(get_current_user_id)):
    rec = db.query(Rec).filter(Rec.id == rec_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Rec not found")
    
    existing = db.query(Like).filter(Like.user_id == user_id, Like.rec_id == rec_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Already liked")
    
    like = Like(user_id=user_id, rec_id=rec_id)
    db.add(like)
    db.commit()
    return {"message": "Liked"}

@router.delete("/{rec_id}/like")
def unlike_rec(rec_id: int, db: Session = Depends(get_db), user_id: int = Depends(get_current_user_id)):
    like = db.query(Like).filter(Like.user_id == user_id, Like.rec_id == rec_id).first()
    if not like:
        raise HTTPException(status_code=400, detail="Not liked")
    
    db.delete(like)
    db.commit()
    return {"message": "Unliked"}