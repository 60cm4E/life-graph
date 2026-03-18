@echo off
set "PATH=%PATH%;C:\Program Files\Git\cmd;C:\Program Files\GitHub CLI"
cd /d "C:\Users\chenc\.gemini\antigravity\scratch\life-graph"

git add -A
git commit -m "feat: flexible data points at any age, add/remove points, mobile UX"
git push origin master

echo === DONE ===
