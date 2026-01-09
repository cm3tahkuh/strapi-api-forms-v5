import { errors } from '@strapi/utils';
import { generateNotificationHtml } from '../../functions';
const { ForbiddenError } = errors;

function isJSON(str) {
	try {
		let newJson = JSON.parse(str);
		return (typeof newJson === 'object' && newJson !== str) || false;
	} catch (e) {
		return false;
	}
}

export default {
	async beforeCreate(event) {},
	async afterCreate(event) {
		const { result } = event;

		if (!result.id) {
			throw new ForbiddenError('No form');
		}

		const settings = await strapi.documents('plugin::api-forms.setting').findFirst();
		const message = generateNotificationHtml(result, settings);

		const notification = await strapi.documents('plugin::api-forms.notification').create({
			data: {
				form: result.id,
				enabled: true,
				identifier: 'notification',
				service: '',
				from: '',
				to: '',
				message: message,
				subject: `New submission from API form: ${result.title}`,
			},
		});

		const confirmation = await strapi.documents('plugin::api-forms.notification').create({
			data: {
				form: result.id,
				enabled: false,
				identifier: 'confirmation',
				service: '',
				from: '',
				to: '',
				subject: `Thank you for your submission on form: ${result.title}`,
				message: message,
			},
		});

		return [confirmation, notification];
	},
};
