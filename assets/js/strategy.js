(() => {
  const D = StrategyData;
  const E = StrategyEditor;
  const esc = PL.esc;
  const records = D.records;
  const filters = { status: '', channel: '', page: 1, size: 10 };
  const badges = { draft: 'badge-gray', scheduled: 'badge-orange', published: 'badge-green', stopped: 'badge-gray' };
  let serial = 7;
  let section = '';
  let content;
  let record;
  let form;
  let step = 0;
  let error = '';
  let previewClosed = false;

  function route(hash) {
    if (location.hash !== hash) history.pushState(null, '', hash);
    readRoute();
    window.scrollTo(0, 0);
  }

  function readRoute() {
    updateScheduledRecords();
    const [view, routeId] = location.hash.slice(1).split('/');
    const id = routeId || (view === 'editor' ? new URLSearchParams(location.search).get('id') : '');
    record = records.find((item) => item.id === id);
    if (view === 'editor' && !id) {
      section = 'editor';
      const line = PLState.pl === 'hunt' ? 'hunt' : 'bird';
      form = D.makeForm({ line, model: D.models[line][0], region: PLState.region });
    } else if (record && ['editor', 'view'].includes(view) && record.status !== 'stopped') {
      section = record.status === 'published' ? 'detail' : 'editor';
      form = structuredClone(record.config);
    } else {
      section = 'list';
      form = null;
    }
    step = 0;
    error = '';
    previewClosed = false;
    setupShell();
  }

  function setupShell() {
    const activePath = section === 'list' ? 'strategy-list.html' : 'prototype-strategy.html#editor';
    const title = section === 'list' ? '策略配置' : section === 'detail' ? '策略详情' : '策略编辑器';
    document.title = `${title} · Demo 用户运营后台`;
    document.body.className = `strategy-page strategy-${section}-page`;
    content = PL.shell({
      title: `策略触达 · ${title}`, activePath, autoDemo: false,
      demo: { prd: '7', points: ['保存草稿、发布、停用与数据追踪使用演示数据。', '策略配置在当前页面会话内有效，刷新后重置。'] },
    });
    document.querySelector('[href="strategy-list.html"]').addEventListener('click', (event) => {
      if (!isPlainClick(event)) return;
      event.preventDefault();
      route('#strategies');
    });
    document.querySelector('[href="prototype-strategy.html#editor"]').addEventListener('click', (event) => {
      if (!isPlainClick(event)) return;
      event.preventDefault();
      beginNew();
    });
    document.getElementById('region-switch').addEventListener('click', (event) => {
      if (section === 'list' && event.target.closest('button')) refreshList();
    });
    content.addEventListener('submit', (event) => {
      event.preventDefault();
      const data = new FormData(event.target);
      filters.status = data.get('status');
      filters.channel = data.get('channel');
      refreshList();
    });
    content.addEventListener('click', handleClick);
    content.addEventListener('input', updateInput);
    content.addEventListener('change', updateSelection);
    render();
  }

  function isPlainClick(event) {
    return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.altKey && !event.shiftKey;
  }

  function beginNew() {
    // A legacy URL may have an id query parameter. Drop it before opening a fresh editor.
    if (location.search) history.replaceState(null, '', location.pathname + location.hash);
    route('#editor');
  }

  function refreshList() {
    filters.page = 1;
    render();
  }

  function updateScheduledRecords() {
    const now = Date.now();
    const today = D.utcDate();
    for (const item of records) {
      if (item.status !== 'scheduled') continue;
      const ready = item.config.channel === 'push'
        ? Date.parse(`${item.pushRunAt}Z`) <= now
        : item.config.start <= today && item.config.end >= today;
      if (ready) item.status = 'published';
    }
  }

  function getRecords() {
    updateScheduledRecords();
    return records.filter(({ status, config }) =>
      (PLState.pl === 'both' || PLState.pl === config.line) &&
      (PLState.region === 'all' || PLState.region === config.region) &&
      (!filters.status || filters.status === status) &&
      (!filters.channel || filters.channel === config.channel));
  }

  function actions(item) {
    const action = (key, label, extra = '') => `<button class="btn btn-sm ${extra}" type="button" data-command="${key}" data-id="${esc(item.id)}">${label}</button>`;
    const copy = action('copy', '复制新建', 'btn-ghost strategy-copy');
    if (item.status === 'published') return action('view', '查看') + action('stop', '停用') + copy;
    if (item.status === 'stopped') return action('delete', '删除', 'btn-danger') + copy;
    return action('edit', '编辑') + action('delete', '删除', 'btn-danger') + copy;
  }

  function renderList() {
    const visible = getRecords();
    const totalPages = Math.max(1, Math.ceil(visible.length / filters.size));
    filters.page = Math.min(filters.page, totalPages);
    const offset = (filters.page - 1) * filters.size;
    const rows = visible.slice(offset, offset + filters.size).map((item) => {
      const s = item.config;
      const group = s.channel !== 'banner' && s.audienceType === 'group'
        ? D.groups.find(({ id }) => id === s.group) : null;
      const audience = group
        ? `<span>${esc(group.name)}</span><small>${D.number.format(group.count)} 人</small>`
        : `<span>${esc(E.audienceLabel(s))}</span>`;
      return [
        `<strong>${esc(s.name)}</strong>`,
        `<span class="strategy-line">${PL.plTag(s.line)}<span>${esc(s.model)}</span></span>`,
        esc(D.regions[s.region]),
        `<span class="strategy-audience-cell">${audience}</span>`,
        `<span class="badge badge-gray">${D.channels[s.channel]}</span>`,
        `<span class="badge ${badges[item.status]}">${D.statuses[item.status]}</span>`,
        `<time class="strategy-time">${esc(item.created)}</time>`,
        `<div class="strategy-row-actions">${actions(item)}</div>`,
      ];
    });
    const table = PL.table(['名称', '产品线', '区域', '用户组合引用', '渠道', '状态', '创建时间（UTC）', '操作'], rows, { emptyText: '暂无符合条件的策略' });
    return `<section class="strategy-list" data-screen-label="策略列表">
      <form class="strategy-list-toolbar" aria-label="筛选策略">
        <select aria-label="状态" name="status">${E.options(D.statuses, filters.status, '全部状态')}</select>
        <select aria-label="渠道" name="channel">${E.options(D.channels, filters.channel, '全部渠道')}</select>
        <button class="btn btn-primary btn-sm" type="submit">查询</button>
        <span class="strategy-muted strategy-list-count" aria-live="polite">共 ${visible.length} 条策略</span>
        <button class="btn btn-primary" type="button" data-command="new">＋ 新建策略</button>
      </form>
      <div class="card strategy-list-card">${table}
        <div class="pager strategy-pager"><label>每页 <select aria-label="每页条数" id="strategy-page-size">${E.options(['10', '20', '50', '100'], filters.size)}</select> 条</label>
          <button class="btn btn-sm" type="button" data-command="previous-page"${filters.page <= 1 ? ' disabled' : ''}>上一页</button>
          <span aria-live="polite">${filters.page} / ${totalPages}</span>
          <button class="btn btn-sm" type="button" data-command="next-page"${filters.page >= totalPages ? ' disabled' : ''}>下一页</button>
        </div>
      </div>
    </section>`;
  }

  function render() {
    if (section === 'editor') content.innerHTML = E.editor(form, record, step, error);
    else if (section === 'detail') content.innerHTML = E.detail(record);
    else content.innerHTML = renderList();
    if (previewClosed) content.querySelector('.strategy-preview-screen')?.classList.add('is-closed');
  }

  function save(status, pushRunAt = '') {
    updateScheduledRecords();
    const current = records.find(({id}) => id === record?.id);
    if (current && !['draft', 'scheduled'].includes(current.status)) {
      route(`#view/${current.id}`);
      PL.toast('策略状态已变更，请查看最新状态', 'warn');
      return;
    }
    const item = current || { id: nextId(), created: D.stamp(), history: [], metrics: {} };
    form.name = form.name.trim();
    item.config = structuredClone(form);
    item.status = status;
    item.pushRunAt = pushRunAt;
    if (status !== 'draft') item.history.unshift({ action: status === 'scheduled' ? '定时发布' : '发布', at: D.stamp() });
    if (!current) records.unshift(item);
    exposeRecord();
    route('#strategies');
    PL.toast(status === 'draft' ? '已保存草稿' : status === 'scheduled' ? '已设为待发布' : '策略已发布', 'ok');
  }

  function nextId() { return `S${String(serial++).padStart(3, '0')}`; }

  function exposeRecord() {
    filters.status = '';
    filters.channel = '';
    filters.page = 1;
    PLState.pl = 'both';
    PLState.region = 'all';
  }

  function copy(item) {
    const config = structuredClone(item.config);
    config.name += '（副本）';
    const draft = { id: nextId(), status: 'draft', config, created: D.stamp(), history: [], metrics: {} };
    records.unshift(draft);
    filters.page = 1;
    if (filters.status && filters.status !== 'draft') filters.status = '';
    render();
    window.scrollTo(0, 0);
    PL.toast('已复制为新草稿', 'ok');
  }

  function confirmAction(title, body, label, callback, critical = false) {
    const previous = document.activeElement;
    const modal = PL.modal({ title, body: `<p>${esc(body)}</p>`, footer:
      `<button class="btn" type="button" data-dismiss>取消</button><button class="btn ${critical ? 'btn-danger' : 'btn-primary'}" type="button" data-confirm>${label}</button>` });
    const dialog = modal.el.querySelector('.modal');
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-label', title);
    const dismiss = modal.el.querySelector('[data-dismiss]');
    const confirm = modal.el.querySelector('[data-confirm]');
    const close = () => { modal.close(); if (previous?.isConnected) previous.focus(); };
    dismiss.addEventListener('click', close);
    confirm.addEventListener('click', () => { modal.close(); callback(); });
    modal.el.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') { event.preventDefault(); close(); }
      if (event.key === 'Tab') {
        const controls = [...dialog.querySelectorAll('button')];
        if (event.shiftKey && document.activeElement === controls[0]) { event.preventDefault(); confirm.focus(); }
        else if (!event.shiftKey && document.activeElement === confirm) { event.preventDefault(); controls[0].focus(); }
      }
    });
    dismiss.focus();
  }

  function handleRecordCommand(command, id) {
    const item = records.find((entry) => entry.id === id);
    if (!item) return;
    if (command === 'view') route(`#view/${id}`);
    if (command === 'edit') route(`#editor/${id}`);
    if (command === 'copy') copy(item);
    if (command === 'delete' && item.status !== 'published') {
      confirmAction('删除策略', `确定删除「${item.config.name}」？`, '删除', () => {
        records.splice(records.indexOf(item), 1);
        render();
        PL.toast('已删除策略', 'ok');
      }, true);
    }
    if (command === 'stop' && item.status === 'published') {
      confirmAction('停用策略', `停用「${item.config.name}」后，App 预计在 1 分钟内停止展示。`, '确认停用', () => {
        item.status = 'stopped';
        item.history.unshift({ action: '停用', at: D.stamp() });
        render();
        PL.toast('已停用策略', 'ok');
      }, true);
    }
  }

  function gotoStep(target) {
    step = target;
    previewClosed = false;
    render();
    document.getElementById('strategy-step-title')?.focus({ preventScroll: true });
  }

  function changeStep(draft = false) {
    const steps = E.stepsFor(form);
    const target = draft ? 0 : step;
    error = E.validate(form, steps[target]);
    if (error) { gotoStep(target); return; }
    if (draft) save('draft');
    else gotoStep(target + 1);
  }

  function publish() {
    const invalid = E.stepsFor(form).findIndex((key) => {
      error = E.validate(form, key);
      return Boolean(error);
    });
    if (invalid >= 0) { gotoStep(invalid); return; }
    if (form.channel === 'push') {
      const runAt = D.nextPushRun(form);
      if (!runAt) {
        error = E.validate(form, 'trigger');
        gotoStep(E.stepsFor(form).indexOf('trigger'));
        return;
      }
      const message = form.pushSchedule === 'once'
        ? `将于 ${D.formatUtcMinute(runAt)} 执行单次下发。`
        : `首次下发时间为 ${D.formatUtcMinute(runAt)}，之后在生效期内按每日时刻执行。`;
      confirmAction('发布策略', message, '确认发布', () => {
        if (D.nextPushRun(form) !== runAt) {
          error = E.validate(form, 'trigger') || '原定下发时刻已过，请确认新的下发安排。';
          gotoStep(E.stepsFor(form).indexOf('trigger'));
          return;
        }
        save('scheduled', runAt);
      });
      return;
    }
    const status = form.start > D.utcDate() ? 'scheduled' : 'published';
    const message = status === 'scheduled' ? `策略将在 ${form.start}（UTC）开始生效。` : '策略将按已配置的触发规则生效。';
    confirmAction('发布策略', message, '确认发布', () => save(status));
  }

  function updateAudience() {
    const allowed = D.forTags(form).map(({id}) => id);
    form.tags = form.tags.filter((id) => allowed.includes(id));
    if (!D.forGroups(form).some(({id}) => id === form.group)) form.group = '';
  }

  function setValue(path, value) {
    const [field, sub] = path.split('.');
    if (sub) form[field][sub] = value;
    else form[field] = value;
    if (field === 'line') form.model = D.models[value][0];
    if (field === 'line' || field === 'channel') updateAudience();
  }

  function rerenderFrom(control) {
    const id = control.id;
    const choice = control.dataset.choice;
    const value = control.dataset.value;
    error = '';
    previewClosed = false;
    render();
    if (id) document.getElementById(id)?.focus({ preventScroll: true });
    else if (choice) content.querySelector(`[data-choice="${choice}"][data-value="${value}"]`)?.focus({ preventScroll: true });
  }

  function updateInput(event) {
    const el = event.target;
    if (section !== 'editor' || !el.dataset.field || el.matches('select')) return;
    setValue(el.dataset.field, el.value);
    const preview = content.querySelector('.strategy-preview');
    if (preview) { previewClosed = false; preview.outerHTML = E.preview(form); }
  }

  async function readImage(el) {
    const file = el.files?.[0];
    if (!file) return;
    const key = el.dataset.image;
    const draft = form;
    if (!file.type.startsWith('image/')) { PL.toast('请选择图片文件', 'warn'); return; }
    try {
      const asset = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve({ name: file.name, src: reader.result });
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      if (form !== draft) return;
      form[key] = asset;
      rerenderFrom(el);
    } catch {
      if (form === draft) PL.toast('读取图片失败，请重新选择', 'warn');
    }
  }

  function updateSelection(event) {
    const el = event.target;
    if (section === 'list' && el.id === 'strategy-page-size') { filters.size = Number(el.value); refreshList(); return; }
    if (section !== 'editor') return;
    if (el.dataset.image) { readImage(el); return; }
    if (el.matches('select[data-field]')) { setValue(el.dataset.field, el.value); rerenderFrom(el); return; }
    if (el.name === 'audienceTag' || el.name === 'cycleDay') {
      const property = el.name === 'audienceTag' ? 'tags' : 'days';
      form[property] = [...content.querySelectorAll(`[name="${el.name}"]:checked`)].map((input) => input.value);
    }
  }

  function runPreview(key) {
    const links = { primary: form.primary, secondary: form.secondary, push: form.pushAction, banner: form.bannerAction };
    if (key === 'popupImage') { PL.toast(`图片跳转 · ${form.popupImageUrl}`); return; }
    const action = links[key];
    if (['primary', 'secondary'].includes(key) && action.type === 'none') {
      previewClosed = true;
      content.querySelector('.strategy-preview-screen').classList.add('is-closed');
      PL.toast('已关闭弹窗预览');
      return;
    }
    PL.toast(E.destinationLabel(action));
  }

  function handleClick(event) {
    const button = event.target.closest('button');
    if (!button) return;
    const { choice, value, clearImage, command, id, previewAction } = button.dataset;
    if (choice) { setValue(choice, value); rerenderFrom(button); return; }
    if (clearImage) { form[clearImage] = null; rerenderFrom(button); return; }
    if (previewAction) { runPreview(previewAction); return; }
    if (id) { handleRecordCommand(command, id); return; }
    if (command === 'new') beginNew();
    if (command === 'list') route('#strategies');
    if (command === 'back') { error = ''; gotoStep(step - 1); }
    if (command === 'next') changeStep();
    if (command === 'draft') changeStep(true);
    if (command === 'publish') publish();
    if (command === 'previous-page') { filters.page -= 1; render(); }
    if (command === 'next-page') { filters.page += 1; render(); }
  }

  document.addEventListener('pl-change', () => { if (section === 'list') refreshList(); });
  window.addEventListener('popstate', readRoute);
  readRoute();
})();
