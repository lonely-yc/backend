/**
 * store.js — API data layer with auth support
 */

const API = 'http://localhost:8088/api';

function getToken() {
  return localStorage.getItem('genealogy_token');
}

function setToken(token) {
  localStorage.setItem('genealogy_token', token);
}

function clearToken() {
  localStorage.removeItem('genealogy_token');
  localStorage.removeItem('genealogy_user');
}

function getUser() {
  try {
    return JSON.parse(localStorage.getItem('genealogy_user'));
  } catch { return null; }
}

function setUser(user) {
  localStorage.setItem('genealogy_user', JSON.stringify(user));
}

async function http(url, opts = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) {
    headers['Authorization'] = 'Bearer ' + token;
  }
  const res = await fetch(API + url, { headers, ...opts });
  const json = await res.json();
  if (json.code === 401) {
    clearToken();
    throw new Error('AUTH_EXPIRED');
  }
  if (json.code !== 200) throw new Error(json.msg || '请求失败');
  return json.data;
}

async function httpUpload(url, file) {
  const formData = new FormData();
  formData.append('file', file);
  const headers = {};
  const token = getToken();
  if (token) {
    headers['Authorization'] = 'Bearer ' + token;
  }
  const res = await fetch(API + url, {
    method: 'POST',
    headers,
    body: formData,
  });
  const json = await res.json();
  if (json.code !== 200) throw new Error(json.msg || '上传失败');
  return json.data;
}

const Store = {

  /* ========== Auth ========== */
  auth: {
    async login(username, password) {
      const data = await http('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });
      setToken(data.token);
      setUser(data.user);
      return data;
    },
    async register(username, password, displayName) {
      const data = await http('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ username, password, displayName }),
      });
      setToken(data.token);
      setUser(data.user);
      return data;
    },
    async me() {
      const data = await http('/auth/me');
      setUser(data);
      return data;
    },
    logout() {
      clearToken();
    },
    getToken,
    getUser,
    isLoggedIn() {
      return !!getToken();
    },
  },

  /* ========== Family ========== */
  family: {
    list()         { return http('/family/list'); },
    get(id)        { return http('/family/' + id); },
    create(dto)    { return http('/family', { method: 'POST', body: JSON.stringify(dto) }); },
    update(id, dto){ return http('/family/' + id, { method: 'PUT', body: JSON.stringify(dto) }); },
    remove(id)     { return http('/family/' + id, { method: 'DELETE' }); },
  },

  /* ========== File ========== */
  file: {
    upload(file) { return httpUpload('/file/upload', file); },
  },

  /* ========== Person ========== */
  person: {
    list(keyword, familyId) {
      let q = '';
      const params = [];
      if (keyword) params.push('keyword=' + encodeURIComponent(keyword));
      if (familyId) params.push('familyId=' + familyId);
      if (params.length) q = '?' + params.join('&');
      return http('/person/list' + q);
    },
    get(id)          { return http('/person/' + id); },
    create(dto)      { return http('/person', { method: 'POST', body: JSON.stringify(dto) }); },
    update(id, dto)  { return http('/person/' + id, { method: 'PUT', body: JSON.stringify(dto) }); },
    remove(id)       { return http('/person/' + id, { method: 'DELETE' }); },
    toggleStar(id)   { return http('/person/' + id + '/star', { method: 'PATCH' }); },
    tree(familyId)   { return http('/person/tree' + (familyId ? '?familyId=' + familyId : '')); },
    stats(familyId)  { return http('/person/stats' + (familyId ? '?familyId=' + familyId : '')); },
  },

  /* ========== Relation ========== */
  relation: {
    list()           { return http('/relation/list'); },
    byPerson(id)     { return http('/relation/person/' + id); },
    create(dto)      { return http('/relation', { method: 'POST', body: JSON.stringify(dto) }); },
    remove(id)       { return http('/relation/' + id, { method: 'DELETE' }); },
  },

  /* ========== Event ========== */
  event: {
    byPerson(id)     { return http('/event/person/' + id); },
    all()            { return http('/event/all'); },
    create(dto)      { return http('/event', { method: 'POST', body: JSON.stringify(dto) }); },
    update(id, dto)  { return http('/event/' + id, { method: 'PUT', body: JSON.stringify(dto) }); },
    remove(id)       { return http('/event/' + id, { method: 'DELETE' }); },
  },

  /* ========== Export ========== */
  export: {
    async ouStyle(familyId) {
      const token = getToken();
      const res = await fetch(API + '/export/pdf/ou-style/' + familyId, {
        headers: { 'Authorization': 'Bearer ' + token }
      });
      if (!res.ok) throw new Error('导出失败');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = '族谱_欧式_' + new Date().toISOString().slice(0, 10) + '.pdf';
      a.click();
      URL.revokeObjectURL(url);
    },

    async suStyle(familyId) {
      const token = getToken();
      const res = await fetch(API + '/export/pdf/su-style/' + familyId, {
        headers: { 'Authorization': 'Bearer ' + token }
      });
      if (!res.ok) throw new Error('导出失败');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = '族谱_苏式_' + new Date().toISOString().slice(0, 10) + '.pdf';
      a.click();
      URL.revokeObjectURL(url);
    },
  },

  /* ========== OperateLog ========== */
  operateLog: {
    page(params) {
      return http('/operate-log/page', { method: 'POST', body: JSON.stringify(params) });
    },
    byPerson(personId) { return http('/operate-log/person/' + personId); },
    byFamily(familyId) { return http('/operate-log/family/' + familyId); },
    getDetail(id)      { return http('/operate-log/' + id + '/detail'); },
  },

  /* ========== Helpers ========== */
  defaultPerson(familyId) {
    return {
      name: '', gender: 'male', generation: 1,
      birthDate: '', deathDate: '', birthPlace: '',
      birthProvince: '', birthCity: '',
      bio: '', isStarred: false, avatarUrl: '',
      familyId: familyId || null,
    };
  },

  avatarFull(url) {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return 'http://localhost:8088' + url;
  },

  async exportJSON(familyId) {
    const [persons, relations, events] = await Promise.all([
      this.person.list(null, familyId),
      this.relation.list(),
      this.event.all(),
    ]);
    const data = { persons, relations, events, exportDate: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '族谱数据_' + new Date().toISOString().slice(0, 10) + '.json';
    a.click();
    URL.revokeObjectURL(url);
  },

  async importJSON(jsonText, familyId) {
    const data = JSON.parse(jsonText);
    const persons = data.persons || [];
    const relations = data.relations || [];
    const events = data.events || [];

    const idMap = {};

    for (const p of persons) {
      const created = await this.person.create({
        name: p.name, gender: p.gender, generation: p.generation,
        birthDate: p.birthDate, deathDate: p.deathDate,
        birthPlace: p.birthPlace, bio: p.bio, isStarred: p.isStarred,
        familyId: familyId || p.familyId,
        avatarUrl: p.avatarUrl || '',
      });
      idMap[p.id] = created.id;
    }

    for (const r of relations) {
      const fromId = idMap[r.fromId];
      const toId = idMap[r.toId];
      if (fromId && toId) {
        await this.relation.create({ fromId, toId, type: r.type });
      }
    }

    for (const e of events) {
      const personId = idMap[e.personId];
      if (personId) {
        await this.event.create({
          personId, type: e.type, title: e.title,
          eventDate: e.eventDate || e.date, description: e.description,
        });
      }
    }

    return persons.length;
  },
};
