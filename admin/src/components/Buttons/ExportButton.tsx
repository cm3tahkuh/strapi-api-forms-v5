import { useIntl } from 'react-intl';
import { useState } from 'react';
import { useFetchClient, useNotification } from '@strapi/strapi/admin';

/*
 * Strapi Design system
 */
import { LinkButton, Loader } from '@strapi/design-system';
import { Download } from '@strapi/icons';
import { PLUGIN_ID } from '../../pluginId';

type ExportButtonProps = {
  formId: number;
  disabled: boolean;
};

const ExportButton = ({ formId, disabled }: ExportButtonProps) => {
  const { formatMessage } = useIntl();
  const [loading, toggleLoading] = useState(false);
  const { get } = useFetchClient();
  const { toggleNotification } = useNotification();

  const processSubmissionExport = async (formId: number) => {
    toggleLoading(true);

    try {
      // Используем useFetchClient для автоматической авторизации
      const response: any = await get(`/${PLUGIN_ID}/submissions/export/${formId}`);

      // Создаем blob из buffer
      const blob = new Blob([new Uint8Array(response.data.data)], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      const filename = response.data.filename || `export-${formId}-${Date.now()}.xlsx`;

      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(link.href);

      toggleLoading(false);
      toggleNotification({
        type: 'success',
      });
    } catch (error) {
      console.error('Export error:', error);
      toggleLoading(false);
      toggleNotification({
        type: 'danger',
        message: 'Export failed',
      });
    }
  };

  return (
    <>
      <LinkButton
        variant="secondary"
        disabled={loading || disabled}
        onClick={() => processSubmissionExport(formId)}
        startIcon={loading ? <Loader small /> : <Download />}
      >
        {formatMessage({
          id: `${PLUGIN_ID}.forms.fields.actions.export_submissions`,
        })}
      </LinkButton>
    </>
  );
};

export default ExportButton;
