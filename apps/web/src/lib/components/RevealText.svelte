<script lang="ts">
	let { text }: { text: string } = $props();
</script>

{#each text.split(/(\s+)/) as word, index (index)}
	{#if word.trim()}<span class="inline-block" data-reveal>{word}</span>{:else}{word}{/if}
{/each}
