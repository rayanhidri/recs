import React, { useState, useEffect, useRef } from 'react'
import Avatar from '../components/Avatar'
import { useNavigate } from 'react-router-dom'
import { getConversations, getMessages, getMe } from '../api'
import useWebSocket from '../hooks/useWebSocket'
import useWebRTC from '../hooks/useWebRTC'

function formatDateDivider(dateString) {
  const date = new Date(dateString)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  if (date.toDateString() === today.toDateString()) return 'today'
  if (date.toDateString() === yesterday.toDateString()) return 'yesterday'
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function timeAgo(dateString) {
  const now = new Date()
  const date = new Date(dateString)
  const seconds = Math.floor((now - date) / 1000)
  
  if (seconds < 60) return 'now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d`
  return `${Math.floor(days / 7)}w`
}

function formatDuration(seconds) {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

export default function Chat() {
  const navigate = useNavigate()
  const messagesEndRef = useRef(null)
  const remoteVideoRef = useRef(null)
  const localVideoRef = useRef(null)
  
  const [me, setMe] = useState(null)
  const [conversations, setConversations] = useState([])
  const [activeConversation, setActiveConversation] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [isTyping, setIsTyping] = useState(false)
  
  const { isConnected, lastMessage, sendMessage, sendTyping, markAsRead } = useWebSocket(me?.id)
  
  const {
    callState,
    callDuration,
    incomingCall,
    isVideoCall,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    handleCallOffer,
    handleCallAnswer,
    handleIceCandidate
  } = useWebRTC(sendMessage, remoteVideoRef, localVideoRef)

  useEffect(() => {
    const fetchMe = async () => {
      try {
        const res = await getMe()
        setMe(res.data)
      } catch (err) {
        navigate('/login')
      }
    }
    fetchMe()
  }, [navigate])

  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const res = await getConversations()
        setConversations(res.data)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    if (me) fetchConversations()
  }, [me])

  useEffect(() => {
    if (!lastMessage) return

    if (lastMessage.type === 'message') {
      if (activeConversation && lastMessage.conversation_id === activeConversation.id) {
        setMessages(prev => [...prev, lastMessage])
        markAsRead(activeConversation.id)
      }
      
      setConversations(prev => {
        const updated = prev.map(conv => {
          if (conv.id === lastMessage.conversation_id) {
            return {
              ...conv,
              last_message: lastMessage.content,
              last_message_time: lastMessage.created_at,
              unread_count: activeConversation?.id === conv.id ? 0 : conv.unread_count + 1
            }
          }
          return conv
        })
        return updated.sort((a, b) => new Date(b.last_message_time) - new Date(a.last_message_time))
      })
    } else if (lastMessage.type === 'typing') {
      if (activeConversation && lastMessage.user_id !== me?.id) {
        setIsTyping(true)
        setTimeout(() => setIsTyping(false), 2000)
      }
    } else if (lastMessage.type === 'read') {
      setMessages(prev => prev.map(msg => ({ ...msg, is_read: true })))
    }
    else if (lastMessage.type === 'call_offer') {
      handleCallOffer(lastMessage)
    } else if (lastMessage.type === 'call_answer') {
      handleCallAnswer(lastMessage.answer)
    } else if (lastMessage.type === 'ice_candidate') {
      handleIceCandidate(lastMessage.candidate)
    } else if (lastMessage.type === 'call_end') {
      endCall()
    }
  }, [lastMessage, activeConversation, me, markAsRead, handleCallOffer, handleCallAnswer, handleIceCandidate, endCall])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const selectConversation = async (conversation) => {
    setActiveConversation(conversation)
    try {
      const res = await getMessages(conversation.id)
      setMessages(res.data)
      markAsRead(conversation.id)
      setConversations(prev => prev.map(conv => 
        conv.id === conversation.id ? { ...conv, unread_count: 0 } : conv
      ))
    } catch (err) {
      console.error(err)
    }
  }

  const handleSend = (e) => {
    e.preventDefault()
    if (!newMessage.trim() || !activeConversation) return

    sendMessage({
      type: 'message',
      conversation_id: activeConversation.id,
      content: newMessage.trim()
    })
    setNewMessage('')
  }

  const handleTyping = () => {
    if (activeConversation) sendTyping(activeConversation.id)
  }

  const handleStartAudioCall = () => {
    if (activeConversation) {
      startCall(activeConversation.id, false)
    }
  }

  const handleStartVideoCall = () => {
    if (activeConversation) {
      startCall(activeConversation.id, true)
    }
  }

  const handleAcceptCall = () => {
    if (incomingCall) {
      acceptCall(incomingCall.conversation_id, incomingCall.offer, incomingCall.withVideo || false)
    }
  }

  const handleRejectCall = () => {
    if (incomingCall) {
      rejectCall(incomingCall.conversation_id)
    }
  }

  const handleEndCall = () => {
    if (activeConversation) {
      endCall(activeConversation.id)
    }
  }

  if (loading) return <div className="chat-loading">loading...</div>

  return (
    <div className={`chat-container ${activeConversation ? 'has-active' : ''}`}>
      {/* Incoming Call Modal */}
      {callState === 'receiving' && incomingCall && (
        <div className="call-modal-overlay">
          <div className="call-modal">
            <div className="call-modal-content">
              <div className="call-icon">{incomingCall.withVideo ? '📹' : '📞'}</div>
              <h3>Incoming {incomingCall.withVideo ? 'Video' : 'Audio'} Call</h3>
              <p>{conversations.find(c => c.id === incomingCall.conversation_id)?.other_username || 'Someone'} is calling...</p>
              <div className="call-modal-buttons">
                <button className="call-reject" onClick={handleRejectCall}>Decline</button>
                <button className="call-accept" onClick={handleAcceptCall}>Accept</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Active Call Screen */}
      {(callState === 'connected' || callState === 'calling') && activeConversation && (
        <div className="call-screen-overlay">
          <div className={`call-screen ${isVideoCall ? 'video-call' : ''}`}>
            {isVideoCall ? (
              <>
                <video 
                  ref={remoteVideoRef} 
                  className="remote-video" 
                  autoPlay 
                  playsInline
                />
                <video 
                  ref={localVideoRef} 
                  className="local-video" 
                  autoPlay 
                  playsInline 
                  muted
                />
                <div className="video-call-info">
                  <h2>{activeConversation.other_username}</h2>
                  <p className="call-timer">
                    {callState === 'calling' ? 'Calling...' : formatDuration(callDuration)}
                  </p>
                </div>
              </>
            ) : (
              <>
                <Avatar
                  avatar={activeConversation.other_avatar} username={activeConversation.other_username}
                  className="call-screen-avatar"
                />
                <h2>{activeConversation.other_username}</h2>
                <p className="call-timer">
                  {callState === 'calling' ? 'Calling...' : formatDuration(callDuration)}
                </p>
                {/* Hidden audio element for audio-only calls */}
                <video ref={remoteVideoRef} style={{ display: 'none' }} autoPlay playsInline />
              </>
            )}
            <button className="call-end-button" onClick={handleEndCall}>
              {callState === 'calling' ? 'Cancel' : 'End Call'}
            </button>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <div className="chat-sidebar">
        <div className="chat-sidebar-header">
          <h2>messages</h2>
          <span className={`status-dot ${isConnected ? 'online' : ''}`}></span>
        </div>
        
        <div className="chat-conversations">
          {conversations.length === 0 ? (
            <div className="empty-conversations">
              <p>no messages yet</p>
              <span>start a conversation from someone's profile</span>
            </div>
          ) : (
            conversations.map(conv => (
              <div 
                key={conv.id} 
                className={`conv-item ${activeConversation?.id === conv.id ? 'active' : ''}`}
                onClick={() => selectConversation(conv)}
              >
                <Avatar
                  avatar={conv.other_avatar} username={conv.other_username}
                  className="conv-avatar"
                />
                <div className="conv-details">
                  <div className="conv-top">
                    <span className="conv-name">{conv.other_username}</span>
                    <span className="conv-time">{conv.last_message_time ? timeAgo(conv.last_message_time) : ''}</span>
                  </div>
                  <div className="conv-bottom">
                    <p className="conv-preview">{conv.last_message || 'Start chatting'}</p>
                    {conv.unread_count > 0 && <span className="conv-unread">{conv.unread_count}</span>}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="chat-main">
        {activeConversation ? (
          <>
            <div className="chat-main-header">
              <button className="chat-back-btn" onClick={() => setActiveConversation(null)}>←</button>
              <Avatar
                avatar={activeConversation.other_avatar} username={activeConversation.other_username}
                className="chat-main-avatar"
                onClick={() => navigate(`/profile/${activeConversation.other_username}`)}
              />
              <div className="chat-main-info">
                <span className="chat-main-name" onClick={() => navigate(`/profile/${activeConversation.other_username}`)} style={{ cursor: 'pointer' }}>{activeConversation.other_username}</span>
              </div>
              <div className="chat-header-actions">
                <button className="call-button" onClick={handleStartAudioCall} title="Audio call">call</button>
                <button className="call-button" onClick={handleStartVideoCall} title="Video call">video</button>
              </div>
            </div>

            <div className="chat-messages">
              {messages.map((msg, index) => {
                const isMine = msg.sender_id === me?.id
                const showAvatar = !isMine && (index === 0 || messages[index - 1]?.sender_id !== msg.sender_id)
                const msgDay = new Date(msg.created_at).toDateString()
                const prevDay = index > 0 ? new Date(messages[index - 1].created_at).toDateString() : null
                const showDivider = index === 0 || msgDay !== prevDay

                return (
                  <React.Fragment key={msg.id}>
                  {showDivider && <div className="date-divider">{formatDateDivider(msg.created_at)}</div>}
                  <div className={`msg ${isMine ? 'msg-sent' : 'msg-received'}`}>
                    {!isMine && (
                      <div className="msg-avatar-col">
                        {showAvatar ? (
                          <Avatar avatar={msg.sender_avatar} username={msg.sender_username} className="msg-avatar" />
                        ) : (
                          <div className="msg-avatar-spacer"></div>
                        )}
                      </div>
                    )}
                    <div className="msg-bubble">
                      {msg.rec_id && (
                        <div
                          className="rec-message-card"
                          onClick={() => msg.rec_link && window.open(msg.rec_link, '_blank')}
                        >
                          {msg.rec_image && <img src={msg.rec_image} alt={msg.rec_title} className="rec-msg-image" />}
                          <div className="rec-msg-info">
                            <span className="rec-msg-category">{msg.rec_category}</span>
                            <p className="rec-msg-title">{msg.rec_title}</p>
                          </div>
                        </div>
                      )}
                      {msg.content && <p>{msg.content}</p>}
                    </div>
                    {isMine && (
                      <span className="msg-status">{msg.is_read ? 'seen' : ''}</span>
                    )}
                  </div>
                  </React.Fragment>
                )
              })}
              
              {isTyping && (
                <div className="msg msg-received">
                  <div className="msg-avatar-col">
                    <Avatar avatar={activeConversation.other_avatar} username={activeConversation.other_username} className="msg-avatar" />
                  </div>
                  <div className="msg-bubble typing">
                    <span></span><span></span><span></span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSend} className="chat-input-area">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleTyping}
                placeholder="message..."
                className="chat-input"
              />
              <button type="submit" className="chat-send" disabled={!newMessage.trim()}>↑</button>
            </form>
          </>
        ) : (
          <div className="chat-empty">
            <div className="chat-empty-content">
              <div className="chat-empty-icon">💬</div>
              <h3>Your messages</h3>
              <p>Send private messages to a friend</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}