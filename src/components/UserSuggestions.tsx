import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

export const UserSuggestions = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: suggestions } = useQuery({
    queryKey: ['user-suggestions'],
    queryFn: async () => {
      // Get users the current user is not following
      const { data: following } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user?.id);

      const followingIds = following?.map(f => f.following_id) || [];

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .not('id', 'in', `(${[user?.id, ...followingIds].join(',')})`)
        .limit(5);

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const handleFollow = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('follows')
        .insert({
          follower_id: user?.id,
          following_id: userId,
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Now following user!",
      });

      queryClient.invalidateQueries({ queryKey: ['user-suggestions'] });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  if (!suggestions?.length) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Suggested for you</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {suggestions?.map((profile: any) => (
          <div key={profile.id} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={profile.avatar_url} />
                <AvatarFallback className="bg-primary/10 text-primary">
                  {profile.username?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              
              <div>
                <p className="font-semibold text-sm">{profile.full_name || profile.username}</p>
                <p className="text-xs text-muted-foreground">@{profile.username}</p>
              </div>
            </div>
            
            <Button
              size="sm"
              variant="secondary"
              onClick={() => handleFollow(profile.id)}
            >
              Follow
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
