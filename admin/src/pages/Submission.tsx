//@ts-nocheck
import { useIntl } from 'react-intl';
import { useEffect, useState } from 'react';
import { Box, Flex, Grid, Button, LinkButton, Modal, Typography, VisuallyHidden, Dialog } from '@strapi/design-system';
import { Cog, Eye, File, Mail, Message, Trash } from '@strapi/icons';
import { PLUGIN_ID } from '../pluginId';
import { getTranslation } from '../utils/getTranslation';
import { BackButton, Layouts, Page, Pagination, Table, useAuth, useQueryParams } from '@strapi/strapi/admin';
import { NavLink, useLocation, useNavigate, useParams } from 'react-router-dom';
import submissionRequests from '../api/submission';
import formRequests from '../api/form';

const Submission = () => {
	const navigate = useNavigate();
	const location = useLocation();
	const { id: formId } = useParams(); // ID формы из URL (если есть)

	const [isModalOpen, setIsModalOpen] = useState(false);
	const [selectedSubmission, setSelectedSubmission] = useState(null);
	const [formTitle, setFormTitle] = useState<string | null>(null);
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
	const [submissionToDelete, setSubmissionToDelete] = useState(null);

	const truncateValue = (value, maxLength = 100) => {
		if (typeof value === 'string' && value.length > maxLength) {
			return value.substring(0, maxLength) + '...'; // Truncate and add ellipsis
		}
		return value;
	};

	const handleOpenModal = (submission) => {
		setSelectedSubmission(submission);
		setIsModalOpen(true);
	};

	const handleCloseModal = () => {
		setIsModalOpen(false);
		setSelectedSubmission(null);
	};

	const handleOpenDeleteDialog = (submission) => {
		setSubmissionToDelete(submission);
		setIsDeleteDialogOpen(true);
	};

	const handleCloseDeleteDialog = () => {
		setIsDeleteDialogOpen(false);
		setSubmissionToDelete(null);
	};

	const handleDeleteSubmission = async () => {
		if (!submissionToDelete) return;

		try {
			await submissionRequests.deleteSubmission(token, submissionToDelete.documentId);
			// Перезагружаем данные после удаления
			const response = await submissionRequests.getSubmissions(token, query, formId);
			setResults(response.data || []);
			setPagination(response.meta?.pagination || null);
			setIsDeleteDialogOpen(false);
			setSubmissionToDelete(null);
		} catch (error) {
			console.error('Error deleting submission:', error);
			// Можно добавить уведомление об ошибке
		}
	};

	const { formatMessage } = useIntl();
	const [isFetching, setIsFetching] = useState(false);
	const [error, setError] = useState(null);

	const [results, setResults] = useState([]);
	const [pagination, setPagination] = useState([]);

	const token = useAuth('Admin', (state) => state.token);

	if (!token) {
		return <Page.Loading />;
	}

	const [{ query }, querySet] = useQueryParams<{
		page?: number;
		pageSize?: number;
	}>({
		page: 1,
		pageSize: 10,
	});

	// Загружаем название формы, если есть formId
	useEffect(() => {
		const fetchFormTitle = async () => {
			if (formId && token) {
				try {
					const form = await formRequests.getForm(token, formId);
					setFormTitle(form.title);
				} catch (error) {
					console.error('Error fetching form title:', error);
				}
			} else {
				setFormTitle(null);
			}
		};

		fetchFormTitle();
	}, [formId, token]);

	useEffect(() => {
		const fetchSubmissions = async () => {
			setIsFetching(true);
			try {
				const response = await submissionRequests.getSubmissions(token, query, formId);
				setResults(response.data || []);
				setPagination(response.meta?.pagination || null);
			} catch (error) {
				setResults([]);
				setPagination(null);
				setError(error);
			} finally {
				setIsFetching(false);
			}
		};

		fetchSubmissions();
	}, [location.search, formId]);

	const tableHeaders: any = [
		'#',
		formatMessage({
			id: getTranslation(`submission.title`),
		}),
		formatMessage({
			id: getTranslation(`list.submission_time`),
		}),
		<VisuallyHidden>Actions</VisuallyHidden>,
	];

	if (isFetching) {
		return <Page.Loading />;
	}

	if (error) {
		return <Page.Error />;
	}

	return (
		<>
			<Layouts.Root>
				<Page.Title>{formatMessage({ id: getTranslation('submissions.label') })}</Page.Title>
				{/* @ts-ignore */}
				<Page.Main style={{ position: 'relative' }}>
					<Layouts.Header
						title={formTitle ? `${formTitle} - ${formatMessage({ id: getTranslation('submissions.label') })}` : formatMessage({ id: getTranslation('submissions.label') })}
						navigationAction={<BackButton disabled={undefined} />}
					/>

					<Layouts.Content>
						<Flex gap={4} style={{ marginBottom: '20px' }}>
							<LinkButton variant="tertiary" startIcon={<Mail />} to={`/plugins/${PLUGIN_ID}`} tag={NavLink}>
								{formatMessage({ id: getTranslation('forms.all') })}
							</LinkButton>
							<LinkButton variant="primary" startIcon={<Message />} to={`/plugins/${PLUGIN_ID}/submissions`} tag={NavLink}>
								{formatMessage({ id: getTranslation('submissions.all') })}
							</LinkButton>
							<LinkButton variant="tertiary" startIcon={<Cog />} to={`/plugins/${PLUGIN_ID}/settings`} tag={NavLink}>
								{formatMessage({ id: getTranslation('settings') })}
							</LinkButton>
						</Flex>
						<Grid.Root>
							<Grid.Item col={12} s={12}>
								<Box style={{ width: '100%' }}>
									<Table.Root rows={results} headers={tableHeaders} isLoading={isFetching}>
										<Table.Content>
											<Table.Head>
												{tableHeaders.map((header: any, index) => (
													<Table.HeaderCell key={index} name={header} label={header} />
												))}
											</Table.Head>
											<Table.Loading />
											<Table.Empty />
											<Table.Body>
											{results && Array.isArray(results) &&
												results.map((row: any) => {
													// Форматируем дату в локальном часовом поясе пользователя
													const creationDate = row.createdAt ? new Intl.DateTimeFormat('ru-RU', {
														year: 'numeric',
														month: '2-digit',
														day: '2-digit',
														hour: '2-digit',
														minute: '2-digit',
														second: '2-digit',
														timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
													}).format(new Date(row.createdAt)) : 'N/A';

													// Обрабатываем submission (может быть строкой JSON или объектом)
													let submission = [];
													if (row.submission) {
														try {
															const submissionData = typeof row.submission === 'string' ? JSON.parse(row.submission) : row.submission;
															if (submissionData && typeof submissionData === 'object') {
																submission = Object.entries(submissionData).map((value, key) => `${value.join(': ')}  `);
															}
														} catch (e) {
															console.error('Error parsing submission:', e);
															submission = ['Ошибка парсинга данных'];
														}
													}

														return (
															<Table.Row key={row.id}>
																<Table.Cell>
																	<Typography textColor="neutral800">{row.id}</Typography>
																</Table.Cell>
																<Table.Cell>
																	<Typography textColor="neutral800">
																		<div>{submission && submission.length > 0 ? truncateValue(submission.join(' - ')) : 'Нет данных'}</div>
																	</Typography>
																</Table.Cell>
																<Table.Cell>
																	<Typography textColor="neutral800">{creationDate}</Typography>
																</Table.Cell>

																<Table.Cell>
																	<Flex gap={2}>
																	<LinkButton variant="secondary" onClick={() => handleOpenModal(row)}>
																		<Flex gap={2} justifyContent="flex-start" alignItems="center">
																			<Eye />
																			{formatMessage({ id: getTranslation('submissions.submission.view_details') })}
																		</Flex>
																	</LinkButton>
																		<Button
																			variant="danger-light"
																			size="S"
																			onClick={() => handleOpenDeleteDialog(row)}
																		>
																			<Trash />
																		</Button>
																	</Flex>
																</Table.Cell>
															</Table.Row>
														);
													})}
											</Table.Body>
										</Table.Content>
									</Table.Root>
									{
										<Pagination.Root {...pagination} defaultPageSize={10}>
											<Pagination.PageSize />
											<Pagination.Links />
										</Pagination.Root>
									}
								</Box>
							</Grid.Item>
						</Grid.Root>
						<Modal.Root open={isModalOpen && selectedSubmission} onOpenChange={handleCloseModal}>
							<Modal.Content>
								<Modal.Header>
									<Typography variant="beta">{formatMessage({ id: getTranslation('submissions.submission.details') })}</Typography>
								</Modal.Header>
								<Modal.Body>
									{selectedSubmission?.submission && selectedSubmission?.form && (
										<Box padding={0}>
											<Box background="neutral100" padding={4} shadow="tableShadow" hasRadius>
												{selectedSubmission.referer && (
													<Typography>
														<strong>Referer:</strong> {selectedSubmission.referer}
													</Typography>
												)}
												{Object.entries(typeof selectedSubmission.submission === 'string' ? JSON.parse(selectedSubmission.submission) : selectedSubmission.submission).map(([key, value]) => {
													const allFields =
														selectedSubmission.form.steps?.flatMap((step) => step.layouts?.lg?.map((layout) => layout.field) || []) || [];
													const fieldConfig = allFields.find((f) => f.name === key);
													const label = fieldConfig?.label || key;
													const fieldType = fieldConfig?.type;

													// Обработка checkbox значений
													let displayValue = value;
													if (fieldType === 'checkbox' && typeof value === 'boolean') {
														displayValue = value ? 'Да' : 'Нет';
													} else if (typeof value === 'boolean') {
														displayValue = value ? 'Да' : 'Нет';
													}

													return (
														<>
															<Box key={key} justifyContent="space-between" alignItems="flex-start" wrap="wrap">
																{/* Key */}
																<Typography fontWeight="bold" textColor="neutral800" style={{ flex: 1, maxWidth: '200px' }}>
																	{label}:
																</Typography>
															</Box>
															<Box marginBottom={4} justifyContent="space-between" alignItems="flex-start" wrap="wrap">
																{/* Value */}
																<Typography textColor="neutral800" style={{ flex: 2 }}>
																	{typeof value === 'object' && !Array.isArray(value) ? (
																		<pre
																			style={{
																				margin: 0,
																				whiteSpace: 'pre-wrap',
																				wordWrap: 'break-word',
																			}}
																		>
																			{JSON.stringify(value, null, 2)}
																		</pre>
																	) : (
																		displayValue || 'N/A'
																	)}
																</Typography>
															</Box>
														</>
													);
												})}
											</Box>
											{selectedSubmission.files && selectedSubmission.files.length > 0 && (
												<Box marginTop={4} padding={4} background="neutral100" shadow="tableShadow" hasRadius>
													<Typography variant="bold" marginBottom={4}>
														Attached Files
													</Typography>
													{selectedSubmission.files.map((file) => (
														<Box key={file.id} marginBottom={2}>
															<LinkButton variant="tertiary" startIcon={<File />} href={file.url} target="_blank" rel="noopener noreferrer">
																{file.name}
															</LinkButton>
														</Box>
													))}
												</Box>
											)}
										</Box>
									)}
								</Modal.Body>
								<Modal.Footer>
									<Modal.Close>
										<Button variant="tertiary">{formatMessage({ id: getTranslation('close') })}</Button>
									</Modal.Close>
								</Modal.Footer>
							</Modal.Content>
						</Modal.Root>

						{/* Модальное окно подтверждения удаления */}
						<Dialog.Root open={isDeleteDialogOpen} onOpenChange={handleCloseDeleteDialog}>
							<Dialog.Content>
								<Dialog.Header>
									<Typography variant="beta">
										{formatMessage({ id: getTranslation('submissions.submission.delete_confirm_title') })}
									</Typography>
								</Dialog.Header>
								<Dialog.Body>
									<Typography>
										{formatMessage({ id: getTranslation('submissions.submission.delete_confirm_message') })}
									</Typography>
									{submissionToDelete && (
										<Box marginTop={4} padding={3} background="neutral100" hasRadius>
											<Typography variant="omega" fontWeight="bold">
												ID: {submissionToDelete.id}
											</Typography>
											<Typography variant="omega" textColor="neutral600">
												{new Date(submissionToDelete.createdAt).toLocaleString('ru-RU')}
											</Typography>
										</Box>
									)}
								</Dialog.Body>
								<Dialog.Footer>
									<Dialog.Cancel>
										<Button variant="tertiary">
											{formatMessage({ id: getTranslation('cancel') })}
										</Button>
									</Dialog.Cancel>
									<Button variant="danger" onClick={handleDeleteSubmission}>
										{formatMessage({ id: getTranslation('delete') })}
									</Button>
								</Dialog.Footer>
							</Dialog.Content>
						</Dialog.Root>
					</Layouts.Content>
				</Page.Main>
			</Layouts.Root>
		</>
	);
};

export { Submission };
