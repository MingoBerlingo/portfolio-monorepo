<script lang="ts">
	import { icons, type IconName } from '$lib/icons';

	interface Props {
		name: IconName;
		size?: 16 | 20 | 24 | 32;
		fill?: string;
		title?: string;
	}

	let { name, size = 24, fill = 'currentColor', title }: Props = $props();

	const component = $derived(icons[name]);
</script>

{#if component}
	{@const Component = component}
	<Component {size} {fill} {title} />
{/if}
