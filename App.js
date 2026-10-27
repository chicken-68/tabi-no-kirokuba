import { html, useState, useEffect, useRef } from './lib.js';
import { useRoute, useLoad, useLongPress, useMode } from './hooks.js';
import { nav, SideHistory, Cards, Article } from './Reader.js';
import { Editor, EditSide } from './Editor.js';

function LoginPanel({ onDone }) {
  const [pw, setPw] = useState('');
  const [state, setState] = useState('');
  const input = useRef();
  useEffect(() => { input.current.focus(); }, []);
  const submit = () => {
    if (!pw || state === 'checking') return;
    setState('checking');
    api.setPw(pw.trim());
    api.login().then(() => onDone(true), e => {
      api.logout();
      setPw('');
      setState(e.message === 'unauthorized' ? 'bad' : 'net:' + e.message);
      input.current.focus();
    });
  };
  const note = state === 'checking' ? '確認中…'
    : state === 'bad' ? 'パスワードが違います'
    : state.startsWith('net:') ? '通信できません（' + state.slice(4) + '）' : '';
  return html`
    <div class=${'lp' + (state === 'bad' ? ' shake' : '')} onClick=${() => input.current.focus()}>
      <input ref=${input} type="password" name="password" autocomplete="current-password"
        autocapitalize="off" autocorrect="off" enterkeyhint="go" value=${pw} placeholder="・・・・・・"
        onInput=${e => { setPw(e.target.value); if (state !== 'checking') setState(''); }}
        onKeyDown=${e => e.key === 'Enter' && submit()} />
      <button onClick=${submit} aria-label="送信">→</button>
      ${note && html`<div class="lpn">${note}</div>`}
    </div>`;
}

function Menu({ auth, mode, onToggle, onLogout }) {
  return html`
    <aside class="side menu">
      <div class="mrow">
        <span>モード</span>
        <button class=${'sw' + (mode === 'dark' ? ' on' : '')} onClick=${onToggle} aria-label="ライトとダークの切り替え"></button>
      </div>
      <h3>about</h3>
      <p>“私”のための旅を記録するサイト</p>
      <p class="note">※記載している写真の無断使用はダメ※</p>
      ${auth && html`<a class="pill" href="#/new">新しい記事</a>`}
      ${auth && html`<button class="lnk" onClick=${onLogout}>ログアウト</button>`}
    </aside>`;
}

export function App() {
  const hash = useRoute();
  const [mode, toggleMode] = useMode();
  const [menu, setMenu] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [auth, setAuth] = useState(false);
  const [rev, setRev] = useState(0);
  const hold = useLongPress(() => setLoginOpen(o => !o));

  useEffect(() => { if (api.hasPw()) api.login().then(() => setAuth(true), () => {}); }, []);
  useEffect(() => { setMenu(false); if (hash === '#/login') setLoginOpen(true); }, [hash]);

  const pub = useLoad(() => api.list(), rev);
  const drafts = useLoad(() => (auth ? api.listAll() : Promise.resolve([])), rev + ':' + auth);

  let post = null, edit = null, page = 1, m;
  if ((m = hash.match(/^#\/post\/(.+)$/))) post = decodeURIComponent(m[1]);
  else if (hash === '#/new') edit = '';
  else if ((m = hash.match(/^#\/edit\/(.+)$/))) edit = decodeURIComponent(m[1]);
  else if ((m = hash.match(/^#\/page\/(\d+)$/))) page = Number(m[1]);
  if (!post && edit === null) nav.lastPage = page;

  const posts = pub.data || [];
  const logout = () => { api.logout(); setAuth(false); location.hash = '#/'; };

  let side;
  if (menu) side = html`<${Menu} auth=${auth} mode=${mode} onToggle=${toggleMode} onLogout=${logout} />`;
  else if (edit !== null) side = html`<${EditSide} drafts=${(drafts.data || []).filter(p => p.status !== 'published')} posts=${posts} activeId=${edit} />`;
  else side = html`<aside class="side"><${SideHistory} posts=${posts} page=${post ? nav.lastPage : page} activeId=${post} /></aside>`;

  let main;
  if (edit !== null) main = auth ? html`<${Editor} key=${edit} id=${edit} onChanged=${() => setRev(r => r + 1)} />` : html`<p class="msg">ログインが必要です。</p>`;
  else if (post) main = html`<${Article} id=${post} />`;
  else if (pub.loading) main = html`<p class="msg">読み込み中…</p>`;
  else if (pub.error) main = html`<p class="msg">読み込めませんでした。時間をおいて開き直してください。</p>`;
  else if (!posts.length) main = html`<p class="msg">記事がまだありません。</p>`;
  else main = html`<${Cards} posts=${posts} page=${page} />`;

  return html`
    <div>
      <header class="hd">
        <button class="burger" onClick=${() => setMenu(v => !v)} aria-label="メニュー">
          ${menu ? html`<span class="x">×</span>` : html`<span class="bars"></span>`}
        </button>
        <a href="#/" class=${'tt' + (hold.holding ? ' holding' : '')} ...${hold.props}>
          旅の記録場<i class="ln"></i>
        </a>
      </header>
      ${loginOpen && html`<${LoginPanel} onDone=${ok => { setAuth(ok); setLoginOpen(false); if (location.hash === '#/login') location.hash = '#/'; }} />`}
      <div class="lay">
        <div class=${'sidew' + (menu ? ' open' : '')}>${side}</div>
        <main class="main">${main}</main>
      </div>
    </div>`;
}
