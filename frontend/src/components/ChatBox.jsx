import { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { Send } from 'lucide-react';

const API_URL    = `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}/api`;
const SOCKET_URL =  import.meta.env.VITE_BACKEND_URL   || 'http://localhost:5000';

export default function ChatBox({ requestId, token, currentUserId }) {
  const [messages, setMessages] = useState([]);
  const [draft,    setDraft]    = useState('');
  const [sending,  setSending]  = useState(false);
  const bottomRef = useRef(null);

  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);
  const socket  = useMemo(() => io(SOCKET_URL, { transports: ['polling', 'websocket'], auth: { token } }), [token]);

  useEffect(() => {
    if (!requestId || !token) return;
    axios.get(`${API_URL}/chat/${requestId}/history`, { headers })
      .then(r => setMessages(r.data?.messages || []))
      .catch(() => {});

    socket.emit('join_room', { request_id: requestId });
    socket.on('receive_message', msg => {
      setMessages(prev => [...prev, msg]);
    });
    return () => { socket.emit('leave_room', { request_id: requestId }); socket.disconnect(); };
  }, [requestId, token]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function sendMessage() {
    if (!draft.trim() || sending) return;
    setSending(true);
    try {
      await axios.post(`${API_URL}/chat/send`, { request_id: requestId, content: draft.trim() }, { headers });
      setDraft('');
    } catch { /* ignore */ }
    finally { setSending(false); }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 480, background: '#FFFFFF', border: '1px solid #E4E2DA', borderRadius: 10, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
      {/* Header */}
      <div style={{ padding: '0.875rem 1.125rem', borderBottom: '1px solid #E4E2DA', display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
        <span className="live-dot" />
        <p style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#0D0C0A' }}>Live Chat</p>
        <span style={{ fontSize: '0.75rem', color: '#8A8878', marginLeft: 'auto' }}>{messages.length} message{messages.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.125rem', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
        {!messages.length && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <p style={{ fontSize: '0.8125rem', color: '#D0CEC4', fontStyle: 'italic' }}>No messages yet. Start the conversation.</p>
          </div>
        )}
        {messages.map((msg, i) => {
          const isOwn = msg.sender_id === currentUserId;
          return (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: isOwn ? 'flex-end' : 'flex-start' }}>
              <p style={{ fontSize: '0.6875rem', color: '#8A8878', marginBottom: '0.2rem', fontWeight: 600 }}>
                {isOwn ? 'You' : (msg.sender_name || 'Helper')}
              </p>
              <div style={{
                maxWidth: '78%', padding: '0.5625rem 0.875rem',
                background: isOwn ? '#0D0C0A' : '#F7F6F1',
                color: isOwn ? '#F0EFE9' : '#2E2D2A',
                borderRadius: isOwn ? '8px 8px 2px 8px' : '8px 8px 8px 2px',
                border: isOwn ? 'none' : '1px solid #E4E2DA',
                fontSize: '0.875rem', lineHeight: 1.55,
              }}>
                {msg.content}
              </div>
              <p style={{ fontSize: '0.6875rem', color: '#D0CEC4', marginTop: '0.2rem' }}>
                {msg.created_at ? new Date(msg.created_at).toLocaleTimeString() : ''}
              </p>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ padding: '0.75rem 1.125rem', borderTop: '1px solid #E4E2DA', display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
        <input
          value={draft} onChange={e => setDraft(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
          placeholder="Type a message…" className="input-field"
          style={{ flex: 1, fontSize: '0.875rem' }}
        />
        <button onClick={sendMessage} disabled={sending || !draft.trim()}
          style={{ width: 38, height: 38, borderRadius: 6, border: 'none', cursor: draft.trim() ? 'pointer' : 'not-allowed', background: draft.trim() ? '#D93B2B' : '#F7F6F1', color: draft.trim() ? '#fff' : '#D0CEC4', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s', flexShrink: 0 }}>
          <Send size={15} />
        </button>
      </div>
    </div>
  );
}