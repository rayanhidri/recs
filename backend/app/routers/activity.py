from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import desc
from datetime import datetime, timedelta
from typing import List
from pydantic import BaseModel
from ..database import get_db
from ..models import Like, Comment, Follow, User, Rec
from ..auth import get_current_user_id

router = APIRouter(prefix="/activity", tags=["activity"])

class ActivityEvent(BaseModel):
    type: str
    actor_username: str
    actor_avatar: str
    rec_id: int
    rec_title: str
    rec_username: str
    content: str = ""
    created_at: datetime

    class Config:
        from_attributes = True

@router.get("/feed", response_model=List[ActivityEvent])
def get_activity_feed(db: Session = Depends(get_db), user_id: int = Depends(get_current_user_id)):
    cutoff = datetime.utcnow() - timedelta(hours=48)

    following_ids = [
        row[0] for row in
        db.query(Follow.following_id).filter(Follow.follower_id == user_id).all()
    ]

    if not following_ids:
        return []

    events = []

    # Likes from people you follow, not on your own recs
    likes = (
        db.query(Like, User, Rec)
        .join(User, Like.user_id == User.id)
        .join(Rec, Like.rec_id == Rec.id)
        .filter(
            Like.user_id.in_(following_ids),
            Like.user_id != user_id,
            Rec.user_id != user_id,
            Like.created_at >= cutoff
        )
        .order_by(desc(Like.created_at))
        .limit(20)
        .all()
    )

    for like, actor, rec in likes:
        rec_user = db.query(User).filter(User.id == rec.user_id).first()
        events.append(ActivityEvent(
            type="like",
            actor_username=actor.username,
            actor_avatar=actor.avatar or "",
            rec_id=rec.id,
            rec_title=rec.title or "",
            rec_username=rec_user.username if rec_user else "",
            created_at=like.created_at
        ))

    # Comments from people you follow, not on your own recs
    comments = (
        db.query(Comment, User, Rec)
        .join(User, Comment.user_id == User.id)
        .join(Rec, Comment.rec_id == Rec.id)
        .filter(
            Comment.user_id.in_(following_ids),
            Comment.user_id != user_id,
            Rec.user_id != user_id,
            Comment.created_at >= cutoff
        )
        .order_by(desc(Comment.created_at))
        .limit(20)
        .all()
    )

    for comment, actor, rec in comments:
        rec_user = db.query(User).filter(User.id == rec.user_id).first()
        events.append(ActivityEvent(
            type="comment",
            actor_username=actor.username,
            actor_avatar=actor.avatar or "",
            rec_id=rec.id,
            rec_title=rec.title or "",
            rec_username=rec_user.username if rec_user else "",
            content=comment.content,
            created_at=comment.created_at
        ))

    events.sort(key=lambda e: e.created_at, reverse=True)
    return events[:30]
