from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import desc
from datetime import datetime, timedelta
from typing import List
from urllib.parse import urlparse
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


class ClusterPoster(BaseModel):
    username: str
    avatar: str

class ClusterOut(BaseModel):
    rec_id: int
    rec_title: str
    rec_image: str
    rec_link: str
    rec_category: str
    posters: List[ClusterPoster]
    count: int
    created_at: str


def _normalize_url(url: str) -> str:
    if not url:
        return ""
    try:
        p = urlparse(url)
        host = p.netloc.replace("www.", "").lower()
        path = p.path.rstrip("/")
        return f"{host}{path}"
    except Exception:
        return url.lower().strip()


@router.get("/clusters", response_model=List[ClusterOut])
def get_clusters(db: Session = Depends(get_db), user_id: int = Depends(get_current_user_id)):
    following_ids = [
        row[0] for row in
        db.query(Follow.following_id).filter(Follow.follower_id == user_id).all()
    ]
    network_ids = list(set(following_ids + [user_id]))

    if len(network_ids) < 2:
        return []

    cutoff = datetime.utcnow() - timedelta(days=30)

    rows = (
        db.query(Rec, User)
        .join(User, Rec.user_id == User.id)
        .filter(
            Rec.user_id.in_(network_ids),
            Rec.created_at >= cutoff,
            Rec.link != None,
            Rec.link != "",
            Rec.quote_of_id == None,
        )
        .order_by(desc(Rec.created_at))
        .all()
    )

    # Group by normalized URL
    seen: dict = {}
    for rec, user in rows:
        key = _normalize_url(rec.link)
        if not key:
            continue
        if key not in seen:
            seen[key] = {"rec": rec, "posters": [], "latest_at": rec.created_at}
        entry = seen[key]
        if not any(p["username"] == user.username for p in entry["posters"]):
            entry["posters"].append({"username": user.username, "avatar": user.avatar or ""})
        if rec.created_at > entry["latest_at"]:
            entry["latest_at"] = rec.created_at
            entry["rec"] = rec

    results = []
    for entry in seen.values():
        if len(entry["posters"]) < 2:
            continue
        rec = entry["rec"]
        results.append(ClusterOut(
            rec_id=rec.id,
            rec_title=rec.title or "",
            rec_image=rec.image or "",
            rec_link=rec.link,
            rec_category=rec.category,
            posters=entry["posters"][:5],
            count=len(entry["posters"]),
            created_at=entry["latest_at"].isoformat(),
        ))

    results.sort(key=lambda c: c.created_at, reverse=True)
    return results[:10]
