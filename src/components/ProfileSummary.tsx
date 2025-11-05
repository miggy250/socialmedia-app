import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';

export const ProfileSummary = () => {
  const { user } = useAuth();

  const { data: profile } = useQuery({
    queryKey: ['my-profile'],
    queryFn: async () => {
      if (!user) return null;
      const response = await apiClient.getProfile();
      return response.profile;
    },
    enabled: !!user,
  });

  if (!user || !profile) return null;

  return (
    <Card className="mb-4">
      <CardContent className="p-4 flex items-center gap-3">
        <Avatar className="h-12 w-12">
          <AvatarImage src={profile.avatar_url || ''} />
          <AvatarFallback className="bg-primary/10 text-primary">
            {profile.username?.charAt(0)?.toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <p className="font-semibold leading-tight">{profile.full_name || profile.username}</p>
          <p className="text-xs text-muted-foreground">@{profile.username}</p>
          <div className="text-xs text-muted-foreground mt-1 flex gap-3">
            <span><strong>{profile?.followers_count ?? 0}</strong> followers</span>
            <span><strong>{profile?.following_count ?? 0}</strong> following</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};


