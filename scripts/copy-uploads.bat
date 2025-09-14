@echo off
REM Скрипт для копирования файлов uploads между окружениями (Windows)
REM Использование: copy-uploads.bat <источник> <назначение>

setlocal enabledelayedexpansion

set SOURCE_DIR=%1
set DEST_DIR=%2

if "%SOURCE_DIR%"=="" (
    goto :usage
)
if "%DEST_DIR%"=="" (
    goto :usage
)

echo 🚀 Копирование файлов uploads...
echo 📁 Источник: %SOURCE_DIR%
echo 📁 Назначение: %DEST_DIR%

REM Проверяем существование источника
if not exist "%SOURCE_DIR%" (
    echo ❌ Директория источника не найдена: %SOURCE_DIR%
    exit /b 1
)

REM Создаем директорию назначения если не существует
if not exist "%DEST_DIR%" (
    mkdir "%DEST_DIR%"
)

REM Подсчитываем файлы
set FILE_COUNT=0
for /r "%SOURCE_DIR%" %%f in (*) do (
    set /a FILE_COUNT+=1
)

echo 📋 Найдено файлов: !FILE_COUNT!

if !FILE_COUNT! equ 0 (
    echo ℹ️  Файлы для копирования не найдены
    exit /b 0
)

REM Копируем файлы
echo 📦 Копируем файлы...
xcopy "%SOURCE_DIR%\*" "%DEST_DIR%\" /E /I /Y >nul 2>&1

if %errorlevel% neq 0 (
    echo ⚠️  Некоторые файлы могли не скопироваться
)

REM Проверяем результат
set COPIED_COUNT=0
for /r "%DEST_DIR%" %%f in (*) do (
    set /a COPIED_COUNT+=1
)

echo ✅ Скопировано файлов: !COPIED_COUNT!

if !FILE_COUNT! equ !COPIED_COUNT! (
    echo 🎉 Все файлы успешно скопированы!
) else (
    echo ⚠️  Количество скопированных файлов не совпадает с исходным
)

goto :end

:usage
echo Использование: %0 ^<источник^> ^<назначение^>
echo.
echo Примеры:
echo   %0 "C:\path\to\old\uploads" "C:\path\to\new\uploads"
echo   %0 "exports\export-2025-09-14T10-30-00\uploads" "..\uploads"
exit /b 1

:end
