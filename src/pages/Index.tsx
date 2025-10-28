import { NavigationBar } from "@/components/NavigationBar";
import { StoriesBar } from "@/components/StoriesBar";
import { PostCard } from "@/components/PostCard";

const Index = () => {
  const posts = [
    {
      author: {
        name: "Marie Uwimana",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=marie",
        location: "Kigali, Rwanda"
      },
      content: "Beautiful sunrise over the hills of Kigali this morning! 🌄 #LandOfAThousandHills #Rwanda",
      image: "https://images.unsplash.com/photo-1609137144813-7d9921338f24?w=800&auto=format&fit=crop",
      likes: 234,
      comments: 18,
      timestamp: "2 hours ago"
    },
    {
      author: {
        name: "Jean Paul Nkurunziza",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=jean",
        location: "Nyamirambo, Kigali"
      },
      content: "Excited to share that our tech startup just secured funding! Building the future of fintech in Rwanda 🚀💻 #RwandaTech #Innovation",
      likes: 456,
      comments: 45,
      timestamp: "5 hours ago"
    },
    {
      author: {
        name: "Grace Mutesi",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=grace",
        location: "Musanze, Rwanda"
      },
      content: "Had an incredible experience visiting the mountain gorillas today! Conservation efforts in Rwanda are truly inspiring 🦍💚 #VisitRwanda #Wildlife",
      image: "https://images.unsplash.com/photo-1551731409-43eb3e517a1a?w=800&auto=format&fit=crop",
      likes: 892,
      comments: 67,
      timestamp: "1 day ago"
    },
    {
      author: {
        name: "Samuel Habimana",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=samuel",
        location: "Kimironko Market, Kigali"
      },
      content: "Supporting local artisans! Check out these beautiful Imigongo art pieces 🎨 Made with natural materials and traditional techniques. DM for inquiries! #MadeInRwanda #SupportLocal",
      image: "https://images.unsplash.com/photo-1582555172866-f73bb12a2ab3?w=800&auto=format&fit=crop",
      likes: 345,
      comments: 23,
      timestamp: "2 days ago"
    }
  ];

  return (
    <div className="min-h-screen bg-muted/30">
      <NavigationBar />
      
      <main className="max-w-2xl mx-auto pt-20 pb-6 px-4">
        <StoriesBar />
        
        <div className="space-y-4">
          {posts.map((post, index) => (
            <PostCard key={index} {...post} />
          ))}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border/50 px-4 py-3 shadow-lg">
        <div className="flex items-center justify-around">
          <button className="p-2">
            <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/>
            </svg>
          </button>
          <button className="p-2">
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.35-4.35"/>
            </svg>
          </button>
          <button className="p-2">
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <line x1="12" y1="8" x2="12" y2="16"/>
              <line x1="8" y1="12" x2="16" y2="12"/>
            </svg>
          </button>
          <button className="p-2 relative">
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
            <span className="absolute top-1 right-1 h-2 w-2 bg-destructive rounded-full"></span>
          </button>
          <button className="p-2">
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Index;
