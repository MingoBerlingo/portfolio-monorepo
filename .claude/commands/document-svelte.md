Add documentation to the current Svelte component **only where necessary**.

Target file: $ARGUMENTS

## Rules

- **Be minimal**: Only document non-obvious code
- **Keep comments short**: 1 line preferred, max 3 lines
- **Skip obvious patterns**: No need to comment standard UI structures
- **Focus on complexity**: Document complex logic, non-standard flows, side effects

## When to Document

### Component JSDoc (top of `<script>`)

Add **only if**:

- Component has complex behavior or multiple responsibilities
- Fetches data from CMS or external services
- Has non-obvious auto-triggering behavior (scroll listeners, intersection observers)

### Props

Add inline comment **only if**:

- Type/purpose isn't obvious from the name
- Has specific format requirements or constraints
- Needs usage examples

### Functions

Add JSDoc **only if**:

- Logic is complex or non-standard
- Has side effects (CMS queries, state updates, navigation)
- Multiple steps that aren't self-explanatory

### HTML Comments

Add **only for**:

- Major logical sections (modals group, form sections)
- Non-obvious groupings
- Complex conditional rendering

**Skip comments for**: Headers, buttons, standard layouts, obvious structures

## Example Output

````svelte
<script lang="ts">
  /**
   * AsciiMorph - Morphing ASCII art animation component
   *
   * Cycles through predefined ASCII frames with a typewriter transition effect.
   * Uses requestAnimationFrame for smooth rendering on the canvas.
   */

  import { cn } from '$lib/utils/cn';

  interface Props {
    speed?: number; // Transition speed in ms between frames
    autoplay?: boolean;
  }

  let { speed = 120, autoplay = true }: Props = $props();

  let frameIndex = $state(0);
  let transitioning = $state(false);

  /** Morphs current frame into the next by randomising intermediate characters */
  function morph() {
    transitioning = true;
    // scramble characters row-by-row before resolving to next frame
    requestAnimationFrame(() => renderFrame(frameIndex + 1));
  }
</script>

<div class={cn('font-mono text-foreground-1', { 'opacity-50': transitioning })}>
  <pre>{currentFrame}</pre>
</div>

<!-- Controls -->
<div class="flex gap-4">
  <button onclick={morph}>Next</button>
  <button onclick={() => (frameIndex = 0)}>Reset</button>
</div>
````

## Bad Example (Over-documented)

```svelte
<script lang="ts">
  /**
   * Header - Site navigation header
   *
   * Displays the site logo and navigation links.
   * Uses scroll detection to hide/show on scroll.
   * Built with Tailwind CSS for styling.
   * Renders navigation links from a static array.
   */

  import { page } from '$app/state';
  import { cn } from '$lib/utils/cn';

  // Navigation links array
  /** Array of navigation links to display */
  const navLinks = [
    { href: '/projects', label: 'Projects' },
    { href: '/info', label: 'Info' }
  ];

  // State for scroll tracking
  /** Stores the last scroll Y position */
  let lastScrollY = $state(0);
  /** Whether the header is hidden */
  let hidden = $state(false);

  /**
   * Handles scroll events on the window.
   * Compares current scroll position to last position
   * to determine if user is scrolling up or down.
   */
  function handleScroll() {
    const currentY = window.scrollY;
    hidden = currentY > lastScrollY && currentY > 50;
    lastScrollY = currentY;
  }
</script>

<!-- Main header element -->
<header class="fixed top-0 left-0 z-50 w-full">
  <!-- Inner container -->
  <div class="flex items-center justify-between">
    <!-- Logo link -->
    <a href="/">Alessandro Quets</a>
    <!-- Navigation -->
    <nav class="flex items-center gap-8">
      {#each navLinks as { href, label } (href)}
        <!-- Navigation link -->
        <a {href}>{label}</a>
      {/each}
    </nav>
  </div>
</header>
```
