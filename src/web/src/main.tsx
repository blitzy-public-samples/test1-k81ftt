/**
 * @fileoverview Entry point for the Task Management System React application
 * Implements root rendering with comprehensive provider setup and performance optimizations
 * @version 1.0.0
 */

import React from 'react'; // ^18.2.0
import ReactDOM from 'react-dom/client'; // ^18.2.0
import { Provider } from 'react-redux'; // ^8.1.0
import { StrictMode } from 'react'; // ^18.2.0
import App from './App';
import { store } from './store/store';
import { ErrorBoundary } from './components/common/ErrorBoundary';

// Root element ID for React application mounting
const ROOT_ELEMENT_ID = 'root';

/**
 * Initializes and renders the React application with all necessary providers,
 * error boundaries, and performance optimizations
 */
const renderApp = (): void => {
  // Verify root element existence
  const rootElement = document.getElementById(ROOT_ELEMENT_ID);
  if (!rootElement) {
    throw new Error(`Root element with id "${ROOT_ELEMENT_ID}" not found`);
  }

  // Create React root with concurrent features
  const root = ReactDOM.createRoot(rootElement);

  // Set up performance monitoring
  if (process.env.NODE_ENV === 'development') {
    const reportWebVitals = (metric: any) => {
      console.log(metric);
    };

    // @ts-ignore - Import web vitals dynamically in development
    import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
      getCLS(reportWebVitals);
      getFID(reportWebVitals);
      getFCP(reportWebVitals);
      getLCP(reportWebVitals);
      getTTFB(reportWebVitals);
    });
  }

  // Render application with providers and error boundary
  root.render(
    <StrictMode>
      <ErrorBoundary>
        <Provider store={store}>
          <App />
        </Provider>
      </ErrorBoundary>
    </StrictMode>
  );
};

// Initialize application
renderApp();

// Enable hot module replacement in development
if (process.env.NODE_ENV === 'development' && module.hot) {
  module.hot.accept('./App', () => {
    renderApp();
  });
}

// Export store instance for external usage
export { store };

// Export type-safe dispatch and state types
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;