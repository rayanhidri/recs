from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from ..database import get_db
from ..models import User, Follow, Rec
from ..schemas import UserProfile
from ..auth import get_current_user_id

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
        is_following=False
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
        is_following=is_following
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