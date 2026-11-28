export function assembleCommunityFeed(posts, reactions, comments, profiles) {
  const people = new Map((profiles || []).map(person => [person.id, person]));
  const reactionsByPost = new Map();
  const commentsByPost = new Map();

  for (const reaction of reactions || []) {
    const items = reactionsByPost.get(reaction.post_id) || [];
    items.push(reaction);
    reactionsByPost.set(reaction.post_id, items);
  }

  for (const comment of comments || []) {
    const items = commentsByPost.get(comment.post_id) || [];
    items.push({ ...comment, author: people.get(comment.author_id) });
    commentsByPost.set(comment.post_id, items);
  }

  return (posts || []).map(post => ({
    ...post,
    author: people.get(post.author_id),
    reactions: reactionsByPost.get(post.id) || [],
    comments: commentsByPost.get(post.id) || [],
  }));
}

export async function fetchCommunityFeed(supabase, { offset = 0, limit = 10 } = {}) {
  const postsResult = await supabase
    .from("community_posts")
    .select("*")
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(offset, offset + limit);

  if (postsResult.error) throw postsResult.error;

  const page = postsResult.data || [];
  const hasMore = page.length > limit;
  const posts = page.slice(0, limit);
  if (!posts.length) return { posts: [], hasMore: false };

  const postIds = posts.map(post => post.id);
  const profileIds = [...new Set([
    ...posts.map(post => post.author_id),
  ])];

  const [reactionsResult, commentsResult] = await Promise.all([
    supabase.from("community_post_reactions").select("*").in("post_id", postIds),
    supabase.from("community_post_comments").select("*").in("post_id", postIds).order("created_at"),
  ]);

  const comments = commentsResult.data || [];
  for (const comment of comments) profileIds.push(comment.author_id);
  const uniqueProfileIds = [...new Set(profileIds)];

  const profilesResult = uniqueProfileIds.length
    ? await supabase.from("profiles").select("id,display_name,username,avatar_url,role").in("id", uniqueProfileIds)
    : { data: [], error: null };

  const error = reactionsResult.error || commentsResult.error || profilesResult.error;
  if (error) throw error;

  return {
    posts: assembleCommunityFeed(
      posts,
      reactionsResult.data || [],
      comments,
      profilesResult.data || [],
    ),
    hasMore,
  };
}
