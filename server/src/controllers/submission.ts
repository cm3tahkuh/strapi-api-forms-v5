/**
 *  controller
 */
import { factories } from '@strapi/strapi';

export default factories.createCoreController('plugin::api-forms.submission', ({ strapi }) => ({
	async find(ctx) {
		const { query } = ctx;
		
		// Если есть фильтр по documentId формы, преобразуем его в id
		if (query.filters && typeof query.filters === 'object' && 'form' in query.filters) {
			const formFilter = query.filters.form as any;
			if (formFilter && formFilter.documentId) {
				const formDocumentId = formFilter.documentId;
				const form = await strapi.documents('plugin::api-forms.form').findOne({ 
					documentId: formDocumentId 
				});
				
				if (form) {
					// Заменяем фильтр на id формы
					query.filters = {
						...query.filters,
						form: {
							id: form.id,
						},
					};
				} else {
					// Если форма не найдена, возвращаем пустой результат
					const pagination = query.pagination as any;
					return {
						data: [],
						meta: {
							pagination: {
								page: pagination?.page || 1,
								pageSize: pagination?.pageSize || 10,
								pageCount: 0,
								total: 0,
							},
						},
					};
				}
			}
		}
		
		// Используем стандартный метод findMany с пагинацией
		const populate = query.populate || ['form', 'files'];
		const pagination = query.pagination as any;
		const page = pagination?.page || 1;
		const pageSize = pagination?.pageSize || 10;
		
		const result = await strapi.documents('plugin::api-forms.submission').findMany({
			filters: query.filters,
			populate,
			pagination: {
				page,
				pageSize,
			},
			sort: query.sort || 'createdAt:desc',
		} as any);
		
		// Получаем общее количество для пагинации
		const total = await strapi.documents('plugin::api-forms.submission').count({
			filters: query.filters,
		} as any);
		
		return {
			data: result,
			meta: {
				pagination: {
					page,
					pageSize,
					pageCount: Math.ceil(total / pageSize),
					total,
				},
			},
		};
	},

	async post(ctx) {
		try {
			const { form, submission, referer } = ctx.request.body;

			if (!form) {
				return ctx.badRequest('No data provided');
			}

			const files = [];

			if (!submission) {
				return ctx.badRequest('Invalid submission data');
			}

			const strapiForm = await strapi.documents('plugin::api-forms.form').findOne({ documentId: form });

			if (!strapiForm) {
				return ctx.badRequest('Form not found');
			}

			// Проверка активности формы
			if (strapiForm.active === false) {
				ctx.status = 403;
				return ctx.send({
					error: {
						status: 403,
						name: 'FormInactiveError',
						message: 'Форма неактивна и не принимает отправки',
					},
				});
			}

			// Валидация обязательных полей
			const submissionData = typeof submission === 'string' ? JSON.parse(submission) : submission;
			const allFields = strapiForm.steps?.flatMap((step) => 
				step.layouts?.lg?.map((layout) => layout.field) || []
			) || [];

			const validationErrors = [];

			for (const field of allFields) {
				if (!field || !field.config?.required) {
					continue;
				}

				const fieldName = field.name;
				const fieldValue = submissionData[fieldName];
				const fieldType = field.type;

				// Проверка наличия поля
				if (fieldValue === undefined || fieldValue === null) {
					validationErrors.push(`Поле "${field.label || fieldName}" обязательно для заполнения`);
					continue;
				}

				// Для checkbox обязательное поле должно быть true
				if (fieldType === 'checkbox') {
					if (fieldValue !== true && fieldValue !== 'true') {
						validationErrors.push(`Поле "${field.label || fieldName}" должно быть отмечено`);
					}
				}
				// Для других типов полей проверяем, что значение не пустое
				else if (typeof fieldValue === 'string' && fieldValue.trim() === '') {
					validationErrors.push(`Поле "${field.label || fieldName}" обязательно для заполнения`);
				}
				// Для массивов проверяем, что они не пустые
				else if (Array.isArray(fieldValue) && fieldValue.length === 0) {
					validationErrors.push(`Поле "${field.label || fieldName}" обязательно для заполнения`);
				}
			}

			if (validationErrors.length > 0) {
				ctx.status = 400;
				return ctx.send({
					error: {
						status: 400,
						name: 'ValidationError',
						message: validationErrors.join('; '),
						details: validationErrors,
					},
				});
			}

			// Rate Limit проверка
			const rateLimitService = strapi.plugin('api-forms').service('rateLimit');
			const rateLimitConfig = strapiForm.rateLimit || {
				enabled: true,
				maxSubmissions: 5,
				timeWindowMinutes: 5,
				oneTimeOnly: false,
			};

			if (rateLimitConfig.enabled) {
				const clientIP = rateLimitService.getClientIP(ctx);
				const checkResult = rateLimitService.checkRateLimit(
					clientIP,
					form,
					rateLimitConfig.maxSubmissions,
					rateLimitConfig.timeWindowMinutes,
					rateLimitConfig.oneTimeOnly || false
				);

				if (!checkResult.allowed) {
					ctx.status = 429;
					return ctx.send({
						error: {
							status: 429,
							name: 'TooManyRequestsError',
							message: checkResult.error || 'Слишком много запросов',
							retryAfter: checkResult.retryAfter || 0,
						},
					});
				}
			}

			// Handle Multiple File Uploads (Strapi 5 format)
			if (ctx.request.files) {
				const uploadedFiles = await strapi
					.plugin('upload')
					.service('upload')
					.upload({
						data: {}, // Optional metadata
						files: Object.values(ctx.request.files).flat(), // Ensure it's an array
					});

				if (uploadedFiles?.length > 0) {
					files.push(...uploadedFiles); // Store the uploaded file references
				}
			}

			return await strapi.documents('plugin::api-forms.submission').create({
				data: {
					form: {
						connect: form,
					},
					submission: JSON.stringify(submissionData),
					files: files.map((file) => file.id), // Store only file IDsr
					referer,
				},
				populate: ['form', 'files'],
			});
		} catch (error) {
			strapi.log.error('Submission error:', error);
			return ctx.internalServerError(JSON.stringify(error.message, error.stack));
		}
	},

	async export(ctx) {
		const { id } = ctx.params;
		return {
			data: await strapi.plugin('api-forms').service('submission').export(id),
			filename: `export-${id}-${Math.random()}.csv`,
		};
	},

	async delete(ctx) {
		const { documentId } = ctx.params;

		try {
			// Находим submission по documentId
			const submission = await strapi.documents('plugin::api-forms.submission').findOne({
				documentId,
			});

			if (!submission) {
				return ctx.notFound('Submission not found');
			}

			// Удаляем submission
			await strapi.documents('plugin::api-forms.submission').delete({
				documentId,
			});

			return ctx.send({ message: 'Submission deleted successfully' });
		} catch (error) {
			strapi.log.error('Error deleting submission:', error);
			return ctx.internalServerError('Error deleting submission');
		}
	},
}));
