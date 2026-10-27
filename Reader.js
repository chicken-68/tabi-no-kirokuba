import { html, useState, useEffect } from './lib.js';
import { useLoad, info, fmt } from './hooks.js';

export const PER_PAGE = 10;
export const nav = { lastPage: 1 };
export const pageHref = n => (n > 1 ? '#/page/' + n : '#/');
export const backHref = () => pageHref(nav.lastPage);
export const shortDate = d => (d ? d.slice(5).replace('-', '/') : '');
const short = s => { const c = [...s]; return c.length > 15 ? c.slice(0, 15).join('') + '…' : s; };

function pageOf(posts, page) {
  const total = Math.max(1, Math.ceil(posts.length / PER_PAGE));
  const cur = Math.min(Math.max(page, 1), total);
  return { total, cur, items: posts.slice((cur - 1) * PER_PAGE, cur * PER_PAGE) };
}

function pageNumbers(cur, total) {
  const nums = [...new Set([1, cur - 1, cur, cur + 1, total].filter(n => n >= 1 && n <= total))].sort((a, b) => a - b);
  const out = [];
  nums.forEach((n, i) => {
    if (i && n - nums[i - 1] > 1) out.push('gap' + n);
    out.push(n);
  });
  return out;
}

function Pager({ cur, total, go }) {
  if (total < 2) return null;
  const to = n => (go ? { href: '#', onClick: e => { e.preventDefault(); go(n); } } : { href: pageHref(n) });
  return html`
    <nav class="pager" aria-label="ページ">
      ${cur > 1 ? html`<a ...${to(cur - 1)} aria-label="前のページ">‹</a>` : html`<span class="off">‹</span>`}
      ${pageNumbers(cur, total).map(n => typeof n === 'string'
        ? html`<span key=${n}>…</span>`
        : html`<a key=${n} ...${to(n)} class=${n === cur ? 'on' : ''}>${n}</a>`)}
      ${cur < total ? html`<a ...${to(cur + 1)} aria-label="次のページ">›</a>` : html`<span class="off">›</span>`}
    </nav>`;
}

export function SideHistory({ posts, page, activeId, hrefOf = id => '#/post/' + id, go }) {
  const { cur, total, items } = pageOf(posts, page);
  return html`
    ${items.map(p => html`
      <a key=${p.id} class=${'hi' + (p.id === activeId ? ' on' : '')} href=${hrefOf(p.id)}>
        <span>${shortDate(p.date)}</span>${p.title || '無題'}
      </a>`)}
    <${Pager} cur=${cur} total=${total} go=${go} />`;
}

function PostCard({ post }) {
  return html`
    <a class="card" href=${'#/post/' + post.id}>
      ${post.cover && html`<div class="ph"><img referrerpolicy="no-referrer" src=${post.cover} alt="" loading="lazy" /></div>`}
      <div class="meta">${info(post)}</div>
      <b>${post.title || '無題'}</b>
      ${post.excerpt && html`<p class="ex">${short(post.excerpt)}</p>`}
    </a>`;
}

export function Cards({ posts, page }) {
  const { cur, total, items } = pageOf(posts, page);
  return html`
    <div class="cards">${items.map(p => html`<${PostCard} key=${p.id} post=${p} />`)}</div>
    <div class="pager-main"><${Pager} cur=${cur} total=${total} /></div>`;
}

function Block({ block, onOpen }) {
  if (block.type === 'heading') return html`<h2>${block.value}</h2>`;
  if (block.type === 'photo') return html`
    <figure>
      <img referrerpolicy="no-referrer" src=${block.url} alt=${block.caption || ''} loading="lazy" onClick=${() => onOpen({ url: block.url, caption: block.caption })} />
      ${block.caption && html`<figcaption>${block.caption}</figcaption>`}
    </figure>`;
  return html`<p>${block.value}</p>`;
}

function Lightbox({ photo, onClose }) {
  const [zoom, setZoom] = useState(false);
  useEffect(() => {
    const onKey = e => e.key === 'Escape' && onClose();
    addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, []);
  return html`
    <div class=${'lb' + (zoom ? ' zoom' : '')} onClick=${() => !zoom && onClose()}>
      <button class="lbx" onClick=${e => { e.stopPropagation(); onClose(); }} aria-label="閉じる">×</button>
      <img referrerpolicy="no-referrer" src=${photo.url} alt=${photo.caption || ''}
        onClick=${e => { e.stopPropagation(); setZoom(z => !z); }} />
      ${photo.caption && !zoom && html`<div class="lbc">${photo.caption}</div>`}
    </div>`;
}

export function Article({ id }) {
  const s = useLoad(() => api.get(id), id);
  const [photo, setPhoto] = useState(null);
  if (s.loading) return html`<p class="msg">読み込み中…</p>`;
  if (s.error) return html`<p class="msg">記事が見つかりませんでした。<br /><a class="back" href=${backHref()}>← 一覧</a></p>`;
  const p = s.data;
  return html`
    <article class="art">
      <a class="back" href=${backHref()}>← 一覧</a>
      ${p.cover && html`<img referrerpolicy="no-referrer" class="hero" src=${p.cover} alt="" onClick=${() => setPhoto({ url: p.cover })} />`}
      <div class="meta" style="margin-top:14px">${fmt(p.date)}</div>
      <h1>${p.title}</h1>
      ${(p.blocks || []).map((b, i) => html`<${Block} key=${i} block=${b} onOpen=${setPhoto} />`)}
      ${photo && html`<${Lightbox} photo=${photo} onClose=${() => setPhoto(null)} />`}
    </article>`;
}
