import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles.css';

async function start(){
  if(import.meta.env.MODE==='tauri'){
    const {installTauriBridge}=await import('../platform/tauri');
    await installTauriBridge();
  }
  createRoot(document.getElementById('root')!).render(<StrictMode><App/></StrictMode>);
}
void start().catch(()=>{
  const root=document.getElementById('root');
  if(root)root.textContent='The desktop bridge could not be initialized. Close the application and try again.';
});
