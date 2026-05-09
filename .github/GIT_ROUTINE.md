# Git 개발 루틴 — 핵심만

한발짝 팀(main 보호 + PR 필수) 기준. 매일 이 흐름.

---

## 1. 작업 시작 (3분)

```bash
git switch main
git pull                              # 어제 머지된 변경 가져오기
git switch -c feat/<오늘-작업>         # 브랜치 = 오늘 작업
```

**브랜치 이름 규약**

| 접두 | 용도 | 예 |
|---|---|---|
| `feat/` | 새 기능 | `feat/home-input` |
| `fix/` | 버그 수정 | `fix/decompose-empty-response` |
| `chore/` | 설정·잡일 | `chore/update-deps` |
| `docs/` | 문서만 | `docs/update-readme` |
| `refactor/` | 동작 같음, 구조 변경 | `refactor/split-result-blocks` |

---

## 2. 작업 중 (반복)

```bash
git status                            # 뭘 만졌는지 확인
git add .                             # 또는 git add <파일> 로 골라서
git commit -m "feat: 입력 폼에 파일 첨부 추가"
```

**커밋 메시지 규약 (Conventional Commits)**

```
<type>: <한 줄 설명>          ← 50자 이내, 마침표 X, 한국어 OK
```

`type`은 브랜치 접두와 동일 (`feat / fix / chore / docs / refactor / style / test`).

**작게, 자주.** 한 커밋 = 한 가지 의미 있는 변경. 30분~1시간에 한 번이 적당.

---

## 3. 작업 끝 (5분)

```bash
git push -u origin feat/<오늘-작업>    # 처음 push만 -u, 다음부터 git push
```

GitHub 페이지로 가서:
1. 노란 배너 "Compare & pull request" 클릭
2. PR 본문 채우기 (템플릿이 자동으로 뜸)
3. **Reviewers**에 팀원 추가
4. **Create pull request**
5. 카톡으로 "리뷰 부탁해" 한 줄

---

## 4. PR 머지 후 정리 (1분)

본인 PR이 머지되면:

```bash
git switch main
git pull                              # 머지된 내 변경분 가져오기
git branch -d feat/<오늘-작업>         # 로컬 브랜치 정리
```

원격 브랜치는 GitHub에서 자동 삭제(merge 시 옵션). 안 됐으면 `git push origin --delete feat/...`.

---

## 5. 사고 복구 (자주 쓰는 5가지)

### 5.1 마지막 커밋 메시지만 고치기 (아직 push 안 한 경우)

```bash
git commit --amend -m "feat: 새로운 메시지"
```

### 5.2 마지막 커밋에 빠진 파일 추가 (아직 push 안 한 경우)

```bash
git add <빠진-파일>
git commit --amend --no-edit
```

### 5.3 작업 중인 변경 잠시 치워두기

```bash
git stash                             # 현재 변경 임시 보관
git pull                              # 또는 다른 브랜치 작업
git stash pop                         # 다시 꺼내기
```

### 5.4 방금 변경 다 버리고 main 상태로

```bash
git restore .                         # 모든 변경 버림 (되돌릴 수 없음)
git clean -fd                         # 추적되지 않는 파일·폴더도 삭제
```

### 5.5 충돌 났을 때 (PR이나 pull 시)

```bash
# 충돌 파일을 에디터로 열어 <<<<< ===== >>>>> 마커 찾아 수동 해결
git add <해결한-파일>
git commit                            # 또는 git rebase --continue
```

해결이 어려우면 멈추고 sync에서 같이 보기. 혼자 무리하게 풀지 말 것.

---

## 6. 절대 하지 말 것

| 명령 | 왜 |
|---|---|
| `git push --force` | 팀원 작업 통째 날림. main에선 보호 규칙으로 차단됨. |
| `git reset --hard <커밋>` | 로컬 변경 영구 삭제. amend나 stash로 우회 가능. |
| `.env` 커밋 | API 키 유출. 한 번 push되면 히스토리에서 제거 어려움. |
| main에 직접 commit | 보호 규칙으로 차단되지만, 시도 자체가 흐름 깨짐. |

---

## 7. 매일 sync에서 git 점검

30분 sync 마지막에 한 번:

```bash
git log --oneline --all --graph -10   # 최근 10개 커밋 시각화
```

본인이 모르는 커밋이 보이면 팀원에게 한 번 물어보기.

---

## 8. 한눈에 보는 흐름

```
git pull  →  git switch -c feat/...  →  코드 작성  →  git add . && git commit -m "..."
                                              ↓
                                      (반복: add + commit)
                                              ↓
                                          git push
                                              ↓
                                       PR 열고 리뷰 요청
                                              ↓
                                          merge 후
                                              ↓
                  git switch main && git pull && git branch -d feat/...
```

---

*— Git 루틴 v1*
