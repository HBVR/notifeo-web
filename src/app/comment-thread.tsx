'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type Comment = {
  id: string;
  content: string;
  created_at: string;
  author: {
    full_name: string | null;
    email: string | null;
  } | null;
  author_id: string;
};

export default function CommentThread({
  incidentId,
  currentUserId,
  isManager,
}: {
  incidentId: string;
  currentUserId?: string;
  isManager?: boolean;
}) {
  const supabase = createClient();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Charger les commentaires
  useEffect(() => {
    let active = true;

    async function load() {
      const { data } = await supabase
        .from('comments')
        .select('id, content, created_at, author_id, author:profiles!comments_author_id_fkey(full_name, email)')
        .eq('incident_id', incidentId)
        .order('created_at', { ascending: true });
      if (active && data) setComments(data as unknown as Comment[]);
    }

    load();

    // Realtime
    const channel = supabase
      .channel(`comments-${incidentId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'comments', filter: `incident_id=eq.${incidentId}` },
        () => load()
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [incidentId, supabase]);

  // Auto-scroll en bas quand nouveaux commentaires
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [comments]);

  async function send() {
    if (!newComment.trim() || !currentUserId) return;
    setSending(true);
    await supabase.from('comments').insert({
      incident_id: incidentId,
      author_id: currentUserId,
      content: newComment.trim(),
    });
    setNewComment('');
    setSending(false);
  }

  async function deleteComment(id: string) {
    setComments((prev) => prev.filter((c) => c.id !== id));
    await supabase.from('comments').delete().eq('id', id);
  }

  function formatTime(date: string) {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60000) return "À l'instant";
    if (diff < 3600000) return `Il y a ${Math.floor(diff / 60000)} min`;
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  }

  return (
    <div className="border-t border-gray-100 pt-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">
        Conversation {comments.length > 0 && `(${comments.length})`}
      </h3>

      {/* Liste des commentaires */}
      <div
        ref={scrollRef}
        className="max-h-60 overflow-y-auto space-y-3 mb-3"
      >
        {comments.length === 0 && (
          <p className="text-xs text-gray-400 text-center py-4">
            Aucun commentaire. Commencez la conversation.
          </p>
        )}
        {comments.map((c) => {
          const isOwn = c.author_id === currentUserId;
          const authorName = c.author?.full_name || c.author?.email || 'Inconnu';
          return (
            <div
              key={c.id}
              className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-3 py-2 ${
                  isOwn
                    ? 'bg-blue-600 text-white rounded-br-md'
                    : 'bg-gray-100 text-gray-900 rounded-bl-md'
                }`}
              >
                {!isOwn && (
                  <p className="text-[10px] font-semibold text-blue-600 mb-0.5">
                    {authorName}
                  </p>
                )}
                <p className="text-sm whitespace-pre-wrap break-words">{c.content}</p>
                <div className="flex items-center justify-between gap-2 mt-1">
                  <span className={`text-[10px] ${isOwn ? 'text-blue-200' : 'text-gray-400'}`}>
                    {formatTime(c.created_at)}
                  </span>
                  {(isOwn || isManager) && (
                    <button
                      onClick={() => deleteComment(c.id)}
                      className={`text-[10px] ${isOwn ? 'text-blue-200 hover:text-white' : 'text-gray-400 hover:text-red-500'}`}
                    >
                      suppr.
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder="Écrire un commentaire..."
          className="flex-1 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none"
        />
        <button
          onClick={send}
          disabled={sending || !newComment.trim()}
          className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {sending ? '...' : 'Envoyer'}
        </button>
      </div>
    </div>
  );
}
