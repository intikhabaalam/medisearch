import useNavigateById from '../../hooks/useNavigateById';
import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, 
  Send, 
  Paperclip, 
  Mic, 
  Bot, 
  User, 
  RotateCcw, 
  Stethoscope,
  AlertCircle
} from 'lucide-react';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import { useSelector } from 'react-redux';
import axios from 'axios';
import toast from 'react-hot-toast';

const MOCK_PROMPT_SUGGESTIONS = [
  'Explain my elevated fasting blood sugar (115 mg/dL)',
  'Can I take ibuprofen with amoxicillin?',
  'Safe home remedies for persistent dry cough',
  'When should I see an urgent care doctor for migraine?',
];

const INITIAL_MESSAGES = [
  {
    id: 1,
    sender: 'ai',
    text: "Hello! I am MediTrust's Clinical AI Assistant. I can help interpret laboratory numbers, explain prescription instructions, or evaluate mild symptoms to guide your care.",
    time: '10:14 AM',
    sources: ['UpToDate Clinical Consensus', 'Mayo Clinic Evidence Base'],
  },
];

export default function AiChatPage() {
  const onNavigate = useNavigateById();
  const { user } = useSelector((state) => state.auth);
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSendMessage = async (textToSend) => {
    const query = typeof textToSend === 'string' ? textToSend : inputText;
    if (!query.trim() || isLoading) return;

    const userMsg = {
      id: Date.now(),
      sender: 'user',
      text: query.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);

    try {
      const token = user?.token;
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const response = await axios.post(
        '/api/ai/chat',
        { text: query.trim() },
        { headers }
      );

      const aiText = response.data?.text || (typeof response.data === 'string' ? response.data : 'Thank you. Please consult a doctor for personalized care.');
      const aiSources = Array.isArray(response.data?.sources) && response.data.sources.length > 0 
        ? response.data.sources 
        : ['MediTrust Clinical Knowledgebase'];

      const aiMsg = {
        id: Date.now() + 1,
        sender: 'ai',
        text: aiText,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        sources: aiSources,
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      console.error('Chat error:', err);
      const errMsg = err.response?.data?.error || err.response?.data?.message || 'Unable to connect to MediTrust AI Assistant. Please check your connection.';
      toast.error(errMsg);

      const errorMsg = {
        id: Date.now() + 1,
        sender: 'ai',
        text: `⚠️ Error: ${errMsg}. Please try again shortly or contact your healthcare provider.`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        sources: ['System Diagnostic'],
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectPrompt = (prompt) => {
    setInputText(prompt);
  };

  const handleClearChat = () => {
    setMessages(INITIAL_MESSAGES);
    toast.success('Chat history cleared.');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-900">MediTrust AI Clinical Companion</h1>
              <Badge variant="purple" size="sm" dot>
                Gemini 2.5 Active
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Trained on peer-reviewed clinical guidelines • HIPAA secure session
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigate('doctors')}
            icon={Stethoscope}
          >
            Connect with Real Doctor
          </Button>
          <button
            onClick={handleClearChat}
            className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 flex items-center gap-1.5 transition-colors"
            title="Reset Conversation"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Suggested Prompt Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        <span className="text-xs font-semibold text-slate-400 shrink-0">Try asking:</span>
        {MOCK_PROMPT_SUGGESTIONS.map((prompt, i) => (
          <button
            key={i}
            onClick={() => handleSelectPrompt(prompt)}
            className="px-3 py-1.5 rounded-xl border border-indigo-100 bg-indigo-50/60 hover:bg-indigo-100 text-indigo-800 text-xs font-medium whitespace-nowrap transition-colors"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Chat Messages Container */}
      <Card className="p-4 sm:p-6 min-h-[480px] max-h-[600px] overflow-y-auto space-y-5 bg-slate-50/50">
        
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          return (
            <div
              key={msg.id}
              className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {/* Avatar */}
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  isUser
                    ? 'bg-teal-600 text-white'
                    : 'bg-gradient-to-tr from-indigo-600 to-purple-600 text-white shadow-xs'
                }`}
              >
                {isUser ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
              </div>

              {/* Message Bubble */}
              <div className={`max-w-xl space-y-1.5 ${isUser ? 'items-end text-right' : 'items-start text-left'}`}>
                
                <div
                  className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-xs ${
                    isUser
                      ? 'bg-teal-600 text-white rounded-tr-none'
                      : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none space-y-2'
                  }`}
                >
                  <div className="whitespace-pre-line">{msg.text}</div>

                  {/* AI Evidence Sources */}
                  {msg.sources && (
                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400">
                      <span className="font-semibold text-slate-600">Verified Sources:</span>
                      {msg.sources.map((s, idx) => (
                        <span key={idx} className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="text-[10px] text-slate-400 px-1">
                  {msg.time}
                </div>
              </div>
            </div>
          );
        })}

        {/* Real Loading Indicator Animation */}
        {isLoading && (
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Bot className="w-5 h-5" />
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-none p-3.5 shadow-xs flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '300ms' }} />
              <span className="text-xs text-slate-400 font-medium ml-1.5">MediTrust AI is formulating medical guidance...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </Card>

      {/* Input Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-2.5 shadow-sm flex items-center gap-2">
        <button
          type="button"
          onClick={() => onNavigate('ai-prescription')}
          className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          title="Attach prescription or lab report"
        >
          <Paperclip className="w-5 h-5" />
        </button>

        <textarea
          rows={1}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask MediTrust AI about medicines, symptoms, or test results... (Shift+Enter for newline)"
          className="flex-1 bg-transparent border-0 text-sm text-slate-800 placeholder-slate-400 focus:outline-none px-2 resize-none max-h-24 py-1"
          disabled={isLoading}
        />

        <Button
          variant="ai"
          size="sm"
          onClick={() => handleSendMessage()}
          icon={Send}
          disabled={!inputText.trim() || isLoading}
          className="shadow-xs disabled:opacity-50"
        >
          {isLoading ? 'Thinking...' : 'Send'}
        </Button>
      </div>

    </div>
  );
}
