import { useState } from 'react';
import { NavigationBar } from '@/components/NavigationBar';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Search as SearchIcon, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

const Search = () => {
  const [searchQuery, setSearchQuery] = useState('');

  const { data: users } = useQuery({
    queryKey: ['search-users', searchQuery],
    queryFn: async () => {
      if (!searchQuery.trim()) return [];

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .or(`username.ilike.%${searchQuery}%,full_name.ilike.%${searchQuery}%`)
        .limit(20);

      if (error) throw error;
      return data;
    },
    enabled: searchQuery.length > 0,
  });

  const { data: posts } = useQuery({
    queryKey: ['search-posts', searchQuery],
    queryFn: async () => {
      if (!searchQuery.trim()) return [];

      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          profiles:user_id (username, avatar_url, full_name)
        `)
        .ilike('content', `%${searchQuery}%`)
        .limit(20);

      if (error) throw error;
      return data;
    },
    enabled: searchQuery.length > 0,
  });

  const { data: trending } = useQuery({
    queryKey: ['trending-hashtags'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hashtags')
        .select('*')
        .order('posts_count', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="min-h-screen bg-muted/30">
      <NavigationBar />
      
      <main className="max-w-2xl mx-auto pt-20 pb-6 px-4">
        <div className="mb-6">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search Rwanda Connect..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {!searchQuery ? (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="h-5 w-5 text-primary" />
                <h3 className="font-bold text-lg">Trending Topics</h3>
              </div>
              
              <div className="space-y-3">
                {trending?.map((hashtag: any) => (
                  <div key={hashtag.id} className="p-3 hover:bg-muted rounded-lg transition-colors cursor-pointer">
                    <p className="font-semibold text-primary">#{hashtag.name}</p>
                    <p className="text-sm text-muted-foreground">{hashtag.posts_count} posts</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="people" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="people">People</TabsTrigger>
              <TabsTrigger value="posts">Posts</TabsTrigger>
            </TabsList>
            
            <TabsContent value="people" className="space-y-3 mt-4">
              {users?.map((user: any) => (
                <Card key={user.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={user.avatar_url} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {user.username?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1">
                        <p className="font-semibold">{user.full_name || user.username}</p>
                        <p className="text-sm text-muted-foreground">@{user.username}</p>
                        {user.bio && <p className="text-sm mt-1">{user.bio}</p>}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {users?.length === 0 && (
                <p className="text-center text-muted-foreground py-8">No users found</p>
              )}
            </TabsContent>
            
            <TabsContent value="posts" className="space-y-3 mt-4">
              {posts?.map((post: any) => (
                <Card key={post.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={post.profiles?.avatar_url} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {post.profiles?.username?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1">
                        <p className="font-semibold text-sm">{post.profiles?.full_name || post.profiles?.username}</p>
                        <p className="text-sm mt-1">{post.content}</p>
                        {post.image_url && (
                          <img src={post.image_url} alt="Post" className="mt-2 rounded-lg w-full max-h-64 object-cover" />
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {posts?.length === 0 && (
                <p className="text-center text-muted-foreground py-8">No posts found</p>
              )}
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  );
};

export default Search;
