# 몇대몇 백엔드

## 설치 및 실행

```bash
cd backend
npm install
node server.js
```

서버가 실행되면 http://localhost:3001 에서 동작합니다.

## API 목록

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | /api/posts | 게시글 목록 |
| GET | /api/posts/:id | 게시글 단건 |
| POST | /api/posts | 게시글 작성 |
| POST | /api/posts/:id/vote | 투표 |
| POST | /api/posts/:id/comments | 댓글 작성 |
| POST | /api/comments/:id/like | 댓글 추천 |
