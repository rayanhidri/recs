import { useRef, useState, useCallback } from 'react'

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
}

export default function useWebRTC(sendMessage) {
  const peerConnection = useRef(null)
  const localStream = useRef(null)
  const remoteAudio = useRef(null)
  
  const [callState, setCallState] = useState('idle') // idle, calling, receiving, connected
  const [incomingCall, setIncomingCall] = useState(null)

  const initializePeerConnection = useCallback((conversationId) => {
    peerConnection.current = new RTCPeerConnection(ICE_SERVERS)
    
    // Handle ICE candidates
    peerConnection.current.onicecandidate = (event) => {
      if (event.candidate) {
        sendMessage({
          type: 'ice_candidate',
          conversation_id: conversationId,
          candidate: event.candidate
        })
      }
    }
    
    // Handle remote stream
    peerConnection.current.ontrack = (event) => {
      if (remoteAudio.current) {
        remoteAudio.current.srcObject = event.streams[0]
      }
    }
    
    // Connection state changes
    peerConnection.current.onconnectionstatechange = () => {
      if (peerConnection.current.connectionState === 'connected') {
        setCallState('connected')
      } else if (peerConnection.current.connectionState === 'disconnected' || 
                 peerConnection.current.connectionState === 'failed') {
        endCall()
      }
    }
    
    return peerConnection.current
  }, [sendMessage])

  const startCall = useCallback(async (conversationId) => {
    try {
      setCallState('calling')
      
      // Get microphone access
      localStream.current = await navigator.mediaDevices.getUserMedia({ audio: true })
      
      // Initialize peer connection
      const pc = initializePeerConnection(conversationId)
      
      // Add local tracks
      localStream.current.getTracks().forEach(track => {
        pc.addTrack(track, localStream.current)
      })
      
      // Create and send offer
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
      
      sendMessage({
        type: 'call_offer',
        conversation_id: conversationId,
        offer: offer
      })
    } catch (err) {
      console.error('Error starting call:', err)
      setCallState('idle')
    }
  }, [initializePeerConnection, sendMessage])

  const handleCallOffer = useCallback(async (data) => {
    setIncomingCall(data)
    setCallState('receiving')
  }, [])

  const acceptCall = useCallback(async (conversationId, offer) => {
    try {
      // Get microphone access
      localStream.current = await navigator.mediaDevices.getUserMedia({ audio: true })
      
      // Initialize peer connection
      const pc = initializePeerConnection(conversationId)
      
      // Add local tracks
      localStream.current.getTracks().forEach(track => {
        pc.addTrack(track, localStream.current)
      })
      
      // Set remote description
      await pc.setRemoteDescription(new RTCSessionDescription(offer))
      
      // Create and send answer
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)
      
      sendMessage({
        type: 'call_answer',
        conversation_id: conversationId,
        answer: answer
      })
      
      setCallState('connected')
      setIncomingCall(null)
    } catch (err) {
      console.error('Error accepting call:', err)
      setCallState('idle')
    }
  }, [initializePeerConnection, sendMessage])

  const handleCallAnswer = useCallback(async (answer) => {
    try {
      await peerConnection.current.setRemoteDescription(new RTCSessionDescription(answer))
      setCallState('connected')
    } catch (err) {
      console.error('Error handling answer:', err)
    }
  }, [])

  const handleIceCandidate = useCallback(async (candidate) => {
    try {
      if (peerConnection.current) {
        await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate))
      }
    } catch (err) {
      console.error('Error adding ICE candidate:', err)
    }
  }, [])

  const endCall = useCallback((conversationId = null) => {
    // Stop local stream
    if (localStream.current) {
      localStream.current.getTracks().forEach(track => track.stop())
      localStream.current = null
    }
    
    // Close peer connection
    if (peerConnection.current) {
      peerConnection.current.close()
      peerConnection.current = null
    }
    
    // Notify other user
    if (conversationId) {
      sendMessage({
        type: 'call_end',
        conversation_id: conversationId
      })
    }
    
    setCallState('idle')
    setIncomingCall(null)
  }, [sendMessage])

  const rejectCall = useCallback((conversationId) => {
    sendMessage({
      type: 'call_end',
      conversation_id: conversationId
    })
    setCallState('idle')
    setIncomingCall(null)
  }, [sendMessage])

  return {
    callState,
    incomingCall,
    remoteAudio,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    handleCallOffer,
    handleCallAnswer,
    handleIceCandidate
  }
}