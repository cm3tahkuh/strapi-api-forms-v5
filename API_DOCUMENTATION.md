# API Документация - Strapi Forms Plugin

## Обзор

Плагин Strapi Forms предоставляет API для работы с формами и их отправками. Все endpoints доступны через базовый путь `/api/api-forms`.

## Endpoints

### Получение списка всех форм

**GET** `/api/api-forms/forms`

Возвращает список всех форм в системе.

**Пример запроса:**
```bash
curl http://localhost:1337/api/api-forms/forms
```

**Пример ответа:**
```json
{
  "data": [
    {
      "id": 3,
      "documentId": "wibdes091emdo005sllqauhv",
      "title": "Привет!",
      "active": true,
      "description": "Форму можно заполнить только один раз за все время!",
      "rateLimit": {
        "enabled": true,
        "maxSubmissions": 1,
        "timeWindowMinutes": 5,
        "oneTimeOnly": true
      }
    }
  ],
  "meta": {
    "pagination": {
      "page": 1,
      "pageSize": 25,
      "pageCount": 1,
      "total": 3
    }
  }
}
```

---

### Получение конфигурации формы

**GET** `/api/api-forms/form/:id`

Возвращает конфигурацию формы по её `documentId`. Используется для получения структуры полей формы.

**Параметры:**
- `id` - documentId формы

**Пример запроса:**
```bash
curl http://localhost:1337/api/api-forms/form/wibdes091emdo005sllqauhv
```

**Пример ответа:**
```json
{
  "fields": {
    "fields": [
      {
        "name": "тест",
        "type": "text",
        "label": "Тест",
        "placeholder": "Тест",
        "description": "Это описание!",
        "validation": {
          "required": true
        }
      }
    ]
  },
  "description": "Форму можно заполнить только один раз за все время!",
  "totalSubmissions": 4
}
```

---

### Отправка формы (заполнение формы)

**POST** `/api/api-forms/submission/post`

Отправляет данные формы на сервер.

**Тело запроса:**
```json
{
  "form": "documentId_формы",
  "submission": {
    "имя_поля": "значение",
    "другое_поле": "значение"
  },
  "referer": "https://example.com" // опционально
}
```

**Пример запроса:**
```bash
curl -X POST http://localhost:1337/api/api-forms/submission/post \
  -H "Content-Type: application/json" \
  -d '{
    "form": "wibdes091emdo005sllqauhv",
    "submission": {
      "тест": "значение поля"
    }
  }'
```

**Пример успешного ответа:**
```json
{
  "id": 7,
  "documentId": "xr6h0u1c8zlo0yaz3g3xi2az",
  "submission": {
    "тест": "значение поля"
  },
  "createdAt": "2026-01-09T12:50:09.618Z",
  "form": {
    "id": 3,
    "documentId": "wibdes091emdo005sllqauhv",
    "title": "Привет!",
    "successMessage": "Успешно!",
    "errorMessage": "Нет!"
  }
}
```

---

## Защита от спама

Плагин поддерживает несколько механизмов защиты от спама:

### 1. Активность формы

Если форма неактивна (`active: false`), все попытки заполнения будут отклонены.

**Пример ошибки:**
```json
{
  "error": {
    "status": 403,
    "name": "FormInactiveError",
    "message": "Форма неактивна и не принимает отправки"
  }
}
```

### 2. Валидация обязательных полей

Сервер проверяет все обязательные поля формы перед сохранением отправки.

**Правила валидации:**
- Все поля с `config.required === true` должны быть заполнены
- Для полей типа `checkbox` обязательное поле должно иметь значение `true`
- Для текстовых полей (`text`, `email`, `textarea`) значение не должно быть пустым
- Для массивов (`select`, `radio`, `checkboxgroup`) массив не должен быть пустым

**Пример ошибки валидации:**
```json
{
  "error": {
    "status": 400,
    "name": "ValidationError",
    "message": "Поле \"Согласие на обработку персональных данных\" должно быть отмечено; Поле \"ФИО\" обязательно для заполнения",
    "details": [
      "Поле \"Согласие на обработку персональных данных\" должно быть отмечено",
      "Поле \"ФИО\" обязательно для заполнения"
    ]
  }
}
```

### 3. Rate Limiting (Ограничение частоты запросов)

Ограничивает количество отправок формы за определенный период времени.

**Параметры:**
- `enabled` - включена ли защита
- `maxSubmissions` - максимальное количество отправок
- `timeWindowMinutes` - временное окно в минутах
- `oneTimeOnly` - можно ли заполнить форму только один раз за все время

**Пример ошибки при превышении лимита:**
```json
{
  "error": {
    "status": 429,
    "name": "TooManyRequestsError",
    "message": "Превышен лимит запросов. Можно отправить 1 раз за 5 минут",
    "retryAfter": 291
  }
}
```

