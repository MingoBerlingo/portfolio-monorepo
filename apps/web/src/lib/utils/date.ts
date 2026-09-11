export function formatYear(value: string | null | undefined) {
	if (!value) return 'Now';
	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) return value;
	return new Intl.DateTimeFormat('en-US', {
		year: 'numeric'
	}).format(parsed);
}

export function formatPeriod(item: { startDate: string; endDate?: string | null }) {
	const start = new Date(item.startDate);
	const end = item.endDate ? new Date(item.endDate) : null;

	if (!item.endDate) {
		return `${formatYear(item.startDate)} – Present`;
	}

	if (
		!Number.isNaN(start.getTime()) &&
		!Number.isNaN(end!.getTime()) &&
		start.getFullYear() === end!.getFullYear()
	) {
		return formatYear(item.startDate);
	}

	return `${formatYear(item.startDate)} – ${formatYear(item.endDate)}`;
}
