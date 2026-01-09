import type { Core } from '@strapi/strapi';


const bootstrap = ({ strapi }: { strapi: Core.Strapi }) => {
	// CRON задача для автоматического управления активностью форм по датам отключена
	// Теперь активность форм управляется только через переключатель в админ-панели
};

export default bootstrap;
