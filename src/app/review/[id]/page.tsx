'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { RoastReport } from '@/components/roast/RoastReport';
import { Flame, Share2, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

export default function ReviewPage() {
  const { id } = useParams(); // session_id
  const [review, setReview] = useState<any>(null);
  const [issues, setIssues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;

    // 1. Fetch Initial Data
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

    // 2. Realtime Subscription
    const channel = supabase
      .channel('realtime:review')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'code_reviews',
          filter: `session_id=eq.${id}`,
        },
        (payload) => {
          console.log('Update received:', payload);
          setReview(payload.new);
          if (payload.new.status === 'complete') {
            // Re-fetch issues if complete (since they are in a separate table)
            fetchData();
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 text-center">
        <motion.div
          animate={{ scale: [1, 1.2, 1], rotate: [0, 5, -5, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
        >
          <Flame className="w-16 h-16 text-red-500 mb-6" />
        </motion.div>
        <h2 className="text-2xl font-bold mb-2">Analyzing Code...</h2>
        <p className="text-muted-foreground animate-pulse">Consulting the digital spirits...</p>
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

  // COMPLETE STATE
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
    <div className="min-h-screen bg-background text-foreground py-8">
      <header className="container mx-auto px-4 mb-8 flex justify-between items-center">
        <Link href="/" className="flex items-center gap-2 font-bold text-xl hover:opacity-80 transition-opacity">
          <Flame className="w-6 h-6 text-red-600" />
          Code Critic
        </Link>
        <div className="flex gap-2">
          <button
            onClick={() => {
              navigator.clipboard.writeText(window.location.href);
              alert('Link copied to clipboard!');
            }}
            className="flex items-center gap-2 px-4 py-2 bg-muted rounded-full text-sm font-medium hover:bg-muted/80 transition-colors"
          >
            <Share2 className="w-4 h-4" /> Share
          </button>
        </div>
      </header>

      <RoastReport
        score={scoreData}
        issues={issues}
        onReset={() => (window.location.href = '/')} // Simple reset
      />
    </div>
  );
}
