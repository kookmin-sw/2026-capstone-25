# 한발짝 (hanbaljjak)

AI 기반 작업 분해 도구. 시스템·배포 아키텍처 기준 모노레포 스캐폴드.

## 아키텍처 한눈에

| 레이어 | 기술 | 로컬 포트 | 배포 |
| --- | --- | --- | --- |
| Frontend | React 18 + Vite 5 + TypeScript | `localhost:5173` | Vercel |
| Backend | Express + TypeScript | `localhost:4000` | Railway |
| AI | Anthropic Claude Haiku 4.5 | — | (Backend에서 호출) |
| DB / Auth / Storage | Supabase (PostgreSQL) | — | Supabase Cloud |
| 코드 저장소 | GitHub | — | `git push` → 자동 배포 |

흐름: `사용자 → HTTPS → React (Vercel) → REST → Express (Railway) → Supabase / Anthropic`

## 폴더 구조

```
hanbaljjak/
├── frontend/        React 18 + Vite 5 (TS)
├── backend/         Express (TS)
├── 다이어그램/       아키텍처 SVG
├── package.json     workspaces 루트
└── .gitignore
```

## 개발 환경 준비

요구사항: Node.js 20 이상 (`.nvmrc` 참고), npm 10 이상.

```bash
# 의존성 설치 (한 번에)
npm install

# 프론트 + 백 동시 실행
npm run dev

# 개별 실행
npm run dev:frontend   # http://localhost:5173
npm run dev:backend    # http://localhost:4000
```

## 환경변수

각 워크스페이스의 `.env.example`을 `.env`로 복사한 뒤 채워 넣는다.

```bash
cp frontend/.env.example frontend/.env
cp backend/.env.example backend/.env
```

## 다음 단계 (이번 스캐폴드 범위 밖)

- Supabase 클라이언트 + 스키마 연결
- Anthropic SDK 라우트 (`/api/decompose` 등)
- Vercel · Railway 배포 설정
