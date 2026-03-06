import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getConversations, getOrCreateConversation, getMessages, getMe } from '../api'
import useWebSocket from '../hooks/useWebSocket'

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
  const weeks = Math.floor(days / 7)
  return `${weeks}w`
}

export default function Chat() {
  const navigate = useNavigate()
  const { odosername } = useParams()
  const messagesEndRef = useRef(null)
  
  const [me, setMe] = useState(null)
  const [conversations, setConversations] = useState([])
  const [activeConversation, setActiveConversation] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [isTyping, setIsTyping] = useState(false)
  
  const { isConnected, lastMessage, sendMessage, sendTyping, markAsRead } = useWebSocket(me?.id)

  // Load current user
  useEffect(() => {
    const fetchMe = async () => {
      try {
        const res = await getMe()
        setMe(res.data)
      } catch (err) {
        console.error(err)
        navigate('/login')
      }
    }
    fetchMe()
  }, [navigate])

  // Load conversations
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
    if (me) {
      fetchConversations()
    }
  }, [me])

  // Handle incoming WebSocket messages
  useEffect(() => {
    if (!lastMessage) return

    if (lastMessage.type === 'message') {
      // Add message to chat if it's for the active conversation
      if (activeConversation && lastMessage.conversation_id === activeConversation.id) {
        setMessages(prev => [...prev, lastMessage])
        markAsRead(activeConversation.id)
      }
      
      // Update conversation list
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
        // Sort by most recent
        return updated.sort((a, b) => new Date(b.last_message_time) - new Date(a.last_message_time))
      })
    } else if (lastMessage.type === 'typing') {
      if (activeConversation && lastMessage.user_id !== me?.id) {
        setIsTyping(true)
        setTimeout(() => setIsTyping(false), 2000)
      }
    } else if (lastMessage.type === 'read') {
      // Update messages to show as read
      setMessages(prev => prev.map(msg => ({ ...msg, is_read: true })))
    }
  }, [lastMessage, activeConversation, me, markAsRead])

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Load messages when conversation is selected
  const selectConversation = async (conversation) => {
    setActiveConversation(conversation)
    try {
      const res = await getMessages(conversation.id)
      setMessages(res.data)
      markAsRead(conversation.id)
      
      // Update unread count
      setConversations(prev => prev.map(conv => 
        conv.id === conversation.id ? { ...conv, unread_count: 0 } : conv
      ))
    } catch (err) {
      console.error(err)
    }
  }

  // Send message
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

  // Handle typing
  const handleTyping = () => {
    if (activeConversation) {
      sendTyping(activeConversation.id)
    }
  }

  if (loading) return <div className="loading">loading...</div>

  return (
    <div className="chat-page">
      {/* Conversations List */}
      <div className="conversations-list">
        <h2>messages</h2>
        {conversations.length === 0 ? (
          <p className="no-conversations">no conversations yet</p>
        ) : (
          conversations.map(conv => (
            <div 
              key={conv.id} 
              className={`conversation-item ${activeConversation?.id === conv.id ? 'active' : ''}`}
              onClick={() => selectConversation(conv)}
            >
              <img 
                src={conv.other_avatar || 'https://via.placeholder.com/48'} 
                alt={conv.other_username}
                className="conversation-avatar"
              />
              <div className="conversation-info">
                <div className="conversation-header">
                  <span className="conversation-username">{conv.other_username}</span>
                  {conv.last_message_time && (
                    <span className="conversation-time">{timeAgo(conv.last_message_time)}</span>
                  )}
                </div>
                <p className="conversation-preview">
                  {conv.last_message || 'Start a conversation'}
                </p>
              </div>
              {conv.unread_count > 0 && (
                <span className="unread-badge">{conv.unread_count}</span>
              )}
            </div>
          ))
        )}
      </div>

      {/* Chat Area */}
      <div className="chat-area">
        {activeConversation ? (
          <>
            <div className="chat-header">
              <img 
                src={activeConversation.other_avatar || 'https://via.placeholder.com/40'} 
                alt={activeConversation.other_username}
                className="chat-header-avatar"
                onClick={() => navigate(`/profile/${activeConversation.other_username}`)}
              />
              <div className="chat-header-info">
                <span className="chat-header-username">{activeConversation.other_username}</span>
                {isConnected && <span className="online-status">online</span>}
              </div>
            </div>

            <div className="messages-container">
              {messages.map(msg => (
                <div 
                  key={msg.id} 
                  className={`message ${msg.sender_id === me?.id ? 'sent' : 'received'}`}
                >
                  <div className="message-content">{msg.content}</div>
                  <div className="message-meta">
                    <span className="message-time">{timeAgo(msg.created_at)}</span>
                    {msg.sender_id === me?.id && (
                      <span className="message-status">{msg.is_read ? 'seen' : 'sent'}</span>
                    )}
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="typing-indicator">typing...</div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSend} className="message-form">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleTyping}
                placeholder="Type a message..."
                className="message-input"
              />
              <button type="submit" className="send-button">send</button>
            </form>
          </>
        ) : (
          <div className="no-chat-selected">
            <p>select a conversation to start chatting</p>
          </div>
        )}
      </div>
    </div>
  )
}