import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { NavigationBar } from "@/components/NavigationBar";
import { PostCard } from "@/components/PostCard";
import { PostComposer } from "@/components/PostComposer";
import { UserSuggestions } from "@/components/UserSuggestions";
import { ProfileSummary } from "@/components/ProfileSummary";
import { useAuth } from "@/contexts/AuthContext";
import { apiClient } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  const { data: posts, isLoading } = useQuery({
    queryKey: ['posts'],
    queryFn: async () => {
      const response = await apiClient.getPosts();
      return response.posts;
    },
    enabled: !!user,
  });

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <div className="text-center">
          <div className="h-16 w-16 rounded-full bg-gradient-to-br from-primary via-secondary to-accent flex items-center justify-center mx-auto mb-4 animate-pulse">
            <span className="text-white font-bold text-2xl">R</span>
          </div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <NavigationBar />
      
      <div className="max-w-6xl mx-auto pt-20 pb-6 px-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <PostComposer />
            
            <div className="space-y-4">
              {isLoading ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Loading posts...</p>
                </div>
              ) : posts && posts.length > 0 ? (
                posts.map((post: any) => (
                  <PostCard key={post.id} post={post} />
                ))
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No posts yet. Create your first post!</p>
                </div>
              )}
            </div>
          </div>

          <div className="hidden lg:block">
            <div className="sticky top-24">
              <ProfileSummary />
              <UserSuggestions />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
