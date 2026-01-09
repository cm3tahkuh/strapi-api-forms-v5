//@ts-nocheck
import fetchInstance from '../utils/fetch';
import { SubmissionResponse, SubmissionsResponse } from '../utils/types';
import { stringify } from 'qs';

const submissionRequests = {
		getSubmissions: async (token: string, queryFilter?: object, formId?: string): Promise<SubmissionsResponse> => {
			const queryParams: any = {
				sort: 'createdAt:desc',
				populate: ['form', 'files'],
				pagination: { page: queryFilter?.page, pageSize: queryFilter?.pageSize },
			};

			// Если передан formId, добавляем фильтр по форме
			if (formId) {
				queryParams.filters = {
					form: {
						documentId: formId,
					},
				};
			}

			const data = await fetchInstance(
				`submissions?${stringify(queryParams)}`,
				token,
				'GET',
				null,
				null,
				true
			);

		return data.json();
	},

	getSubmission: async (token: string, id: string): Promise<SubmissionResponse> => {
		const data = await fetchInstance(`submission/${id}`, token, 'GET', null, null, true);

		return data.json();
	},
};

export default submissionRequests;
