import { useRef, useState, useCallback, useEffect } from 'react'

const ICE_SERVERS = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      {
        urls: 'turn:openrelay.metered.ca:80',
        username: 'openrelayproject',
        credential: 'openrelayproject'
      },
      {
        urls: 'turn:openrelay.metered.ca:443',
        username: 'openrelayproject',
        credential: 'openrelayproject'
      },
      {
        urls: 'turn:openrelay.metered.ca:443?transport=tcp',
        username: 'openrelayproject',
        credential: 'openrelayproject'
      }
    ]
  }

export default function useWebRTC(sendMessage, remoteAudioRef) {
  const peerConnection = useRef(null)
  const localStream = useRef(null)
  const pendingCandidates = useRef([])
  
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
    window.debugPC = peerConnection.current
    pendingCandidates.current = []
    
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
      console.log('Track readyState:', event.track.readyState)
      
      const remoteStream = event.streams[0]
      
      if (remoteAudioRef && remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = remoteStream
        remoteAudioRef.current.volume = 1.0
        remoteAudioRef.current.muted = false
        
        // Unmute the track if it's muted
        event.track.enabled = true
        
        // Wait a bit then try to play
        setTimeout(() => {
          remoteAudioRef.current.play()
            .then(() => console.log('Audio playing successfully'))
            .catch(err => {
              console.log('Audio play error:', err)
              // Add click listener as fallback
              const playOnClick = () => {
                remoteAudioRef.current.play()
                document.removeEventListener('click', playOnClick)
              }
              document.addEventListener('click', playOnClick)
            })
        }, 100)
      }
      
      // Monitor track unmute
      event.track.onunmute = () => {
        console.log('Track unmuted!')
        if (remoteAudioRef && remoteAudioRef.current) {
          remoteAudioRef.current.play().catch(e => console.log('Play on unmute failed:', e))
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

  const processPendingCandidates = useCallback(async () => {
    if (!peerConnection.current || !peerConnection.current.remoteDescription) return
    
    console.log(`Processing ${pendingCandidates.current.length} pending ICE candidates`)
    for (const candidate of pendingCandidates.current) {
      try {
        await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate))
        console.log('Added pending ICE candidate')
      } catch (err) {
        console.error('Error adding pending ICE candidate:', err)
      }
    }
    pendingCandidates.current = []
  }, [])

  const startCall = useCallback(async (conversationId) => {
    try {
      setCallState('calling')
      
      localStream.current = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      })
      console.log('Got local stream:', localStream.current)
      
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
      localStream.current = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      })
      console.log('Got local stream for answer:', localStream.current)
      
      const pc = initializePeerConnection(conversationId)
      
      localStream.current.getTracks().forEach(track => {
        console.log('Adding local track:', track.kind, track.enabled)
        pc.addTrack(track, localStream.current)
      })
      
      await pc.setRemoteDescription(new RTCSessionDescription(offer))
      console.log('Set remote description')
      
      // Process any pending ICE candidates
      await processPendingCandidates()
      
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
  }, [initializePeerConnection, sendMessage, processPendingCandidates])

  const handleCallAnswer = useCallback(async (answer) => {
    try {
      console.log('Received call answer')
      await peerConnection.current.setRemoteDescription(new RTCSessionDescription(answer))
      console.log('Set remote description from answer')
      
      // Process any pending ICE candidates
      await processPendingCandidates()
      
      setCallState('connected')
    } catch (err) {
      console.error('Error handling answer:', err)
    }
  }, [processPendingCandidates])

  const handleIceCandidate = useCallback(async (candidate) => {
    try {
      console.log('Received ICE candidate')
      if (peerConnection.current && peerConnection.current.remoteDescription) {
        await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate))
        console.log('Added ICE candidate')
      } else {
        console.log('Queueing ICE candidate')
        pendingCandidates.current.push(candidate)
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
    
    pendingCandidates.current = []
    
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