import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient, handleApiError } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';

interface CommentsDialogProps {
  postId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CommentsDialog = ({ postId, open, onOpenChange }: CommentsDialogProps) => {
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: comments } = useQuery({
    queryKey: ['comments', postId],
    queryFn: async () => {
      const response = await apiClient.getComments(postId);
      return response.comments;
    },
    enabled: open,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim() || !user) return;

    setLoading(true);
    try {
      await apiClient.addComment(postId, comment);

      setComment('');
      queryClient.invalidateQueries({ queryKey: ['comments', postId] });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: handleApiError(error),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Comments</DialogTitle>
        </DialogHeader>

        <div className="max-h-[400px] overflow-y-auto space-y-4 mb-4">
          {comments?.map((comment: any) => (
            <div key={comment.id} className="flex gap-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={comment.avatar_url} />
                <AvatarFallback className="bg-primary/10 text-primary text-xs">
                  {comment.username?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1">
                <div className="bg-muted rounded-lg p-3">
                  <p className="font-semibold text-sm">{comment.full_name || comment.username}</p>
                  <p className="text-sm">{comment.content}</p>
                </div>
                <p className="text-xs text-muted-foreground mt-1 ml-3">
                  {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                </p>
              </div>
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex gap-2 border-t pt-4">
          <Avatar className="h-8 w-8">
            <AvatarImage src="" />
            <AvatarFallback className="bg-primary/10 text-primary text-xs">
              {user?.email?.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <Input
            placeholder="Write a comment..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            disabled={loading}
          />

          <Button type="submit" size="icon" disabled={loading || !comment.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
