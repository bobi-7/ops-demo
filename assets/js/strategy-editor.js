window.StrategyEditor = (() => {
  const D = StrategyData;
  const esc = PL.esc;
  const stepLabels = { base: '基础信息', content: '内容与文案', audience: '推送人群', trigger: '触发方式', review: '预览与发布' };
  const stepsFor = (form) => form.channel === 'banner'
    ? ['base', 'content', 'trigger', 'review']
    : ['base', 'content', 'audience', 'trigger', 'review'];

  function options(items, value, placeholder) {
    const entries = Array.isArray(items) ? items.map((item) => [item, item]) : Object.entries(items);
    return (placeholder ? `<option value="">${esc(placeholder)}</option>` : '') + entries.map(([key, label]) =>
      `<option value="${esc(key)}"${String(key) === String(value) ? ' selected' : ''}>${esc(label)}</option>`).join('');
  }

  function field(label, key, control, required = false, className = '') {
    return `<div class="form-field ${className}"><label for="${key}">${label}${required ? '<span class="req" aria-hidden="true">*</span>' : ''}</label>${control}</div>`;
  }

  function input(key, value, type = 'text', placeholder = '') {
    return `<input id="${key}" data-field="${key}" type="${type}" value="${esc(value)}" placeholder="${esc(placeholder)}"${type === 'url' ? ' inputmode="url"' : ''}>`;
  }

  function select(key, items, value, placeholder) {
    return `<select id="${key}" data-field="${key}" data-render>${options(items, value, placeholder)}</select>`;
  }

  function choices(key, items, current, label) {
    return `<div class="seg strategy-seg" role="group" aria-label="${esc(label)}">${Object.entries(items).map(([value, name]) =>
      `<button type="button" data-choice="${key}" data-value="${esc(value)}" class="${current === value ? 'on' : ''}" aria-pressed="${current === value}">${esc(name)}</button>`).join('')}</div>`;
  }

  function jumpField(key, action, label = '跳转方式', close = false) {
    const optionNames = { none: close ? '不跳转（关闭弹窗）' : '不跳转', internal: '站内', external: '站外' };
    let target = '';
    if (action.type === 'internal') target = field('App 页面', `${key}.page`, select(`${key}.page`, D.destinations, action.page, '请选择页面'), true);
    if (action.type === 'external') target = field('站外网址', `${key}.url`, input(`${key}.url`, action.url, 'url', 'https://example.com'), true);
    return field(label, `${key}.type`, select(`${key}.type`, optionNames, action.type)) + target;
  }

  function uploader(key, label, image, required = false) {
    return field(label, key, `<div class="strategy-upload">
      <label class="btn btn-sm strategy-upload-label"><span>上传图片</span><input id="${key}" type="file" accept="image/*" data-image="${key}" aria-label="${label}"></label>
      <span class="strategy-muted strategy-file-name">${image ? esc(image.name) : '未选择文件'}</span>
      ${image ? `<button class="btn btn-sm btn-ghost" type="button" data-clear-image="${key}">移除</button>` : ''}
    </div>`, required);
  }

  function baseFields(form) {
    return `<div class="form-grid strategy-grid">
      ${field('策略名称', 'name', input('name', form.name, 'text', '如：试用到期提醒'), true, 'strategy-wide')}
      ${field('产品线', 'line', select('line', D.lines, form.line), true)}
      ${field('产品系列', 'model', select('model', D.models[form.line], form.model), true)}
      ${field('触达区域', 'region', select('region', D.regions, form.region), true)}
      <div class="form-field"><label id="strategy-channel-label">触达渠道<span class="req" aria-hidden="true">*</span></label>
        ${choices('channel', { push: 'Push', popup: 'App 弹窗', banner: 'Banner' }, form.channel, '触达渠道')}
      </div>
    </div>`;
  }

  function popupButton(key, name, button) {
    return `<fieldset class="strategy-button-row"><legend>${name}</legend><div class="form-grid strategy-grid strategy-button-fields">
      ${field('按钮文案', `${key}.text`, input(`${key}.text`, button.text, 'text', key === 'secondary' ? 'Later' : 'Learn more'), true)}
      ${jumpField(key, button, '点击后', true)}
    </div></fieldset>`;
  }

  function contentFields(form) {
    if (form.channel === 'popup') {
      return `<div class="strategy-fields">
        ${uploader('popupImage', '弹窗配图', form.popupImage)}
        ${field('图片跳转链接', 'popupImageUrl', input('popupImageUrl', form.popupImageUrl, 'text', '选填'))}
        <div class="form-field"><label>按钮类型</label>${choices('buttonStyle', { dual: '主次按钮', single: '单按钮', none: '无按钮' }, form.buttonStyle, '按钮类型')}</div>
        ${form.buttonStyle === 'none' ? '' : popupButton('primary', form.buttonStyle === 'dual' ? '主按钮' : '按钮', form.primary)}
        ${form.buttonStyle === 'dual' ? popupButton('secondary', '次按钮', form.secondary) : ''}
      </div>`;
    }
    if (form.channel === 'banner') {
      const ranks = Array.from({ length: 10 }, (_, i) => String(i + 1));
      return `<div class="strategy-fields">
        ${uploader('bannerImage', 'Banner 图片', form.bannerImage, true)}
        <div class="form-grid strategy-grid">
          ${field('投放位置', 'placement', select('placement', D.placements, form.placement), true)}
          ${field('轮播顺序', 'order', select('order', ranks, form.order) + '<span class="help">数字越小，位置越靠前</span>', true)}
        </div>
        <div class="form-grid strategy-grid">${jumpField('bannerAction', form.bannerAction)}</div>
      </div>`;
    }
    return `<div class="strategy-fields">
      ${field('标题', 'pushTitle', input('pushTitle', form.pushTitle, 'text', '选填，使用英文'))}
      ${field('正文', 'pushBody', `<textarea id="pushBody" data-field="pushBody" rows="4" placeholder="输入英文通知正文">${esc(form.pushBody)}</textarea>`, true)}
      ${uploader('pushImage', '配图', form.pushImage)}
      <div class="form-grid strategy-grid">${jumpField('pushAction', form.pushAction)}</div>
    </div>`;
  }

  function audienceFields(form) {
    let detail = '';
    if (form.audienceType === 'group') {
      const groups = D.forGroups(form);
      const groupOpts = Object.fromEntries(groups.map(({id, name, count}) => [id, `${name} · ${D.number.format(count)} 人`]));
      detail = `<div class="strategy-fit">${field('用户分组', 'group', select('group', groupOpts, form.group, '选择分组') + '<span class="help">显示分组总人数。每天更新分组，触达投放范围内的成员。</span>', true)}</div>`;
    } else if (form.audienceType === 'tags') {
      detail = `<div class="strategy-tag-list" role="group" aria-label="受众标签">${D.forTags(form).map((tag) => `
          <label class="strategy-tag"><input type="checkbox" name="audienceTag" value="${tag.id}"${form.tags.includes(tag.id) ? ' checked' : ''}>
            <span><b>${esc(tag.name)}</b><small>${esc(tag.note)}</small></span></label>`).join('')}</div>
        <p class="strategy-muted">多选时，范围内的用户需同时满足所选标签。</p>`;
    }
    return `<div class="strategy-fields">
      <p class="strategy-scope"><span>投放范围</span><strong>${esc(D.scope(form))}</strong></p>
      ${choices('audienceType', { all: '范围内全部用户', tags: '按受众标签筛选', group: '引用用户分组' }, form.audienceType, '推送人群选择方式')}
      ${detail}
      ${form.channel === 'push' ? `<p class="strategy-rule">${D.once}。</p>` : ''}
    </div>`;
  }

  function dateWindow(form) {
    return `<div class="form-grid strategy-grid strategy-date-grid">
        ${field('UTC 开始日期', 'start', input('start', form.start, 'date'), true)}
        ${field('UTC 结束日期', 'end', input('end', form.end, 'date'), true)}
      </div>`;
  }

  function triggerFields(form) {
    if (form.channel === 'push') {
      const single = form.pushSchedule === 'once';
      return `<div class="strategy-fields">
        ${choices('pushSchedule', { once: '单次下发', range: '时间段下发' }, form.pushSchedule, 'Push 下发方式')}
        ${single
          ? `<div class="strategy-fit">${field('UTC 下发日期与时间', 'pushAt', input('pushAt', form.pushAt, 'datetime-local'), true)}</div>`
          : `${dateWindow(form)}<div class="strategy-fit">${field('每日下发时刻（UTC）', 'pushTime', input('pushTime', form.pushTime, 'time'), true)}</div>`}
        <p class="strategy-muted">${single ? '到达指定时刻时筛选人群并下发一次。' : '起止日期均包含在内，每天到点筛选人群。'} ${D.once}。</p>
      </div>`;
    }
    const cycle = D.isCycle(form);
    return `<div class="strategy-fields">
      ${form.channel === 'popup' ? choices('trigger', { scheduled: '定时触发', cycle: '周期触发' }, form.trigger, '触发方式') : ''}
      ${dateWindow(form)}
      ${cycle ? `<div class="strategy-fit">${field('周期频率', 'cycle', select('cycle', { daily: '每天', weekly: '每周', monthly: '每月' }, form.cycle), true)}</div>
        ${form.cycle === 'weekly' ? `<fieldset class="strategy-week"><legend>触发星期<span class="req" aria-hidden="true">*</span></legend><div>${D.weekdays.map((day, i) => `<label><input type="checkbox" name="cycleDay" value="${i}"${form.days.includes(String(i)) ? ' checked' : ''}>${day}</label>`).join('')}</div></fieldset>` : ''}
        ${form.cycle === 'monthly' ? `<div class="strategy-fit">${field('每月触发日', 'dayOfMonth', select('dayOfMonth', Object.fromEntries(Array.from({ length: 31 }, (_, i) => [i + 1, `${i + 1} 日`])), form.dayOfMonth), true)}</div>` : ''}
        <p class="strategy-muted">在生效日期范围内按所选周期触发。${form.cycle === 'monthly' ? '当月没有所选日期时跳过。' : ''}</p>
      ` : ''}
    </div>`;
  }

  function destinationLabel(action) {
    if (action.type === 'internal') return action.page ? `站内 · ${action.page}` : '站内 · 待选择';
    if (action.type === 'external') return action.url ? `站外 · ${action.url}` : '站外 · 待填写';
    return '不跳转';
  }

  function audienceLabel(form) {
    if (form.channel === 'banner') return '—';
    if (form.audienceType === 'all') return '范围内全部用户';
    if (form.audienceType === 'group') {
      const match = D.groups.find(({id}) => id === form.group);
      return match ? `${match.name} · ${D.number.format(match.count)} 人` : '—';
    }
    if (form.audienceType === 'tags') return D.tags.filter(({id}) => form.tags.includes(id)).map(({name}) => name).join('、') || '—';
    return '—';
  }

  function imagePreview(asset, label) {
    if (asset?.src) return `<img class="strategy-preview-image" src="${esc(asset.src)}" alt="${esc(label)}">`;
    return `<div class="strategy-placeholder${asset?.sample ? ' sample' : ''}">${asset?.sample ? 'Sample artwork' : esc(label)}</div>`;
  }

  function preview(form) {
    const button = (key, data) => `<button type="button" data-preview-action="${key}" class="preview-${key}">${esc(data.text.trim() || (key === 'primary' ? 'Learn more' : 'Later'))}</button>`;
    let content;
    if (form.channel === 'popup') {
      content = `<div class="strategy-app-background" lang="en"><b>Home</b><div></div><div></div></div>
        <div class="strategy-app-shade"></div><div class="strategy-app-dialog" lang="en">
          ${form.popupImageUrl.trim() ? `<button type="button" class="strategy-art-button" data-preview-action="popupImage" aria-label="Preview image link">${imagePreview(form.popupImage, 'Popup image')}</button>` : imagePreview(form.popupImage, 'Popup image')}
          ${form.buttonStyle !== 'none' ? `<div class="strategy-app-actions">${button('primary', form.primary)}${form.buttonStyle === 'dual' ? button('secondary', form.secondary) : ''}</div>` : ''}
        </div>`;
    } else if (form.channel === 'banner') {
      content = `<div class="strategy-banner-frame" lang="en"><b>Explore</b>
        <button type="button" class="strategy-art-button" data-preview-action="banner" aria-label="Preview Banner link">${imagePreview(form.bannerImage, 'Banner image')}</button>
        <div class="strategy-app-lines"><i></i><i></i><i></i></div></div>`;
    } else {
      content = `<div class="strategy-notification" lang="en"><button type="button" class="strategy-notification-button" data-preview-action="push">
        <span class="strategy-notification-head"><span class="strategy-app-icon">D</span><span>Demo</span><small>now</small></span>
        ${form.pushTitle.trim() ? `<b>${esc(form.pushTitle)}</b>` : ''}
        <span class="strategy-push-copy">${esc(form.pushBody || 'Your notification appears here.')}</span>
        ${form.pushImage ? imagePreview(form.pushImage, 'Notification image') : ''}
      </button></div>`;
    }
    return `<aside class="strategy-preview" aria-label="${D.channels[form.channel]}预览"><h3>App 预览</h3><div class="strategy-preview-screen ${form.channel}">${content}</div></aside>`;
  }

  function summary(form) {
    const rows = [
      ['策略名称', form.name || '—'], ['产品线', `${D.lines[form.line]} · ${form.model}`],
      ['触达区域', D.regions[form.region]], ['触达渠道', D.channels[form.channel]],
    ];
    if (form.channel !== 'banner') {
      const audience = form.audienceType === 'all' ? `${D.scope(form)} · 全部用户` : audienceLabel(form);
      rows.push(['推送人群', audience]);
    }
    rows.push(['触发方式', D.timing(form)]);
    if (form.channel === 'push') rows.push(['发送规则', `${D.once}。`], ['点击通知', destinationLabel(form.pushAction)]);
    if (form.channel === 'banner') rows.push(['投放位置', D.placements[form.placement]], ['轮播顺序', form.order], ['点击图片', destinationLabel(form.bannerAction)]);
    if (form.channel === 'popup') {
      if (form.popupImageUrl) rows.push(['图片跳转', form.popupImageUrl]);
      if (form.buttonStyle !== 'none') rows.push([form.buttonStyle === 'dual' ? '主按钮' : '按钮', `${form.primary.text || '—'} · ${form.primary.type === 'none' ? '关闭弹窗' : destinationLabel(form.primary)}`]);
      if (form.buttonStyle === 'dual') rows.push(['次按钮', `${form.secondary.text || '—'} · ${form.secondary.type === 'none' ? '关闭弹窗' : destinationLabel(form.secondary)}`]);
    }
    return `<dl class="strategy-summary">${rows.map(([label, value]) => `<div><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`).join('')}</dl>`;
  }

  function metrics(record) {
    const definitions = {
      push: [['sent', '成功发送次数'], ['clicked', 'Push 点击次数']],
      popup: [['shown', '弹窗展示次数'], ['primary', '主按钮点击次数'], ['secondary', '次按钮点击次数']],
      banner: [['clicked', 'Banner 点击次数']],
    };
    const { config, metrics: values } = record;
    const entries = definitions[config.channel].filter(([key]) => {
      if (config.channel !== 'popup') return true;
      if (key === 'secondary') return config.buttonStyle === 'dual';
      return key !== 'primary' || config.buttonStyle !== 'none';
    });
    return `<section class="card strategy-metrics"><div class="card-head"><h3>数据追踪</h3><span class="strategy-muted">演示数据</span></div>
      <dl class="strategy-metric-grid">${entries.map(([key, label]) => `<div><dt>${label}</dt><dd>${D.number.format(values[key] || 0)}</dd></div>`).join('')}</dl></section>`;
  }

  function history(record) {
    if (!record?.history.length) return '';
    return `<section class="card strategy-history"><div class="card-head"><h3>操作日志</h3></div><ul>${record.history.map((entry) => `<li><span>${esc(entry.action)}</span><time>${esc(entry.at)} UTC</time></li>`).join('')}</ul></section>`;
  }

  function progress(steps, current) {
    return `<nav class="steps strategy-steps" aria-label="编辑进度">${steps.map((key, i) => {
      const status = i < current ? 'done' : i === current ? 'on' : '';
      const value = i < current ? '✓' : i + 1;
      const marker = i === current ? ' aria-current="step"' : '';
      return `${i ? `<span class="step-line${i <= current ? ' done' : ''}" aria-hidden="true"></span>` : ''}<span class="step ${status}"${marker}><span class="step-dot">${value}</span><span class="step-label">${stepLabels[key]}</span></span>`;
    }).join('')}</nav>`;
  }

  function editor(form, record, current, error) {
    const steps = stepsFor(form);
    const key = steps[current];
    const last = key === 'review';
    const title = record ? '编辑策略' : '新建策略';
    const fields = { base: baseFields, content: contentFields, audience: audienceFields, trigger: triggerFields, review: summary };
    return `<div class="strategy-editor">
      <div class="strategy-page-bar"><button type="button" class="btn btn-sm" data-command="list">← 返回策略列表</button>
        ${record ? `<span class="strategy-muted">${esc(record.id)}</span>` : ''}</div>
      <section class="card strategy-card" data-screen-label="${title}">
        <div class="card-head strategy-editor-head"><h2>${title}</h2></div>
        <div class="card-body strategy-editor-body">${progress(steps, current)}
          <div class="strategy-step-layout${key === 'content' || last ? ' with-preview' : ''}">
            <div class="strategy-step-fields"><h3 tabindex="-1" id="strategy-step-title">${stepLabels[key]}</h3>${fields[key](form)}
              ${error ? `<p class="strategy-error" role="alert">${esc(error)}</p>` : ''}
            </div>${key === 'content' || last ? preview(form) : ''}
          </div>
        </div>
        <div class="strategy-footer">
          <button type="button" class="btn" data-command="back"${current === 0 ? ' disabled' : ''}>上一步</button>
          <div><button type="button" class="btn" data-command="draft">保存草稿</button>
          <button type="button" class="btn btn-primary" data-command="${last ? 'publish' : 'next'}">${last ? '发布' : '下一步'}</button></div>
        </div>
      </section>${history(record)}
    </div>`;
  }

  function detail(record) {
    return `<div class="strategy-editor"><div class="strategy-page-bar"><button type="button" class="btn btn-sm" data-command="list">← 返回策略列表</button></div>
      <section class="card strategy-card" data-screen-label="查看策略"><div class="card-head strategy-editor-head"><h2>${esc(record.config.name)}</h2>${PL.badge(D.statuses[record.status])}</div>
        <div class="card-body strategy-editor-body strategy-step-layout with-preview"><div>${summary(record.config)}</div>${preview(record.config)}</div>
      </section>${metrics(record)}${history(record)}</div>`;
  }

  function webUrl(raw) {
    try { return ['https:', 'http:'].includes(new URL(raw.trim()).protocol); } catch { return false; }
  }

  function validateJump(action, label) {
    if (action.type === 'internal' && !D.destinations.includes(action.page)) return `请选择${label}的站内页面。`;
    if (action.type === 'external' && !webUrl(action.url)) return `请输入${label}的有效网址（http:// 或 https://）。`;
    return '';
  }

  function validate(form, step) {
    if (step === 'base') return form.name.trim() ? '' : '请填写策略名称。';
    if (step === 'content') {
      if (form.channel === 'push') return form.pushBody.trim() ? validateJump(form.pushAction, 'Push') : '请填写 Push 正文。';
      if (form.channel === 'banner') return form.bannerImage ? validateJump(form.bannerAction, 'Banner') : '请上传 Banner 图片。';
      if (form.popupImageUrl.trim() && !form.popupImage) return '请先上传需要跳转的弹窗图片。';
      if (form.buttonStyle === 'none') return form.popupImage ? '' : '请上传弹窗配图。';
      if (!form.primary.text.trim()) return form.buttonStyle === 'dual' ? '请填写主按钮文案。' : '请填写按钮文案。';
      const primaryError = validateJump(form.primary, form.buttonStyle === 'dual' ? '主按钮' : '按钮');
      if (primaryError || form.buttonStyle !== 'dual') return primaryError;
      return form.secondary.text.trim() ? validateJump(form.secondary, '次按钮') : '请填写次按钮文案。';
    }
    if (step === 'audience') {
      if (form.audienceType === 'all') return '';
      if (form.audienceType === 'group') return D.forGroups(form).some(({id}) => id === form.group) ? '' : '请选择用户分组。';
      if (form.audienceType === 'tags') return form.tags.length ? '' : '请至少选择一个受众标签。';
      return '请选择推送人群方式。';
    }
    if (step === 'trigger') {
      if (form.channel === 'push' && form.pushSchedule === 'once') {
        if (!form.pushAt) return '请选择 UTC 下发日期与时间。';
        if (!D.nextPushRun(form)) return '单次下发时间必须晚于当前时间。';
        return '';
      }
      if (!form.start || !form.end) return '请填写 UTC 开始日期和结束日期。';
      if (form.start > form.end) return '结束日期不能早于开始日期。';
      if (form.end < D.utcDate()) return '请选择尚未结束的触发日期范围。';
      if (form.channel === 'push') {
        if (!form.pushTime) return '请选择每日下发时刻（UTC）。';
        if (!D.nextPushRun(form)) return '这个时间段内已没有可执行的下发时刻，请调整日期或时刻。';
      }
      if (D.isCycle(form)) {
        if (form.cycle === 'weekly' && !form.days.length) return '请至少选择一个触发星期。';
        if (!D.hasCycleDate(form)) return '生效日期范围内没有符合周期的日期，请调整日期范围或周期。';
      }
    }
    return '';
  }

  return { editor, detail, preview, stepsFor, options, audienceLabel, destinationLabel, validate };
})();
