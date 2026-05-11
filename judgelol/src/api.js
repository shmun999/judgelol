const BASE_URL = "http://localhost:3001/api";

// 게시글 목록
export const getPosts = () =>
  fetch(`${BASE_URL}/posts`).then((r) => r.json());

// 게시글 단건
export const getPost = (id, userEmail) => {
  const url = userEmail
    ? `${BASE_URL}/posts/${id}?user_email=${encodeURIComponent(userEmail)}`
    : `${BASE_URL}/posts/${id}`;
  return fetch(url).then((r) => r.json());
};

// 게시글 작성
export const createPost = (data) =>
  fetch(`${BASE_URL}/posts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then((r) => r.json());

// 투표
export const vote = (postId, optionId, userEmail) =>
  fetch(`${BASE_URL}/posts/${postId}/vote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ option_id: optionId, user_email: userEmail }),
  }).then((r) => r.json());

// 댓글 작성
export const createComment = (postId, data) =>
  fetch(`${BASE_URL}/posts/${postId}/comments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then((r) => r.json());

// 게시글 추천/비추천
export const likePost = (postId, type, userEmail) =>
  fetch(`${BASE_URL}/posts/${postId}/like`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type, user_email: userEmail }),
  }).then((r) => r.json());

// 댓글 추천
export const likeComment = (commentId, userEmail) =>
  fetch(`${BASE_URL}/comments/${commentId}/like`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_email: userEmail }),
  }).then((r) => r.json());

// 댓글 삭제
export const deleteComment = (commentId, userEmail) =>
  fetch(`${BASE_URL}/comments/${commentId}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_email: userEmail }),
  }).then((r) => r.json());
