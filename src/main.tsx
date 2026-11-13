import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/tokens.css';
import './styles/base.css';
import './styles/ui.css';
import './styles/layout.css';
import App from './App';
import { LevelProvider } from './context/LevelContext';
import { ToastProvider, ConfirmProvider } from './components/ui';
import { registerServiceWorker } from './lib/pwa';
import { sfx } from './lib/sfx';
import { installFx } from './lib/fx';
import { startMotion } from './lib/motion';
import { bootWorld } from './world';
import { bootUi } from './lib/ui';
import './styles/motion.css';
import './styles/ambient.css';
import './styles/ios.css';
import './styles/ios-overlays.css';

bootUi();
bootWorld();
sfx.attach();
installFx();
startMotion();
const root = document.getElementById('root')!;
createRoot(root).render(
  <StrictMode>
    <LevelProvider>
      <ToastProvider>
        <ConfirmProvider>
          <App />
        </ConfirmProvider>
      </ToastProvider>
    </LevelProvider>
  </StrictMode>,
);
// The boot splash lives inside #root and is replaced on first render.
registerServiceWorker();
