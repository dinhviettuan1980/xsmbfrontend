import React, { useState, useRef, useEffect } from 'react';
import apiClient from './utils/apiClient';

function BotMessage({ text }) {
  const lines = text.split('\n');
  return (
    <div className="space-y-0.5">
      {lines.map((line, i) => {
        if (line.startsWith('•')) {
          const [label, nums] = line.slice(1).split('→');
          return (
            <div key={i} className="flex items-baseline gap-1 text-sm">
              <span className="text-gray-700">{label?.trim()}</span>
              {nums && (
                <>
                  <span className="text-gray-400 mx-1">→</span>
                  <span className="font-bold text-red-600">{nums.trim()}</span>
                </>
              )}
            </div>
          );
        }
        return <p key={i} className="text-sm">{line}</p>;
      })}
    </div>
  );
}

function ChatPage() {
  const [messages, setMessages] = useState([
    { role: 'bot', text: 'Xin chào! Bạn có thể hỏi:\n• Kết quả đề theo ngày\n• Số theo giấc mơ (vd: "mơ thấy rắn", "nằm mơ thấy đám cưới")' }
  ]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = { role: 'user', text: input };
    setMessages(prev => [...prev, userMessage]);
    const currentInput = input;
    setInput('');

    try {
      const res = await apiClient.post('/chat', { message: currentInput });
      const botReply = res.data.reply || `Đề ngày ${res.data.date} là ${res.data.de}`;
      setMessages(prev => [...prev, { role: 'bot', text: botReply }]);
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Lỗi hệ thống. Vui lòng thử lại.';
      setMessages(prev => [...prev, { role: 'bot', text: errorMsg }]);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') sendMessage();
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-md mx-auto bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm ${
              msg.role === 'user'
                ? 'ml-auto bg-red-600 text-white rounded-br-sm'
                : 'mr-auto bg-gray-100 text-gray-800 rounded-bl-sm'
            }`}
          >
            {msg.role === 'bot' ? <BotMessage text={msg.text} /> : msg.text}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-3 border-t border-gray-200 flex gap-2 bg-white">
        <input
          type="text"
          placeholder="Nhập câu hỏi hoặc giấc mơ..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 border border-gray-200 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
        />
        <button
          onClick={sendMessage}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-full text-sm font-semibold transition-colors"
        >
          Gửi
        </button>
      </div>
    </div>
  );
}

export default ChatPage;
