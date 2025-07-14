<script lang="ts">
  import '../app.css';
  import { Toaster } from 'svelte-french-toast';
</script>

<Toaster />
<main class="container mx-auto p-4">
  <slot />
</main>
