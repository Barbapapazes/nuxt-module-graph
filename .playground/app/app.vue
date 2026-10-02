<template>
  <main>
    <h1>Nuxt module graph playground</h1>
    <p>Open Nuxt DevTools and select <strong>Module graph</strong>.</p>
    <p>Start the iframe client in another terminal with <code>pnpm client:dev</code>.</p>
    <p>The local feature module depends on a local core module and optionally on Nuxt DevTools.</p>
  </main>
</template>

<style>
body { font-family: system-ui, sans-serif; margin: 3rem; line-height: 1.6; }
main { max-width: 48rem; margin: auto; }
code { background: #eee; color: #222; padding: 0.2rem 0.4rem; border-radius: 0.25rem; }
</style>
