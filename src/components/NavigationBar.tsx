import { Home, Search, MessageCircle, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "react-router-dom";
import { CreatePostDialog } from "./CreatePostDialog";
import { NotificationsPanel } from "./NotificationsPanel";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { useAuth } from "@/contexts/AuthContext";

export const NavigationBar = () => {
  const location = useLocation();
  const { user } = useAuth();

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border/50 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary via-secondary to-accent flex items-center justify-center">
            <span className="text-white font-bold text-lg">R</span>
          </div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
            Rwanda Connect
          </h1>
        </Link>
        
        <div className="hidden md:flex items-center gap-4">
          <Link to="/">
            <Button variant={isActive('/') ? 'default' : 'ghost'} size="icon">
              <Home className="h-6 w-6" />
            </Button>
          </Link>
          
          <Link to="/search">
            <Button variant={isActive('/search') ? 'default' : 'ghost'} size="icon">
              <Search className="h-6 w-6" />
            </Button>
          </Link>
          
          <CreatePostDialog />
          
          <Link to="/messages">
            <Button variant={isActive('/messages') ? 'default' : 'ghost'} size="icon">
              <MessageCircle className="h-6 w-6" />
            </Button>
          </Link>
          
          <NotificationsPanel />
          
          <Link to="/settings">
            <Button variant={isActive('/settings') ? 'default' : 'ghost'} size="icon">
              <Settings className="h-6 w-6" />
            </Button>
          </Link>

          <Link to="/settings">
            <Avatar className="h-8 w-8 cursor-pointer">
              <AvatarImage src="" />
              <AvatarFallback className="bg-primary/10 text-primary text-xs">
                {user?.email?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </Link>
        </div>
      </div>
    </nav>
  );
};
