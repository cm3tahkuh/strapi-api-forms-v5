/**
 * Retrieve value from submission fields
 */
function getValueFromSubmissionByKey(key: string, submission: any): string {
	return submission[key] ?? '-';
}

/**
 * Replace placeholders in the template
 */
function replaceDynamicVariables(message: string, submission: any): string {
	return message.replace(/{{(.*?)}}/g, (_, key) => {
		return submission[key] ?? '-';
	});
}

function generateNotificationHtml(result, settings) {
	const tableRows = result.steps
		.map((step) => {
			if (!step.layouts.lg) return '';
			return step.layouts.lg
				.map((block) => {
					const { field } = block;
					if (field.type === 'file') return '';
					return `<tr><td><strong>${field.label}</strong></td><td>{{${field.name}}}</td></tr>`;
				})
				.join('');
		})
		.join('');

	const htmlWithSubmission = `<table width="600" cellpadding="0" cellspacing="0"><tbody>${tableRows}</tbody></table>`;

	return `<body style="margin:0; padding:0; background-color: #FFFFFF;" bgcolor="#FFFFFF">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#FFFFFF" style="background-color: #FFFFFF; width: 100%;">
      <tr>
        <td align="center">
          ${htmlWithSubmission}
        </td>
      </tr>
    </table>
  </body>`;
}

export { getValueFromSubmissionByKey, replaceDynamicVariables, generateNotificationHtml };
