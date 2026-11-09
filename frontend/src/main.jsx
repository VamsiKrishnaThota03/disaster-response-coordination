import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ChakraProvider, extendTheme } from '@chakra-ui/react';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import './index.css';

const theme = extendTheme({
  config: { initialColorMode: 'dark', useSystemColorMode: false },
  fonts: {
    heading: `'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif`,
    body: `'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif`,
  },
  colors: {
    gray: {
      50: '#f8fafc', 100: '#f1f5f9', 200: '#e2e8f0', 300: '#cbd5e1', 400: '#94a3b8',
      500: '#64748b', 600: '#475569', 700: '#2b3648', 800: '#18202e', 900: '#0f1520',
    },
  },
  styles: {
    global: {
      body: { bg: 'gray.900', color: 'gray.100' },
      '*:focus-visible': { outline: '2px solid', outlineColor: 'blue.300', outlineOffset: '2px' },
    },
  },
  components: {
    Button: { defaultProps: { colorScheme: 'blue' } },
    Modal: { baseStyle: { dialog: { bg: 'gray.800' } } },
  },
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ChakraProvider theme={theme}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ChakraProvider>
  </StrictMode>
);
