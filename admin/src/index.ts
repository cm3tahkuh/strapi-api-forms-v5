import { PLUGIN_ID } from './pluginId';
import { Initializer } from './components/Initializer';
import { PluginIcon } from './components/PluginIcon';

export default {
	register(app: any) {
		app.addMenuLink({
			to: `plugins/${PLUGIN_ID}`,
			icon: PluginIcon,
			intlLabel: {
				id: `${PLUGIN_ID}.plugin.name`,
				defaultMessage: 'Формы',
			},
			Component: async () => {
				const { App } = await import('./pages/App');

				return App;
			},
		});

		app.registerPlugin({
			id: PLUGIN_ID,
			initializer: Initializer,
			isReady: false,
			name: PLUGIN_ID,
		});
	},

	async registerTrads({ locales }: { locales: string[] }) {
		// Загружаем только русский язык для всех локалей
		const { default: ruData } = await import('./translations/ru.json');

		return locales.map((locale) => ({
			data: ruData,
			locale,
		}));
	},
};
