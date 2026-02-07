'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { RoastReport } from '@/components/roast/RoastReport';
import { Flame, Share2, MessageCircle, X, Send, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

// Widgets

// Custom Hook - REPLACED WITH OFFICIAL SDK
import { useTambo, TamboProvider } from '@tambo-ai/react';
import { components } from '@/lib/tambo';
import { toast } from 'react-hot-toast';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

interface Message {
  role: 'user' | 'assistant';
  content: string;
  widgets?: Array<{ type: string; props: any }>;
}

export default function ReviewPage() {
  const params = useParams();

  return (
    <TamboProvider apiKey={process.env.NEXT_PUBLIC_TAMBO_API_KEY!} components={components} environment="production">
      <ReviewContent id={params.id as string} />
    </TamboProvider>
  );
}

function ReviewContent({ id }: { id: string }) {
  const [review, setReview] = useState<any>(null);
  const [issues, setIssues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Tambo Hook (Official SDK)
  // useTambo returns the composite context including thread methods
  const { sendThreadMessage, thread } = useTambo();

  // Chat State
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (!id) return;
    const fetchData = async () => {
      const { data, error } = await supabase
        .from('code_reviews')
        .select('*, code_issues(*)')
        .eq('session_id', id)
        .single();

      if (error) {
        console.error(error);
        setError('Review not found.');
      } else {
        setReview(data);
        setIssues(data.code_issues || []);
      }
      setLoading(false);
    };

    fetchData();

    const channel = supabase
      .channel('realtime:review')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'code_reviews', filter: `session_id=eq.${id}` },
        (payload) => {
          setReview(payload.new);
          if (payload.new.status === 'complete') fetchData();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [thread?.messages, chatOpen]);

  // Initialize chat with context if empty
  useEffect(() => {
    if (review?.status === 'complete' && thread && thread.messages.length === 0) {
      const contextMessage = `SYSTEM_CONTEXT:
The user is reviewing the following code:
${review.code_snippet?.slice(0, 5000)}... (truncated)

Issues found by the roaster:
${issues.map((i: any) => `- ${i.title} (${i.severity}): ${i.roast}`).join('\n')}

You are "Code Critic", a witty and slightly sarcastic AI assistant. Help the user fix these issues using the available tools (FixSuggestion, CodeComparison, etc.).
If the user asks "How do I fix this?", pick the most critical issue and use the FixSuggestion widget.`;

      // Send invisible context message to prime the thread
      sendThreadMessage(contextMessage);
    }
  }, [review, thread]);

  const handleChatSend = async () => {
    if (!chatInput.trim() || isSending) return;

    const content = chatInput;
    setChatInput('');
    setIsSending(true);

    try {
      // Use the Official Tambo SDK to chat
      // sendThreadMessage returns a Promise<TamboThreadMessage>
      await sendThreadMessage(content);
    } catch (err) {
      console.error('Chat error:', err);
      // Ideally show error toast
    } finally {
      setIsSending(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 text-center">
        <Loader2 className="w-12 h-12 animate-spin text-purple-500 mb-4" />
        <h2 className="text-xl font-bold">Loading Review...</h2>
      </div>
    );
  }

  if (error || !review) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-500">{error || 'Review not found'}</div>
    );
  }

  if (review.status === 'analyzing') {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 text-center">
        <motion.div
          animate={{ scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
        >
          <Flame className="w-20 h-20 text-orange-500 mb-8 filter drop-shadow-[0_0_15px_rgba(255,100,0,0.5)]" />
        </motion.div>
        <h2 className="text-3xl font-black mb-4">Cooking Your Roast 🔥</h2>
        <div className="max-w-md mx-auto space-y-2 text-muted-foreground">
          <p>Analyzing Security Vulnerabilities...</p>
          <p>Checking Cyclomatic Complexity...</p>
          <p>Preparing Sarcastic Comments...</p>
        </div>
      </div>
    );
  }

  const scoreData = {
    overall: review.overall_score,
    grade: review.badge,
    gradeColor:
      review.overall_score > 80 ? 'text-green-500' : review.overall_score > 50 ? 'text-yellow-500' : 'text-red-500',
    security: review.security_score,
    performance: review.performance_score,
    maintainability: review.maintainability_score,
  };

  return (
    <div className="min-h-screen bg-background text-foreground relative">
      <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-background/80 backdrop-blur-md px-4 py-4 mb-8">
        <div className="container mx-auto flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl hover:opacity-80 transition-opacity">
            <Flame className="w-6 h-6 text-red-600" />
            Code Critic
          </Link>
          <div className="flex gap-2">
            <button
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                toast.success('Link copied to clipboard!');
              }}
              className="flex items-center gap-2 px-4 py-2 bg-muted rounded-full text-sm font-medium hover:bg-muted/80 transition-colors"
            >
              <Share2 className="w-4 h-4" /> Share
            </button>
          </div>
        </div>
      </header>

      {/* Main Report View */}
      <RoastReport score={scoreData} issues={issues} onReset={() => (window.location.href = '/')} />

      {/* Floating Chat Button */}
      <motion.button
        initial={{ scale: 0 }} // Start hidden
        animate={{ scale: 1 }} // Pop in
        whileHover={{ scale: 1.1 }}
        onClick={() => setChatOpen(!chatOpen)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full shadow-2xl flex items-center justify-center z-50 text-white"
      >
        {chatOpen ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
      </motion.button>

      {/* Chat Panel */}
      <AnimatePresence>
        {chatOpen && (
          <motion.div
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            className="fixed top-0 right-0 h-full w-full md:w-[450px] bg-slate-900 border-l border-slate-700 shadow-2xl z-40 flex flex-col"
          >
            <div className="p-4 border-b border-slate-700 bg-slate-800 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-white">Chat with Code Critic</h3>
                <p className="text-xs text-slate-400">Ask how to fix your mess</p>
              </div>
              <button onClick={() => setChatOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-900/50">
              {/* Render Messages from Tambo SDK Thread */}
              {thread?.messages
                ?.filter((msg: any) =>
                  typeof msg.content === 'string' ? !msg.content.startsWith('SYSTEM_CONTEXT:') : true,
                )
                .map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[85%] rounded-2xl p-3 ${
                        msg.role === 'user'
                          ? 'bg-purple-600 text-white rounded-br-none'
                          : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-bl-none'
                      }`}
                    >
                      <div className="whitespace-pre-wrap text-sm">
                        {typeof msg.content === 'string'
                          ? msg.content
                          : Array.isArray(msg.content)
                            ? msg.content.map((part: any, i: number) => {
                                if (part.type === 'text') return <span key={i}>{part.text}</span>;
                                return null;
                              })
                            : null}
                      </div>

                      {/* Render Widget if Tambo SDK decided to show one */}
                      {/* The SDK puts the rendered React element here! */}
                      {msg.renderedComponent && <div className="mt-3">{msg.renderedComponent}</div>}
                    </div>
                  </div>
                ))}

              {/* Loading Indicator */}
              {isSending && (
                <div className="flex justify-start">
                  <div className="bg-slate-800 rounded-2xl p-3 border border-slate-700 rounded-bl-none flex gap-1">
                    <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" />
                    <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce delay-75" />
                    <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce delay-150" />
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <div className="p-4 border-t border-slate-700 bg-slate-800">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleChatSend()}
                  placeholder="Ask a question..."
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <button
                  onClick={handleChatSend}
                  disabled={isSending || !chatInput.trim()}
                  className="p-2 bg-purple-600 rounded-xl hover:bg-purple-700 disabled:opacity-50 text-white transition-colors"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
