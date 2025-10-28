import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, MessageCircle, Share2, Bookmark } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { CommentsDialog } from "./CommentsDialog";
import { formatDistanceToNow } from "date-fns";

interface PostCardProps {
  post: any;
}

export const PostCard = ({ post }: PostCardProps) => {
  const [commentsOpen, setCommentsOpen] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isLiked, setIsLiked] = useState(
    post.likes?.some((like: any) => like.user_id === user?.id) || false
  );

  const handleLike = async () => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "You must be logged in to like posts",
      });
      return;
    }

    try {
      if (isLiked) {
        await supabase
          .from('likes')
          .delete()
          .eq('post_id', post.id)
          .eq('user_id', user.id);
      } else {
        await supabase
          .from('likes')
          .insert({
            post_id: post.id,
            user_id: user.id,
          });
      }

      setIsLiked(!isLiked);
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  return (
    <>
      <Card className="mb-4 overflow-hidden border-border/50 shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12 border-2 border-primary/20">
              <AvatarImage src={post.profiles?.avatar_url} alt={post.profiles?.full_name} />
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                {post.profiles?.username?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="font-semibold text-foreground">{post.profiles?.full_name || post.profiles?.username}</p>
              {post.profiles?.location && (
                <p className="text-sm text-muted-foreground">{post.profiles.location}</p>
              )}
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
              </p>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="pb-3 space-y-3">
          <p className="text-foreground leading-relaxed">{post.content}</p>
          {post.image_url && (
            <div className="rounded-lg overflow-hidden">
              <img 
                src={post.image_url} 
                alt="Post content" 
                className="w-full object-cover"
              />
            </div>
          )}
        </CardContent>
        
        <CardFooter className="pt-3 border-t border-border/50 flex flex-col gap-3">
          <div className="flex items-center justify-between w-full text-sm text-muted-foreground">
            <span>{post.likes_count || 0} likes</span>
            <span>{post.comments_count || 0} comments</span>
          </div>
          
          <div className="flex items-center justify-around w-full gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              className="flex-1 gap-2"
              onClick={handleLike}
            >
              <Heart className={`h-5 w-5 ${isLiked ? 'fill-destructive text-destructive' : ''}`} />
              <span>Like</span>
            </Button>
            
            <Button variant="ghost" size="sm" className="flex-1 gap-2" onClick={() => setCommentsOpen(true)}>
              <MessageCircle className="h-5 w-5" />
              <span>Comment</span>
            </Button>
            
            <Button variant="ghost" size="sm" className="flex-1 gap-2">
              <Share2 className="h-5 w-5" />
              <span>Share</span>
            </Button>
            
            <Button variant="ghost" size="icon">
              <Bookmark className="h-5 w-5" />
            </Button>
          </div>
        </CardFooter>
      </Card>

      <CommentsDialog postId={post.id} open={commentsOpen} onOpenChange={setCommentsOpen} />
    </>
  );
};
