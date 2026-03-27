import React, { useState, useRef, useEffect } from 'react';
import apiClient from './utils/apiClient'; // axios instance

function ChatPage() {
  const [messages, setMessages] = useState([
    { role: 'bot', text: 'Xin chào! Bạn muốn hỏi kết quả đề ngày nào?' }
  ]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);

  // Scroll xuống cuối khi có tin nhắn mới
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = { role: 'user', text: input };
    setMessages(prev => [...prev, userMessage]);

    try {
      const res = await apiClient.post('/chat', { message: input });
      const botReply = res.data.reply || `Đề ngày ${res.data.date} là ${res.data.de}`;
      setMessages(prev => [...prev, { role: 'bot', text: botReply }]);
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Lỗi hệ thống. Vui lòng thử lại.';
      setMessages(prev => [...prev, { role: 'bot', text: errorMsg }]);
    }

    setInput('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto bg-white">
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`max-w-[80%] px-4 py-2 rounded-lg text-sm ${
              msg.role === 'user'
                ? 'ml-auto bg-blue-500 text-white'
                : 'mr-auto bg-gray-200 text-gray-800'
            }`}
          >
            {msg.text}
          </div>
        ))}
        <div ref={messagesEndRef}></div>
      </div>

      <div className="p-4 border-t flex gap-2">
        <input
          type="text"
          placeholder="Nhập câu hỏi..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 border rounded px-3 py-2 text-sm focus:outline-none"
        />
        <button
          onClick={sendMessage}
          className="bg-blue-500 text-white px-4 py-2 rounded text-sm"
        >
          Gửi
        </button>
      </div>
    </div>
  );
}

export default ChatPage;