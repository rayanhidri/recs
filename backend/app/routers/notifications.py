from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Notification, User
from ..schemas import NotificationOut
from ..auth import get_current_user_id

router = APIRouter(prefix="/notifications", tags=["notifications"])

@router.get("/", response_model=list[NotificationOut])
def get_notifications(db: Session = Depends(get_db), user_id: int = Depends(get_current_user_id)):
    notifications = db.query(Notification).filter(Notification.user_id == user_id).order_by(Notification.created_at.desc()).limit(50).all()
    
    results = []
    for notif in notifications:
        from_user = db.query(User).filter(User.id == notif.from_user_id).first()
        results.append(NotificationOut(
            id=notif.id,
            type=notif.type,
            rec_id=notif.rec_id,
            is_read=notif.is_read,
            created_at=notif.created_at,
            from_username=from_user.username if from_user else "",
            from_user_avatar=from_user.avatar or "" if from_user else ""
        ))
    return results

@router.post("/read")
def mark_all_read(db: Session = Depends(get_db), user_id: int = Depends(get_current_user_id)):
    db.query(Notification).filter(Notification.user_id == user_id, Notification.is_read == False).update({"is_read": True})
    db.commit()
    return {"message": "All notifications marked as read"}