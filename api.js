const API_URL = 'https://script.google.com/macros/s/AKfycbx7A16rHhOEpkp-fMcO2flLNeMxhEWgFaVuAwx5VYGQC7ZCaJEQOzbRmo1NYVnFF2RdVA/exec';

async function call_(url, options) {
  const res = await fetch(url, options);
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || 'error');
  return data;
}

const api = {
  async list() {
    return (await call_(API_URL + '?action=list')).posts;
  },
  async get(id) {
    return (await call_(API_URL + '?action=get&id=' + encodeURIComponent(id))).post;
  },
};
