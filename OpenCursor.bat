setlocal

set "PROJECT_DIR=%~dp0"

rem Prefer the GUI exe to avoid extra console windows
if exist "%LocalAppData%\Programs\Cursor\Cursor.exe" (
  start "" "%LocalAppData%\Programs\Cursor\Cursor.exe" "%PROJECT_DIR%" >nul 2>nul
) else (
  start "" /b cursor "%PROJECT_DIR%" >nul 2>nul
)

exit /b 0