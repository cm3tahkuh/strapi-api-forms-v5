//@ts-nocheck
/**
 *  service
 */
import { factories } from '@strapi/strapi';
import * as XLSX from 'xlsx';

export default factories.createCoreService('plugin::api-forms.submission', ({ strapi }) => ({
	async export(formId) {
		//@ts-ignore
		const entities = await strapi
			.documents('plugin::api-forms.form')
			.findFirst({ filters: { documentId: formId }, populate: { submissions: '*' } });

		if (!entities || entities.submissions.length === 0) {
			return;
		}

		// Получаем все поля формы для определения типов
		const allFields = entities.steps?.flatMap((step) => step.layouts?.lg?.map((layout) => layout.field) || []) || [];
		const fieldTypeMap = {};
		allFields.forEach((field) => {
			if (field && field.name) {
				fieldTypeMap[field.name] = field.type;
			}
		});

		const data = entities.submissions.map((result) => {
			const submission = typeof result.submission === 'string' ? JSON.parse(result.submission) : result.submission;
			const processedSubmission = {};

			// Обрабатываем каждое поле
			Object.entries(submission).forEach(([key, value]) => {
				const fieldType = fieldTypeMap[key];
				// Преобразуем checkbox значения в "Да"/"Нет"
				if (fieldType === 'checkbox' && typeof value === 'boolean') {
					processedSubmission[key] = value ? 'Да' : 'Нет';
				} else if (typeof value === 'boolean') {
					// Также обрабатываем любые boolean значения
					processedSubmission[key] = value ? 'Да' : 'Нет';
				} else {
					processedSubmission[key] = value;
				}
			});

			// Форматируем createdAt в локальном часовом поясе
			const createdAtDate = new Date(result.createdAt);
			const formattedDate = createdAtDate.toLocaleString('ru-RU', {
				year: 'numeric',
				month: '2-digit',
				day: '2-digit',
				hour: '2-digit',
				minute: '2-digit',
				second: '2-digit',
				timeZone: 'Europe/Moscow', // Используем московское время как локальное
			});

			return {
				...processedSubmission,
				'Время заполнения': formattedDate,
			};
		});

		// Создаем Excel файл
		const worksheet = XLSX.utils.json_to_sheet(data);
		const workbook = XLSX.utils.book_new();
		XLSX.utils.book_append_sheet(workbook, worksheet, 'Submissions');

		// Возвращаем buffer
		return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
	},

	async upload(file) {
		try {
			const createdFiles = await strapi.plugins.upload.services.upload.upload({
				data: {
					fileInfo: {
						name: file.name,
						caption: file.name,
						alternativeText: file.name,
					},
				},
				files: file,
			});

			return createdFiles[0];
		} catch (error) {
			strapi.log.error(error);
		}
	},
}));
