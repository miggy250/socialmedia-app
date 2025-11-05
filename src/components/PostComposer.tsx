import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Image as ImageIcon, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/api';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

export const PostComposer = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [content, setContent] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const createPost = useMutation({
    mutationFn: async ({ content, imageUrl }: { content: string; imageUrl?: string }) => {
      return apiClient.createPost({ content, imageUrl });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      setContent('');
      setSelectedImage(null);
      setImagePreview(null);
      toast({ title: 'Post created successfully!' });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Failed to create post',
        description: error.message,
        variant: 'destructive'
      });
    },
  });

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: 'File too large',
          description: 'Maximum file size is 5MB',
          variant: 'destructive'
        });
        return;
      }
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && !selectedImage) return;

    try {
      let imageUrl: string | undefined;
      
      if (selectedImage) {
        const uploadResult = await apiClient.uploadImage(selectedImage);
        imageUrl = uploadResult.imageUrl;
      }

      await createPost.mutateAsync({ content, imageUrl });
    } catch (error: any) {
      toast({
        title: 'Upload failed',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  return (
    <Card className="p-4 mb-4">
      <form onSubmit={handleSubmit}>
        <div className="flex gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={user?.avatar_url} />
            <AvatarFallback className="bg-primary/10 text-primary">
              {user?.username?.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1">
            <Textarea
              placeholder="What's on your mind?"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="resize-none border-0 focus-visible:ring-0 p-0 min-h-[80px]"
            />
            
            {imagePreview && (
              <div className="relative mt-2 rounded-lg overflow-hidden">
                <img 
                  src={imagePreview} 
                  alt="Preview" 
                  className="w-full max-h-96 object-cover"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2"
                  onClick={handleRemoveImage}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
            
            <div className="flex items-center justify-between mt-3 pt-3 border-t">
              <div className="flex gap-2">
                <input
                  type="file"
                  id="image-upload"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageSelect}
                />
                <label htmlFor="image-upload">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="cursor-pointer"
                    onClick={() => document.getElementById('image-upload')?.click()}
                  >
                    <ImageIcon className="h-4 w-4 mr-2" />
                    Photo
                  </Button>
                </label>
              </div>
              
              <Button 
                type="submit" 
                disabled={(!content.trim() && !selectedImage) || createPost.isPending}
              >
                {createPost.isPending ? 'Posting...' : 'Post'}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </Card>
  );
};
