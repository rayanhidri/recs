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
    }
  ]
}

export default function useWebRTC(sendMessage, remoteAudioRef) {
  const peerConnection = useRef(null)
  const localStream = useRef(null)
  const pendingCandidates = useRef([])
  const isInCall = useRef(false)
  
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
    if (peerConnection.current) {
      peerConnection.current.close()
    }
    
    peerConnection.current = new RTCPeerConnection(ICE_SERVERS)
    window.debugPC = peerConnection.current
    
    console.log('Created new RTCPeerConnection')
    
    peerConnection.current.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('Generated ICE candidate:', event.candidate.type, event.candidate.protocol)
        sendMessage({
          type: 'ice_candidate',
          conversation_id: conversationId,
          candidate: event.candidate.toJSON()
        })
      } else {
        console.log('ICE gathering complete')
      }
    }
    
    peerConnection.current.ontrack = (event) => {
      console.log('>>> RECEIVED REMOTE TRACK <<<')
      
      if (remoteAudioRef && remoteAudioRef.current && event.streams[0]) {
        remoteAudioRef.current.srcObject = event.streams[0]
        remoteAudioRef.current.volume = 1.0
        remoteAudioRef.current.muted = false
        
        remoteAudioRef.current.play()
          .then(() => console.log('Audio playing successfully'))
          .catch(err => console.log('Audio play error:', err))
      }
      
      event.track.onunmute = () => {
        console.log('>>> TRACK UNMUTED <<<')
        if (remoteAudioRef && remoteAudioRef.current) {
          remoteAudioRef.current.play().catch(e => console.log('Play on unmute failed:', e))
        }
      }
    }
    
    peerConnection.current.onconnectionstatechange = () => {
      console.log('Connection state:', peerConnection.current?.connectionState)
      if (peerConnection.current?.connectionState === 'connected') {
        setCallState('connected')
      } else if (peerConnection.current?.connectionState === 'disconnected' || 
                 peerConnection.current?.connectionState === 'failed') {
        endCall()
      }
    }

    peerConnection.current.oniceconnectionstatechange = () => {
      console.log('ICE connection state:', peerConnection.current?.iceConnectionState)
    }
    
    return peerConnection.current
  }, [sendMessage, remoteAudioRef])

  const startCall = useCallback(async (conversationId) => {
    if (isInCall.current) {
      console.log('Already in a call, ignoring')
      return
    }
    
    try {
      isInCall.current = true
      setCallState('calling')
      pendingCandidates.current = []
      
      console.log('Starting call...')
      localStream.current = await navigator.mediaDevices.getUserMedia({ 
        audio: true
      })
      console.log('Got local stream')
      
      const pc = initializePeerConnection(conversationId)
      
      localStream.current.getTracks().forEach(track => {
        console.log('Adding local track to PC')
        pc.addTrack(track, localStream.current)
      })
      
      console.log('Creating offer...')
      const offer = await pc.createOffer()
      console.log('Setting local description...')
      await pc.setLocalDescription(offer)
      
      // Wait a bit for ICE candidates to be gathered
      await new Promise(resolve => setTimeout(resolve, 500))
      
      console.log('Sending offer via WebSocket')
      sendMessage({
        type: 'call_offer',
        conversation_id: conversationId,
        offer: {
          type: pc.localDescription.type,
          sdp: pc.localDescription.sdp
        }
      })
    } catch (err) {
      console.error('Error starting call:', err)
      isInCall.current = false
      setCallState('idle')
    }
  }, [initializePeerConnection, sendMessage])

  const handleCallOffer = useCallback((data) => {
    if (isInCall.current) {
      console.log('Already in a call, ignoring incoming offer')
      return
    }
    console.log('Received call offer')
    isInCall.current = true
    pendingCandidates.current = []
    setIncomingCall(data)
    setCallState('receiving')
  }, [])

  const acceptCall = useCallback(async (conversationId, offer) => {
    try {
      console.log('Accepting call...')
      
      localStream.current = await navigator.mediaDevices.getUserMedia({ 
        audio: true
      })
      console.log('Got local stream for answer')
      
      const pc = initializePeerConnection(conversationId)
      
      localStream.current.getTracks().forEach(track => {
        console.log('Adding local track to PC')
        pc.addTrack(track, localStream.current)
      })
      
      console.log('Setting remote description (offer)...')
      await pc.setRemoteDescription(new RTCSessionDescription(offer))
      console.log('Remote description set')
      
      // Process pending ICE candidates
      console.log(`Processing ${pendingCandidates.current.length} pending ICE candidates`)
      for (const candidate of pendingCandidates.current) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate))
          console.log('Added pending ICE candidate')
        } catch (err) {
          console.error('Error adding pending candidate:', err)
        }
      }
      pendingCandidates.current = []
      
      console.log('Creating answer...')
      const answer = await pc.createAnswer()
      console.log('Setting local description (answer)...')
      await pc.setLocalDescription(answer)
      
      // Wait a bit for ICE candidates
      await new Promise(resolve => setTimeout(resolve, 500))
      
      console.log('Sending answer via WebSocket')
      sendMessage({
        type: 'call_answer',
        conversation_id: conversationId,
        answer: {
          type: pc.localDescription.type,
          sdp: pc.localDescription.sdp
        }
      })
      
      setCallState('connected')
      setIncomingCall(null)
    } catch (err) {
      console.error('Error accepting call:', err)
      isInCall.current = false
      setCallState('idle')
    }
  }, [initializePeerConnection, sendMessage])

  const handleCallAnswer = useCallback(async (answer) => {
    try {
      console.log('Received call answer')
      if (!peerConnection.current) {
        console.error('No peer connection!')
        return
      }
      
      if (peerConnection.current.signalingState !== 'have-local-offer') {
        console.log('Ignoring answer - wrong state:', peerConnection.current.signalingState)
        return
      }
      
      console.log('Setting remote description (answer)...')
      await peerConnection.current.setRemoteDescription(new RTCSessionDescription(answer))
      console.log('Remote description set')
      
      // Process pending ICE candidates
      console.log(`Processing ${pendingCandidates.current.length} pending ICE candidates`)
      for (const candidate of pendingCandidates.current) {
        try {
          await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate))
          console.log('Added pending ICE candidate')
        } catch (err) {
          console.error('Error adding pending candidate:', err)
        }
      }
      pendingCandidates.current = []
      
      setCallState('connected')
    } catch (err) {
      console.error('Error handling answer:', err)
    }
  }, [])

  const handleIceCandidate = useCallback(async (candidate) => {
    console.log('Received ICE candidate from remote')
    
    if (!peerConnection.current) {
      console.log('No peer connection, queueing candidate')
      pendingCandidates.current.push(candidate)
      return
    }
    
    if (peerConnection.current.remoteDescription) {
      try {
        await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate))
        console.log('Added ICE candidate directly')
      } catch (err) {
        console.error('Error adding ICE candidate:', err)
      }
    } else {
      console.log('No remote description yet, queueing candidate')
      pendingCandidates.current.push(candidate)
    }
  }, [])

  const endCall = useCallback((conversationId = null) => {
    console.log('Ending call')
    isInCall.current = false
    
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
    isInCall.current = false
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