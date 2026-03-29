import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { createMinisterChat } from '../services/geminiService';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Bot, User, ArrowLeft, Send, Loader2 } from 'lucide-react';

export function MinisterChat() {
  const { ministryId } = useParams();
  const ministry = decodeURIComponent(ministryId || '');
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [messages, setMessages] = useState<{role: 'user'|'model', text: string}[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ministry) {
      chatRef.current = createMinisterChat(ministry);
      setMessages([{
        role: 'model',
        text: `Bună ziua! Sunt Ministrul AI pentru ${ministry}. Vă stau la dispoziție pentru întrebări, sesizări sau informații despre programele noastre în desfășurare. Cu ce vă pot ajuta astăzi?`
      }]);
    }
  }, [ministry]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !chatRef.current) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsLoading(true);

    try {
      const response = await chatRef.current.sendMessage({ message: userMsg });
      setMessages(prev => [...prev, { role: 'model', text: response.text }]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'model', text: 'Ne cerem scuze, a apărut o eroare de rețea. Vă rugăm să încercați din nou.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!ministry) {
    return <div className="p-8 text-center">Minister invalid.</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6 h-[calc(100dvh-12rem)] sm:h-auto flex flex-col">
      <div className="flex items-center gap-3 sm:gap-4 px-2 sm:px-0 shrink-0">
        <Button variant="outline" size="icon" onClick={() => navigate('/')} className="shrink-0 h-9 w-9 sm:h-10 sm:w-10">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="min-w-0">
          <h1 className="text-lg sm:text-2xl font-bold text-slate-900 flex items-center gap-2 truncate">
            <Bot className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 shrink-0" />
            <span className="truncate">Discuție cu Ministrul AI</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 truncate">{ministry}</p>
        </div>
      </div>

      <Card className="flex-1 sm:h-[600px] flex flex-col border-slate-200 shadow-sm overflow-hidden mx-2 sm:mx-0">
        <CardContent className="flex-1 p-0 flex flex-col overflow-hidden relative">
          <div 
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4 sm:space-y-6 bg-slate-50"
          >
            {messages.map((msg, idx) => (
              <div 
                key={idx} 
                className={`flex gap-2 sm:gap-3 max-w-[90%] sm:max-w-[85%] ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}
              >
                <div className={`h-6 w-6 sm:h-8 sm:w-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-slate-200' : 'bg-blue-600 text-white'}`}>
                  {msg.role === 'user' ? <User className="h-3 w-3 sm:h-4 sm:w-4 text-slate-600" /> : <Bot className="h-3 w-3 sm:h-4 sm:w-4" />}
                </div>
                <div 
                  className={`rounded-2xl px-3 py-2 sm:px-4 sm:py-3 text-xs sm:text-sm ${
                    msg.role === 'user' 
                      ? 'bg-blue-600 text-white rounded-tr-none' 
                      : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none shadow-sm'
                  }`}
                >
                  <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-2 sm:gap-3 max-w-[90%] sm:max-w-[85%]">
                <div className="h-6 w-6 sm:h-8 sm:w-8 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0">
                  <Bot className="h-3 w-3 sm:h-4 sm:w-4" />
                </div>
                <div className="rounded-2xl px-3 py-2 sm:px-4 sm:py-3 bg-white border border-slate-200 text-slate-800 rounded-tl-none shadow-sm flex items-center gap-2">
                  <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin text-blue-600 shrink-0" />
                  <span className="text-xs sm:text-sm text-slate-500">Ministrul formulează un răspuns...</span>
                </div>
              </div>
            )}
          </div>
          
          <div className="p-3 sm:p-4 bg-white border-t border-slate-200 shrink-0">
            <form onSubmit={handleSend} className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Scrieți mesajul aici..."
                className="flex-1 bg-slate-50 border-slate-200 focus:bg-white text-sm h-10 sm:h-11"
                disabled={isLoading}
              />
              <Button type="submit" disabled={!input.trim() || isLoading} className="bg-blue-600 hover:bg-blue-700 h-10 w-10 sm:h-11 sm:w-11 shrink-0 p-0 flex items-center justify-center">
                <Send className="h-4 w-4" />
              </Button>
            </form>
            <p className="text-[10px] sm:text-xs text-center text-slate-400 mt-2 leading-tight">
              Acesta este un asistent AI. Răspunsurile sunt generate automat și nu reprezintă un act administrativ oficial.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
