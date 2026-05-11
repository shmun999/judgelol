# ⚖️ 몇대몇 (JudgeLoL)

> 게임 중 분쟁사항 판단 투표 서비스

리그 오브 레전드 게임 내 분쟁 상황에 대해 AI가 핵심 구간을 찾고, 전문가와 유저들이 투표로 판정하는 플랫폼입니다.

**서울시립대학교 컴퓨터과학부 종합설계 3조**

## 팀원

| 이름 | 역할 |
|------|------|
| 심재용 | 풀스택 개발 |
| 유원호 | 풀스택 개발 |
| 권동현 | 풀스택 개발 |
| 문세현 | 풀스택 개발 |

## 기술 스택

- **Frontend**: React (Vite) + Tailwind CSS
- **Backend**: Node.js (예정)
- **Database**: 미정
- **AI**: LSTM / Transformer (예정)
- **Infra**: AWS (S3 + CloudFront + EC2)
- **API**: Riot API, YouTube API

## 시작하기

### 필수 설치

- [Node.js](https://nodejs.org) (LTS 버전)
- [Git](https://git-scm.com)

### 프로젝트 클론 및 실행

```bash
# 저장소 클론
git clone https://github.com/팀계정/judgelol.git
cd judgelol

# 의존성 설치
npm install

# 개발 서버 실행
npm run dev
```

브라우저에서 `http://localhost:5173` 접속

### 빌드 (배포용)

```bash
npm run build
```

`dist/` 폴더에 배포용 파일 생성

## 프로젝트 구조

```
judgelol/
├── index.html
├── package.json
├── vite.config.js
├── public/
│   └── favicon.svg
└── src/
    ├── main.jsx              # 앱 진입점
    ├── index.css             # 글로벌 스타일 (Tailwind)
    ├── App.jsx               # 메인 앱 (페이지 라우팅)
    ├── components/
    │   ├── Header.jsx        # 공통 헤더
    │   ├── Footer.jsx        # 공통 푸터
    │   └── PostCard.jsx      # 게시글 카드 컴포넌트
    ├── pages/
    │   ├── HomePage.jsx      # 메인 페이지
    │   ├── PostsPage.jsx     # 게시판 (법정)
    │   ├── DetailPage.jsx    # 게시글 상세 + 투표
    │   └── LoginPage.jsx     # 로그인/회원가입
    └── data/
        └── mockData.js       # 더미 데이터 (추후 DB 교체)
```

## Legal

몇대몇 isn't endorsed by Riot Games and doesn't reflect the views or opinions of Riot Games or anyone officially involved in producing or managing League of Legends.
