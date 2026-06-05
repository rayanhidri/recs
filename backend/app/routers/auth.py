import os
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from ..database import get_db
from ..models import User, Follow
from ..schemas import UserCreate, Token, UserOut, GoogleAuthRequest
from ..auth import hash_password, verify_password, create_access_token

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
CREATOR_USERNAME = os.getenv("CREATOR_USERNAME", "rayan")

router = APIRouter(prefix="/auth", tags=["auth"])

def auto_follow_creator(new_user_id: int, db: Session):
    creator = db.query(User).filter(User.username == CREATOR_USERNAME).first()
    if not creator or creator.id == new_user_id:
        return
    already = db.query(Follow).filter(
        Follow.follower_id == new_user_id,
        Follow.following_id == creator.id
    ).first()
    if not already:
        db.add(Follow(follower_id=new_user_id, following_id=creator.id))
        db.commit()

@router.post("/signup", response_model=UserOut)
def signup(user: UserCreate, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == user.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    if db.query(User).filter(User.username == user.username).first():
        raise HTTPException(status_code=400, detail="Username already taken")

    new_user = User(
        username=user.username,
        email=user.email,
        password=hash_password(user.password)
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    auto_follow_creator(new_user.id, db)
    return new_user

@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == form_data.username).first()
    if not db_user or not db_user.password:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not verify_password(form_data.password, db_user.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token({"user_id": db_user.id})
    return {"access_token": token, "token_type": "bearer"}

@router.post("/google", response_model=Token)
def google_auth(body: GoogleAuthRequest, db: Session = Depends(get_db)):
    try:
        idinfo = id_token.verify_oauth2_token(
            body.credential,
            google_requests.Request(),
            GOOGLE_CLIENT_ID
        )
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid Google token")

    email = idinfo["email"]
    name = idinfo.get("name", "")
    picture = idinfo.get("picture", "")

    user = db.query(User).filter(User.email == email).first()

    if not user:
        base = (name.lower().replace(" ", "") or email.split("@")[0])[:20]
        username = base
        counter = 1
        while db.query(User).filter(User.username == username).first():
            username = f"{base}{counter}"
            counter += 1

        user = User(username=username, email=email, password=None, avatar=picture)
        db.add(user)
        db.commit()
        db.refresh(user)
        auto_follow_creator(user.id, db)

    token = create_access_token({"user_id": user.id})
    return {"access_token": token, "token_type": "bearer"}