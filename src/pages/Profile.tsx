import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { apiClient, handleApiError } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { NavigationBar } from "@/components/NavigationBar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Grid, Settings, Bookmark, Heart, MessageCircle, MapPin, Calendar } from "lucide-react";
import { format } from "date-fns";

export default function Profile() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [profile, setProfile] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [savedPosts, setSavedPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  
  const [editForm, setEditForm] = useState({
    fullName: "",
    bio: "",
    location: "",
    avatarUrl: "",
  });

  const isOwnProfile = !userId || userId === user?.id;

  useEffect(() => {
    loadProfile();
    loadPosts();
    if (isOwnProfile) {
      loadSavedPosts();
    }
  }, [userId]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getProfile(userId);
      setProfile(data.profile);
      setIsFollowing(data.profile.is_following > 0);
      
      if (isOwnProfile) {
        setEditForm({
          fullName: data.profile.full_name || "",
          bio: data.profile.bio || "",
          location: data.profile.location || "",
          avatarUrl: data.profile.avatar_url || "",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: handleApiError(error),
      });
    } finally {
      setLoading(false);
    }
  };

  const loadPosts = async () => {
    try {
      const targetUserId = userId || user?.id;
      if (!targetUserId) return;
      
      const data = await apiClient.getUserPosts(targetUserId);
      setPosts(data.posts);
    } catch (error) {
      console.error("Error loading posts:", error);
    }
  };

  const loadSavedPosts = async () => {
    try {
      const data = await apiClient.getSavedPosts();
      setSavedPosts(data.posts);
    } catch (error) {
      console.error("Error loading saved posts:", error);
    }
  };

  const handleFollow = async () => {
    if (!profile) return;
    
    try {
      if (isFollowing) {
        await apiClient.unfollowUser(profile.id);
        setIsFollowing(false);
        toast({ title: "Unfollowed successfully" });
      } else {
        await apiClient.followUser(profile.id);
        setIsFollowing(true);
        toast({ title: "Following successfully" });
      }
      loadProfile(); // Reload to update counts
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: handleApiError(error),
      });
    }
  };

  const handleUpdateProfile = async () => {
    try {
      await apiClient.updateProfile(editForm);
      toast({ title: "Profile updated successfully" });
      setEditDialogOpen(false);
      loadProfile();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: handleApiError(error),
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <NavigationBar />
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background">
        <NavigationBar />
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <p className="text-muted-foreground">Profile not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <NavigationBar />
      
      <div className="container max-w-4xl mx-auto px-4 py-8">
        {/* Profile Header */}
        <div className="flex flex-col md:flex-row gap-8 mb-8">
          {/* Avatar */}
          <div className="flex justify-center md:justify-start">
            <Avatar className="h-32 w-32 md:h-40 md:w-40 border-4 border-primary/20">
              <AvatarImage src={profile.avatar_url} alt={profile.username} />
              <AvatarFallback className="bg-primary/10 text-primary text-3xl font-bold">
                {profile.username?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>

          {/* Profile Info */}
          <div className="flex-1 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <h1 className="text-2xl font-bold">{profile.username}</h1>
              
              {isOwnProfile ? (
                <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                      <Settings className="h-4 w-4" />
                      Edit Profile
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Edit Profile</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="fullName">Full Name</Label>
                        <Input
                          id="fullName"
                          value={editForm.fullName}
                          onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="bio">Bio</Label>
                        <Textarea
                          id="bio"
                          value={editForm.bio}
                          onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                          rows={3}
                        />
                      </div>
                      <div>
                        <Label htmlFor="location">Location</Label>
                        <Input
                          id="location"
                          value={editForm.location}
                          onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="avatarUrl">Avatar URL</Label>
                        <Input
                          id="avatarUrl"
                          value={editForm.avatarUrl}
                          onChange={(e) => setEditForm({ ...editForm, avatarUrl: e.target.value })}
                        />
                      </div>
                      <Button onClick={handleUpdateProfile} className="w-full">
                        Save Changes
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              ) : (
                <Button 
                  variant={isFollowing ? "outline" : "default"} 
                  size="sm"
                  onClick={handleFollow}
                >
                  {isFollowing ? "Following" : "Follow"}
                </Button>
              )}
            </div>

            {/* Stats */}
            <div className="flex gap-8">
              <div className="text-center">
                <p className="font-bold text-lg">{posts.length}</p>
                <p className="text-sm text-muted-foreground">posts</p>
              </div>
              <div className="text-center">
                <p className="font-bold text-lg">{profile.followers_count || 0}</p>
                <p className="text-sm text-muted-foreground">followers</p>
              </div>
              <div className="text-center">
                <p className="font-bold text-lg">{profile.following_count || 0}</p>
                <p className="text-sm text-muted-foreground">following</p>
              </div>
            </div>

            {/* Bio */}
            <div>
              {profile.full_name && (
                <p className="font-semibold">{profile.full_name}</p>
              )}
              {profile.bio && (
                <p className="text-sm text-foreground mt-1">{profile.bio}</p>
              )}
              {profile.location && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground mt-2">
                  <MapPin className="h-4 w-4" />
                  <span>{profile.location}</span>
                </div>
              )}
              <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                <Calendar className="h-4 w-4" />
                <span>Joined {format(new Date(profile.created_at), 'MMMM yyyy')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="posts" className="w-full">
          <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent">
            <TabsTrigger 
              value="posts" 
              className="gap-2 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
            >
              <Grid className="h-4 w-4" />
              Posts
            </TabsTrigger>
            {isOwnProfile && (
              <TabsTrigger 
                value="saved" 
                className="gap-2 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
              >
                <Bookmark className="h-4 w-4" />
                Saved
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="posts" className="mt-4">
            {posts.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No posts yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-1 md:gap-4">
                {posts.map((post) => (
                  <Card 
                    key={post.id} 
                    className="aspect-square overflow-hidden cursor-pointer group relative border-border/50"
                    onClick={() => navigate('/')}
                  >
                    {post.image_url ? (
                      <img 
                        src={post.image_url} 
                        alt="Post" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-muted flex items-center justify-center p-4">
                        <p className="text-sm text-foreground line-clamp-6">{post.content}</p>
                      </div>
                    )}
                    
                    {/* Overlay on hover */}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-6 text-white">
                      <div className="flex items-center gap-2">
                        <Heart className="h-5 w-5 fill-white" />
                        <span className="font-semibold">{post.likes_count || 0}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MessageCircle className="h-5 w-5 fill-white" />
                        <span className="font-semibold">{post.comments_count || 0}</span>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {isOwnProfile && (
            <TabsContent value="saved" className="mt-4">
              {savedPosts.length === 0 ? (
                <div className="text-center py-12">
                  <Bookmark className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No saved posts yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-1 md:gap-4">
                  {savedPosts.map((post) => (
                    <Card 
                      key={post.id} 
                      className="aspect-square overflow-hidden cursor-pointer group relative border-border/50"
                      onClick={() => navigate('/')}
                    >
                      {post.image_url ? (
                        <img 
                          src={post.image_url} 
                          alt="Post" 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-muted flex items-center justify-center p-4">
                          <p className="text-sm text-foreground line-clamp-6">{post.content}</p>
                        </div>
                      )}
                      
                      {/* Overlay on hover */}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-6 text-white">
                        <div className="flex items-center gap-2">
                          <Heart className="h-5 w-5 fill-white" />
                          <span className="font-semibold">{post.likes_count || 0}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MessageCircle className="h-5 w-5 fill-white" />
                          <span className="font-semibold">{post.comments_count || 0}</span>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}
