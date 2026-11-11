<script lang="ts">
  import { page } from "$app/state";
  import type { Snippet } from "svelte";

  let { children }: { children?: Snippet } = $props();
</script>

<header class="flex min-h-16 flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-stone-200 bg-white px-4 py-2 md:px-7">
  <div class="flex flex-wrap items-center gap-x-5 gap-y-1 md:gap-x-8">
    <span class="whitespace-nowrap text-lg font-semibold tracking-tight">Resume <span class="font-normal text-stone-500">Studio</span></span>
    <nav aria-label="Resume Studio" class="flex gap-1 text-sm">
      {#each [{ href: "/", label: "Base Resume" }, { href: "/tailor", label: "Tailor Resume" }] as { href, label }}
        <a {href} aria-current={page.url.pathname === href ? "page" : undefined}
          class="whitespace-nowrap rounded-md px-2.5 py-2 text-stone-600 hover:bg-stone-100 aria-[current=page]:bg-indigo-50 aria-[current=page]:font-semibold aria-[current=page]:text-indigo-700">{label}</a>
      {/each}
    </nav>
  </div>
  {@render children?.()}
</header>
