import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Plus } from "lucide-react";

const stories = [
  { id: 1, name: "Your Story", avatar: "", isOwn: true },
  { id: 2, name: "Kigali Events", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=kigali" },
  { id: 3, name: "Rwanda Tourism", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=tourism" },
  { id: 4, name: "Tech Hub", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=tech" },
  { id: 5, name: "Artisans RW", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=artisan" },
  { id: 6, name: "Music Scene", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=music" },
];

export const StoriesBar = () => {
  return (
    <div className="bg-card border border-border/50 rounded-lg p-4 mb-4 shadow-sm">
      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
        {stories.map((story) => (
          <div key={story.id} className="flex flex-col items-center gap-2 min-w-[80px] cursor-pointer group">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-primary via-secondary to-accent rounded-full p-[3px] group-hover:scale-105 transition-transform">
                <div className="bg-background rounded-full p-[2px]">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={story.avatar} alt={story.name} />
                    <AvatarFallback className="bg-muted">
                      {story.isOwn ? (
                        <Plus className="h-8 w-8 text-primary" />
                      ) : (
                        story.name.slice(0, 2).toUpperCase()
                      )}
                    </AvatarFallback>
                  </Avatar>
                </div>
              </div>
            </div>
            <span className="text-xs text-center text-foreground/80 font-medium truncate w-full">
              {story.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
