import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

const StartChatButton = ({ userId, username }) => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const currentUserId = parseInt(localStorage.getItem('user_id'));

  // Don't show button on own profile
  if (userId === currentUserId) {
    return null;
  }

  const handleStartChat = async () => {
    setLoading(true);
    try {
        const response = await api.post(`/chat/conversations/${userId}`);
      navigate('/chat', { state: { conversationId: response.data.id } });
    } catch (error) {
      console.error('Error starting chat:', error);
      alert('failed to start chat. please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button 
      className="start-chat-btn" 
      onClick={handleStartChat}
      disabled={loading}
    >
      {loading ? '...' : 'message'}
    </button>
  );
};

export default StartChatButton;