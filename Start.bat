@echo off
cd /d "%~dp0"

echo ========================================
echo   XHBlogs Console Launcher
echo ========================================
echo.
echo [INFO] Script dir: %~dp0
echo.

:: Detect Python
python --version >nul 2>&1
if errorlevel 1 goto try_py

echo [OK] Python detected, starting...
echo.
python run_me.py
if errorlevel 1 goto error
goto end

:try_py
py --version >nul 2>&1
if errorlevel 1 goto no_python

echo [OK] Python detected via py launcher, starting...
echo.
py run_me.py
if errorlevel 1 goto error
goto end

:no_python
echo.
echo [ERROR] Python not found!
echo Please install Python 3.10+ and add it to PATH
echo Download: https://www.python.org/downloads/
echo.
pause
exit /b 1

:error
echo.
echo [ERROR] Startup failed! Check error messages above.
echo.
pause
exit /b 1

:end
echo.
echo [OK] Launcher finished. If console window does not appear, please wait.
echo.
pause
exit /b 0
