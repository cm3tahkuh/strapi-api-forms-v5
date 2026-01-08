/**
 * Rate Limit Service
 * In-memory rate limiting for form submissions
 */

// Структура: Map<"IP:FormID", { timestamps: number[], limit: number, window: number }>
const rateLimitMap = new Map<
	string,
	{
		timestamps: number[];
		limit: number;
		window: number; // в миллисекундах
		oneTimeOnly: boolean;
	}
>();

/**
 * Получить IP адрес клиента
 * Приоритет: x-forwarded-for -> request.ip -> socket.remoteAddress
 */
export function getClientIP(ctx: any): string {
	// 1. Проверяем x-forwarded-for (если за прокси/балансировщиком)
	const forwarded = ctx.request.headers['x-forwarded-for'];
	if (forwarded) {
		// Может быть несколько IP через запятую, берем первый
		const ip = forwarded.split(',')[0].trim();
		if (ip) return ip;
	}

	// 2. Прямой IP
	if (ctx.request.ip) {
		return ctx.request.ip;
	}

	// 3. Fallback на socket
	if (ctx.request.socket?.remoteAddress) {
		return ctx.request.socket.remoteAddress;
	}

	// 4. Если ничего не найдено, возвращаем unknown
	return 'unknown';
}

/**
 * Проверить rate limit для IP и формы
 * @returns { allowed: boolean, retryAfter?: number, error?: string }
 */
export function checkRateLimit(
	ip: string,
	formId: string,
	maxSubmissions: number,
	timeWindowMinutes: number,
	oneTimeOnly: boolean
): { allowed: boolean; retryAfter?: number; error?: string } {
	const key = `${ip}:${formId}`;
	const now = Date.now();
	const timeWindowMs = oneTimeOnly ? Infinity : timeWindowMinutes * 60 * 1000;

	// Получаем или создаем запись
	let record = rateLimitMap.get(key);

	if (!record) {
		// Первая запись для этого IP+Form
		record = {
			timestamps: [now],
			limit: maxSubmissions,
			window: timeWindowMs,
			oneTimeOnly: oneTimeOnly,
		};
		rateLimitMap.set(key, record);
		return { allowed: true };
	}

	// Обновляем настройки (на случай если они изменились в форме)
	record.limit = maxSubmissions;
	record.window = timeWindowMs;
	record.oneTimeOnly = oneTimeOnly;

	// Очищаем старые записи (старше timeWindow)
	if (!oneTimeOnly) {
		record.timestamps = record.timestamps.filter((timestamp) => {
			return now - timestamp < timeWindowMs;
		});
	}

	// Проверяем лимит
	if (oneTimeOnly) {
		// Если форма может быть заполнена только 1 раз за все время
		if (record.timestamps.length >= 1) {
			const oldestTimestamp = Math.min(...record.timestamps);
			const retryAfter = Math.ceil((oldestTimestamp + timeWindowMs - now) / 1000);
			return {
				allowed: false,
				retryAfter: retryAfter > 0 ? retryAfter : 0,
				error: 'Эта форма может быть заполнена только один раз',
			};
		}
	} else {
		// Обычная проверка лимита
		if (record.timestamps.length >= maxSubmissions) {
			// Находим самый старый timestamp в окне
			const oldestTimestamp = Math.min(...record.timestamps);
			const retryAfter = Math.ceil((oldestTimestamp + timeWindowMs - now) / 1000);
			return {
				allowed: false,
				retryAfter: retryAfter > 0 ? retryAfter : 0,
				error: `Превышен лимит запросов. Можно отправить ${maxSubmissions} раз за ${timeWindowMinutes} минут`,
			};
		}
	}

	// Добавляем текущий timestamp
	record.timestamps.push(now);

	// Если oneTimeOnly, оставляем только одну запись
	if (oneTimeOnly && record.timestamps.length > 1) {
		record.timestamps = [record.timestamps[0]];
	}

	return { allowed: true };
}

/**
 * Очистить старые записи (опционально, для периодической очистки)
 */
export function cleanupOldRecords(): void {
	const now = Date.now();
	const keysToDelete: string[] = [];

	rateLimitMap.forEach((record, key) => {
		if (!record.oneTimeOnly) {
			// Удаляем записи, где все timestamps старше окна
			const validTimestamps = record.timestamps.filter((timestamp) => {
				return now - timestamp < record.window;
			});

			if (validTimestamps.length === 0) {
				keysToDelete.push(key);
			} else {
				record.timestamps = validTimestamps;
			}
		}
	});

	keysToDelete.forEach((key) => rateLimitMap.delete(key));
}

export default {
	getClientIP,
	checkRateLimit,
	cleanupOldRecords,
};


