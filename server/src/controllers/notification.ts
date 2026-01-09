import { factories } from '@strapi/strapi';

export default factories.createCoreController('plugin::api-forms.notification', ({ strapi }) => ({
	async findOne(ctx) {
		const data = await strapi.documents('plugin::api-forms.notification').findOne({ ...ctx.params, populate: { form: '*' } });
		return { data };
	},
}));
