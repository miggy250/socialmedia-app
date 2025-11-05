import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { apiClient, handleApiError } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const StoriesBar = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [stories, setStories] = useState<any[]>([]);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedUserStories, setSelectedUserStories] = useState<any[]>([]);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [storyForm, setStoryForm] = useState({ imageUrl: '', caption: '' });
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadStories();
  }, []);

  const loadStories = async () => {
    try {
      const data = await apiClient.getStories();
      setStories(data.stories);
    } catch (error) {
      console.error('Error loading stories:', error);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const { imageUrl } = await apiClient.uploadImage(file);
      setStoryForm({ ...storyForm, imageUrl });
      toast({ title: 'Image uploaded successfully' });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: handleApiError(error),
      });
    } finally {
      setUploading(false);
    }
  };

  const handleCreateStory = async () => {
    if (!storyForm.imageUrl) {
      toast({ variant: 'destructive', title: 'Please upload an image' });
      return;
    }

    try {
      await apiClient.createStory(storyForm);
      toast({ title: 'Story created successfully' });
      setCreateDialogOpen(false);
      setStoryForm({ imageUrl: '', caption: '' });
      loadStories();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: handleApiError(error),
      });
    }
  };

  const handleViewStories = async (userStories: any) => {
    setSelectedUserStories(userStories.stories);
    setCurrentStoryIndex(0);
    setViewDialogOpen(true);
    
    // Mark first story as viewed
    if (userStories.stories[0] && userStories.stories[0].user_viewed === 0) {
      await apiClient.markStoryViewed(userStories.stories[0].id);
    }
  };

  const nextStory = async () => {
    if (currentStoryIndex < selectedUserStories.length - 1) {
      const newIndex = currentStoryIndex + 1;
      setCurrentStoryIndex(newIndex);
      
      // Mark as viewed
      if (selectedUserStories[newIndex] && selectedUserStories[newIndex].user_viewed === 0) {
        await apiClient.markStoryViewed(selectedUserStories[newIndex].id);
      }
    } else {
      setViewDialogOpen(false);
    }
  };

  const prevStory = () => {
    if (currentStoryIndex > 0) {
      setCurrentStoryIndex(currentStoryIndex - 1);
    }
  };

  const hasOwnStory = stories.some(s => s.user_id === user?.id);

  return (
    <>
      <div className="bg-card border border-border/50 rounded-lg p-4 mb-4 shadow-sm">
        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
          {/* Create Story / View Own Story */}
          {hasOwnStory ? (
            <div 
              onClick={() => {
                const ownStory = stories.find(s => s.user_id === user?.id);
                if (ownStory) handleViewStories(ownStory);
              }}
              className="flex flex-col items-center gap-2 min-w-[80px] cursor-pointer group"
            >
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-primary via-secondary to-accent rounded-full p-[3px] group-hover:scale-105 transition-transform">
                  <div className="bg-background rounded-full p-[2px]">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={user?.avatar_url} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {user?.email?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                </div>
              </div>
              <span className="text-xs text-center text-foreground/80 font-medium truncate w-full">
                Your Story
              </span>
            </div>
          ) : (
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <div className="flex flex-col items-center gap-2 min-w-[80px] cursor-pointer group">
                  <div className="relative">
                    <div className="bg-gradient-to-br from-primary via-secondary to-accent rounded-full p-[3px] group-hover:scale-105 transition-transform">
                      <div className="bg-background rounded-full p-[2px]">
                        <Avatar className="h-16 w-16">
                          <AvatarFallback className="bg-muted">
                            <Plus className="h-8 w-8 text-primary" />
                          </AvatarFallback>
                        </Avatar>
                      </div>
                    </div>
                  </div>
                  <span className="text-xs text-center text-foreground/80 font-medium truncate w-full">
                    Create Story
                  </span>
                </div>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Story</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="storyImage">Story Image</Label>
                    <Input
                      id="storyImage"
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={uploading}
                    />
                    {storyForm.imageUrl && (
                      <img src={storyForm.imageUrl} alt="Preview" className="mt-2 rounded-lg max-h-48 object-cover" />
                    )}
                  </div>
                  <div>
                    <Label htmlFor="caption">Caption (optional)</Label>
                    <Textarea
                      id="caption"
                      value={storyForm.caption}
                      onChange={(e) => setStoryForm({ ...storyForm, caption: e.target.value })}
                      placeholder="Add a caption..."
                      rows={3}
                    />
                  </div>
                  <Button onClick={handleCreateStory} disabled={uploading || !storyForm.imageUrl} className="w-full">
                    {uploading ? 'Uploading...' : 'Create Story'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}

          {/* Other Users' Stories */}
          {stories.filter(s => s.user_id !== user?.id).map((userStory) => (
            <div 
              key={userStory.user_id}
              onClick={() => handleViewStories(userStory)}
              className="flex flex-col items-center gap-2 min-w-[80px] cursor-pointer group"
            >
              <div className="relative">
                <div className={`absolute inset-0 rounded-full p-[3px] group-hover:scale-105 transition-transform ${
                  userStory.stories.some((s: any) => s.user_viewed === 0) 
                    ? 'bg-gradient-to-br from-primary via-secondary to-accent'
                    : 'bg-muted'
                }`}>
                  <div className="bg-background rounded-full p-[2px]">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={userStory.avatar_url} alt={userStory.username} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {userStory.username?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                </div>
              </div>
              <span className="text-xs text-center text-foreground/80 font-medium truncate w-full">
                {userStory.username}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* View Story Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-md p-0 overflow-hidden">
          {selectedUserStories[currentStoryIndex] && (
            <div className="relative">
              {/* Progress bars */}
              <div className="absolute top-0 left-0 right-0 flex gap-1 p-2 z-10">
                {selectedUserStories.map((_, index) => (
                  <div key={index} className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden">
                    <div 
                      className={`h-full bg-white transition-all ${
                        index === currentStoryIndex ? 'w-full' : index < currentStoryIndex ? 'w-full' : 'w-0'
                      }`}
                    />
                  </div>
                ))}
              </div>
              
              {/* Story content */}
              <img 
                src={selectedUserStories[currentStoryIndex].image_url} 
                alt="Story" 
                className="w-full max-h-[80vh] object-contain bg-black"
              />
              
              {selectedUserStories[currentStoryIndex].caption && (
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 to-transparent">
                  <p className="text-white">{selectedUserStories[currentStoryIndex].caption}</p>
                </div>
              )}

              {/* Navigation */}
              <div className="absolute inset-0 flex">
                <div className="flex-1 cursor-pointer" onClick={prevStory} />
                <div className="flex-1 cursor-pointer" onClick={nextStory} />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
