<script lang="ts">
	import { scrambleHover } from '$lib/actions/scrambleHover';
	let { text }: { text: string } = $props();
</script>

<span class="scramble-label" use:scrambleHover
	><span class="scramble-original">{text}</span><span class="scramble-output" aria-hidden="true"
	></span></span
>
