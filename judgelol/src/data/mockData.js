// 티어별 색상 매핑
export const TIER_COLORS = {
  IRON: "linear-gradient(135deg, #64748b, #475569)",
  BRONZE: "linear-gradient(135deg, #a16207, #713f12)",
  SILVER: "linear-gradient(135deg, #94a3b8, #64748b)",
  GOLD: "linear-gradient(135deg, #fbbf24, #d97706)",
  PLATINUM: "linear-gradient(135deg, #67e8f9, #0891b2)",
  DIAMOND: "linear-gradient(135deg, #a78bfa, #7c3aed)",
  MASTER: "linear-gradient(135deg, #f472b6, #db2777)",
  CHALLENGER: "linear-gradient(135deg, #fcd34d, #ef4444)",
};

// 더미 게시글 데이터 (나중에 DB 연동 시 교체)
export const MOCK_POSTS = [
  {
    id: 1,
    title: "너무 억울합니다. 누가 더 잘못한 건가요?",
    description:
      "친구랑 듀오 중인데 서로 싸웠습니다. 제가 원딜인데 서포터인 친구가 로밍을 계속 가서 혼자 2대1 당했어요. 판결내주세요.",
    time: "2시간 전",
    tier: "GOLD",
    views: 1203,
    comments: 47,
    likes: 234,
    dislikes: 12,
    votes: [
      { label: "글쓴이", count: 45 },
      { label: "친구", count: 38 },
      { label: "둘다", count: 20 },
    ],
  },
  {
    id: 2,
    title: "정글러가 갱을 안 와요. 이거 정상인가요?",
    description:
      "15분 동안 탑 갱을 한 번도 안 왔습니다. 탑이 망했다고 하는데 정글 동선상 어쩔 수 없었습니다.",
    time: "4시간 전",
    tier: "PLATINUM",
    views: 892,
    comments: 32,
    likes: 156,
    dislikes: 8,
    votes: [
      { label: "정글 잘못", count: 62 },
      { label: "탑 잘못", count: 21 },
      { label: "서로 소통부족", count: 17 },
    ],
  },
  {
    id: 3,
    title: "서포터가 미드로 로밍 갔다가 바텀 터졌어요",
    description:
      "탑도 아니고 미드로 로밍을 갔는데 그 사이에 바텀이 터졌습니다. 이게 맞나요?",
    time: "6시간 전",
    tier: "DIAMOND",
    views: 2451,
    comments: 89,
    likes: 412,
    dislikes: 34,
    votes: [
      { label: "서포터 잘못", count: 71 },
      { label: "원딜 잘못", count: 15 },
      { label: "미드 잘못", count: 14 },
    ],
  },
  {
    id: 4,
    title: "바론 스틸 vs 한타 승리, 뭐가 맞아요?",
    description:
      "바론 풀피에 먹을 수 있었는데 한타 각이 보여서 한타를 갔습니다. 팀원이 화를 냅니다.",
    time: "8시간 전",
    tier: "MASTER",
    views: 1847,
    comments: 56,
    likes: 289,
    dislikes: 21,
    votes: [
      { label: "바론 먹는 게 맞음", count: 55 },
      { label: "한타 가는 게 맞음", count: 40 },
      { label: "상황에 따라 다름", count: 5 },
    ],
  },
  {
    id: 5,
    title: "첫 블러드 주고 갱 오라는 탑",
    description:
      "본인이 솔킬 당해놓고 정글한테 갱 오라고 핑찍는 거 이해가 안 갑니다.",
    time: "1일 전",
    tier: "SILVER",
    views: 3201,
    comments: 124,
    likes: 567,
    dislikes: 45,
    votes: [
      { label: "탑 잘못", count: 78 },
      { label: "정글 잘못", count: 12 },
      { label: "둘다 잘못", count: 10 },
    ],
  },
  {
    id: 6,
    title: "원딜이 타워 뺏겠다고 혼자 들어갔다가 죽음",
    description:
      "시야도 없는데 혼자 들어가서 죽은 거 이해가 안 갑니다. 각이 있었다고 하는데...",
    time: "1일 전",
    tier: "GOLD",
    views: 1567,
    comments: 43,
    likes: 198,
    dislikes: 15,
    votes: [
      { label: "원딜 잘못", count: 82 },
      { label: "서폿 잘못", count: 8 },
      { label: "각이 있었음", count: 10 },
    ],
  },
];

// 더미 댓글 데이터
export const MOCK_COMMENTS = [
  {
    id: 1,
    author: "판관_다이아",
    tier: "DIAMOND",
    content:
      "영상 12분 구간 보면 글쓴이가 시야 안 잡고 먼저 들어간 게 문제네요. 친구가 합류 늦은 건 맞지만 진입 자체가 잘못된 판단이었음.",
    time: "1시간 전",
    likes: 34,
  },
  {
    id: 2,
    author: "법정의달인",
    tier: "MASTER",
    content:
      "이건 6:4로 글쓴이가 더 잘못. 골드 격차 벌어진 상태에서 무리한 어그로였어요.",
    time: "30분 전",
    likes: 28,
  },
  {
    id: 3,
    author: "소환사ABC",
    tier: "GOLD",
    content:
      "저는 친구가 더 잘못인 것 같은데... AI 하이라이트 8분 구간에서 핑 무시했잖아요",
    time: "15분 전",
    likes: 12,
  },
];
