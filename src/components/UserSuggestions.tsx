import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient, handleApiError } from '@/lib/api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

export const UserSuggestions = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: suggestions } = useQuery({
    queryKey: ['user-suggestions'],
    queryFn: async () => {
      if (!user) return [];
      const response = await apiClient.getUserSuggestions();
      return response.suggestions;
    },
    enabled: !!user,
  });

  const followMutation = useMutation({
    mutationFn: async (targetUserId: string) => {
      await apiClient.followUser(targetUserId);
      return targetUserId;
    },
    onMutate: async (targetUserId: string) => {
      await queryClient.cancelQueries({ queryKey: ['user-suggestions'] });
      const prev = queryClient.getQueryData<any[]>(['user-suggestions']);
      queryClient.setQueryData<any[]>(['user-suggestions'], (old) =>
        (old || []).filter((p) => p.id !== targetUserId)
      );
      return { prev };
    },
    onError: (err: any, _vars, context) => {
      if (context?.prev) queryClient.setQueryData(['user-suggestions'], context.prev);
      toast({ variant: 'destructive', title: 'Error', description: handleApiError(err) });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['user-suggestions'] });
      queryClient.invalidateQueries({ queryKey: ['my-profile'] });
    },
    onSuccess: () => {
      toast({ title: 'Success', description: 'Now following user!' });
    }
  });

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
              onClick={() => followMutation.mutate(profile.id)}
            >
              Follow
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
