from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from typing import List
from pydantic import BaseModel
from ..database import get_db
from ..models import User, Follow, Rec, PinnedRec, Like, Save, Comment, Notification, Conversation, Message
from ..schemas import UserProfile, UserUpdate, RecOut
from ..auth import get_current_user_id

class PinnedRecsUpdate(BaseModel):
    rec_ids: List[int]

router = APIRouter(prefix="/users", tags=["users"])

@router.get("/me", response_model=UserProfile)
def get_current_user(db: Session = Depends(get_db), current_user_id: int = Depends(get_current_user_id)):
    user = db.query(User).filter(User.id == current_user_id).first()
    
    recs_count = db.query(func.count(Rec.id)).filter(Rec.user_id == user.id).scalar()
    tuned_in = db.query(func.count(Follow.id)).filter(Follow.following_id == user.id).scalar()
    tuned_to = db.query(func.count(Follow.id)).filter(Follow.follower_id == user.id).scalar()
    
    return UserProfile(
        id=user.id,
        username=user.username,
        bio=user.bio,
        avatar=user.avatar,
        recs_count=recs_count,
        tuned_in=tuned_in,
        tuned_to=tuned_to,
        is_following=False,
    )

@router.patch("/me", response_model=UserProfile)
def update_current_user(updates: UserUpdate, db: Session = Depends(get_db), current_user_id: int = Depends(get_current_user_id)):
    user = db.query(User).filter(User.id == current_user_id).first()
    
    if updates.username is not None:
        new_username = updates.username.strip().lower()
        if not new_username:
            raise HTTPException(status_code=400, detail="Username cannot be empty")
        if len(new_username) < 2 or len(new_username) > 30:
            raise HTTPException(status_code=400, detail="Username must be 2-30 characters")
        existing = db.query(User).filter(User.username == new_username, User.id != current_user_id).first()
        if existing:
            raise HTTPException(status_code=400, detail="Username already taken")
        user.username = new_username
    if updates.bio is not None:
        user.bio = updates.bio
    if updates.avatar is not None:
        user.avatar = updates.avatar
    
    db.commit()
    db.refresh(user)
    
    recs_count = db.query(func.count(Rec.id)).filter(Rec.user_id == user.id).scalar()
    tuned_in = db.query(func.count(Follow.id)).filter(Follow.following_id == user.id).scalar()
    tuned_to = db.query(func.count(Follow.id)).filter(Follow.follower_id == user.id).scalar()
    
    return UserProfile(
        id=user.id,
        username=user.username,
        bio=user.bio,
        avatar=user.avatar,
        recs_count=recs_count,
        tuned_in=tuned_in,
        tuned_to=tuned_to,
        is_following=False,
    )

@router.get("/search", response_model=list[UserProfile])
def search_users(q: str, db: Session = Depends(get_db), current_user_id: int = Depends(get_current_user_id)):
    users = db.query(User).filter(User.username.ilike(f"%{q}%")).limit(20).all()
    
    results = []
    for user in users:
        recs_count = db.query(func.count(Rec.id)).filter(Rec.user_id == user.id).scalar()
        tuned_in = db.query(func.count(Follow.id)).filter(Follow.following_id == user.id).scalar()
        tuned_to = db.query(func.count(Follow.id)).filter(Follow.follower_id == user.id).scalar()
        is_following = db.query(Follow).filter(Follow.follower_id == current_user_id, Follow.following_id == user.id).first() is not None
        
        results.append(UserProfile(
            id=user.id,
            username=user.username,
            bio=user.bio,
            avatar=user.avatar,
            recs_count=recs_count,
            tuned_in=tuned_in,
            tuned_to=tuned_to,
            is_following=is_following
        ))
    return results
@router.get("/{username}/followers", response_model=list[UserProfile])
def get_followers(username: str, db: Session = Depends(get_db), current_user_id: int = Depends(get_current_user_id)):
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    followers = db.query(User).join(Follow, Follow.follower_id == User.id).filter(Follow.following_id == user.id).all()
    
    results = []
    for follower in followers:
        recs_count = db.query(func.count(Rec.id)).filter(Rec.user_id == follower.id).scalar()
        tuned_in = db.query(func.count(Follow.id)).filter(Follow.following_id == follower.id).scalar()
        tuned_to = db.query(func.count(Follow.id)).filter(Follow.follower_id == follower.id).scalar()
        is_following = db.query(Follow).filter(Follow.follower_id == current_user_id, Follow.following_id == follower.id).first() is not None
        
        results.append(UserProfile(
            id=follower.id,
            username=follower.username,
            bio=follower.bio,
            avatar=follower.avatar,
            recs_count=recs_count,
            tuned_in=tuned_in,
            tuned_to=tuned_to,
            is_following=is_following
        ))
    return results

