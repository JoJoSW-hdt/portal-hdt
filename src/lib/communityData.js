export async function fetchCommunityFeed(supabase) {
  const [postsResult, reactionsResult, commentsResult, profilesResult] = await Promise.all([
    supabase.from("community_posts").select("*").order("created_at", { ascending: false }),
    supabase.from("community_post_reactions").select("*"),
    supabase.from("community_post_comments").select("*").order("created_at"),
    supabase.from("profiles").select("id,display_name,username,avatar_url,role"),
  ]);

  const error = postsResult.error || reactionsResult.error || commentsResult.error || profilesResult.error;
  if (error) throw error;

  const people = new Map((profilesResult.data || []).map(person => [person.id, person]));
  const reactions = reactionsResult.data || [];
  const comments = commentsResult.data || [];

  return (postsResult.data || []).map(post => ({
    ...post,
    author: people.get(post.author_id),
    reactions: reactions.filter(reaction => reaction.post_id === post.id),
    comments: comments
      .filter(comment => comment.post_id === post.id)
      .map(comment => ({ ...comment, author: people.get(comment.author_id) })),
  }));
}
