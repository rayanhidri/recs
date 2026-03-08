import { useRef, useState, useCallback, useEffect } from 'react'

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
}

export default function useWebRTC(sendMessage, remoteAudioRef) {
  const peerConnection = useRef(null)
  const localStream = useRef(null)
  
  const [callState, setCallState] = useState('idle')
  const [incomingCall, setIncomingCall] = useState(null)
  const [callDuration, setCallDuration] = useState(0)
  const callTimer = useRef(null)

  // Start call timer when connected
  useEffect(() => {
    if (callState === 'connected') {
      setCallDuration(0)
      callTimer.current = setInterval(() => {
        setCallDuration(prev => prev + 1)
      }, 1000)
    } else {
      if (callTimer.current) {
        clearInterval(callTimer.current)
        callTimer.current = null
      }
      setCallDuration(0)
    }
    
    return () => {
      if (callTimer.current) {
        clearInterval(callTimer.current)
      }
    }
  }, [callState])

  const initializePeerConnection = useCallback((conversationId) => {
    peerConnection.current = new RTCPeerConnection(ICE_SERVERS)
    
    peerConnection.current.onicecandidate = (event) => {
      if (event.candidate) {
        sendMessage({
          type: 'ice_candidate',
          conversation_id: conversationId,
          candidate: event.candidate
        })
      }
    }
    
    peerConnection.current.ontrack = (event) => {
      console.log('Received remote track:', event.streams[0])
      if (remoteAudioRef && remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = event.streams[0]
        remoteAudioRef.current.play().catch(err => console.log('Audio play error:', err))
      }
    }
    
    peerConnection.current.onconnectionstatechange = () => {
      console.log('Connection state:', peerConnection.current.connectionState)
      if (peerConnection.current.connectionState === 'connected') {
        setCallState('connected')
      } else if (peerConnection.current.connectionState === 'disconnected' || 
                 peerConnection.current.connectionState === 'failed') {
        endCall()
      }
    }
    
    return peerConnection.current
  }, [sendMessage, remoteAudioRef])

  const startCall = useCallback(async (conversationId) => {
    try {
      setCallState('calling')
      
      localStream.current = await navigator.mediaDevices.getUserMedia({ audio: true })
      console.log('Got local stream:', localStream.current)
      
      const pc = initializePeerConnection(conversationId)
      
      localStream.current.getTracks().forEach(track => {
        pc.addTrack(track, localStream.current)
      })
      
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
      localStream.current = await navigator.mediaDevices.getUserMedia({ audio: true })
      console.log('Got local stream for answer:', localStream.current)
      
      const pc = initializePeerConnection(conversationId)
      
      localStream.current.getTracks().forEach(track => {
        pc.addTrack(track, localStream.current)
      })
      
      await pc.setRemoteDescription(new RTCSessionDescription(offer))
      
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
      if (peerConnection.current && peerConnection.current.remoteDescription) {
        await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate))
      }
    } catch (err) {
      console.error('Error adding ICE candidate:', err)
    }
  }, [])

  const endCall = useCallback((conversationId = null) => {
    if (localStream.current) {
      localStream.current.getTracks().forEach(track => track.stop())
      localStream.current = null
    }
    
    if (peerConnection.current) {
      peerConnection.current.close()
      peerConnection.current = null
    }
    
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
    callDuration,
    incomingCall,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    handleCallOffer,
    handleCallAnswer,
    handleIceCandidate
  }
}