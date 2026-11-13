<script lang="ts">
  let { kind }: { kind: 'base' | 'tailor' | 'review' } = $props();
</script>

<svg aria-hidden="true" viewBox="0 0 320 180" class="h-44 w-full" fill="none">
  <circle cx="160" cy="90" r="72" fill="currentColor" opacity=".06" />
  {#if kind === 'base'}
    <rect x="89" y="29" width="118" height="134" rx="10" fill="white" stroke="currentColor" opacity=".35" />
    <rect x="110" y="17" width="118" height="134" rx="10" fill="white" stroke="currentColor" stroke-width="2" />
    <circle cx="135" cy="43" r="9" fill="currentColor" opacity=".16" />
    <path d="M155 40h47M155 48h29M130 72h78M130 84h61M130 105h78M130 117h53M130 129h69" stroke="currentColor" stroke-width="4" stroke-linecap="round" opacity=".4" />
    <circle cx="224" cy="137" r="23" fill="currentColor" />
    <path d="M214 137h20M224 127v20" stroke="white" stroke-width="3" stroke-linecap="round" />
  {:else if kind === 'tailor'}
    <rect x="56" y="36" width="100" height="120" rx="10" fill="white" stroke="currentColor" stroke-width="2" opacity=".45" />
    <path d="M74 60h63M74 73h45M74 96h63M74 109h53M74 122h58" stroke="currentColor" stroke-width="4" stroke-linecap="round" opacity=".25" />
    <rect x="179" y="23" width="100" height="120" rx="10" fill="white" stroke="currentColor" stroke-width="2" />
    <path d="M197 48h63M197 61h45M197 84h63M197 97h53M197 110h58" stroke="currentColor" stroke-width="4" stroke-linecap="round" opacity=".45" />
    <circle cx="167" cy="91" r="23" fill="currentColor" />
    <path d="m158 91 6 6 12-13" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
    <path d="m266 15 3-9 3 9 9 3-9 3-3 9-3-9-9-3z" fill="currentColor" opacity=".5" />
  {:else}
    <rect x="83" y="18" width="126" height="143" rx="10" fill="white" stroke="currentColor" stroke-width="2" />
    <path d="M105 43h78M105 56h54M127 83h56M127 104h56M127 125h39" stroke="currentColor" stroke-width="4" stroke-linecap="round" opacity=".4" />
    <path d="m102 82 5 5 9-10M102 103l5 5 9-10M102 124l5 5 9-10" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
    <circle cx="219" cy="117" r="29" fill="white" stroke="currentColor" stroke-width="5" />
    <path d="m240 139 24 24" stroke="currentColor" stroke-width="9" stroke-linecap="round" />
  {/if}
</svg>
