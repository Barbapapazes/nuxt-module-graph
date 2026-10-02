import { useDevtoolsClient } from '@nuxt/devtools-kit/iframe-client'

export default defineNuxtPlugin(() => {
  const client = useDevtoolsClient()
  const preferredDark = usePreferredDark()
  const dark = useState('module-graph-dark', () => false)

  watchEffect(() => {
    const theme = client.value?.devtools.colorMode
    dark.value = theme ? theme === 'dark' : preferredDark.value
    document.documentElement.classList.toggle('dark', dark.value)
  })
})