@router.get("/{username}/following", response_model=list[UserProfile])
def get_following(username: str, db: Session = Depends(get_db), current_user_id: int = Depends(get_current_user_id)):
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    following = db.query(User).join(Follow, Follow.following_id == User.id).filter(Follow.follower_id == user.id).all()
    
    results = []
    for followed in following:
        recs_count = db.query(func.count(Rec.id)).filter(Rec.user_id == followed.id).scalar()
        tuned_in = db.query(func.count(Follow.id)).filter(Follow.following_id == followed.id).scalar()
        tuned_to = db.query(func.count(Follow.id)).filter(Follow.follower_id == followed.id).scalar()
        is_following = db.query(Follow).filter(Follow.follower_id == current_user_id, Follow.following_id == followed.id).first() is not None
        
        results.append(UserProfile(
            id=followed.id,
            username=followed.username,
            bio=followed.bio,
            avatar=followed.avatar,
            recs_count=recs_count,
            tuned_in=tuned_in,
            tuned_to=tuned_to,
            is_following=is_following
        ))
    return results

@router.get("/{username}", response_model=UserProfile)
def get_user_profile(username: str, db: Session = Depends(get_db), current_user_id: int = Depends(get_current_user_id)):
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    recs_count = db.query(func.count(Rec.id)).filter(Rec.user_id == user.id).scalar()
    tuned_in = db.query(func.count(Follow.id)).filter(Follow.following_id == user.id).scalar()
    tuned_to = db.query(func.count(Follow.id)).filter(Follow.follower_id == user.id).scalar()
    is_following = db.query(Follow).filter(Follow.follower_id == current_user_id, Follow.following_id == user.id).first() is not None
    
    return UserProfile(
        id=user.id,
        username=user.username,
        bio=user.bio,
        avatar=user.avatar,
        recs_count=recs_count,
        tuned_in=tuned_in,
        tuned_to=tuned_to,
        is_following=is_following,
    )

