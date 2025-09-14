#!/bin/bash
# Скрипт для копирования файлов uploads между окружениями
# Использование: ./copy-uploads.sh <источник> <назначение>

set -e

SOURCE_DIR="$1"
DEST_DIR="$2"

if [ -z "$SOURCE_DIR" ] || [ -z "$DEST_DIR" ]; then
    echo "Использование: $0 <источник> <назначение>"
    echo ""
    echo "Примеры:"
    echo "  $0 /path/to/old/uploads /path/to/new/uploads"
    echo "  $0 exports/export-2025-09-14T10-30-00/uploads ../uploads"
    exit 1
fi

echo "🚀 Копирование файлов uploads..."
echo "📁 Источник: $SOURCE_DIR"
echo "📁 Назначение: $DEST_DIR"

# Проверяем существование источника
if [ ! -d "$SOURCE_DIR" ]; then
    echo "❌ Директория источника не найдена: $SOURCE_DIR"
    exit 1
fi

# Создаем директорию назначения если не существует
mkdir -p "$DEST_DIR"

# Подсчитываем файлы
FILE_COUNT=$(find "$SOURCE_DIR" -type f | wc -l)
echo "📋 Найдено файлов: $FILE_COUNT"

if [ "$FILE_COUNT" -eq 0 ]; then
    echo "ℹ️  Файлы для копирования не найдены"
    exit 0
fi

# Копируем файлы
echo "📦 Копируем файлы..."
cp -r "$SOURCE_DIR"/* "$DEST_DIR"/ 2>/dev/null || {
    echo "⚠️  Некоторые файлы могли не скопироваться"
}

# Проверяем результат
COPIED_COUNT=$(find "$DEST_DIR" -type f | wc -l)
echo "✅ Скопировано файлов: $COPIED_COUNT"

if [ "$FILE_COUNT" -eq "$COPIED_COUNT" ]; then
    echo "🎉 Все файлы успешно скопированы!"
else
    echo "⚠️  Количество скопированных файлов не совпадает с исходным"
fi
