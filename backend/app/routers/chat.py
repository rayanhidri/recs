from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, func
from typing import Dict
import json
from datetime import datetime
from ..database import get_db
from ..models import User, Conversation, Message
from ..schemas import MessageOut, ConversationOut, MessageCreate
from ..auth import get_current_user_id

router = APIRouter(prefix="/chat", tags=["chat"])

# Store active WebSocket connections
active_connections: Dict[int, WebSocket] = {}

# WebSocket endpoint
@router.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: int, db: Session = Depends(get_db)):
    await websocket.accept()
    active_connections[user_id] = websocket
    
    try:
        while True:
            data = await websocket.receive_json()
            
            if data["type"] == "message":
                # Save message to DB
                conversation_id = data["conversation_id"]
                content = data["content"]
                
                message = Message(
                    conversation_id=conversation_id,
                    sender_id=user_id,
                    content=content
                )
                db.add(message)
                
                # Update conversation timestamp
                conversation = db.query(Conversation).filter(Conversation.id == conversation_id).first()
                conversation.updated_at = datetime.utcnow()
                db.commit()
                db.refresh(message)
                
                # Get sender info
                sender = db.query(User).filter(User.id == user_id).first()
                
                # Prepare message data
                message_data = {
                    "type": "message",
                    "id": message.id,
                    "conversation_id": conversation_id,
                    "sender_id": user_id,
                    "content": content,
                    "is_read": False,
                    "created_at": message.created_at.isoformat(),
                    "sender_username": sender.username,
                    "sender_avatar": sender.avatar or ""
                }
                
                # Send to recipient if online
                recipient_id = conversation.user2_id if conversation.user1_id == user_id else conversation.user1_id
                if recipient_id in active_connections:
                    await active_connections[recipient_id].send_json(message_data)
                
                # Send back to sender for confirmation
                await websocket.send_json(message_data)
            
            elif data["type"] == "typing":
                conversation_id = data["conversation_id"]
                conversation = db.query(Conversation).filter(Conversation.id == conversation_id).first()
                recipient_id = conversation.user2_id if conversation.user1_id == user_id else conversation.user1_id
                
                if recipient_id in active_connections:
                    await active_connections[recipient_id].send_json({
                        "type": "typing",
                        "conversation_id": conversation_id,
                        "user_id": user_id
                    })
            
            elif data["type"] == "read":
                conversation_id = data["conversation_id"]
                # Mark messages as read
                db.query(Message).filter(
                    Message.conversation_id == conversation_id,
                    Message.sender_id != user_id,
                    Message.is_read == False
                ).update({"is_read": True})
                db.commit()
                
                # Notify sender that messages were read
                conversation = db.query(Conversation).filter(Conversation.id == conversation_id).first()
                other_user_id = conversation.user2_id if conversation.user1_id == user_id else conversation.user1_id
                
                if other_user_id in active_connections:
                    await active_connections[other_user_id].send_json({
                        "type": "read",
                        "conversation_id": conversation_id
                    })
                    
    except WebSocketDisconnect:
        del active_connections[user_id]


# Get or create conversation
@router.post("/conversations/{other_user_id}", response_model=ConversationOut)
def get_or_create_conversation(other_user_id: int, db: Session = Depends(get_db), user_id: int = Depends(get_current_user_id)):
    if user_id == other_user_id:
        raise HTTPException(status_code=400, detail="Cannot chat with yourself")
    
    # Check if conversation exists
    conversation = db.query(Conversation).filter(
        or_(
            and_(Conversation.user1_id == user_id, Conversation.user2_id == other_user_id),
            and_(Conversation.user1_id == other_user_id, Conversation.user2_id == user_id)
        )
    ).first()
    
    if not conversation:
        # Create new conversation
        conversation = Conversation(user1_id=user_id, user2_id=other_user_id)
        db.add(conversation)
        db.commit()
        db.refresh(conversation)
    
    other_user = db.query(User).filter(User.id == other_user_id).first()
    
    # Get last message
    last_msg = db.query(Message).filter(Message.conversation_id == conversation.id).order_by(Message.created_at.desc()).first()
    
    # Get unread count
    unread = db.query(func.count(Message.id)).filter(
        Message.conversation_id == conversation.id,
        Message.sender_id != user_id,
        Message.is_read == False
    ).scalar()
    
    return ConversationOut(
        id=conversation.id,
        other_user_id=other_user.id,
        other_username=other_user.username,
        other_avatar=other_user.avatar or "",
        last_message=last_msg.content if last_msg else "",
        last_message_time=last_msg.created_at if last_msg else None,
        unread_count=unread
    )


# Get all conversations for current user
@router.get("/conversations", response_model=list[ConversationOut])
def get_conversations(db: Session = Depends(get_db), user_id: int = Depends(get_current_user_id)):
    conversations = db.query(Conversation).filter(
        or_(Conversation.user1_id == user_id, Conversation.user2_id == user_id)
    ).order_by(Conversation.updated_at.desc()).all()
    
    results = []
    for conv in conversations:
        other_user_id = conv.user2_id if conv.user1_id == user_id else conv.user1_id
        other_user = db.query(User).filter(User.id == other_user_id).first()
        
        last_msg = db.query(Message).filter(Message.conversation_id == conv.id).order_by(Message.created_at.desc()).first()
        
        unread = db.query(func.count(Message.id)).filter(
            Message.conversation_id == conv.id,
            Message.sender_id != user_id,
            Message.is_read == False
        ).scalar()
        
        results.append(ConversationOut(
            id=conv.id,
            other_user_id=other_user.id,
            other_username=other_user.username,
            other_avatar=other_user.avatar or "",
            last_message=last_msg.content if last_msg else "",
            last_message_time=last_msg.created_at if last_msg else None,
            unread_count=unread
        ))
    
    return results


# Get messages for a conversation
@router.get("/conversations/{conversation_id}/messages", response_model=list[MessageOut])
def get_messages(conversation_id: int, db: Session = Depends(get_db), user_id: int = Depends(get_current_user_id)):
    # Verify user is part of conversation
    conversation = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    if user_id not in [conversation.user1_id, conversation.user2_id]:
        raise HTTPException(status_code=403, detail="Not your conversation")
    
    messages = db.query(Message).filter(Message.conversation_id == conversation_id).order_by(Message.created_at.asc()).all()
    
    results = []
    for msg in messages:
        sender = db.query(User).filter(User.id == msg.sender_id).first()
        results.append(MessageOut(
            id=msg.id,
            conversation_id=msg.conversation_id,
            sender_id=msg.sender_id,
            content=msg.content,
            is_read=msg.is_read,
            created_at=msg.created_at,
            sender_username=sender.username,
            sender_avatar=sender.avatar or ""
        ))
    
    return results