import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { format } from 'date-fns';
import { ro } from 'date-fns/locale';
import { MessageSquare, Send } from 'lucide-react';

interface Comment {
  id: string;
  requestId: string;
  userId: string;
  userName: string;
  text: string;
  createdAt: string;
}

export function CommentsSection({ requestId }: { requestId: string }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user, profile } = useAuth();

  useEffect(() => {
    const q = query(
      collection(db, 'comments'),
      where('requestId', '==', requestId),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedComments = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Comment[];
      setComments(fetchedComments);
    }, (error) => {
      console.error('Error fetching comments:', error);
    });

    return () => unsubscribe();
  }, [requestId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile || !newComment.trim()) return;

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'comments'), {
        requestId,
        userId: user.uid,
        userName: profile.name || user.displayName || 'Cetățean',
        text: newComment.trim(),
        createdAt: new Date().toISOString()
      });
      setNewComment('');
    } catch (error) {
      console.error('Error adding comment:', error);
      alert('A apărut o eroare la adăugarea comentariului.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mt-4 sm:mt-6 border-t border-slate-200 pt-4 sm:pt-6">
      <h4 className="flex items-center gap-2 text-base sm:text-lg font-semibold text-slate-900 mb-3 sm:mb-4">
        <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
        Discuții și Comentarii ({comments.length})
      </h4>

      <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-6">
        {comments.length === 0 ? (
          <p className="text-xs sm:text-sm text-slate-500 italic">Nu există comentarii încă. Fii primul care comentează!</p>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="bg-slate-50 rounded-lg p-3 sm:p-4 border border-slate-100">
              <div className="flex justify-between items-start mb-1.5 sm:mb-2 gap-2">
                <span className="font-medium text-xs sm:text-sm text-slate-900 truncate">{comment.userName}</span>
                <span className="text-[10px] sm:text-xs text-slate-500 shrink-0">
                  {format(new Date(comment.createdAt), 'dd MMM yyyy, HH:mm', { locale: ro })}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-700 whitespace-pre-wrap">{comment.text}</p>
            </div>
          ))
        )}
      </div>

      {user ? (
        <form onSubmit={handleSubmit} className="space-y-2 sm:space-y-3">
          <Textarea
            placeholder="Adaugă un comentariu la această decizie..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="min-h-[80px] sm:min-h-[100px] resize-y text-sm"
            maxLength={1000}
          />
          <div className="flex justify-end">
            <Button 
              type="submit" 
              disabled={!newComment.trim() || isSubmitting}
              className="gap-2 bg-blue-600 hover:bg-blue-700 w-full sm:w-auto h-10 sm:h-11"
            >
              <Send className="h-4 w-4" />
              {isSubmitting ? 'Se trimite...' : 'Trimite Comentariu'}
            </Button>
          </div>
        </form>
      ) : (
        <div className="bg-blue-50 rounded-lg p-3 sm:p-4 text-center border border-blue-100">
          <p className="text-xs sm:text-sm text-blue-800">
            Trebuie să fii autentificat pentru a putea comenta.
          </p>
        </div>
      )}
    </div>
  );
}
