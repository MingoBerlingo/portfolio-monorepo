<script lang="ts">
  let {
    name,
  }: { name: "up" | "down" | "delete" | "eye" | "hidden" | "drag" | "pen" } =
    $props();
</script>

<svg
  width="16"
  height="16"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="1.7"
  stroke-linecap="round"
  stroke-linejoin="round"
  aria-hidden="true"
>
  {#if name === "up"}<path d="m6 14 6-6 6 6" />
  {:else if name === "down"}<path d="m6 10 6 6 6-6" />
  {:else if name === "delete"}<path
      d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"
    />
  {:else if name === "pen"}<path d="m16 3 5 5-12 12-6 1 1-6L16 3ZM14 5l5 5" />
  {:else if name === "drag"}<path
      d="M9 5h.01M15 5h.01M9 12h.01M15 12h.01M9 19h.01M15 19h.01"
      stroke-width="3"
    />
  {:else}<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z" /><circle
      cx="12"
      cy="12"
      r="3"
    />{#if name === "hidden"}<path d="m3 3 18 18" />{/if}{/if}
</svg>
