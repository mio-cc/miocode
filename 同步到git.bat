@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"

rem ===== 把 sj 文件夹同步到 github.com/mio-cc/miocode =====
rem 远端用你 ~/.ssh/config 里的别名 miocode-github（它已经指向配好的私钥），脚本里不需要写私钥路径。
set "REMOTE=git@miocode-github:mio-cc/miocode.git"

if not exist ".git" (
  git init -b main
  git remote add origin %REMOTE%
) else (
  git remote set-url origin %REMOTE%
)
git config user.name >nul 2>&1 || git config user.name "ku mio"
git config user.email >nul 2>&1 || git config user.email "miokuhhh@gmail.com"
git config core.quotepath false

git add -A
git diff --cached --quiet
if errorlevel 1 (
  for /f %%i in ('powershell -NoProfile -Command "Get-Date -Format yyyy-MM-dd_HH:mm"') do set "NOW=%%i"
  git commit -q -m "sync %NOW%"
) else (
  echo 没有新的变动。
)

git fetch origin
git rev-parse --verify -q origin/main >nul && git pull --no-rebase --no-edit --allow-unrelated-histories origin main
git push -u origin main
if errorlevel 1 (
  echo.
  echo [x] 推送失败。先在命令行运行：ssh -T git@miocode-github
  echo     看到 "successfully authenticated" 说明密钥没问题，再检查部署密钥是否勾了 Allow write access。
) else (
  echo [ok] 已同步到 github.com/mio-cc/miocode
)
pause
