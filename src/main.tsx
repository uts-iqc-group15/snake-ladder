import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { NuqsAdapter } from 'nuqs/adapters/react'
import './index.css'
import App from './app.tsx'
import { Provider as TooltipProvider } from '@radix-ui/react-tooltip'
import { SettingsProvider } from '@/components/settings-provider'

const queryClient = new QueryClient({
  defaultOptions: {
    mutations: { retry: false },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <NuqsAdapter>
      <QueryClientProvider client={queryClient}>
        <SettingsProvider>
          <TooltipProvider delayDuration={100} skipDelayDuration={300}>
            <App />
          </TooltipProvider>
        </SettingsProvider>
      </QueryClientProvider>
    </NuqsAdapter>
  </StrictMode>,
)
