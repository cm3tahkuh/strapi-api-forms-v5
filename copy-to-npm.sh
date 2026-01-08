#!/bin/bash

# Скрипт для копирования собранных файлов плагина в node_modules установленного плагина
# Использование: ./copy-to-npm.sh

STRAPI_PROJECT_PATH="../my-strapi-test"
PLUGIN_NPM_PATH="$STRAPI_PROJECT_PATH/node_modules/strapi-api-forms"

if [ ! -d "$PLUGIN_NPM_PATH" ]; then
    echo "Ошибка: Плагин не найден в $PLUGIN_NPM_PATH"
    echo "Убедитесь, что плагин установлен через npm в проекте Strapi"
    exit 1
fi

echo "Копирование файлов из dist в node_modules..."

# Копируем admin файлы
if [ -d "dist/admin" ]; then
    cp -r dist/admin/* "$PLUGIN_NPM_PATH/dist/admin/"
    echo "✓ Admin файлы скопированы"
else
    echo "Ошибка: dist/admin не найден. Сначала выполните npm run build"
    exit 1
fi

# Копируем server файлы
if [ -d "dist/server" ]; then
    cp -r dist/server/* "$PLUGIN_NPM_PATH/dist/server/"
    echo "✓ Server файлы скопированы"
else
    echo "Ошибка: dist/server не найден. Сначала выполните npm run build"
    exit 1
fi

# Копируем chunks (скомпилированные модули)
if [ -d "dist/_chunks" ]; then
    mkdir -p "$PLUGIN_NPM_PATH/dist/_chunks"
    # Удаляем старые chunks и копируем новые
    rm -rf "$PLUGIN_NPM_PATH/dist/_chunks"/*
    cp -r dist/_chunks/* "$PLUGIN_NPM_PATH/dist/_chunks/" 2>/dev/null
    echo "✓ Chunks скопированы"
fi

# Копируем переводы (из исходников и из dist)
if [ -d "admin/src/translations" ]; then
    mkdir -p "$PLUGIN_NPM_PATH/dist/admin/src/translations"
    cp admin/src/translations/*.json "$PLUGIN_NPM_PATH/dist/admin/src/translations/" 2>/dev/null
    echo "✓ Переводы из исходников скопированы"
fi
if [ -d "dist/admin/src/translations" ]; then
    mkdir -p "$PLUGIN_NPM_PATH/dist/admin/src/translations"
    cp dist/admin/src/translations/*.json "$PLUGIN_NPM_PATH/dist/admin/src/translations/" 2>/dev/null
    echo "✓ Переводы из dist скопированы"
fi

echo ""
echo "Готово! Файлы успешно скопированы в $PLUGIN_NPM_PATH"
echo "Теперь перезапустите Strapi для применения изменений"

