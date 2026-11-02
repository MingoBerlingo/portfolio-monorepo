import type { Education, Experience, Profile, Project, Hero } from '@portfolio/types';

const escape = (text: string) => text.replace(/([\\`*_[\]<>#])/g, '\\$1');
const year = (date?: string | null) => date?.slice(0, 4) || 'Present';

function richText(node: unknown): string {
	if (!node || typeof node !== 'object') return '';
	const value = node as { text?: string; type?: string; children?: unknown[] };
	if (typeof value.text === 'string') return escape(value.text);
	if (value.type === 'linebreak') return '\n';
	const text = (value.children ?? []).map(richText).join('');
	return ['paragraph', 'heading', 'listitem'].includes(value.type ?? '') ? `${text}\n\n` : text;
}

export function portfolioMarkdown(
	profile: Profile,
	projects: Project[],
	experiences: Experience[],
	education: Education[],
	base = '',
	hero?: Pick<Hero, 'homepageIntroduction'>
): string {
	const intro = hero?.homepageIntroduction
		?.replace(/\[[a-zA-Z0-9_-]+\]/g, '')
		.replace(/[^\S\n]+/g, ' ')
		.replace(/ +([,.;:!?])/g, '$1')
		.trim();
	const biography = richText(profile.presentation?.root).trim();
	const sections = [
		`# ${escape(`${profile.name} ${profile.surname}`)}`,
		escape(profile.jobPosition || ''),
		intro ? escape(intro) : '',
		biography && biography !== intro ? biography : '',
		...[
			{ title: 'Featured projects', items: projects.filter((project) => project.isFeatured) },
			{ title: 'Other projects', items: projects.filter((project) => !project.isFeatured) }
		].map(({ title, items }) =>
			items.length
				? `## ${title}\n\n${items.map((project) => `- [${escape(project.shortTitle || project.title)}](${base}/projects/${encodeURIComponent(project.slug)}) (${year(project.year)}): ${escape(project.tagline || '')}`).join('\n')}`
				: ''
		),
		experiences.length
			? `## Experience\n\n${experiences.map((item) => `- ${year(item.startDate)}–${year(item.endDate)}: ${escape(item.role)} — ${escape(item.company)}`).join('\n')}`
			: '',
		education.length
			? `## Education\n\n${education.map((item) => `- ${year(item.startDate)}–${year(item.endDate)}: ${escape(item.title)} — ${escape(item.school)}`).join('\n')}`
			: '',
		`## Contact\n\n${[
			profile.email ? `- [${escape(profile.email)}](mailto:${profile.email})` : '',
			profile.github?.url ? `- [GitHub](<${profile.github.url.replace(/[<>\r\n]/g, '')}>)` : '',
			profile.linkedin?.url
				? `- [LinkedIn](<${profile.linkedin.url.replace(/[<>\r\n]/g, '')}>)`
				: ''
		]
			.filter(Boolean)
			.join('\n')}`
	];
	return sections.filter(Boolean).join('\n\n') + '\n';
}
