import { useState, useEffect } from 'react';
import { NavigationBar } from '@/components/NavigationBar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';

const Messages = () => {
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [message, setMessage] = useState('');
  const { user } = useAuth();

  const { data: conversations } = useQuery({
    queryKey: ['conversations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:sender_id (username, avatar_url, full_name),
          receiver:receiver_id (username, avatar_url, full_name)
        `)
        .or(`sender_id.eq.${user?.id},receiver_id.eq.${user?.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Group by conversation partner
      const grouped = data.reduce((acc: any, msg: any) => {
        const partnerId = msg.sender_id === user?.id ? msg.receiver_id : msg.sender_id;
        const partner = msg.sender_id === user?.id ? msg.receiver : msg.sender;
        
        if (!acc[partnerId]) {
          acc[partnerId] = {
            user: partner,
            lastMessage: msg,
            unread: msg.sender_id !== user?.id && !msg.read,
          };
        }
        return acc;
      }, {});

      return Object.values(grouped);
    },
  });

  const { data: messages, refetch } = useQuery({
    queryKey: ['messages', selectedUser?.id],
    queryFn: async () => {
      if (!selectedUser) return [];

      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${user?.id},receiver_id.eq.${selectedUser.id}),and(sender_id.eq.${selectedUser.id},receiver_id.eq.${user?.id})`)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Mark as read
      await supabase
        .from('messages')
        .update({ read: true })
        .eq('receiver_id', user?.id)
        .eq('sender_id', selectedUser.id);

      return data;
    },
    enabled: !!selectedUser,
  });

  useEffect(() => {
    if (!selectedUser) return;

    const channel = supabase
      .channel('messages-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
        },
        () => {
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedUser, refetch]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !selectedUser || !user) return;

    await supabase.from('messages').insert({
      sender_id: user.id,
      receiver_id: selectedUser.id,
      content: message,
    });

    setMessage('');
    refetch();
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <NavigationBar />
      
      <main className="max-w-6xl mx-auto pt-20 pb-6 px-4">
        <div className="grid grid-cols-3 gap-4 h-[calc(100vh-120px)]">
          {/* Conversations List */}
          <div className="col-span-1 bg-card rounded-lg border overflow-y-auto">
            <div className="p-4 border-b">
              <h2 className="font-bold text-lg">Messages</h2>
            </div>
            
            <div className="divide-y">
              {conversations?.map((conv: any) => (
                <div
                  key={conv.user.id}
                  onClick={() => setSelectedUser(conv.user)}
                  className={`p-4 cursor-pointer hover:bg-muted transition-colors ${
                    selectedUser?.id === conv.user.id ? 'bg-muted' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={conv.user.avatar_url} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {conv.user.username?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{conv.user.full_name || conv.user.username}</p>
                      <p className="text-sm text-muted-foreground truncate">{conv.lastMessage.content}</p>
                    </div>
                    
                    {conv.unread && (
                      <div className="h-2 w-2 bg-primary rounded-full"></div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Chat Area */}
          <div className="col-span-2 bg-card rounded-lg border flex flex-col">
            {selectedUser ? (
              <>
                <div className="p-4 border-b flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={selectedUser.avatar_url} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {selectedUser.username?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold">{selectedUser.full_name || selectedUser.username}</p>
                    <p className="text-xs text-muted-foreground">@{selectedUser.username}</p>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages?.map((msg: any) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-lg p-3 ${
                          msg.sender_id === user?.id
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        }`}
                      >
                        <p>{msg.content}</p>
                        <p className={`text-xs mt-1 ${
                          msg.sender_id === user?.id ? 'text-primary-foreground/70' : 'text-muted-foreground'
                        }`}>
                          {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <form onSubmit={handleSend} className="p-4 border-t flex gap-2">
                  <Input
                    placeholder="Type a message..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                  />
                  <Button type="submit" size="icon">
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                Select a conversation to start messaging
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Messages;