@router.post("/{username}/follow")
def follow_user(username: str, db: Session = Depends(get_db), current_user_id: int = Depends(get_current_user_id)):
    user_to_follow = db.query(User).filter(User.username == username).first()
    if not user_to_follow:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user_to_follow.id == current_user_id:
        raise HTTPException(status_code=400, detail="Cannot follow yourself")
    
    existing = db.query(Follow).filter(Follow.follower_id == current_user_id, Follow.following_id == user_to_follow.id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Already following")
    
    follow = Follow(follower_id=current_user_id, following_id=user_to_follow.id)
    db.add(follow)
    db.commit()
    return {"message": f"Now following {username}"}

@router.delete("/{username}/follow")
def unfollow_user(username: str, db: Session = Depends(get_db), current_user_id: int = Depends(get_current_user_id)):
    user_to_unfollow = db.query(User).filter(User.username == username).first()
    if not user_to_unfollow:
        raise HTTPException(status_code=404, detail="User not found")
    
    follow = db.query(Follow).filter(Follow.follower_id == current_user_id, Follow.following_id == user_to_unfollow.id).first()
    if not follow:
        raise HTTPException(status_code=400, detail="Not following")
    
    db.delete(follow)
    db.commit()
    return {"message": f"Unfollowed {username}"}


def _rec_to_out(rec: Rec, db: Session, user_id: int) -> RecOut:
    from sqlalchemy import func as sqlfunc
    likes_count = db.query(sqlfunc.count(Like.id)).filter(Like.rec_id == rec.id).scalar()
    is_liked = db.query(Like).filter(Like.user_id == user_id, Like.rec_id == rec.id).first() is not None
    is_saved = db.query(Save).filter(Save.user_id == user_id, Save.rec_id == rec.id).first() is not None
    owner = db.query(User).filter(User.id == rec.user_id).first()
    return RecOut(
        **rec.__dict__,
        username=owner.username if owner else "",
        user_avatar=owner.avatar or "" if owner else "",
        likes_count=likes_count,
        is_liked=is_liked,
        is_saved=is_saved,
    )


@router.get("/me/pinned", response_model=List[RecOut])
def get_my_pinned(db: Session = Depends(get_db), current_user_id: int = Depends(get_current_user_id)):
    pins = db.query(PinnedRec).filter(PinnedRec.user_id == current_user_id).order_by(PinnedRec.created_at.asc()).limit(3).all()
    results = []
    for pin in pins:
        rec = db.query(Rec).filter(Rec.id == pin.rec_id).first()
        if rec:
            results.append(_rec_to_out(rec, db, current_user_id))
    return results


@router.get("/{username}/pinned", response_model=List[RecOut])
def get_pinned(username: str, db: Session = Depends(get_db), current_user_id: int = Depends(get_current_user_id)):
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    pins = db.query(PinnedRec).filter(PinnedRec.user_id == user.id).order_by(PinnedRec.created_at.asc()).limit(3).all()
    results = []
    for pin in pins:
        rec = db.query(Rec).filter(Rec.id == pin.rec_id).first()
        if rec:
            results.append(_rec_to_out(rec, db, current_user_id))
    return results


@router.put("/me/pinned")
def update_pinned(body: PinnedRecsUpdate, db: Session = Depends(get_db), current_user_id: int = Depends(get_current_user_id)):
    rec_ids = body.rec_ids[:3]
    # Verify all recs belong to this user
    for rec_id in rec_ids:
        rec = db.query(Rec).filter(Rec.id == rec_id, Rec.user_id == current_user_id).first()
        if not rec:
            raise HTTPException(status_code=400, detail=f"Rec {rec_id} not found or not yours")
    # Replace
    db.query(PinnedRec).filter(PinnedRec.user_id == current_user_id).delete()
    for rec_id in rec_ids:
        db.add(PinnedRec(user_id=current_user_id, rec_id=rec_id))
    db.commit()
    return {"message": "Pinned updated"}


@router.delete("/me")
def delete_account(db: Session = Depends(get_db), current_user_id: int = Depends(get_current_user_id)):
    user = db.query(User).filter(User.id == current_user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    rec_ids = [r[0] for r in db.query(Rec.id).filter(Rec.user_id == current_user_id).all()]

    # Notifications involving this user or their recs
    notif_filter = or_(Notification.user_id == current_user_id, Notification.from_user_id == current_user_id)
    if rec_ids:
        notif_filter = or_(notif_filter, Notification.rec_id.in_(rec_ids))
    db.query(Notification).filter(notif_filter).delete(synchronize_session=False)

    # Re-recs of this user's recs (recs that quote their recs)
    if rec_ids:
        quote_rec_ids = [r[0] for r in db.query(Rec.id).filter(Rec.quote_of_id.in_(rec_ids)).all()]
        if quote_rec_ids:
            db.query(Like).filter(Like.rec_id.in_(quote_rec_ids)).delete(synchronize_session=False)
            db.query(Comment).filter(Comment.rec_id.in_(quote_rec_ids)).delete(synchronize_session=False)
            db.query(Save).filter(Save.rec_id.in_(quote_rec_ids)).delete(synchronize_session=False)
            db.query(PinnedRec).filter(PinnedRec.rec_id.in_(quote_rec_ids)).delete(synchronize_session=False)
            db.query(Rec).filter(Rec.id.in_(quote_rec_ids)).delete(synchronize_session=False)

    # Saves, pins, likes, comments on this user's recs (by others)
    save_filter = Save.user_id == current_user_id
    pin_filter = PinnedRec.user_id == current_user_id
    like_filter = Like.user_id == current_user_id
    comment_filter = Comment.user_id == current_user_id
    if rec_ids:
        save_filter = or_(save_filter, Save.rec_id.in_(rec_ids))
        pin_filter = or_(pin_filter, PinnedRec.rec_id.in_(rec_ids))
        like_filter = or_(like_filter, Like.rec_id.in_(rec_ids))
        comment_filter = or_(comment_filter, Comment.rec_id.in_(rec_ids))
        db.query(Message).filter(Message.rec_id.in_(rec_ids)).update({"rec_id": None}, synchronize_session=False)

    db.query(Save).filter(save_filter).delete(synchronize_session=False)
    db.query(PinnedRec).filter(pin_filter).delete(synchronize_session=False)
    db.query(Like).filter(like_filter).delete(synchronize_session=False)
    db.query(Comment).filter(comment_filter).delete(synchronize_session=False)

    # Follows
    db.query(Follow).filter(
        or_(Follow.follower_id == current_user_id, Follow.following_id == current_user_id)
    ).delete(synchronize_session=False)

    # Conversations and their messages
    conv_ids = [c[0] for c in db.query(Conversation.id).filter(
        or_(Conversation.user1_id == current_user_id, Conversation.user2_id == current_user_id)
    ).all()]
    if conv_ids:
        db.query(Message).filter(Message.conversation_id.in_(conv_ids)).delete(synchronize_session=False)
        db.query(Conversation).filter(Conversation.id.in_(conv_ids)).delete(synchronize_session=False)

    # User's recs
    db.query(Rec).filter(Rec.user_id == current_user_id).delete(synchronize_session=False)

    # User
    db.delete(user)
    db.commit()
    return {"message": "Account deleted"}
