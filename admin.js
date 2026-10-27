let PW = localStorage.getItem('pw') || '';

const post_ = body => call_(API_URL, {
  method: 'POST',
  headers: { 'Content-Type': 'text/plain' },
  body: JSON.stringify({ password: PW, ...body }),
});

Object.assign(api, {
  hasPw: () => !!PW,
  setPw(p) { PW = p; localStorage.setItem('pw', p); },
  logout() { PW = ''; localStorage.removeItem('pw'); },
  login: () => post_({ action: 'login' }),
  async listAll() { return (await post_({ action: 'list_all' })).posts; },
  async getAny(id) { return (await post_({ action: 'get', id })).post; },
  save: p => post_({ action: 'save', ...p }),
  remove: id => post_({ action: 'delete', id }),
  upload: (filename, mime, data) => post_({ action: 'upload', filename, mime, data }),
});
