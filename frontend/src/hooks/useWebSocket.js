import { useEffect, useRef, useState, useCallback } from 'react'
import { getWebSocketUrl } from '../api'

export default function useWebSocket(userId) {
  const ws = useRef(null)
  const [isConnected, setIsConnected] = useState(false)
  const [lastMessage, setLastMessage] = useState(null)

  useEffect(() => {
    if (!userId) return

    const url = getWebSocketUrl(userId)
    ws.current = new WebSocket(url)

    ws.current.onopen = () => {
      console.log('WebSocket connected')
      setIsConnected(true)
    }

    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data)
      setLastMessage(data)
    }

    ws.current.onclose = () => {
      console.log('WebSocket disconnected')
      setIsConnected(false)
    }

    ws.current.onerror = (error) => {
      console.error('WebSocket error:', error)
    }

    return () => {
      if (ws.current) {
        ws.current.close()
      }
    }
  }, [userId])

  const sendMessage = useCallback((data) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(data))
    }
  }, [])

  const sendTyping = useCallback((conversationId) => {
    sendMessage({ type: 'typing', conversation_id: conversationId })
  }, [sendMessage])

  const markAsRead = useCallback((conversationId) => {
    sendMessage({ type: 'read', conversation_id: conversationId })
  }, [sendMessage])

  return {
    isConnected,
    lastMessage,
    sendMessage,
    sendTyping,
    markAsRead
  }
}