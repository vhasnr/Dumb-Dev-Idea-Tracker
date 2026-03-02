import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@aws-amplify/ui-react/styles.css';
import '@cloudscape-design/global-styles/index.css';
import '@uiw/react-md-editor/markdown-editor.css';
import '@uiw/react-markdown-preview/markdown.css';
import './config/amplify';
import './index.css';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
