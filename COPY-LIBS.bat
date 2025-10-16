@echo off
echo.
echo ===============================================
echo   ATLAS UI v4.0 - Copy Libraries to /lib/
echo ===============================================
echo.

set "SRC=D:\Proiect Propriu Luminomorphism librarie\ATLAS UI\atlas-ui-kit-v4.0_ML_Engine\src"
set "DST=D:\Proiect Propriu Luminomorphism librarie\ATLAS UI\atlas-ui-kit-v4.0_ML_Engine-Demo\lib"

echo Copying JavaScript libraries...
echo.

copy "%SRC%\atlas-ui-v4.js" "%DST%\" >nul 2>&1 && echo [OK] atlas-ui-v4.js || echo [FAIL] atlas-ui-v4.js
copy "%SRC%\atlas-ml-engine-v4.js" "%DST%\" >nul 2>&1 && echo [OK] atlas-ml-engine-v4.js || echo [FAIL] atlas-ml-engine-v4.js
copy "%SRC%\atlas-layout-generator.js" "%DST%\" >nul 2>&1 && echo [OK] atlas-layout-generator.js || echo [FAIL] atlas-layout-generator.js
copy "%SRC%\atlas-component-composer.js" "%DST%\" >nul 2>&1 && echo [OK] atlas-component-composer.js || echo [FAIL] atlas-component-composer.js
copy "%SRC%\atlas-affordance-registry.js" "%DST%\" >nul 2>&1 && echo [OK] atlas-affordance-registry.js || echo [FAIL] atlas-affordance-registry.js
copy "%SRC%\atlas-primitives.js" "%DST%\" >nul 2>&1 && echo [OK] atlas-primitives.js (ALREADY EXISTS) || echo [FAIL] atlas-primitives.js
copy "%SRC%\atlas-event-bus.js" "%DST%\" >nul 2>&1 && echo [OK] atlas-event-bus.js || echo [FAIL] atlas-event-bus.js
copy "%SRC%\atlas-confusion-detector.js" "%DST%\" >nul 2>&1 && echo [OK] atlas-confusion-detector.js || echo [FAIL] atlas-confusion-detector.js
copy "%SRC%\atlas-session-tracker.js" "%DST%\" >nul 2>&1 && echo [OK] atlas-session-tracker.js || echo [FAIL] atlas-session-tracker.js

echo.
echo ===============================================
echo   Copy complete! Check for [FAIL] messages.
echo ===============================================
echo.
echo Press any key to close...
pause >nul