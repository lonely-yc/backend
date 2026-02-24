/**
 * app.js — Main Vue 3 Application with Auth, Family Selection, Avatar
 */

const { createApp, ref, computed, watch, onMounted, nextTick } = Vue;

createApp({
  setup() {
    /* ==================== Page / Auth State ==================== */
    const page          = ref('login'); // login | register | families | main
    const authError     = ref('');
    const loginForm     = ref({ username: '', password: '' });
    const regForm       = ref({ username: '', password: '', displayName: '' });
    const currentUser   = ref(null);
    const families      = ref([]);
    const currentFamily = ref(null);

    /* ==================== Main App State ==================== */
    const view      = ref('tree');
    const q         = ref('');
    const filter    = ref('all');
    const sel       = ref(null);
    const showPM    = ref(false);
    const showEM    = ref(false);
    const showDel   = ref(false);
    const showFM    = ref(false);
    const showDelFamily = ref(false);
    const editing   = ref(null);
    const editingFamily = ref(null);
    const delTarget = ref(null);
    const delFamilyTarget = ref(null);
    const relCtx    = ref(null);
    const evTarget  = ref(null);
    const toasts    = ref([]);
    const loading   = ref(false);

    /* Avatar */
    const avatarPreview = ref('');
    const avatarFile    = ref(null);

    /* ==================== Data ==================== */
    const persons   = ref([]);
    const relations = ref([]);
    const events    = ref([]);
    const statsData = ref({});

    /* Logs */
    const logs         = ref([]);
    const logTotal     = ref(0);
    const logPage      = ref(1);
    const logPageSize  = ref(20);
    const logLoading   = ref(false);
    const logFilters   = ref({
      operateType: '',
      targetType: '',
      keyword: '',
    });
    const showLogDetail = ref(false);
    const logDetailData = ref(null);

    /* Map */
    const mapChart = ref(null);
    const mapInstance = ref(null);
    const mapStats = ref({ countMap: {}, unmatched: [] });
    const showUnmatched = ref(false);
    const mapProvinceModal = ref({ show: false, province: '', members: [] });

    /* Migration Map */
    const migrationMapInstance = ref(null);
    const hasMigrationData = computed(() => {
      return events.value.some(e => (e.latitude || e.longitude || e.lat || e.lng) && (e.type === 'migration' || e.type === 'residence'));
    });
    const migrationEventCount = computed(() => {
      return events.value.filter(e => (e.latitude || e.longitude || e.lat || e.lng) && (e.type === 'migration' || e.type === 'residence')).length;
    });
    const debugEvents = computed(() => {
      return events.value.filter(e => e.type === 'migration' || e.type === 'residence');
    });
    const showDebugEvents = ref(false);

    const migrationCard = ref({ show: false, x: 0, y: 0, person: null, event: null });

    /* Location Picker */
    const showLocationPicker = ref(false);
    const locationPickerInstance = ref(null);
    const tempLocation = ref(null);
    const locationSearchQuery = ref('');

    /* Region Select */
    const provinceList = ref([]);
    const cityList = ref([]);

    /* Timeline Linkage */
    const linkedPersonId = ref(null);
    const linkedEventId = ref(null);
    const linkageMode = ref(false);
    const timelineContainer = ref(null);

    /* Forms */
    const pf = ref(Store.defaultPerson());
    const ef = ref({ type: 'other', title: '', eventDate: '', description: '', location: '', latitude: null, longitude: null });
    const ff = ref({ surname: '', description: '' });

    const viewMeta = {
      tree:      { title: '族谱图谱', icon: 'mdi-file-tree-outline' },
      list:      { title: '成员管理', icon: 'mdi-account-group-outline' },
      timeline:  { title: '时间轴',   icon: 'mdi-timeline-clock-outline' },
      stats:     { title: '数据统计', icon: 'mdi-chart-arc' },
      map:       { title: '籍贯地图', icon: 'mdi-map-marker-radius' },
      migration: { title: '迁徙路线', icon: 'mdi-map-marker-path' },
      logs:      { title: '操作日志', icon: 'mdi-history' },
    };

    const evTypes = [
      { v: 'birth', l: '出生' }, { v: 'death', l: '去世' },
      { v: 'marriage', l: '婚姻' }, { v: 'migration', l: '迁徙' },
      { v: 'achievement', l: '功名' }, { v: 'residence', l: '定居' },
      { v: 'other', l: '其他' },
    ];

    /* ==================== Computed ==================== */
    const isAdmin = computed(() => currentUser.value?.role === 'ADMIN');
    const familyId = computed(() => currentFamily.value?.id);

    const maxGen = computed(() => persons.value.length ? Math.max(...persons.value.map(p => p.generation)) : 0);
    const genList = computed(() => [...new Set(persons.value.map(p => p.generation))].sort((a, b) => a - b));

    const filtered = computed(() => {
      let list = persons.value;
      if (q.value) {
        const s = q.value.toLowerCase();
        list = list.filter(p => p.name.toLowerCase().includes(s));
      }
      const f = filter.value;
      if (f === 'male')    list = list.filter(p => p.gender === 'male');
      if (f === 'female')  list = list.filter(p => p.gender === 'female');
      if (f === 'starred') list = list.filter(p => p.isStarred);
      if (f.startsWith('g')) {
        const g = parseInt(f.slice(1));
        if (!isNaN(g)) list = list.filter(p => p.generation === g);
      }
      return list.sort((a, b) => a.generation - b.generation || a.name.localeCompare(b.name));
    });

    const sortedEvents = computed(() =>
      [...events.value].sort((a, b) => (a.eventDate || '').localeCompare(b.eventDate || ''))
    );

    const maleN     = computed(() => persons.value.filter(p => p.gender === 'male').length);
    const femaleN   = computed(() => persons.value.length - maleN.value);
    const malePct   = computed(() => persons.value.length ? Math.round(maleN.value / persons.value.length * 100) : 0);
    const femalePct = computed(() => persons.value.length ? 100 - malePct.value : 0);

    const genStats = computed(() => {
      const m = {};
      persons.value.forEach(p => { m[p.generation] = (m[p.generation] || 0) + 1; });
      const mx = Math.max(...Object.values(m), 1);
      return Object.keys(m).sort((a, b) => a - b).map(g => ({
        gen: +g, n: m[g], pct: Math.max((m[g] / mx) * 100, 8),
      }));
    });

    const selRelations = computed(() => {
      if (!sel.value) return [];
      const id = sel.value.id;
      const out = [];
      relations.value.forEach(r => {
        if (r.fromId === id) {
          const lbl = r.type === 'spouse' ? '配偶' : r.type === 'adopted' ? '养子女' : '子女';
          out.push({ id: r.id, tid: r.toId, name: nameOf(r.toId), label: lbl });
        } else if (r.toId === id) {
          const lbl = r.type === 'spouse' ? '配偶' : r.type === 'adopted' ? '养父母' : '父/母';
          out.push({ id: r.id, tid: r.fromId, name: nameOf(r.fromId), label: lbl });
        }
      });
      return out;
    });

    // 计算每个成员的关系信息（用于列表显示）
    const personRelationsMap = computed(() => {
      const map = {};
      persons.value.forEach(p => {
        map[p.id] = { spouse: null, spouseLabel: '', childrenCount: 0, parentNames: [] };
      });
      relations.value.forEach(r => {
        if (r.type === 'spouse') {
          const fromP = persons.value.find(p => p.id === r.fromId);
          const toP = persons.value.find(p => p.id === r.toId);
          if (fromP && toP) {
            // 对方是我的配偶
            map[r.toId].spouse = fromP.name;
            map[r.toId].spouseLabel = fromP.gender === 'male' ? '之夫' : '之妻';
            map[r.fromId].spouse = toP.name;
            map[r.fromId].spouseLabel = toP.gender === 'male' ? '之夫' : '之妻';
          }
        } else {
          // 我是子女的父/母
          if (map[r.fromId]) {
            map[r.fromId].childrenCount++;
          }
          // 我是孩子
          if (map[r.toId]) {
            const parent = persons.value.find(p => p.id === r.fromId);
            if (parent) {
              const label = parent.gender === 'male' ? '父' : '母';
              map[r.toId].parentNames.push(parent.name + label);
            }
          }
        }
      });
      return map;
    });

    const hasBirthPlaceData = computed(() => {
      return persons.value.some(p => p.birthPlace && p.birthPlace.trim());
    });

    /* Region computed */
    const birthPlaceFull = computed(() => {
      if (!pf.value.birthProvince) return '';
      const province = pf.value.birthProvince;
      const city = pf.value.birthCity;
      return getFullRegion(province, city);
    });

    const mapLegendData = computed(() => {
      const entries = Object.entries(mapStats.value.countMap || {})
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
      const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#3b82f6', '#8b5cf6', '#ec4899'];
      return entries.map(([name, count], idx) => ({
        name,
        count,
        color: colors[idx % colors.length],
      }));
    });

    const selEvents = computed(() => {
      if (!sel.value) return [];
      return events.value
        .filter(e => e.personId === sel.value.id)
        .sort((a, b) => (a.eventDate || '').localeCompare(b.eventDate || ''));
    });

    /* ==================== Toast ==================== */
    let _tid = 0;
    function toast(msg, type = 'success') {
      const icons = { success: 'mdi-check-circle', error: 'mdi-alert-circle', info: 'mdi-information' };
      const id = ++_tid;
      toasts.value.push({ id, msg, type, icon: icons[type] || icons.info });
      setTimeout(() => { toasts.value = toasts.value.filter(t => t.id !== id); }, 3000);
    }

    /* ==================== Avatar Helper ==================== */
    function avatarFull(url) {
      return Store.avatarFull(url);
    }

    /* ==================== Auth ==================== */
    async function doLogin() {
      authError.value = '';
      if (!loginForm.value.username || !loginForm.value.password) {
        authError.value = '请输入用户名和密码';
        return;
      }
      try {
        const data = await Store.auth.login(loginForm.value.username, loginForm.value.password);
        currentUser.value = data.user;
        page.value = 'families';
        await loadFamilies();
      } catch (err) {
        authError.value = err.message === 'AUTH_EXPIRED' ? '请重新登录' : err.message;
      }
    }

    async function doRegister() {
      authError.value = '';
      if (!regForm.value.username || !regForm.value.password || !regForm.value.displayName) {
        authError.value = '请填写所有字段';
        return;
      }
      if (regForm.value.password.length < 4) {
        authError.value = '密码至少4位';
        return;
      }
      try {
        const data = await Store.auth.register(
          regForm.value.username,
          regForm.value.password,
          regForm.value.displayName
        );
        currentUser.value = data.user;
        toast('注册成功！' + (data.user.role === 'ADMIN' ? '你是第一位用户，已成为管理员' : ''));
        page.value = 'families';
        await loadFamilies();
      } catch (err) {
        authError.value = err.message;
      }
    }

    function doLogout() {
      Store.auth.logout();
      currentUser.value = null;
      currentFamily.value = null;
      page.value = 'login';
      loginForm.value = { username: '', password: '' };
      GraphManager.destroy();
    }

    async function checkAuth() {
      if (!Store.auth.isLoggedIn()) {
        page.value = 'login';
        return;
      }
      try {
        const user = await Store.auth.me();
        currentUser.value = user;
        page.value = 'families';
        await loadFamilies();
      } catch {
        Store.auth.logout();
        page.value = 'login';
      }
    }

    /* ==================== Family ==================== */
    async function loadFamilies() {
      try {
        families.value = await Store.family.list() || [];
      } catch (err) {
        if (err.message === 'AUTH_EXPIRED') {
          page.value = 'login';
          return;
        }
        toast('加载家族列表失败', 'error');
      }
    }

    async function enterFamily(f) {
      currentFamily.value = f;
      page.value = 'main';
      view.value = 'tree';
      await reload();
      nextTick(() => setTimeout(renderGraph, 200));
    }

    function backToFamilies() {
      GraphManager.destroy();
      currentFamily.value = null;
      sel.value = null;
      persons.value = [];
      relations.value = [];
      events.value = [];
      page.value = 'families';
      loadFamilies();
    }

    function openAddFamily() {
      editingFamily.value = null;
      ff.value = { surname: '', description: '' };
      showFM.value = true;
    }

    function openEditFamily(f) {
      editingFamily.value = f;
      ff.value = { surname: f.surname, description: f.description || '' };
      showFM.value = true;
    }

    async function saveFamily() {
      if (!ff.value.surname.trim()) { toast('请输入姓氏', 'error'); return; }
      try {
        if (editingFamily.value) {
          await Store.family.update(editingFamily.value.id, ff.value);
          toast('家族已更新');
        } else {
          await Store.family.create(ff.value);
          toast('家族已创建');
        }
        showFM.value = false;
        await loadFamilies();
      } catch (err) { toast(err.message, 'error'); }
    }

    function askDelFamily(f) {
      delFamilyTarget.value = f;
      showDelFamily.value = true;
    }

    async function doDelFamily() {
      if (!delFamilyTarget.value) return;
      try {
        await Store.family.remove(delFamilyTarget.value.id);
        showDelFamily.value = false;
        toast('家族已删除');
        await loadFamilies();
      } catch (err) { toast(err.message, 'error'); }
    }

    /* ==================== Data Loading ==================== */
    async function reload() {
      const fid = familyId.value;
      try {
        const [p, r, e] = await Promise.all([
          Store.person.list(null, fid),
          Store.relation.list(),
          Store.event.all(),
        ]);
        persons.value = p || [];
        relations.value = r || [];
        events.value = e || [];
      } catch (err) {
        if (err.message === 'AUTH_EXPIRED') {
          page.value = 'login';
          return;
        }
        toast('加载数据失败: ' + err.message, 'error');
      }
    }

    /* ==================== Helpers ==================== */
    function nameOf(id) { const p = persons.value.find(x => x.id === id); return p ? p.name : '?'; }
    function genOf(id)  { const p = persons.value.find(x => x.id === id); return p ? p.generation : '?'; }

    /* ==================== Navigation ==================== */
    function go(v) {
      view.value = v;
      if (v === 'tree') nextTick(renderGraph);
      if (v === 'logs') nextTick(loadLogs);
      if (v === 'map') nextTick(renderMap);
      if (v === 'migration') nextTick(renderMigrationMap);
    }

    function onSearch() { if (q.value && view.value === 'tree') go('list'); }
    function pick(p)    { sel.value = { ...p }; }
    function jumpTo(id) { const p = persons.value.find(x => x.id === id); if (p) pick(p); }

    /* ==================== Avatar Upload ==================== */
    function onAvatarChange(e) {
      const file = e.target.files?.[0];
      if (!file) return;
      avatarFile.value = file;
      const reader = new FileReader();
      reader.onload = ev => { avatarPreview.value = ev.target.result; };
      reader.readAsDataURL(file);
      e.target.value = '';
    }

    async function uploadAvatar() {
      if (!avatarFile.value) return pf.value.avatarUrl || '';
      try {
        const result = await Store.file.upload(avatarFile.value);
        return result.url;
      } catch (err) {
        toast('头像上传失败: ' + err.message, 'error');
        return pf.value.avatarUrl || '';
      }
    }

    /* ==================== Person CRUD ==================== */
    function openAdd() {
      editing.value = null;
      relCtx.value = null;
      pf.value = Store.defaultPerson(familyId.value);
      // 初始化省市选择器
      pf.value.birthProvince = '';
      pf.value.birthCity = '';
      cityList.value = [];
      avatarPreview.value = '';
      avatarFile.value = null;
      showPM.value = true;
    }

    function openEdit(p) {
      editing.value = p;
      relCtx.value = null;
      pf.value = { ...p };
      // 初始化省市选择器
      const place = p.birthPlace || '';
      pf.value.birthProvince = '';
      pf.value.birthCity = '';
      // 尝试从 birthPlace 中解析省市
      for (const province of provinceList.value) {
        if (place.includes(province.name)) {
          pf.value.birthProvince = province.name;
          cityList.value = getCities(province.name) || [];
          // 尝试匹配城市
          for (const city of cityList.value) {
            if (place.includes(city)) {
              pf.value.birthCity = city;
              break;
            }
          }
          break;
        }
      }
      avatarPreview.value = '';
      avatarFile.value = null;
      showPM.value = true;
    }

    function openAddChild(parent) {
      editing.value = null;
      relCtx.value = { type: 'child', pId: parent.id, pName: parent.name };
      pf.value = Store.defaultPerson(familyId.value);
      pf.value.generation = parent.generation + 1;
      pf.value.birthProvince = '';
      pf.value.birthCity = '';
      cityList.value = [];
      avatarPreview.value = '';
      avatarFile.value = null;
      showPM.value = true;
    }

    function openAddSpouse(p) {
      editing.value = null;
      relCtx.value = { type: 'spouse', pId: p.id, pName: p.name };
      pf.value = Store.defaultPerson(familyId.value);
      pf.value.generation = p.generation;
      pf.value.gender = p.gender === 'male' ? 'female' : 'male';
      pf.value.birthProvince = '';
      pf.value.birthCity = '';
      cityList.value = [];
      avatarPreview.value = '';
      avatarFile.value = null;
      showPM.value = true;
    }

    async function savePerson() {
      if (!pf.value.name.trim()) { toast('请输入姓名', 'error'); return; }

      try {
        // Upload avatar if selected
        const avatarUrl = await uploadAvatar();
        pf.value.avatarUrl = avatarUrl;
        pf.value.familyId = familyId.value;
        // Set birthPlace from province/city selection
        if (pf.value.birthProvince) {
          pf.value.birthPlace = getFullRegion(pf.value.birthProvince, pf.value.birthCity);
        }

        if (editing.value) {
          await Store.person.update(editing.value.id, pf.value);
          toast('信息已更新');
        } else {
          const created = await Store.person.create(pf.value);
          if (relCtx.value && created) {
            await Store.relation.create({
              fromId: relCtx.value.pId,
              toId: created.id,
              type: relCtx.value.type === 'spouse' ? 'spouse' : 'parent-child',
            });
          }
          toast('「' + pf.value.name + '」已添加');
        }

        showPM.value = false;
        avatarPreview.value = '';
        avatarFile.value = null;
        await reload();
        if (sel.value) {
          const fresh = persons.value.find(p => p.id === sel.value.id);
          if (fresh) sel.value = { ...fresh };
        }
        nextTick(renderGraph);
      } catch (err) {
        toast(err.message, 'error');
      }
    }

    async function toggleStar(p) {
      try {
        await Store.person.toggleStar(p.id);
        await reload();
        toast(p.isStarred ? '已取消标记' : '已标记');
      } catch (err) { toast(err.message, 'error'); }
    }

    function askDel(p) { delTarget.value = p; showDel.value = true; }

    async function doDel() {
      if (!delTarget.value) return;
      try {
        await Store.person.remove(delTarget.value.id);
        if (sel.value && sel.value.id === delTarget.value.id) sel.value = null;
        showDel.value = false;
        await reload();
        toast('已删除');
        nextTick(renderGraph);
      } catch (err) { toast(err.message, 'error'); }
    }

    /* ==================== Events ==================== */
    function openEventModal(p) {
      evTarget.value = p;
      ef.value = { type: 'other', title: '', eventDate: '', description: '', location: '', latitude: null, longitude: null };
      showEM.value = true;
    }

    async function saveEvent() {
      if (!ef.value.title.trim() || !ef.value.eventDate) { toast('请填写标题和日期', 'error'); return; }
      try {
        await Store.event.create({
          personId: evTarget.value.id,
          type: ef.value.type,
          title: ef.value.title,
          eventDate: ef.value.eventDate,
          description: ef.value.description,
          location: ef.value.location || '',
          latitude: ef.value.latitude || null,
          longitude: ef.value.longitude || null,
        });
        showEM.value = false;
        await reload();
        toast('事件已添加');
        if (sel.value && sel.value.id === evTarget.value.id) {
          sel.value = { ...sel.value };
        }
        // 如果当前在迁徙地图视图，自动刷新
        if (view.value === 'migration') {
          nextTick(renderMigrationMap);
        }
      } catch (err) { toast(err.message, 'error'); }
    }

    /* ==================== Logs ==================== */
    async function loadLogs() {
      logLoading.value = true;
      try {
        const params = {
          familyId: familyId.value,
          pageNum: logPage.value,
          pageSize: logPageSize.value,
          operateType: logFilters.value.operateType || null,
          targetType: logFilters.value.targetType || null,
          keyword: logFilters.value.keyword || null,
        };
        const result = await Store.operateLog.page(params);
        logs.value = result.records || [];
        logTotal.value = result.total || 0;
      } catch (err) {
        toast('加载日志失败: ' + err.message, 'error');
      } finally {
        logLoading.value = false;
      }
    }

    function onLogPageChange(p) {
      logPage.value = p;
      loadLogs();
    }

    function onLogFilterChange() {
      logPage.value = 1;
      loadLogs();
    }

    async function viewLogDetail(log) {
      try {
        // 调用接口获取完整日志信息（包括detail JSON字符串）
        const fullLog = await Store.operateLog.getDetail(log.id);
        // 解析detail JSON字符串
        let parsedDetail = {};
        if (fullLog.detail) {
          try {
            parsedDetail = JSON.parse(fullLog.detail);
          } catch (e) {
            console.warn('解析日志详情失败', e);
          }
        }
        logDetailData.value = { log: fullLog, detail: parsedDetail };
        showLogDetail.value = true;
      } catch (err) {
        toast('获取详情失败: ' + err.message, 'error');
      }
    }

    /* ==================== Import / Export ==================== */
    async function exportJSON() {
      try {
        await Store.exportJSON(familyId.value);
        toast('数据已导出');
      } catch (err) { toast(err.message, 'error'); }
    }

    async function exportPdf(style) {
      try {
        toast('正在生成 PDF...', 'info');
        if (style === 'ou') {
          await Store.export.ouStyle(familyId.value);
        } else {
          await Store.export.suStyle(familyId.value);
        }
        toast('PDF 已下载');
      } catch (err) {
        toast('导出失败: ' + err.message, 'error');
      }
    }

    async function importJSON(e) {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async ev => {
        try {
          const count = await Store.importJSON(ev.target.result, familyId.value);
          toast('已导入 ' + count + ' 位成员');
          await reload();
          nextTick(renderGraph);
        } catch (err) { toast('导入失败: ' + err.message, 'error'); }
      };
      reader.readAsText(file);
      e.target.value = '';
    }

    // 下载Excel导入模板
    function downloadTemplate() {
      const headers = ['姓名', '性别', '世代', '出生日期', '去世日期', '出生地', '籍贯', '简介', '父亲姓名', '母亲姓名', '配偶姓名'];
      const exampleData = [
        ['张三', '男', '1', '1950-01-01', '', '北京', '北京', '家族创始人', '', '', ''],
        ['张三分', '男', '2', '1980-05-15', '', '北京', '北京', '张三之子', '张三', '', '李氏'],
      ];
      const ws = XLSX.utils.aoa_to_sheet([headers, ...exampleData]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, '成员导入模板');
      ws['!cols'] = headers.map((_, i) => ({ wch: i === 0 ? 15 : 12 }));
      XLSX.writeFile(wb, '族谱成员导入模板.xlsx');
      toast('模板已下载');
    }

    // Excel批量导入成员
    async function importExcel(e) {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data);
        const sheetName = workbook.SheetNames[0];
        const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

        if (!rows.length) {
          toast('Excel文件为空', 'error');
          return;
        }

        const nameToPerson = {};
        let successCount = 0;

        for (const row of rows) {
          const name = row['姓名']?.trim();
          if (!name) continue;

          const gender = row['性别'] === '男' ? 'MALE' : 'FEMALE';
          const generation = parseInt(row['世代']) || 1;

          const person = await Store.person.create({
            name,
            gender,
            generation,
            birthDate: row['出生日期'] || null,
            deathDate: row['去世日期'] || null,
            birthPlace: row['出生地'] || row['籍贯'] || '',
            bio: row['简介'] || '',
            familyId: familyId.value,
            avatarUrl: ''
          });

          nameToPerson[name] = person;
          successCount++;
        }

        // 创建关系
        for (const row of rows) {
          const childName = row['姓名']?.trim();
          const child = nameToPerson[childName];
          if (!child) continue;

          const fatherName = row['父亲姓名']?.trim();
          if (fatherName && nameToPerson[fatherName]) {
            await Store.relation.create({
              fromId: nameToPerson[fatherName].id,
              toId: child.id,
              type: 'FATHER'
            });
          }

          const motherName = row['母亲姓名']?.trim();
          if (motherName && nameToPerson[motherName]) {
            await Store.relation.create({
              fromId: nameToPerson[motherName].id,
              toId: child.id,
              type: 'MOTHER'
            });
          }

          const spouseName = row['配偶姓名']?.trim();
          if (spouseName && nameToPerson[spouseName]) {
            await Store.relation.create({
              fromId: child.id,
              toId: nameToPerson[spouseName].id,
              type: 'SPOUSE'
            });
          }
        }

        toast('成功导入 ' + successCount + ' 位成员');
        await reload();
        nextTick(renderGraph);
      } catch (err) {
        toast('导入失败: ' + err.message, 'error');
      }
      e.target.value = '';
    }

    /* ==================== Graph ==================== */
    async function renderGraph() {
      if (!persons.value.length) {
        GraphManager.destroy();
        return;
      }
      // 先销毁再重建
      GraphManager.destroy();
      await nextTick();
      setTimeout(renderGraphImpl, 30);
    }

    async function renderGraphImpl() {
      if (!persons.value.length) return;

      // Handler for node click
      const handleNodeClick = (id) => {
        const p = persons.value.find(x => x.id === id);
        if (!p) return;

        // If linkage mode is on, use linkage handler instead
        if (linkageMode.value) {
          onGraphNodeClick(id);
        } else {
          pick(p);
        }
      };

      try {
        const treeData = await Store.person.tree(familyId.value);
        if (treeData) {
          GraphManager.renderTree(treeData, handleNodeClick);
        }
      } catch (err) {
        GraphManager.render(persons.value, relations.value, handleNodeClick);
      }
    }

    function gZoom(r)  { GraphManager.zoom(r); }
    function gFit()    { GraphManager.fitView(); }
    function gCenter() { GraphManager.fitCenter(); }
    function gBeautify() { GraphManager.beautify(); }

    /* ========== Map ========== */
    function renderMap() {
      if (view.value !== 'map') return;
      if (!persons.value.length) return;

      // 统计籍贯
      const result = countBirthPlace(persons.value);
      mapStats.value = result;

      // 获取散点数据
      const scatterData = getMapScatterData(persons.value);

      // 如果没有数据，不渲染
      if (scatterData.length === 0) {
        if (mapInstance.value) {
          mapInstance.value.dispose();
          mapInstance.value = null;
        }
        return;
      }

      nextTick(() => {
        const container = document.getElementById('chinaMap');
        if (!container) return;

        // 销毁旧实例
        if (mapInstance.value) {
          mapInstance.value.dispose();
        }

        const chart = echarts.init(container);
        mapInstance.value = chart;

        // 注册地图
        echarts.registerMap('china', ChinaMapData);

        // 计算最大值的比例
        const maxVal = Math.max(...scatterData.map(d => d.value[2]));

        const option = {
          backgroundColor: '#f8fafc',
          tooltip: {
            trigger: 'item',
            formatter: function(params) {
              if (params.seriesType === 'scatter' || params.seriesType === 'effectScatter') {
                return `<div style="padding: 8px;">
                  <strong>${params.name}</strong><br/>
                  人数: ${params.value[2]} 人<br/>
                  <span style="color:#9ca3af;font-size:11px">点击查看详情</span>
                </div>`;
              }
              if (params.componentType === 'series' && params.target) {
                return `<div style="padding: 8px;">
                  <strong>${params.name}</strong><br/>
                  人数: ${params.value[2]} 人
                </div>`;
              }
              return params.name;
            }
          },
          geo: {
            map: 'china',
            roam: true,
            zoom: 1.2,
            center: [105, 36],
            label: {
              show: false
            },
            itemStyle: {
              areaColor: '#e2e8f0',
              borderColor: '#94a3b8',
              borderWidth: 1
            },
            emphasis: {
              itemStyle: {
                areaColor: '#cbd5e1'
              },
              label: {
                show: true,
                color: '#1e293b'
              }
            },
            select: {
              itemStyle: {
                areaColor: '#3b82f6'
              }
            }
          },
          series: [
            {
              type: 'scatter',
              coordinateSystem: 'geo',
              data: scatterData,
              symbolSize: function(val) {
                // 根据人数调整点大小
                const size = (val[2] / maxVal) * 30 + 10;
                return Math.max(size, 12);
              },
              itemStyle: {
                color: function(params) {
                  return getProvinceColor(params.data.name, mapStats.value.countMap, maxVal);
                },
                shadowBlur: 10,
                shadowColor: 'rgba(0, 0, 0, 0.3)'
              },
              label: {
                show: true,
                formatter: function(params) {
                  return params.value[2];
                },
                position: 'top',
                color: '#1e293b',
                fontSize: 12,
                fontWeight: 'bold'
              },
              zlevel: 2
            },
            {
              type: 'effectScatter',
              coordinateSystem: 'geo',
              data: scatterData,
              symbolSize: function(val) {
                const size = (val[2] / maxVal) * 30 + 10;
                return Math.max(size, 12);
              },
              showEffectOn: 'render',
              rippleEffect: {
                brushType: 'stroke',
                scale: 3
              },
              itemStyle: {
                color: function(params) {
                  return getProvinceColor(params.data.name, mapStats.value.countMap, maxVal);
                },
                shadowBlur: 10,
                shadowColor: 'rgba(0, 0, 0, 0.3)'
              },
              zlevel: 1
            }
          ]
        };

        chart.setOption(option);

        // 点击事件处理
        chart.off('click');
        chart.on('click', function(params) {
          let provinceName = null;
          if (params.seriesType === 'scatter' || params.seriesType === 'effectScatter') {
            provinceName = params.data?.name;
          } else if (params.componentType === 'geo' || params.target) {
            provinceName = params.name;
          }

          if (provinceName) {
            onProvinceClick(provinceName);
          }
        });

        // 响应窗口大小变化
        window.addEventListener('resize', () => chart.resize());
      });
    }

    // 点击省份显示该省份成员
    function onProvinceClick(provinceName) {
      // 获取该省份的成员
      const provinceMembers = persons.value.filter(p => {
        const normalized = normalizeProvince(p.birthPlace);
        return normalized === provinceName;
      });

      if (provinceMembers.length === 0) {
        toast(`${provinceName}暂无成员数据`, 'info');
        return;
      }

      // 显示成员列表
      showProvinceMembers(provinceMembers, provinceName);
    }

    // 显示省份成员弹窗
    function showProvinceMembers(members, provinceName) {
      // 临时存储弹窗数据
      mapProvinceModal.value = {
        show: true,
        province: provinceName,
        members: members
      };
    }

    function getProvinceColor(province, countMap, maxVal) {
      if (!countMap || !province) return '#94a3b8';
      const count = countMap[province] || 0;
      if (count === 0) return '#94a3b8';

      // 颜色渐变：从浅到深
      const ratio = count / maxVal;
      const colors = [
        { r: 239, g: 246, b: 255 }, // #eff6ff ( lightest )
        { r: 147, g: 197, b: 253 }, // #93c5fd
        { r: 59, g: 130, b: 246 },  // #3b82f6
        { r: 37, g: 99, b: 235 },   // #2563eb
        { r: 29, g: 78, b: 216 },   // #1e4ed8
        { r: 30, g: 58, b: 138 },   // #1e3a8a ( darkest )
      ];

      const idx = Math.min(Math.floor(ratio * (colors.length - 1)), colors.length - 1);
      const c = colors[idx];
      return `rgb(${c.r}, ${c.g}, ${c.b})`;
    }

    /* ========== Migration Map ========== */
    function renderMigrationMap() {
      if (view.value !== 'migration') return;

      nextTick(() => {
        const container = document.getElementById('migrationMap');
        if (!container) {
          console.error('Migration map container not found');
          return;
        }

        console.log('Rendering migration map');
        console.log('Events:', events.value);

        // 确保容器有尺寸
        container.style.width = '100%';
        container.style.height = '100%';

        // 销毁旧实例
        if (migrationMapInstance.value) {
          migrationMapInstance.value.remove();
          migrationMapInstance.value = null;
        }

        // 创建地图
        const map = L.map('migrationMap', {
          center: [35, 105],
          zoom: 4,
          zoomControl: true
        });

        // 使用 OpenStreetMap 底图
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map);

        migrationMapInstance.value = map;
        console.log('Leaflet map initialized');

        // 获取有位置的事件（兼容 lat/lng 或 latitude/longitude）
        const locationEvents = events.value.filter(function(e) {
          const lat = e.latitude !== undefined ? e.latitude : e.lat;
          const lng = e.longitude !== undefined ? e.longitude : e.lng;
          const hasLocation = lat !== undefined && lat !== null && lat !== '' &&
                             lng !== undefined && lng !== null && lng !== '';
          const isMigrationOrResidence = e.type === 'migration' || e.type === 'residence';
          return hasLocation && isMigrationOrResidence;
        }).sort(function(a, b) {
          return (a.eventDate || '').localeCompare(b.eventDate || '');
        });

        console.log('Location events:', locationEvents);

        if (locationEvents.length === 0) {
          console.log('No location events found');
          return;
        }

        // 按人物分组，同一人物按时间排序
        var eventsByPerson = {};
        locationEvents.forEach(function(e) {
          if (!eventsByPerson[e.personId]) {
            eventsByPerson[e.personId] = [];
          }
          eventsByPerson[e.personId].push(e);
        });

        var markers = [];

        // 绘制每个成员的迁徙路线
        Object.entries(eventsByPerson).forEach(function(entry) {
          var personId = entry[0];
          var evts = entry[1];
          var person = persons.value.find(function(p) { return p.id == personId; });
          if (!person) return;

          // 按时间排序
          evts.sort(function(a, b) {
            return (a.eventDate || '').localeCompare(b.eventDate || '');
          });

          // 创建路径点
          var coords = evts.map(function(e, idx) {
            var lat = e.latitude || e.lat;
            var lng = e.longitude || e.lng;

            // 确定标记类型
            var isFirst = idx === 0;
            var isResidence = e.type === 'residence';
            var isOrigin = isFirst && evts.length > 1;

            // 创建标记
            var markerHtml = createMarkerHtml(e, person, isOrigin, isResidence);

            var marker = L.marker([lat, lng], {
              icon: L.divIcon({
                className: 'migration-marker',
                html: markerHtml,
                iconSize: [40, 40],
                iconAnchor: [20, 40]
              })
            }).addTo(map);

            // 绑定点击事件
            marker.on('click', function(clickEvent) {
              L.DomEvent.stopPropagation(clickEvent.originalEvent);
              showMigrationCard(clickEvent.originalEvent, person, e);
            });

            markers.push(marker);

            return [lat, lng];
          });

          // 绘制迁徙路线
          if (coords.length > 1) {
            var polyline = L.polyline(coords, {
              color: '#3b82f6',
              weight: 2,
              opacity: 0.7,
              dashArray: '10, 10'
            }).addTo(map);
          }
        });

        // 自动调整视野以显示所有标记
        if (markers.length > 0) {
          var group = L.featureGroup(markers);
          map.fitBounds(group.getBounds().pad(0.1));
        }

        // 点击地图关闭卡片
        map.on('click', function() {
          migrationCard.value.show = false;
        });
      });
    }

    function createMarkerHtml(event, person, isOrigin, isResidence) {
      const color = isOrigin ? '#f59e0b' : (isResidence ? '#10b981' : '#3b82f6');
      const icon = isOrigin ? 'mdi-home' : (isResidence ? 'mdi-map-marker' : 'mdi-map-marker-radius');

      return `
        <div class="marker-pin" style="background: ${color}">
          <i class="mdi ${icon}"></i>
        </div>
        <div class="marker-center" style="background: ${color}"></div>
      `;
    }

    function showMigrationCard(e, person, event) {
      const card = migrationCard.value;
      card.show = true;
      card.person = person;
      card.event = event;
      card.x = e.clientX + 10;
      card.y = e.clientY - 80;
    }

    function getEventTypeLabel(type) {
      const types = {
        'birth': '出生',
        'death': '去世',
        'marriage': '婚姻',
        'migration': '迁徙',
        'achievement': '功名',
        'residence': '定居',
        'other': '其他'
      };
      return types[type] || type;
    }

    function goToPerson(personId) {
      migrationCard.value.show = false;
      if (personId) {
        const p = persons.value.find(x => x.id === personId);
        if (p) {
          pick(p);
          go('tree');
        }
      }
    }

    function debugMigration() {
      console.log('All events:', events.value);
      const migrationEvents = events.value.filter(e => e.type === 'migration' || e.type === 'residence');
      console.log('Migration/residence events:', migrationEvents);
      console.log('Has latitude:', migrationEvents.some(e => e.latitude !== undefined));
      console.log('Has lat:', migrationEvents.some(e => e.lat !== undefined));
      // 重新渲染
      renderMigrationMap();
    }

    /* ========== Location Picker ========== */
    function openMapPicker() {
      showLocationPicker.value = true;
      tempLocation.value = null;

      nextTick(() => {
        setTimeout(() => {
          initLocationPicker();
        }, 100);
      });
    }

    function initLocationPicker() {
      const container = document.getElementById('locationPickerMap');
      if (!container) return;

      if (locationPickerInstance.value) {
        locationPickerInstance.value.remove();
      }

      // 默认中心点（中国）
      const map = L.map('locationPickerMap', {
        center: [35, 105],
        zoom: 4
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);

      let currentMarker = null;

      // 点击地图选择位置
      map.on('click', (e) => {
        const { lat, lng } = e.latlng;

        if (currentMarker) {
          currentMarker.remove();
        }

        // 逆地理编码获取地址（简化版）
        const address = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;

        currentMarker = L.marker([lat, lng]).addTo(map);
        currentMarker.bindPopup(address).openPopup();

        tempLocation.value = { lat, lng, address };
      });

      locationPickerInstance.value = map;
    }

    function searchLocation() {
      if (!locationSearchQuery.value.trim() || !locationPickerInstance.value) return;

      // 使用 Nominatim API 进行地理编码
      const query = encodeURIComponent(locationSearchQuery.value + ', 中国');
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1`;

      fetch(url)
        .then(res => res.json())
        .then(data => {
          if (data && data.length > 0) {
            const result = data[0];
            const lat = parseFloat(result.lat);
            const lng = parseFloat(result.lon);

            locationPickerInstance.value.setView([lat, lng], 12);

            // 添加标记
            let marker = L.marker([lat, lng]).addTo(locationPickerInstance.value);
            marker.bindPopup(result.display_name).openPopup();

            tempLocation.value = {
              lat,
              lng,
              address: result.display_name
            };
          } else {
            toast('未找到该地点', 'info');
          }
        })
        .catch(err => {
          console.error('地理编码失败:', err);
          toast('搜索失败', 'error');
        });
    }

    function confirmLocation() {
      if (tempLocation.value) {
        ef.value.latitude = tempLocation.value.lat;
        ef.value.longitude = tempLocation.value.lng;
        ef.value.location = tempLocation.value.address;
      }
      showLocationPicker.value = false;
    }

    function onLocationInput() {
      // 可以在这里添加自动完成逻辑
    }

    /* ========== Timeline Linkage ========== */
    function onTimelineEventClick(event) {
      const personId = event.personId;
      linkedPersonId.value = personId;
      linkedEventId.value = event.id;

      // Switch to tree view and highlight
      go('tree');
      nextTick(() => {
        GraphManager.highlightPath(personId, persons.value, relations.value);
        GraphManager.focusNode(personId);
      });
    }

    function onGraphNodeClick(personId) {
      if (!linkageMode.value) return;
      linkedPersonId.value = personId;
      linkedEventId.value = null;

      // Switch to timeline view and scroll
      go('timeline');
      nextTick(() => {
        scrollTimelineToPerson(personId);
        GraphManager.clearHighlight();
      });
    }

    function scrollTimelineToPerson(personId) {
      nextTick(() => {
        const container = document.querySelector('.tl-page');
        if (!container) return;

        const personEvents = sortedEvents.value.filter(e => e.personId === personId);
        if (personEvents.length === 0) return;

        // Find first event element for this person
        const firstEvent = personEvents[0];
        const element = document.querySelector(`[data-event-id="${firstEvent.id}"]`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      });
    }

    function clearLinkageHighlight() {
      linkedPersonId.value = null;
      linkedEventId.value = null;
      GraphManager.clearHighlight();
    }

    // Clear highlight when switching views
    watch(view, () => {
      if (view.value !== 'tree') {
        GraphManager.clearHighlight();
      }
    });

    // Re-render graph when linkage mode changes
    watch(linkageMode, () => {
      if (view.value === 'tree' && persons.value.length) {
        renderGraphImpl();
      }
    });

    /* ==================== Region Select ==================== */
    function onProvinceChange() {
      pf.value.birthCity = '';
      if (pf.value.birthProvince) {
        cityList.value = getCities(pf.value.birthProvince) || [];
      } else {
        cityList.value = [];
      }
    }

    function initRegionSelect() {
      provinceList.value = getProvinces();
    }

    /* ==================== Init ==================== */
    onMounted(() => {
      checkAuth();
      initRegionSelect();
    });

    /* ==================== Return ==================== */
    return {
      /* Page / Auth */
      page, authError, loginForm, regForm, currentUser, families, currentFamily,
      isAdmin,
      doLogin, doRegister, doLogout,

      /* Family */
      enterFamily, backToFamilies,
      showFM, editingFamily, ff,
      openAddFamily, openEditFamily, saveFamily,
      showDelFamily, delFamilyTarget, askDelFamily, doDelFamily,

      /* Main app */
      view, q, filter, sel, showPM, showEM, showDel,
      editing, delTarget, relCtx, toasts, loading,
      pf, ef,
      persons, relations, events, statsData,
      viewMeta, evTypes,
      maxGen, genList, filtered, sortedEvents,
      maleN, femaleN, malePct, femalePct, genStats,
      selRelations, selEvents, personRelationsMap,

      /* Logs */
      logs, logTotal, logPage, logPageSize, logLoading, logFilters,
      showLogDetail, logDetailData,
      loadLogs, onLogPageChange, onLogFilterChange, viewLogDetail,

      /* Map */
      mapStats, showUnmatched, hasBirthPlaceData, mapLegendData, mapProvinceModal,

      /* Migration Map */
      hasMigrationData, migrationEventCount, debugEvents, showDebugEvents, migrationCard, goToPerson, getEventTypeLabel, debugMigration,

      /* Location Picker */
      showLocationPicker, locationSearchQuery, tempLocation,
      openMapPicker, searchLocation, confirmLocation, onLocationInput,

      /* Avatar */
      avatarPreview, avatarFull, onAvatarChange,

      /* Region */
      provinceList, cityList, birthPlaceFull, onProvinceChange,

      /* Actions */
      go, onSearch, pick, jumpTo,
      openAdd, openEdit, openAddChild, openAddSpouse, savePerson,
      toggleStar, askDel, doDel,
      openEventModal, saveEvent,
      exportJSON, exportPdf, importJSON, importExcel, downloadTemplate,
      gZoom, gFit, gCenter, gBeautify, renderGraph,
      nameOf, genOf, toast,

      /* Timeline Linkage */
      linkedPersonId, linkedEventId, linkageMode, timelineContainer,
      onTimelineEventClick, onGraphNodeClick, scrollTimelineToPerson, clearLinkageHighlight,
    };
  },
}).mount('#app');
