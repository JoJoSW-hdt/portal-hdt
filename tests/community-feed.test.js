import test from "node:test";
import assert from "node:assert/strict";
import { assembleCommunityFeed } from "../src/lib/communityData.js";

test("assembles each post with only its own reactions and comments", () => {
  const profiles = [
    { id: "member-1", display_name: "Ana" },
    { id: "member-2", display_name: "Beto" },
  ];
  const posts = [
    { id: "post-1", author_id: "member-1" },
    { id: "post-2", author_id: "member-2" },
  ];
  const reactions = [
    { id: "reaction-1", post_id: "post-1", member_id: "member-2" },
    { id: "reaction-2", post_id: "post-2", member_id: "member-1" },
  ];
  const comments = [
    { id: "comment-1", post_id: "post-1", author_id: "member-2", body: "Boa!" },
  ];

  const feed = assembleCommunityFeed(posts, reactions, comments, profiles);

  assert.equal(feed.length, 2);
  assert.equal(feed[0].author.display_name, "Ana");
  assert.deepEqual(feed[0].reactions.map(item => item.id), ["reaction-1"]);
  assert.equal(feed[0].comments[0].author.display_name, "Beto");
  assert.deepEqual(feed[1].reactions.map(item => item.id), ["reaction-2"]);
  assert.deepEqual(feed[1].comments, []);
});

test("handles empty pages and missing profile records safely", () => {
  const feed = assembleCommunityFeed(
    [{ id: "post-1", author_id: "missing" }],
    [],
    [{ id: "comment-1", post_id: "post-1", author_id: "missing" }],
    [],
  );

  assert.equal(feed[0].author, undefined);
  assert.equal(feed[0].comments[0].author, undefined);
  assert.deepEqual(feed[0].reactions, []);
});