**Пример ошибки при oneTimeOnly:**
```json
{
  "error": {
    "status": 429,
    "name": "TooManyRequestsError",
    "message": "Эта форма может быть заполнена только один раз",
    "retryAfter": null
  }
}
```

---

## Примеры использования

### Пример 1: Получение и заполнение активной формы

```bash
# 1. Получить список форм
curl http://localhost:1337/api/api-forms/forms

# 2. Получить конфигурацию конкретной формы
curl http://localhost:1337/api/api-forms/form/wibdes091emdo005sllqauhv

# 3. Заполнить форму
curl -X POST http://localhost:1337/api/api-forms/submission/post \
  -H "Content-Type: application/json" \
  -d '{
    "form": "wibdes091emdo005sllqauhv",
    "submission": {
      "тест": "мое значение"
    }
  }'
```

### Пример 2: Обработка ошибок

```bash
# Попытка заполнить неактивную форму
curl -X POST http://localhost:1337/api/api-forms/submission/post \
  -H "Content-Type: application/json" \
  -d '{
    "form": "n80213pgoeeqq6n8ti3vtak4",
    "submission": {"тест": "значение"}
  }'

# Ответ: 403 FormInactiveError
```

### Пример 3: Работа с rate limiting

```bash
# Первая отправка - успешно
curl -X POST http://localhost:1337/api/api-forms/submission/post \
  -H "Content-Type: application/json" \
  -d '{
    "form": "yhewr50pbqgk6t563wvm1aam",
    "submission": {"названиеполя": "первая попытка"}
  }'

# Вторая отправка сразу - ошибка 429
curl -X POST http://localhost:1337/api/api-forms/submission/post \
  -H "Content-Type: application/json" \
  -d '{
    "form": "yhewr50pbqgk6t563wvm1aam",
    "submission": {"названиеполя": "вторая попытка"}
  }'

# Ответ содержит retryAfter в секундах - время до следующей попытки
```

---

## Коды ошибок

| Код | Описание |
|-----|----------|
| 400 | Неверные данные запроса / Ошибка валидации обязательных полей |
| 403 | Форма неактивна |
| 429 | Превышен лимит запросов (rate limiting) |
| 500 | Внутренняя ошибка сервера |

---

## Поля формы

Каждое поле формы имеет следующую структуру:

```json
{
  "name": "название_поля",
  "type": "text|email|number|textarea|checkbox|select|radio|file",
  "label": "Метка поля",
  "placeholder": "Плейсхолдер",
  "description": "Описание поля",
  "validation": {
    "required": true
  },
  "options": [] // для select, radio, checkbox
}
```

---

## Примечания

1. Все формы проверяются на активность перед обработкой
2. **Валидация обязательных полей выполняется на сервере перед сохранением отправки**
3. Для обязательных checkbox полей значение должно быть строго `true`
4. Rate limiting работает на основе IP-адреса клиента
5. Для форм с `oneTimeOnly: true` проверка выполняется по IP и documentId формы
6. Временное окно для rate limiting настраивается в минутах (1, 5, 10, 30, 60, 1440)
7. Описание формы и полей доступно в конфигурации формы

## Изменения в API

### Валидация обязательных полей (добавлено)

**Что изменилось:**
- Добавлена серверная валидация всех обязательных полей формы перед сохранением отправки
- Проверка выполняется после проверки активности формы, но до rate limiting

**Проверяемые условия:**
1. **Обязательные checkbox поля** - значение должно быть `true` или `"true"` (строка)
2. **Обязательные текстовые поля** - значение не должно быть `null`, `undefined` или пустой строкой
3. **Обязательные массивы** - массив не должен быть пустым

**Ошибка валидации:**
- HTTP статус: `400 Bad Request`
- Тип ошибки: `ValidationError`
- Сообщение содержит список всех полей, которые не прошли валидацию
- Поле `details` содержит массив отдельных сообщений об ошибках для каждого поля

**Пример запроса с ошибкой валидации:**
```bash
curl -X POST http://localhost:1337/api/api-forms/submission/post \
  -H "Content-Type: application/json" \
  -d '{
    "form": "documentId_формы",
    "submission": {
      "обязательное_текстовое_поле": "",
      "обязательный_чекбокс": false
    }
  }'
```

**Ответ:**
```json
{
  "error": {
    "status": 400,
    "name": "ValidationError",
    "message": "Поле \"Обязательное текстовое поле\" обязательно для заполнения; Поле \"Обязательный чекбокс\" должно быть отмечено",
    "details": [
      "Поле \"Обязательное текстовое поле\" обязательно для заполнения",
      "Поле \"Обязательный чекбокс\" должно быть отмечено"
    ]
  }
}
```

