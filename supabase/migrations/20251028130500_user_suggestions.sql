-- Suggest users the current user doesn't already follow (and not self)
CREATE OR REPLACE FUNCTION public.get_user_suggestions(me uuid)
RETURNS SETOF public.profiles
LANGUAGE sql
STABLE
AS $$
  SELECT p.*
  FROM public.profiles p
  WHERE p.id <> me
    AND NOT EXISTS (
      SELECT 1 FROM public.follows f
      WHERE f.follower_id = me AND f.following_id = p.id
    )
  ORDER BY p.created_at DESC
  LIMIT 5;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_suggestions(uuid) TO authenticated, anon;

