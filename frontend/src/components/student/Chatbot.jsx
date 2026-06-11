// src/components/student/Chatbot.jsx
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';

const AI_BASE_URL = import.meta.env.VITE_AI_SERVICE_URL || 'http://localhost:8000';

const SUGGESTED_QUESTIONS = [
  "What food is available today?",
  "Do you have any halal options?",
  "Any items expiring soon I should take?",
  "What protein sources are in stock?",
];

export default function Chatbot() {
  const { currentUser } = useAuth();
  const [messages, setMessages] = useState([
    {
      role: 'bot',
      text: "Hi! I'm the PutraPantry Assistant Ask me what's available, dietary options, or anything about today's stock!",
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function sendMessage(text) {
    const query = text ?? input.trim();
    if (!query || loading) return;

    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: query }]);
    setLoading(true);

    try {
      const res = await fetch(`${AI_BASE_URL}/ai/chatbot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          studentId: currentUser?.uid ?? null,
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      console.log('Response data:', data);
      setMessages(prev => [
        ...prev,
        { role: 'bot', text: data.reply || 'Sorry, I could not get a response.' },
      ]);
    } catch (err) {
      console.error('Chatbot fetch error:', err);
      setMessages(prev => [
        ...prev,
        {
          role: 'bot',
          text: "I'm having trouble connecting right now. Please try again shortly or check the Stock tab directly.",
          isError: true,
        },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <div className="card chatbot-container">
      <h2>PutraPantry Assistant</h2>

      {messages.length === 1 && (
        <div className="chat-suggestions">
          {SUGGESTED_QUESTIONS.map(q => (
            <button
              key={q}
              className="suggestion-chip"
              onClick={() => sendMessage(q)}
              disabled={loading}
            >
              {q}
            </button>
          ))}
        </div>
      )}

      <div className="chat-messages">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`chat-msg ${msg.role}${msg.isError ? ' error' : ''}`}
          >
            {msg.text}
          </div>
        ))}

        {loading && (
          <div className="chat-msg bot loading">
            PutraPantry Assistant is thinking
            <span className="typing-dots">
              <span>.</span><span>.</span><span>.</span>
            </span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <div className="chat-input-row">
        <input
          ref={inputRef}
          type="text"
          className="chat-input"
          placeholder="Ask about available food, dietary needs..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
        />
        <button
          className="chat-send-btn"
          onClick={() => sendMessage()}
          disabled={loading || !input.trim()}
        >
          {loading ? '...' : 'Send'}
        </button>
      </div>
    </div>
  );
}