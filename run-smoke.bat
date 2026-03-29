@echo off
cd D:\Projects\intoaec-automation

echo ================================
echo    IntoAEC Smoke Test Runner
echo ================================
echo.
echo Which server do you want to test?
echo.
echo   1. Testing Server
echo   2. Production Server
echo.
set /p choice="Enter 1 or 2: "

if "%choice%"=="1" (
    set TEST_ENV=testing
    echo.
    echo Running on TESTING SERVER...
) else if "%choice%"=="2" (
    set TEST_ENV=production
    echo.
    echo Running on PRODUCTION SERVER...
) else (
    echo Invalid choice! Running on TESTING SERVER by default...
    set TEST_ENV=testing
)

echo.
echo Started at: %date% %time%
echo.
npx cucumber-js --tags @smoke --format html:reports/smoke-report.html
echo.
echo Completed at: %date% %time%
start reports\smoke-report.html
pause