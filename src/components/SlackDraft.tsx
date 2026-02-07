'use client';

import { useTambo } from '@tambo-ai/react';
import { Check, Copy, Hash, MessageSquare, Send, User, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'react-hot-toast';

const CHANNELS = [
  { id: '#new-channel', label: 'new-channel', color: 'bg-emerald-500/10 text-emerald-500' },
  { id: '#all-data-guard', label: 'all-data-guard', color: 'bg-indigo-500/10 text-indigo-500' },
  { id: '#social', label: 'social', color: 'bg-pink-500/10 text-pink-500' },
];

export function SlackDraft({
  channel: initialChannel = '#new-channel',
  draftText = '🚨 *INCIDENT DECLARED*\n\n*Service:* payment-gateway\n*Severity:* SEV-1\n*Status:* Investigating\n\n_Team is looking into 500 errors on checkout._',
}: {
  channel?: string;
  draftText?: string;
}) {
  const { sendThreadMessage } = useTambo();
  const [text, setText] = useState(draftText);
  const [copied, setCopied] = useState(false);
  const [sent, setSent] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState(initialChannel);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSend = async () => {
    setSent(true);

    // Call Server Action
    const { success, simulated, error } = await import('@/app/actions').then((mod) =>
      mod.sendSlackNotification(text, selectedChannel),
    );

    if (success) {
      sendThreadMessage(`✅ Posted to Slack ${selectedChannel}`);
      toast.custom(
        (t) => (
          <div
            className={`${
              t.visible ? 'animate-enter' : 'animate-leave'
            } max-w-md w-full bg-white dark:bg-[#1E1E1E] shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}
          >
            <div className="flex-1 w-0 p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0 pt-0.5">
                  <img
                    className="h-10 w-10 rounded-full"
                    src="https://upload.wikimedia.org/wikipedia/commons/d/d5/Slack_icon_2019.svg"
                    alt=""
                  />
                </div>
                <div className="ml-3 flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    Message Sent {simulated ? '(Simulated)' : ''}
                  </p>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Posted to <span className="font-bold text-[#4A154B]">{selectedChannel}</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        ),
        { duration: 3000 },
      );
      setSent(false);
    } else {
      toast.error(`Failed to send: ${error}`);
      setSent(false);
    }
  };

  return (
    <div className="w-full bg-card text-card-foreground border border-border rounded-xl shadow-sm overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="bg-[#4A154B] text-white px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 relative">
          <MessageSquare className="w-4 h-4 text-white/80" />
          <div className="relative">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-1 font-bold text-sm hover:bg-white/10 px-2 py-1 rounded transition-colors"
            >
              Draft for {selectedChannel}
              <ChevronDown className="w-3 h-3 opacity-70" />
            </button>

            {isDropdownOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setIsDropdownOpen(false)} />
                <div className="absolute top-full left-0 mt-1 w-48 bg-white dark:bg-[#2C2C2C] rounded-lg shadow-xl border border-neutral-200 dark:border-neutral-700 py-1 z-20 text-neutral-900 dark:text-neutral-100">
                  {CHANNELS.map((ch) => (
                    <button
                      key={ch.id}
                      onClick={() => {
                        setSelectedChannel(ch.id);
                        setIsDropdownOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center gap-2"
                    >
                      <Hash className="w-3 h-3 opacity-50" />
                      {ch.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 text-xs text-white/60 bg-white/10 px-2 py-0.5 rounded">
          <Hash className="w-3 h-3" />
          <span>{selectedChannel.replace('#', '')}</span>
        </div>
      </div>

      {/* Body */}
      <div className="p-6 flex-1 flex flex-col">
        {/* Mock Slack Message Look */}
        <div className="flex gap-3 mb-4 flex-1">
          <div className="w-9 h-9 rounded bg-emerald-600 flex items-center justify-center shrink-0">
            <User className="w-5 h-5 text-white" />
          </div>
          <div className="w-full flex flex-col">
            <div className="flex items-baseline gap-2 mb-1">
              <span className="font-bold text-neutral-900 dark:text-neutral-100 text-sm">Tambo Bot</span>
              <span className="text-[10px] uppercase font-bold text-neutral-500 bg-neutral-200 dark:bg-neutral-800 px-1 py-0.5 rounded-sm">
                APP
              </span>
              <span className="text-xs text-neutral-400 hover:underline cursor-pointer">12:42 PM</span>
            </div>

            <div className="relative flex-1">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="w-full h-full min-h-[120px] p-3 text-sm bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800 rounded-lg focus:ring-2 focus:ring-[#4A154B]/20 focus:border-[#4A154B]/50 transition-all font-sans resize-none text-neutral-800 dark:text-neutral-200 leading-relaxed"
                style={{
                  fontFamily:
                    "Slack-Lato, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
                }}
              />
              <div className="absolute bottom-3 right-3 text-[10px] text-neutral-400 font-mono bg-white/50 dark:bg-black/50 px-1.5 rounded pointer-events-none">
                {text.length} chars
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end border-t border-border pt-4 shrink-0">
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-white/5 rounded-lg transition-colors border border-transparent hover:border-border"
          >
            {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copied' : 'Copy Text'}
          </button>

          <button
            onClick={handleSend}
            disabled={sent}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg transition-all shadow-sm ${
              sent
                ? 'bg-green-600 hover:bg-green-700 cursor-default'
                : 'bg-[#007a5a] hover:bg-[#006C4F] active:scale-95'
            }`}
          >
            {sent ? <Check className="w-4 h-4" /> : <Send className="w-4 h-4" />}
            {sent ? 'Sent!' : `Send to ${selectedChannel}`}
          </button>
        </div>
      </div>
    </div>
  );
}
