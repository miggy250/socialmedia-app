-- Follow/Unfollow RPCs and helper security

-- Follow another user; idempotent
CREATE OR REPLACE FUNCTION public.follow(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF target_user_id = auth.uid() THEN
    RETURN; -- no-op: cannot follow yourself
  END IF;

  INSERT INTO public.follows (follower_id, following_id)
  VALUES (auth.uid(), target_user_id)
  ON CONFLICT (follower_id, following_id) DO NOTHING;
END;
$$;

GRANT EXECUTE ON FUNCTION public.follow(uuid) TO authenticated;

-- Unfollow another user; idempotent
CREATE OR REPLACE FUNCTION public.unfollow(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.follows
  WHERE follower_id = auth.uid() AND following_id = target_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.unfollow(uuid) TO authenticated;

-- Convenience: follower/following counts for a given profile
CREATE OR REPLACE VIEW public.profile_follow_counts AS
SELECT
  p.id AS profile_id,
  (SELECT COUNT(*) FROM public.follows f WHERE f.following_id = p.id) AS followers_count,
  (SELECT COUNT(*) FROM public.follows f WHERE f.follower_id = p.id) AS following_count
FROM public.profiles p;

-- Expose view for read to everyone
GRANT SELECT ON public.profile_follow_counts TO anon, authenticated;

