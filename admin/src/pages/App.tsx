import { Page } from '@strapi/strapi/admin';
import { Routes, Route } from 'react-router-dom';
import { Layouts } from '@strapi/strapi/admin';
import { Form } from './Form';
import { HomePage } from './HomePage';
import { Submission } from './Submission';
import { Settings } from './Settings';
import * as Tooltip from '@radix-ui/react-tooltip';

const App = () => {
	return (
		<Tooltip.Provider delayDuration={0} skipDelayDuration={0}>
			<Layouts.Root>
				<Routes>
					<Route index element={<HomePage />} />
					<Route path="/submissions" element={<Submission />} />
					<Route path="/form/:id/submissions" element={<Submission />} />
					<Route path="/settings" element={<Settings />} />
					<Route path="/form" element={<Form />} />
					<Route path={`/form/:id`} element={<Form />} />
					<Route path="*" element={<Page.Error />} />
				</Routes>
			</Layouts.Root>
		</Tooltip.Provider>
	);
};

export { App };
