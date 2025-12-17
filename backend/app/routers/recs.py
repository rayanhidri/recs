from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from typing import List
from ..database import get_db
from ..models import Rec, User, Follow, Like, Comment, Notification
from ..schemas import RecCreate, RecOut, CommentCreate, CommentOut
from ..auth import get_current_user_id

router = APIRouter(prefix="/recs", tags=["recs"])

def get_rec_with_details(rec, username, db, user_id):
    likes_count = db.query(func.count(Like.id)).filter(Like.rec_id == rec.id).scalar()
    is_liked = db.query(Like).filter(Like.user_id == user_id, Like.rec_id == rec.id).first() is not None
    user = db.query(User).filter(User.username == username).first()
    user_avatar = user.avatar if user else ""
    return RecOut(**rec.__dict__, username=username, likes_count=likes_count, is_liked=is_liked, user_avatar=user_avatar)

@router.post("/", response_model=RecOut)
def create_rec(rec: RecCreate, db: Session = Depends(get_db), user_id: int = Depends(get_current_user_id)):
    new_rec = Rec(**rec.dict(), user_id=user_id)
    db.add(new_rec)
    db.commit()
    db.refresh(new_rec)
    
    user = db.query(User).filter(User.id == user_id).first()
    return get_rec_with_details(new_rec, user.username, db, user_id)

@router.get("/feed", response_model=List[RecOut])
def get_feed(db: Session = Depends(get_db), user_id: int = Depends(get_current_user_id), skip: int = 0, limit: int = 50):
    following_ids = db.query(Follow.following_id).filter(Follow.follower_id == user_id).subquery()
    recs = db.query(Rec, User.username).join(User).filter(
        (Rec.user_id.in_(following_ids)) | (Rec.user_id == user_id)
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
    
    # Create notification (if not liking own rec)
    if rec.user_id != user_id:
        notification = Notification(
            user_id=rec.user_id,
            from_user_id=user_id,
            type="like",
            rec_id=rec_id
        )
        db.add(notification)
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

@router.get("/{rec_id}/comments", response_model=list[CommentOut])
def get_comments(rec_id: int, db: Session = Depends(get_db)):
    comments = db.query(Comment).filter(Comment.rec_id == rec_id).order_by(Comment.created_at.asc()).all()
    results = []
    for comment in comments:
        user = db.query(User).filter(User.id == comment.user_id).first()
        results.append(CommentOut(
            id=comment.id,
            user_id=comment.user_id,
            rec_id=comment.rec_id,
            content=comment.content,
            created_at=comment.created_at,
            username=user.username,
            user_avatar=user.avatar or ""
        ))
    return results

@router.post("/{rec_id}/comments", response_model=CommentOut)
def create_comment(rec_id: int, comment: CommentCreate, db: Session = Depends(get_db), user_id: int = Depends(get_current_user_id)):
    rec = db.query(Rec).filter(Rec.id == rec_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Rec not found")
    
    new_comment = Comment(user_id=user_id, rec_id=rec_id, content=comment.content)
    db.add(new_comment)
    db.commit()
    db.refresh(new_comment)
    
    # Create notification (if not commenting on own rec)
    if rec.user_id != user_id:
        notification = Notification(
            user_id=rec.user_id,
            from_user_id=user_id,
            type="comment",
            rec_id=rec_id
        )
        db.add(notification)
        db.commit()
    
    user = db.query(User).filter(User.id == user_id).first()
    return CommentOut(
        id=new_comment.id,
        user_id=new_comment.user_id,
        rec_id=new_comment.rec_id,
        content=new_comment.content,
        created_at=new_comment.created_at,
        username=user.username,
        user_avatar=user.avatar or ""
    )
@router.delete("/{rec_id}")
def delete_rec(rec_id: int, db: Session = Depends(get_db), user_id: int = Depends(get_current_user_id)):
    rec = db.query(Rec).filter(Rec.id == rec_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Rec not found")
    if rec.user_id != user_id:
        raise HTTPException(status_code=403, detail="Not your rec")
    
    # Delete related likes, comments, notifications first
    db.query(Like).filter(Like.rec_id == rec_id).delete()
    db.query(Comment).filter(Comment.rec_id == rec_id).delete()
    db.query(Notification).filter(Notification.rec_id == rec_id).delete()
    
    db.delete(rec)
    db.commit()
    return {"message": "Rec deleted"}

@router.get("/{rec_id}", response_model=RecOut)
def get_rec(rec_id: int, db: Session = Depends(get_db), user_id: int = Depends(get_current_user_id)):
    rec = db.query(Rec).filter(Rec.id == rec_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Rec not found")
    user = db.query(User).filter(User.id == rec.user_id).first()
    return get_rec_with_details(rec, user.username, db, user_id)