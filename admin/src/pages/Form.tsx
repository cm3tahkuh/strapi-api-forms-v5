import { FormBuilder } from '../components/FormBuilder';
import { FormProvider, useFormContext } from '../context/FormContext';
import { useNavigate, useParams } from 'react-router-dom';
import { useIntl } from 'react-intl';
import { getTranslation } from '../utils/getTranslation';
import { Box, Button, Dialog, Field, Flex, Grid, Textarea, Typography, Checkbox, NumberInput, SingleSelect, SingleSelectOption, Divider, Switch } from '@strapi/design-system';
import { useEffect, useState } from 'react';
import { CheckCircle } from '@strapi/icons';
import { BackButton, Layouts, Page, useAuth, useFetchClient } from '@strapi/strapi/admin';
import AlertWrapper from '../components/Layout/AlertWrapper';
import formRequests from '../api/form';
import omit from 'lodash/omit';
import { PLUGIN_ID } from '../pluginId';
import * as Tooltip from '@radix-ui/react-tooltip';

type FormParams = {
	id?: string;
};

const FormContent = () => {
	const { get } = useFetchClient();
	const history = useNavigate();
	const { formatMessage } = useIntl();
	const { id } = useParams<FormParams>();
	const token = useAuth('Admin', (state) => state.token);

	// context
	const { state, dispatch } = useFormContext();

	// states
	const [isLoading, setIsLoading] = useState<boolean>(true);
	const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
	const [showAlert, toggleAlert] = useState<boolean>(false);
	const [alertVariant, setAlertVariant] = useState<string>('success');
	const [alertMessage, setAlertMessage] = useState<string>('');
	const [response, setResponse] = useState<any>(null);

	useEffect(() => {
		setTimeout(() => {
			if (showAlert) {
				toggleAlert(false);
			}
		}, 5000);
	}, [alertVariant]);
	useEffect(() => {
		const fetchSettings = async () => {
			const { data } = await get(`/${PLUGIN_ID}/setting`, {
				headers: {
					Authorization: `Bearer ${token}`,
				},
			});
			if (!data.data) {
				return;
			}
			dispatch({
				type: 'EDIT_FORM',
				payload: {
					successMessage: data.data.globalSuccessMessage,
				},
			});

			dispatch({
				type: 'EDIT_FORM',
				payload: {
					errorMessage: data.data.globalErrorMessage,
				},
			});
		};

		fetchSettings();

		if (!id) {
			// Инициализация для новой формы
			dispatch({
				type: 'EDIT_FORM',
				payload: {
					active: true, // Форма активна по умолчанию
					rateLimit: state.rateLimit || {
						enabled: true,
						maxSubmissions: 5,
						timeWindowMinutes: 5,
						oneTimeOnly: false,
					},
				},
			});
			setIsLoading(false);

			return;
		}

		formRequests
			.getForm(token!, id)
			.then((result) => {
				// Инициализация rateLimit если его нет
				if (!result.rateLimit) {
					result.rateLimit = {
						enabled: true,
						maxSubmissions: 5,
						timeWindowMinutes: 5,
						oneTimeOnly: false,
					};
				}

				dispatch({
					type: 'EDIT_FORM',
					payload: result,
				});
			})
			.finally(() => setIsLoading(false));
	}, []);

	const onSave = async () => {
		if (!state.title || !state.steps || !state.successMessage || !state.errorMessage) {
			setAlertVariant('danger');
			return toggleAlert(true);
		}

		const data = omit(state, ['currentStep']);

		try {
			if (!id) {
				const result = await formRequests.submitForm(token!, data);
				setResponse(result.data);

				return setIsDialogOpen(true);
			}

			const result = await formRequests.updateForm(token!, id!, data);
			// Сохраняем documentId для показа диалога
			setResponse({ documentId: id });
			
			// Показываем диалог успеха
			setIsDialogOpen(true);
		} catch (error: any) {
			setAlertMessage(error.message);
			setAlertVariant('danger');

			return toggleAlert(true);
		}
	};

	if (isLoading) {
		return <Page.Loading />;
	}

	return (
		<Layouts.Root>
			<Page.Title>{formatMessage({ id: getTranslation('heading.menu') })}</Page.Title>
			{/* @ts-ignore */}
			<Page.Main style={{ position: 'relative' }}>
				{showAlert ? (
					<AlertWrapper
						variant={alertVariant}
						toggleAlert={toggleAlert}
						message={alertMessage !== '' ? alertMessage : formatMessage({ id: getTranslation(`alert.description.${alertVariant}`) })}
					/>
				) : (
					<></>
				)}

				<Layouts.Header
					title={formatMessage({ id: getTranslation('heading.menu') })}
					subtitle={formatMessage({
						id: getTranslation(id ? 'heading.edit' : 'heading.add'),
					})}
					primaryAction={
						<Button onClick={onSave}>
							{formatMessage({
								id: getTranslation('save'),
							})}
						</Button>
					}
					navigationAction={<BackButton fallback={`/plugins/${PLUGIN_ID}`} disabled={false} />}
				/>

				<Layouts.Content>
					<Box>
						<Box background="neutral100" padding={6} marginBottom={4} shadow="filterShadow" hasRadius>
							<Grid.Root gap={4}>
								<Grid.Item col={12} xs={12}>
									<Field.Root
										name="title"
										required
										style={{ width: '100%' }}
										error={!state.title && showAlert && alertMessage === '' ? formatMessage({ id: getTranslation(`required`) }) : ''}
									>
										<Field.Label>{formatMessage({ id: getTranslation(`forms.fields.title`) })}</Field.Label>
										<Field.Input
											name="title"
											type="text"
											value={state.title}
											onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
												dispatch({
													type: 'EDIT_FORM',
													payload: {
														title: event.currentTarget.value,
													},
												})
											}
										/>
										<Field.Error />
									</Field.Root>
								</Grid.Item>
								<Grid.Item col={12} xs={12}>
									<Field.Root name="description" style={{ width: '100%' }}>
										<Field.Label>{formatMessage({ id: getTranslation(`forms.fields.description`) })}</Field.Label>
										<Textarea
											name="description"
											value={state.description || ''}
											onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) =>
												dispatch({
													type: 'EDIT_FORM',
													payload: {
														description: event.currentTarget.value,
													},
												})
											}
										/>
									</Field.Root>
								</Grid.Item>
								<Grid.Item col={12} xs={12}>
									<Field.Root name="active" style={{ width: '100%' }}>
										<Field.Label>{formatMessage({ id: getTranslation(`forms.fields.active`) })}</Field.Label>
										<Flex gap={2} alignItems="center">
											<Switch
												onCheckedChange={(value: boolean) =>
													dispatch({
														type: 'EDIT_FORM',
														payload: {
															active: value,
														},
													})
												}
												checked={state.active !== false}
											/>
											<Typography variant="pi" textColor={state.active !== false ? "success600" : "neutral600"}>
												{state.active !== false 
													? formatMessage({ id: getTranslation(`forms.fields.active.on`) })
													: formatMessage({ id: getTranslation(`forms.fields.active.off`) })
												}
											</Typography>
										</Flex>
									</Field.Root>
								</Grid.Item>
								<Grid.Item col={12} xs={12}>
									<Field.Root
										required
										name="successMessage"
										style={{ width: '100%' }}
										error={
											!state.successMessage && showAlert && alertMessage === '' ? formatMessage({ id: getTranslation(`required`) }) : ''
										}
									>
										<Field.Label>{formatMessage({ id: getTranslation(`forms.fields.successMessage`) })}</Field.Label>
										<Textarea
											name="successMessage"
											type="text"
											value={state.successMessage}
											onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
												dispatch({
													type: 'EDIT_FORM',
													payload: {
														successMessage: event.currentTarget.value,
													},
												})
											}
										/>
										<Field.Error />
									</Field.Root>
								</Grid.Item>
								<Grid.Item col={12} xs={12}>
									<Field.Root
										required
										name="errorMessage"
										style={{ width: '100%' }}
										error={!state.errorMessage && showAlert && alertMessage === '' ? formatMessage({ id: getTranslation(`required`) }) : ''}
									>
										<Field.Label>{formatMessage({ id: getTranslation(`forms.fields.errorMessage`) })}</Field.Label>
										<Textarea
											name="errorMessage"
											type="text"
											value={state.errorMessage}
											onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
												dispatch({
													type: 'EDIT_FORM',
													payload: {
														errorMessage: event.currentTarget.value,
													},
												})
											}
										/>
										<Field.Error />
									</Field.Root>
								</Grid.Item>
							</Grid.Root>
						</Box>

						{/* Rate Limit Settings */}
						<Box background="neutral100" padding={6} marginBottom={4} shadow="filterShadow" hasRadius>
							<Typography variant="beta" fontWeight="bold" marginBottom={4}>
								Защита от спама
							</Typography>
							<Grid.Root gap={4}>
								<Grid.Item col={12} xs={12}>
									<Checkbox
										checked={state.rateLimit?.enabled !== false}
										onCheckedChange={(checked: boolean) =>
											dispatch({
												type: 'EDIT_FORM',
												payload: {
													rateLimit: {
														...state.rateLimit,
														enabled: checked,
														maxSubmissions: state.rateLimit?.maxSubmissions || 5,
														timeWindowMinutes: state.rateLimit?.timeWindowMinutes || 5,
														oneTimeOnly: state.rateLimit?.oneTimeOnly || false,
													},
												},
											})
										}
									>
										Включить защиту от спама
									</Checkbox>
								</Grid.Item>

								{state.rateLimit?.enabled !== false && (
									<>
										<Grid.Item col={6} xs={12}>
											<Field.Root>
												<Field.Label>Максимальное количество отправок</Field.Label>
												<NumberInput
													value={state.rateLimit?.maxSubmissions || 5}
													onValueChange={(value: number) => {
														const minValue = 1;
														// Блокируем значения меньше 1
														if (value === null || value === undefined || isNaN(value) || value < minValue) {
															return; // Не обновляем состояние, если значение недопустимо
														}
														dispatch({
															type: 'EDIT_FORM',
															payload: {
																rateLimit: {
																	...state.rateLimit,
																	maxSubmissions: value,
																},
															},
														});
													}}
													onBlur={(e: React.FocusEvent<HTMLInputElement>) => {
														const inputValue = parseInt(e.target.value, 10);
														if (isNaN(inputValue) || inputValue < 1) {
															// Если значение недопустимо, устанавливаем минимальное
															dispatch({
																type: 'EDIT_FORM',
																payload: {
																	rateLimit: {
																		...state.rateLimit,
																		maxSubmissions: 1,
																	},
																},
															});
														}
													}}
													min={1}
													step={1}
												/>
											</Field.Root>
										</Grid.Item>

										<Grid.Item col={6} xs={12}>
											<Field.Root>
												<Field.Label>Временное окно</Field.Label>
												<SingleSelect
													value={String(state.rateLimit?.timeWindowMinutes || 5)}
													onChange={(value: string) =>
														dispatch({
															type: 'EDIT_FORM',
															payload: {
																rateLimit: {
																	...state.rateLimit,
																	timeWindowMinutes: parseInt(value),
																},
															},
														})
													}
												>
													<SingleSelectOption value="1">1 минута</SingleSelectOption>
													<SingleSelectOption value="5">5 минут</SingleSelectOption>
													<SingleSelectOption value="10">10 минут</SingleSelectOption>
													<SingleSelectOption value="30">30 минут</SingleSelectOption>
													<SingleSelectOption value="60">1 час</SingleSelectOption>
													<SingleSelectOption value="1440">24 часа</SingleSelectOption>
												</SingleSelect>
											</Field.Root>
										</Grid.Item>

										<Grid.Item col={12} xs={12}>
											<Checkbox
												checked={state.rateLimit?.oneTimeOnly || false}
												onCheckedChange={(checked: boolean) =>
													dispatch({
														type: 'EDIT_FORM',
														payload: {
															rateLimit: {
																...state.rateLimit,
																oneTimeOnly: checked,
															},
														},
													})
												}
											>
												Форма может быть заполнена только один раз за все время
											</Checkbox>
										</Grid.Item>
									</>
								)}
							</Grid.Root>
						</Box>
					</Box>
					<FormBuilder />
					{isDialogOpen && (
						<Dialog.Root open={isDialogOpen} onDismiss={() => setIsDialogOpen(false)}>
							<Dialog.Content>
								<Dialog.Header>{formatMessage({ id: getTranslation('alert.success') })}</Dialog.Header>
								<Dialog.Body icon={<CheckCircle fill="success600" />}>
									{formatMessage({ id: getTranslation('alert.description.success') })}
								</Dialog.Body>
								<Dialog.Footer>
									{response && response.documentId ? (
										<>
											<Dialog.Cancel>
												<Button
													fullWidth
													variant="secondary"
													onClick={() => {
														history(`/plugins/${PLUGIN_ID}/form/${response.documentId}`);
														setIsDialogOpen(false);
													}}
												>
													{formatMessage({ id: getTranslation('back_to_form') })}
												</Button>
											</Dialog.Cancel>
											<Dialog.Action>
												<Button fullWidth variant="primary" onClick={() => history(`/plugins/${PLUGIN_ID}`)}>
													{formatMessage({ id: getTranslation('back_to_overview') })}
												</Button>
											</Dialog.Action>
										</>
									) : (
										<Dialog.Action>
											<Button fullWidth variant="primary" onClick={() => setIsDialogOpen(false)}>
												{formatMessage({ id: getTranslation('close') })}
											</Button>
										</Dialog.Action>
									)}
								</Dialog.Footer>
							</Dialog.Content>
						</Dialog.Root>
					)}
				</Layouts.Content>
			</Page.Main>
		</Layouts.Root>
	);
};

const Form = () => (
	<FormProvider>
		<FormContent />
	</FormProvider>
);

export { Form };
