import { html, render } from './lib.js';
import './admin.js';
import { App } from './App.js';

const root = document.getElementById('root');
root.textContent = '';
render(html`<${App} />`, root);
