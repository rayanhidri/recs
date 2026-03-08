import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { getConversations, getMessages, getMe } from '../api'
import useWebSocket from '../hooks/useWebSocket'
import useWebRTC from '../hooks/useWebRTC'

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
  const remoteAudioRef = useRef(null)
  
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
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    handleCallOffer,
    handleCallAnswer,
    handleIceCandidate
  } = useWebRTC(sendMessage, remoteAudioRef)

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

  const handleStartCall = () => {
    if (activeConversation) {
      startCall(activeConversation.id)
    }
  }

  const handleAcceptCall = () => {
    if (incomingCall) {
      acceptCall(incomingCall.conversation_id, incomingCall.offer)
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
    <div className="chat-container">
      <audio ref={remoteAudioRef} autoPlay playsInline />
      
      {/* Incoming Call Modal */}
      {callState === 'receiving' && incomingCall && (
        <div className="call-modal-overlay">
          <div className="call-modal">
            <div className="call-modal-content">
              <div className="call-icon">📞</div>
              <h3>Incoming Call</h3>
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
      {callState === 'connected' && activeConversation && (
        <div className="call-screen-overlay">
          <div className="call-screen">
            <img 
              src={activeConversation.other_avatar || 'https://via.placeholder.com/120'} 
              alt=""
              className="call-screen-avatar"
            />
            <h2>{activeConversation.other_username}</h2>
            <p className="call-timer">{formatDuration(callDuration)}</p>
            <button className="call-end-button" onClick={handleEndCall}>
              End Call
            </button>
          </div>
        </div>
      )}

      {/* Calling Screen */}
      {callState === 'calling' && activeConversation && (
        <div className="call-screen-overlay">
          <div className="call-screen">
            <img 
              src={activeConversation.other_avatar || 'https://via.placeholder.com/120'} 
              alt=""
              className="call-screen-avatar"
            />
            <h2>{activeConversation.other_username}</h2>
            <p className="call-status">Calling...</p>
            <button className="call-end-button" onClick={handleEndCall}>
              Cancel
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
                <img 
                  src={conv.other_avatar || 'https://via.placeholder.com/56'} 
                  alt=""
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
              <img 
                src={activeConversation.other_avatar || 'https://via.placeholder.com/44'} 
                alt=""
                className="chat-main-avatar"
                onClick={() => navigate(`/profile/${activeConversation.other_username}`)}
              />
              <div className="chat-main-info">
                <span className="chat-main-name">{activeConversation.other_username}</span>
                {isConnected && <span className="chat-main-status">active now</span>}
              </div>
              <div className="chat-header-actions">
                <button className="call-button" onClick={handleStartCall} title="Start audio call">
                  📞
                </button>
              </div>
            </div>

            <div className="chat-messages">
              {messages.map((msg, index) => {
                const isMine = msg.sender_id === me?.id
                const showAvatar = !isMine && (index === 0 || messages[index - 1]?.sender_id !== msg.sender_id)
                
                return (
                  <div key={msg.id} className={`msg ${isMine ? 'msg-sent' : 'msg-received'}`}>
                    {!isMine && (
                      <div className="msg-avatar-col">
                        {showAvatar ? (
                          <img src={msg.sender_avatar || 'https://via.placeholder.com/28'} alt="" className="msg-avatar" />
                        ) : (
                          <div className="msg-avatar-spacer"></div>
                        )}
                      </div>
                    )}
                    <div className="msg-bubble">
                      <p>{msg.content}</p>
                    </div>
                    {isMine && (
                      <span className="msg-status">{msg.is_read ? 'seen' : ''}</span>
                    )}
                  </div>
                )
              })}
              
              {isTyping && (
                <div className="msg msg-received">
                  <div className="msg-avatar-col">
                    <img src={activeConversation.other_avatar || 'https://via.placeholder.com/28'} alt="" className="msg-avatar" />
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
                placeholder="Message..."
                className="chat-input"
              />
              <button type="submit" className="chat-send" disabled={!newMessage.trim()}>
                Send
              </button>
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