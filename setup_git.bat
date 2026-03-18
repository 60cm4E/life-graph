@echo off
set "PATH=%PATH%;C:\Program Files\Git\cmd"
cd /d "C:\Users\chenc\.gemini\antigravity\scratch\life-graph"
git init
git add -A
git config user.email "user@example.com"
git config user.name "user"
git commit -m "Initial commit: Life Graph web app"
echo DONE
