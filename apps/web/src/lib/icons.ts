import { JumpLink } from 'carbon-icons-svelte';
import ArrowLeft from 'carbon-icons-svelte/lib/ArrowLeft.svelte';
import ArrowRight from 'carbon-icons-svelte/lib/ArrowRight.svelte';
import ArrowUpRight from 'carbon-icons-svelte/lib/ArrowUpRight.svelte';
import PullRequest from 'carbon-icons-svelte/lib/PullRequest.svelte';
import Bot from 'carbon-icons-svelte/lib/Bot.svelte';
import View from 'carbon-icons-svelte/lib/View.svelte';
import LogoFigma from 'carbon-icons-svelte/lib/LogoFigma.svelte';
import Code from 'carbon-icons-svelte/lib/Code.svelte';
import Close from 'carbon-icons-svelte/lib/Close.svelte';
import Information from 'carbon-icons-svelte/lib/Information.svelte';
import Launch from 'carbon-icons-svelte/lib/Launch.svelte';
import Menu from 'carbon-icons-svelte/lib/Menu.svelte';

/**
 * Icon registry — add new icons here as needed.
 * Only registered icons are included in the bundle.
 */
export const icons = {
	'arrow-left': ArrowLeft,
	'arrow-right': ArrowRight,
	'arrow-up-right': ArrowUpRight,
	'pull-request': PullRequest,
	view: View,
	figma: LogoFigma,
	code: Code,
	bot: Bot,
	close: Close,
	information: Information,
	launch: Launch,
	menu: Menu,
	'jump-link': JumpLink
} as const;

export type IconName = keyof typeof icons;
