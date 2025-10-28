import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, MessageCircle, Share2, Bookmark } from "lucide-react";
import { useState } from "react";

interface PostCardProps {
  author: {
    name: string;
    avatar: string;
    location?: string;
  };
  content: string;
  image?: string;
  likes: number;
  comments: number;
  timestamp: string;
}

export const PostCard = ({ author, content, image, likes, comments, timestamp }: PostCardProps) => {
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(likes);

  const handleLike = () => {
    setIsLiked(!isLiked);
    setLikeCount(isLiked ? likeCount - 1 : likeCount + 1);
  };

  return (
    <Card className="mb-4 overflow-hidden border-border/50 shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12 border-2 border-primary/20">
            <AvatarImage src={author.avatar} alt={author.name} />
            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
              {author.name.split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <p className="font-semibold text-foreground">{author.name}</p>
            {author.location && (
              <p className="text-sm text-muted-foreground">{author.location}</p>
            )}
            <p className="text-xs text-muted-foreground">{timestamp}</p>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pb-3 space-y-3">
        <p className="text-foreground leading-relaxed">{content}</p>
        {image && (
          <div className="rounded-lg overflow-hidden">
            <img 
              src={image} 
              alt="Post content" 
              className="w-full object-cover"
            />
          </div>
        )}
      </CardContent>
      
      <CardFooter className="pt-3 border-t border-border/50 flex flex-col gap-3">
        <div className="flex items-center justify-between w-full text-sm text-muted-foreground">
          <span>{likeCount} likes</span>
          <span>{comments} comments</span>
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
          
          <Button variant="ghost" size="sm" className="flex-1 gap-2">
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
  );
};
