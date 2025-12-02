from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List
from ..database import get_db
from ..models import Rec, User, Follow
from ..schemas import RecCreate, RecOut
from ..auth import get_current_user_id

router = APIRouter(prefix="/recs", tags=["recs"])

@router.post("/", response_model=RecOut)
def create_rec(rec: RecCreate, db: Session = Depends(get_db), user_id: int = Depends(get_current_user_id)):
    new_rec = Rec(**rec.dict(), user_id=user_id)
    db.add(new_rec)
    db.commit()
    db.refresh(new_rec)
    
    user = db.query(User).filter(User.id == user_id).first()
    return RecOut(**new_rec.__dict__, username=user.username)

@router.get("/feed", response_model=List[RecOut])
def get_feed(db: Session = Depends(get_db), user_id: int = Depends(get_current_user_id), skip: int = 0, limit: int = 20):
    # Get IDs of users I follow
    following_ids = db.query(Follow.following_id).filter(Follow.follower_id == user_id).subquery()
    
    # Get recs from those users, newest first
    recs = db.query(Rec, User.username).join(User).filter(
        Rec.user_id.in_(following_ids)
    ).order_by(desc(Rec.created_at)).offset(skip).limit(limit).all()
    
    return [RecOut(**rec.__dict__, username=username) for rec, username in recs]

@router.get("/user/{username}", response_model=List[RecOut])
def get_user_recs(username: str, db: Session = Depends(get_db), skip: int = 0, limit: int = 20):
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    recs = db.query(Rec).filter(Rec.user_id == user.id).order_by(desc(Rec.created_at)).offset(skip).limit(limit).all()
    return [RecOut(**rec.__dict__, username=username) for rec in recs]