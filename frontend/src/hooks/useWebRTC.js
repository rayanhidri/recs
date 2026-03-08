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
        console.log('Sending ICE candidate')
        sendMessage({
          type: 'ice_candidate',
          conversation_id: conversationId,
          candidate: event.candidate
        })
      }
    }
    
    peerConnection.current.ontrack = (event) => {
      console.log('Received remote track:', event.streams[0])
      console.log('Track kind:', event.track.kind)
      console.log('Track enabled:', event.track.enabled)
      console.log('Track muted:', event.track.muted)
      
      if (remoteAudioRef && remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = event.streams[0]
        remoteAudioRef.current.volume = 1.0
        remoteAudioRef.current.muted = false
        
        const playPromise = remoteAudioRef.current.play()
        if (playPromise !== undefined) {
          playPromise
            .then(() => console.log('Audio playing successfully'))
            .catch(err => {
              console.log('Audio play error:', err)
              document.addEventListener('click', () => {
                remoteAudioRef.current.play()
              }, { once: true })
            })
        }
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

    peerConnection.current.oniceconnectionstatechange = () => {
      console.log('ICE connection state:', peerConnection.current.iceConnectionState)
    }
    
    return peerConnection.current
  }, [sendMessage, remoteAudioRef])

  const startCall = useCallback(async (conversationId) => {
    try {
      setCallState('calling')
      
      localStream.current = await navigator.mediaDevices.getUserMedia({ audio: true })
      console.log('Got local stream:', localStream.current)
      console.log('Local tracks:', localStream.current.getTracks())
      
      const pc = initializePeerConnection(conversationId)
      
      localStream.current.getTracks().forEach(track => {
        console.log('Adding local track:', track.kind, track.enabled)
        pc.addTrack(track, localStream.current)
      })
      
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
      console.log('Sending offer')
      
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
    console.log('Received call offer')
    setIncomingCall(data)
    setCallState('receiving')
  }, [])

  const acceptCall = useCallback(async (conversationId, offer) => {
    try {
      console.log('Accepting call')
      localStream.current = await navigator.mediaDevices.getUserMedia({ audio: true })
      console.log('Got local stream for answer:', localStream.current)
      
      const pc = initializePeerConnection(conversationId)
      
      localStream.current.getTracks().forEach(track => {
        console.log('Adding local track:', track.kind, track.enabled)
        pc.addTrack(track, localStream.current)
      })
      
      await pc.setRemoteDescription(new RTCSessionDescription(offer))
      console.log('Set remote description')
      
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)
      console.log('Sending answer')
      
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
      console.log('Received call answer')
      await peerConnection.current.setRemoteDescription(new RTCSessionDescription(answer))
      console.log('Set remote description from answer')
      setCallState('connected')
    } catch (err) {
      console.error('Error handling answer:', err)
    }
  }, [])

  const handleIceCandidate = useCallback(async (candidate) => {
    try {
      console.log('Received ICE candidate')
      if (peerConnection.current && peerConnection.current.remoteDescription) {
        await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate))
        console.log('Added ICE candidate')
      } else {
        console.log('Skipping ICE candidate - no remote description yet')
      }
    } catch (err) {
      console.error('Error adding ICE candidate:', err)
    }
  }, [])

  const endCall = useCallback((conversationId = null) => {
    console.log('Ending call')
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