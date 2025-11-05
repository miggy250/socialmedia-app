import { useState, useEffect, useRef } from 'react';
import { NavigationBar } from '@/components/NavigationBar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Send, Plus, Search } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSocket } from '@/contexts/SocketContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { apiClient } from '@/lib/api';

const Messages = () => {
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [localMessages, setLocalMessages] = useState<any[]>([]);
  const [newMessageOpen, setNewMessageOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { user } = useAuth();
  const { socket, connected } = useSocket();
  const queryClient = useQueryClient();
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: conversations, refetch: refetchConversations } = useQuery({
    queryKey: ['conversations'],
    queryFn: async () => {
      if (!user) return [];
      const res = await apiClient.getConversations();
      return res.conversations;
    },
  });

  const { data: userSearchResults } = useQuery({
    queryKey: ['search-users-dm', searchQuery],
    queryFn: async () => {
      if (!searchQuery.trim()) return [];
      const res = await apiClient.searchUsers(searchQuery, 10);
      return res.users;
    },
    enabled: searchQuery.length > 0 && newMessageOpen,
  });

  const { data: fetchedMessages, refetch } = useQuery({
    queryKey: ['messages', selectedUser?.id],
    queryFn: async () => {
      if (!selectedUser) return [];
      const res = await apiClient.getThread(selectedUser.id);
      return res.messages;
    },
    enabled: !!selectedUser,
  });

  // Sync fetched messages to local state
  useEffect(() => {
    if (fetchedMessages) {
      setLocalMessages(fetchedMessages);
    }
  }, [fetchedMessages]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [localMessages]);

  // Socket.IO realtime effects
  useEffect(() => {
    if (!socket || !selectedUser || !connected) return;

    // Join conversation room
    socket.emit('join-conversation', selectedUser.id);

    // Listen for new messages
    const handleNewMessage = (msg: any) => {
      setLocalMessages(prev => [...prev, msg]);
      // Mark as read if received
      if (msg.sender_id === selectedUser.id) {
        socket.emit('mark-read', { senderId: selectedUser.id });
      }
    };

    // Listen for typing indicator
    const handleTyping = ({ userId, typing }: { userId: string; typing: boolean }) => {
      if (userId === selectedUser.id) {
        setIsTyping(typing);
      }
    };

    // Listen for read receipts
    const handleMessagesRead = () => {
      setLocalMessages(prev => prev.map(m => ({ ...m, is_read: 1 })));
    };

    socket.on('new-message', handleNewMessage);
    socket.on('user-typing', handleTyping);
    socket.on('messages-read', handleMessagesRead);

    return () => {
      socket.emit('leave-conversation', selectedUser.id);
      socket.off('new-message', handleNewMessage);
      socket.off('user-typing', handleTyping);
      socket.off('messages-read', handleMessagesRead);
    };
  }, [socket, selectedUser, connected]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !selectedUser || !user || !socket) return;

    // Send via Socket.IO for instant delivery
    socket.emit('send-message', {
      receiverId: selectedUser.id,
      content: message
    });

    // Stop typing indicator
    socket.emit('typing-stop', selectedUser.id);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }

    setMessage('');
    queryClient.invalidateQueries({ queryKey: ['conversations'] });
  };

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value);

    if (!socket || !selectedUser) return;

    // Send typing start
    socket.emit('typing-start', selectedUser.id);

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Send typing stop after 2 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('typing-stop', selectedUser.id);
    }, 2000);
  };

  const handleStartConversation = (selectedUser: any) => {
    setSelectedUser(selectedUser);
    setNewMessageOpen(false);
    setSearchQuery('');
    refetchConversations();
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <NavigationBar />
      
      <main className="max-w-6xl mx-auto pt-20 pb-6 px-4">
        <div className="grid grid-cols-3 gap-4 h-[calc(100vh-120px)]">
          {/* Conversations List */}
          <div className="col-span-1 bg-card rounded-lg border overflow-y-auto">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="font-bold text-lg">Messages</h2>
              <Button size="icon" variant="ghost" onClick={() => setNewMessageOpen(true)}>
                <Plus className="h-5 w-5" />
              </Button>
            </div>
            
            <div className="divide-y">
              {!conversations || conversations.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground">
                  <p className="mb-2">No conversations yet</p>
                  <Button size="sm" onClick={() => setNewMessageOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Start a conversation
                  </Button>
                </div>
              ) : conversations?.map((conv: any) => (
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
                  {localMessages?.map((msg: any) => (
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
                        <div className="flex items-center gap-2 mt-1">
                          <p className={`text-xs ${
                            msg.sender_id === user?.id ? 'text-primary-foreground/70' : 'text-muted-foreground'
                          }`}>
                            {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                          </p>
                          {msg.sender_id === user?.id && msg.is_read === 1 && (
                            <span className="text-xs text-primary-foreground/70">✓✓</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {isTyping && (
                    <div className="flex justify-start">
                      <div className="bg-muted rounded-lg p-3">
                        <p className="text-sm text-muted-foreground italic">typing...</p>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <form onSubmit={handleSend} className="p-4 border-t flex gap-2">
                  <Input
                    placeholder="Type a message..."
                    value={message}
                    onChange={handleTyping}
                  />
                  <Button type="submit" size="icon" disabled={!connected}>
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

      {/* New Message Dialog */}
      <Dialog open={newMessageOpen} onOpenChange={setNewMessageOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Message</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="max-h-[400px] overflow-y-auto space-y-2">
              {userSearchResults && userSearchResults.length > 0 ? (
                userSearchResults.map((searchUser: any) => (
                  <div
                    key={searchUser.id}
                    onClick={() => handleStartConversation(searchUser)}
                    className="flex items-center gap-3 p-3 hover:bg-muted rounded-lg cursor-pointer transition-colors"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={searchUser.avatar_url} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {searchUser.username?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-semibold">{searchUser.full_name || searchUser.username}</p>
                      <p className="text-sm text-muted-foreground">@{searchUser.username}</p>
                    </div>
                  </div>
                ))
              ) : searchQuery ? (
                <p className="text-center text-muted-foreground py-8">No users found</p>
              ) : (
                <p className="text-center text-muted-foreground py-8">Search for users to start a conversation</p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Messages;
