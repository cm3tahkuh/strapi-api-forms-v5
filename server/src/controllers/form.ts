/**
 *  controller
 */

import { factories } from '@strapi/strapi';
import { generateNotificationHtml } from '../functions';

export default factories.createCoreController('plugin::api-forms.form', ({ strapi }) => ({
	async findOne(ctx) {
		const data = await strapi.documents('plugin::api-forms.form').findOne(ctx.params);

		return { data };
	},

	async settings(ctx) {
		return { data: { settings: strapi.config.get('plugin::api-forms') } };
	},
	async update(ctx) {
		const { data } = ctx.request.body;
		const { documentId } = ctx.params;
		const response = await strapi.documents('plugin::api-forms.form').update({
			documentId: documentId,
			data,
			populate: { notifications: true },
		});

		const settings = await strapi.documents('plugin::api-forms.setting').findFirst();
		const message = generateNotificationHtml(response, settings);

		const notificationId = response.notifications.find((n) => n.identifier === 'notification')?.documentId;
		const confirmationId = response.notifications.find((n) => n.identifier === 'confirmation')?.documentId;
		if (notificationId) {
			await strapi.documents('plugin::api-forms.notification').update({
				documentId: notificationId,
				data: {
					//@ts-ignore
					message: message,
				},
			});
		} else {
			// In case notification doesn't exist, create it
			await strapi.documents('plugin::api-forms.notification').create({
				data: {
					form: documentId,
					enabled: true,
					identifier: 'notification',
					service: '',
					from: '',
					to: '',
					message: message,
					subject: `New submission from API form: ${response.title}`,
				},
			});
		}

		if (confirmationId) {
			await strapi.documents('plugin::api-forms.notification').update({
				documentId: confirmationId,
				data: {
					//@ts-ignore
					message: message,
				},
			});
		} else {
			// In case confirmation doesn't exist, create it
			await strapi.documents('plugin::api-forms.notification').create({
				data: {
					form: documentId,
					enabled: false,
					identifier: 'confirmation',
					service: '',
					from: '',
					to: '',
					subject: `Thank you for your submission on form: ${response.title}`,
					message: message,
				},
			});
		}

		return { response };
	},
	async delete(ctx) {
		return await strapi.documents('plugin::api-forms.form').delete(ctx.params);
	},

	async getFormConfig(ctx) {
		try {
			const form = await strapi
				.documents('plugin::api-forms.form')
				.findOne({ documentId: ctx.params.id, populate: { submissions: { count: true } } });

			if (!form || form.steps.length === 0) {
				return ctx.badRequest('No form steps found');
			}

			// Convert layout widths into Tailwind grid classes
			const widthClassMap = {
				12: 'col-span-full',
				8: 'col-span-8',
				6: 'col-span-6',
				4: 'col-span-4',
			};

			// Transform the form data
			const formattedSteps = form.steps.map((step) => {
				const layouts = step.layouts;
				return {
					step: step.id,
					fields: layouts.lg.map((fieldLayout) => {
						const fieldData = fieldLayout.field;

						const lgWidth = widthClassMap[fieldLayout.w] || 'col-span-full';
						const mdWidth = widthClassMap[layouts.md.find((f) => f.i === fieldLayout.i)?.w] || 'col-span-full';
						const smWidth = widthClassMap[layouts.sm.find((f) => f.i === fieldLayout.i)?.w] || 'col-span-full';

						return {
							name: fieldData.name,
							type: fieldData.type,
							label: fieldData.label,
							placeholder: fieldData.placeholder || '',
							description: fieldData.description || '',
							classnames: `${smWidth} lg:${lgWidth} md:${mdWidth}`,
							options: fieldData.options || [],
							validation: { required: fieldData.config?.required },
						};
					}),
				};
			});

			if (formattedSteps.length === 1) {
				const fields = formattedSteps.flat().pop();
				delete fields.step;

				return (ctx.body = { 
					fields, 
					description: form.description || '',
					totalSubmissions: form.submissions.count || 0 
				});
			}

			ctx.body = { 
				steps: formattedSteps, 
				description: form.description || '',
				count: formattedSteps.length 
			};
		} catch (error) {
			ctx.throw(500, 'Error fetching form configuration', { error });
		}
	},
}));
