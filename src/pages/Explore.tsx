import { useState } from 'react';
import { NavigationBar } from '@/components/NavigationBar';
import { PostCard } from '@/components/PostCard';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';

const Explore = () => {
  const { data: trendingPosts, isLoading: loadingPosts } = useQuery({
    queryKey: ['explore-trending'],
    queryFn: async () => {
      const res = await apiClient.getTrendingPosts(20);
      return res.posts;
    },
  });

  const { data: trendingHashtags, isLoading: loadingHashtags } = useQuery({
    queryKey: ['trending-hashtags'],
    queryFn: async () => {
      const res = await apiClient.getTrendingHashtags(15);
      return res.hashtags;
    },
  });

  return (
    <div className="min-h-screen bg-muted/30">
      <NavigationBar />
      
      <main className="max-w-6xl mx-auto pt-20 pb-6 px-4">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Explore</h1>
          <p className="text-muted-foreground">Discover trending posts and popular hashtags</p>
        </div>

        <Tabs defaultValue="trending" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="trending">Trending Posts</TabsTrigger>
            <TabsTrigger value="hashtags">Popular Hashtags</TabsTrigger>
          </TabsList>

          <TabsContent value="trending">
            {loadingPosts ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Loading trending posts...</p>
              </div>
            ) : trendingPosts && trendingPosts.length > 0 ? (
              <div className="space-y-4">
                {trendingPosts.map((post: any) => (
                  <PostCard key={post.id} post={post} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No trending posts yet</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="hashtags">
            {loadingHashtags ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Loading hashtags...</p>
              </div>
            ) : trendingHashtags && trendingHashtags.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {trendingHashtags.map((hashtag: any) => (
                  <Card
                    key={hashtag.id}
                    className="p-4 cursor-pointer hover:bg-accent transition-colors"
                    onClick={() => window.location.href = `/hashtag/${hashtag.name}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <TrendingUp className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold text-lg">#{hashtag.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {hashtag.post_count} {hashtag.post_count === 1 ? 'post' : 'posts'}
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No hashtags yet</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Explore;
