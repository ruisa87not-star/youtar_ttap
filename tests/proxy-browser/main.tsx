// Test-only injection: this entry is never included in a production build.
import {createRoot} from 'react-dom/client';
import {App} from '../../src/renderer/App';
import '../../src/renderer/styles.css';
createRoot(document.getElementById('root')!).render(<App registrationProxy={{origin:'http://127.0.0.1:4187',plannerOrigin:'http://127.0.0.1:4177'}}/>);
