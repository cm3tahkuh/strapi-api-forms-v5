import { Field as FieldInterface } from '../../context/FormContext';
import { Field, Typography } from '@strapi/design-system';
import fieldMap from './FieldMap';

const FieldPreview = ({ field }: { field: FieldInterface }) => {
  const Component = fieldMap.get(field.type);

  if (!Component) {
    return null;
  }

  return (
    <Field.Root required={field.config?.required ?? false} style={{ width: '100%' }}>
      {field.type !== 'checkbox' && (
        <Field.Label>{field.label}</Field.Label>
      )}
      {field.description && (
        <Typography variant="pi" textColor="neutral600" style={{ marginTop: field.type === 'checkbox' ? '0px' : '4px', marginBottom: '8px' }}>
          {field.description}
        </Typography>
      )}
      <Component disabled={true} style={{ width: '100%' }} {...field} />
    </Field.Root>
  );
};

export default FieldPreview;
