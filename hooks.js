import { html, useState, useEffect, useRef } from './lib.js';
import Sortable from 'https://esm.sh/sortablejs@1.15.2';

export const uid = () => Math.random().toString(36).slice(2, 10);
export const today = () => new Date(Date.now() - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
export const fmt = d => (d ? d.replace(/-/g, '.') : '');
export const info = p => fmt(p.date);

export function useRoute() {
  const [hash, setHash] = useState(location.hash);
  useEffect(() => {
    const onChange = () => { setHash(location.hash); scrollTo(0, 0); };
    addEventListener('hashchange', onChange);
    return () => removeEventListener('hashchange', onChange);
  }, []);
  return hash;
}

export function useLoad(fn, dep) {
  const [state, setState] = useState({ loading: true });
  useEffect(() => {
    setState({ loading: true });
    fn().then(data => setState({ data }), e => setState({ error: e.message }));
  }, [dep]);
  return state;
}

export function useSortable(ref, onMove, active) {
  useEffect(() => {
    if (!active || !ref.current) return;
    const sortable = Sortable.create(ref.current, {
      handle: '.grip',
      animation: 150,
      onEnd({ oldIndex, newIndex, from, item }) {
        if (oldIndex === newIndex) return;
        item.remove();
        from.insertBefore(item, from.children[oldIndex] || null);
        onMove(oldIndex, newIndex);
      },
    });
    return () => sortable.destroy();
  }, [active]);
}

export function usePicker() {
  const ref = useRef();
  const done = useRef();
  const open = multiple => new Promise(resolve => {
    done.current = resolve;
    ref.current.multiple = !!multiple;
    ref.current.value = '';
    ref.current.click();
  });
  const input = html`<input ref=${ref} type="file" accept="image/*" hidden onChange=${e => done.current([...e.target.files])} />`;
  return [open, input];
}

export async function shrink(file) {
  const bmp = await createImageBitmap(file);
  const r = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * r);
  c.height = Math.round(bmp.height * r);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', 0.82).split(',')[1];
}

export function useLongPress(onTrigger, ms = 800) {
  const timer = useRef();
  const fired = useRef(false);
  const [holding, setHolding] = useState(false);
  const stop = () => { clearTimeout(timer.current); setHolding(false); };
  return {
    holding,
    props: {
      onPointerDown: () => {
        fired.current = false;
        setHolding(true);
        timer.current = setTimeout(() => { fired.current = true; setHolding(false); onTrigger(); }, ms);
      },
      onPointerUp: stop,
      onPointerLeave: stop,
      onPointerCancel: stop,
      onContextMenu: e => e.preventDefault(),
      onClick: e => { if (fired.current) { e.preventDefault(); fired.current = false; } },
    },
  };
}

export function useMode() {
  const [mode, setMode] = useState(document.documentElement.dataset.mode);
  const toggle = () => {
    const next = mode === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.mode = next;
    localStorage.setItem('mode', next);
    setMode(next);
  };
  return [mode, toggle];
}
