import { html, useState, useEffect, useRef } from './lib.js';
import { useSortable, usePicker, shrink, uid, today, info } from './hooks.js';
import { backHref, shortDate, SideHistory } from './Reader.js';

function BlockRow({ block, onChange, onDelete }) {
  return html`
    <div class="blk">
      <span class="grip">≡</span>
      <div class="bd">
        ${block.type === 'heading' && html`<input class="in h" placeholder="見出し" value=${block.value || ''} onInput=${e => onChange({ value: e.target.value })} />`}
        ${block.type === 'text' && html`<textarea class="in" rows="5" placeholder="文章" value=${block.value || ''} onInput=${e => onChange({ value: e.target.value })} />`}
        ${block.type === 'photo' && html`
          <img referrerpolicy="no-referrer" src=${block.url} alt="" />
          <input class="in" placeholder="キャプション" value=${block.caption || ''} onInput=${e => onChange({ caption: e.target.value })} />`}
      </div>
      <button class="x" onClick=${onDelete}>×</button>
    </div>`;
}

export function Editor({ id: initialId, onChanged }) {
  const blank = { id: '', title: '', date: today(), place: '', cover: '', status: 'draft', blocks: [] };
  const [post, setPost] = useState(initialId ? null : blank);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const listRef = useRef();
  const [pick, fileInput] = usePicker();

  useEffect(() => {
    if (!initialId) return;
    api.getAny(initialId).then(
      d => setPost({ ...d, blocks: (d.blocks || []).map(b => ({ ...b, _k: uid() })) }),
      () => setMsg('読み込めませんでした'));
  }, []);

  useSortable(listRef, (from, to) => setPost(x => {
    const blocks = [...x.blocks];
    blocks.splice(to, 0, blocks.splice(from, 1)[0]);
    return { ...x, blocks };
  }), !!post);

  if (!post) return html`<p class="msg">${msg || '読み込み中…'}</p>`;

  const setField = (key, value) => setPost(x => ({ ...x, [key]: value }));
  const patchBlock = (k, patch) => setPost(x => ({ ...x, blocks: x.blocks.map(b => b._k === k ? { ...b, ...patch } : b) }));
  const addBlock = b => setPost(x => ({ ...x, blocks: [...x.blocks, { ...b, _k: uid() }] }));
  const removeBlock = k => setPost(x => ({ ...x, blocks: x.blocks.filter(b => b._k !== k) }));

  const run = async fn => {
    setBusy(true);
    try { await fn(); } catch (e) { setMsg('失敗しました: ' + e.message); }
    setBusy(false);
  };
  const sendPhotos = async files => {
    const urls = [];
    for (let i = 0; i < files.length; i++) {
      setMsg('写真を送信中 ' + (i + 1) + '/' + files.length);
      const r = await api.upload('photo-' + Date.now() + '.jpg', 'image/jpeg', await shrink(files[i]));
      urls.push(r.url);
    }
    setMsg('');
    return urls;
  };
  const addPhotos = async () => {
    const files = await pick(true);
    if (files.length) run(async () => (await sendPhotos(files)).forEach(url => addBlock({ type: 'photo', url, caption: '' })));
  };
  const changeCover = async () => {
    const files = await pick(false);
    if (files.length) run(async () => setField('cover', (await sendPhotos(files))[0]));
  };
  const save = status => run(async () => {
    const r = await api.save({
      id: post.id, title: post.title, date: post.date, place: post.place, cover: post.cover, status,
      blocks: post.blocks.map(({ _k, ...b }) => b),
    });
    setPost(x => ({ ...x, id: r.id, status }));
    setMsg(status === 'published' ? '公開しました' : '下書きを保存しました');
    onChanged();
  });
  const remove = () => {
    if (post.id && confirm('この記事を削除しますか？')) run(async () => { await api.remove(post.id); onChanged(); location.hash = backHref(); });
  };

  return html`
    <div class="ed">
      ${fileInput}
      <a class="btn only-narrow" href=${backHref()}>一覧に戻る</a>
      ${post.status === 'published' && post.id && html`<a class="btn" href=${'#/post/' + post.id}>公開ページを見る</a>`}
      <input class="in" type="date" value=${post.date} onInput=${e => setField('date', e.target.value)} />
      <input class="in h" placeholder="タイトル" value=${post.title} onInput=${e => setField('title', e.target.value)} />
      <div class="blk"><div class="bd">
        ${post.cover && html`<img referrerpolicy="no-referrer" src=${post.cover} alt="" />`}
        <button class="btn" disabled=${busy} onClick=${changeCover}>${post.cover ? 'カバー写真を変える' : 'カバー写真を選ぶ'}</button>
      </div></div>
      <div ref=${listRef}>
        ${post.blocks.map(b => html`<${BlockRow} key=${b._k} block=${b} onChange=${patch => patchBlock(b._k, patch)} onDelete=${() => removeBlock(b._k)} />`)}
      </div>
      <div class="adds">
        <button class="btn" onClick=${() => addBlock({ type: 'heading', value: '' })}>＋見出し</button>
        <button class="btn" onClick=${() => addBlock({ type: 'text', value: '' })}>＋文章</button>
        <button class="btn" disabled=${busy} onClick=${addPhotos}>＋写真</button>
      </div>
      <div class="bar"><div>
        ${msg && html`<div class="meta">${msg}</div>`}
        <button class="btn" disabled=${busy} onClick=${() => save('draft')}>下書き保存</button>
        <button class="btn pri" disabled=${busy} onClick=${() => save('published')}>公開する</button>
        ${post.id && html`<button class="btn del" disabled=${busy} onClick=${remove}>削除</button>`}
      </div></div>
    </div>`;
}

export function EditSide({ drafts, posts, activeId }) {
  const [showPub, setShowPub] = useState(false);
  const [page, setPage] = useState(1);
  return html`
    <aside class="side">
      <a class="pill dk" href=${backHref()}>一覧に戻る</a>
      <button class="pill dk" onClick=${() => setShowPub(v => !v)}>${showPub ? '下書きを表示' : '投稿を編集'}</button>
      <h3 class="sh">${showPub ? '投稿済み' : '下書き'}</h3>
      ${showPub
        ? html`<${SideHistory} posts=${posts} page=${page} go=${setPage} activeId=${activeId} hrefOf=${id => '#/edit/' + id} />`
        : html`
          ${drafts.map(p => html`
            <a key=${p.id} class=${'hi' + (p.id === activeId ? ' on' : '')} href=${'#/edit/' + p.id}>
              <span>${shortDate(p.date)}</span>${p.title || '無題'}
            </a>`)}
          ${!drafts.length && html`<p class="meta" style="padding:0 14px">下書きはありません</p>`}`}
    </aside>`;
}
