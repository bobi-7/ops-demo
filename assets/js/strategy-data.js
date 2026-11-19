/* 策略原型使用独立的脱敏演示数据。页面之间共享内存态。 */
window.StrategyData = (() => {
  const channels = { push: 'Push', popup: '弹窗', banner: 'Banner' };
  const lines = { bird: '观鸟线', hunt: '狩猎线' };
  const models = { bird: ['K3', 'Q5'], hunt: ['TL300'] };
  const regions = { all: '全量', na: '北美', eu: '欧洲' };
  const statuses = { draft: '草稿', scheduled: '待发布', published: '已发布', stopped: '已停用' };
  const destinations = ['Home', 'Gallery', 'AI Assistant', 'Explore', 'Me Tab', 'My Plan', 'Subscription 页', 'Gallery 详情页', 'AI Insights', 'AI Species Gallery'];
  const placements = { exploreTop: 'Explore Tab 顶部' };
  const weekdays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
  const tags = [
    { id: 'noCapture', name: '绑定后无首图引导', note: '观鸟设备已绑定至少 1 天，且尚未上传任何拍摄文件', channels: ['push'], line: 'bird' },
    { id: 'winBack', name: '7–30 天未激活兜底召回', note: '注册 7–30 天，已绑定本人观鸟相机，且未完成任一设备的鸟类首图', channels: ['push'], line: 'bird' },
    { id: 'highlights', name: '高光时刻更新', note: '账号当前有观鸟高光时刻', channels: ['push'], line: 'bird' },
    { id: 'aiRecognition', name: 'AI 识别额度用尽', note: 'AI 识别额度为 0', channels: ['push'] },
    { id: 'aiAssistant', name: 'AI 助手额度用尽', note: '观鸟线 AI 助手额度为 0', channels: ['push'], line: 'bird' },
    { id: 'trial', name: '开启试用期间', note: '当前处于试用期', channels: ['popup', 'push'] },
    { id: 'trialDay3', name: '试用第 3 天', note: '当日进入试用第 3 天', channels: ['popup', 'push'] },
    { id: 'renewal', name: '订阅到期前 1 天', note: '当日距离订阅到期 1 天', channels: ['popup', 'push'] },
    { id: 'optOut', name: '未自动续费', note: '有付费或试用套餐，且已关闭自动续费', channels: ['popup', 'push'] },
  ];
  const groups = [
    { id: 'P001', name: '狩猎体验期未转付费', line: 'hunt', count: 1240 },
    { id: 'P002', name: '订阅即将到期 ≤7 天', line: 'both', count: 8640 },
    { id: 'P003', name: '观鸟 7 天试用中用户', line: 'bird', count: 532 },
    { id: 'P005', name: '已购 K3 未订阅', line: 'bird', count: 2210 },
  ];
  const number = new Intl.NumberFormat('zh-CN');
  const once = '同一策略对同一用户只发送 1 次';
  const utcDate = () => new Date().toISOString().slice(0,10);
  const dayOffset = (days) => new Date(Date.now() + days * 86400000).toISOString().slice(0,10);
  const newDestination = () => ({ type: 'none', page: '', url: '' });
  const makeForm = (values = {}) => ({
    name: '', line: 'bird', model: 'K3', region: 'all', channel: 'push',
    pushTitle: '', pushBody: '', pushImage: null, pushAction: newDestination(),
    popupImage: null, popupImageUrl: '', buttonStyle: 'single',
    primary: { text: '', ...newDestination() }, secondary: { text: '', ...newDestination() },
    bannerImage: null, bannerAction: newDestination(), order: '1', placement: 'exploreTop',
    audienceType: '', tags: [], group: '', trigger: 'scheduled', start: '', end: '',
    pushSchedule: 'range', pushAt: '', pushTime: '',
    cycle: 'daily', days: [], dayOfMonth: '1', ...values,
  });
  const imageSample = { name: '示例图片', src: '', sample: true };
  const openPlan = { type: 'internal', page: 'My Plan', url: '' };
  const sample = (id, status, created, values, metrics = {}) => ({
    id, status, created, config: makeForm(values), metrics, history: [],
  });
  const records = [
    sample('S001', 'published', '2026-11-13 14:20', {
      name: '体验期转化提醒', line: 'hunt', model: 'TL300', region: 'na',
      pushTitle: 'Keep your camera connected', pushBody: 'Your trial is ending soon. Find a plan that fits your camera.',
      pushAction: openPlan, audienceType: 'group', group: 'P001', start: dayOffset(-4), end: dayOffset(8), pushTime: '16:00',
    }, { sent: 824, clicked: 136 }),
    sample('S002', 'published', '2026-11-12 10:45', {
      name: '续费到期提醒', pushTitle: 'Your subscription ends tomorrow', pushBody: 'Review your plan to keep your account benefits.',
      pushAction: openPlan, audienceType: 'tags', tags: ['renewal'], start: dayOffset(-5), end: dayOffset(9), pushTime: '14:00',
    }, { sent: 416, clicked: 78 }),
    sample('S003', 'scheduled', '2026-11-10 08:30', {
      name: '新用户试用引导', channel: 'popup', region: 'eu', popupImage: imageSample,
      buttonStyle: 'dual', primary: { text: 'Explore your plan', ...openPlan }, secondary: { text: 'Later', ...newDestination() },
      audienceType: 'group', group: 'P003', start: dayOffset(2), end: dayOffset(15),
    }),
    sample('S004', 'draft', '2026-11-09 16:15', {
      name: '探索页活动横幅', channel: 'banner', bannerImage: imageSample,
      bannerAction: { type: 'internal', page: 'Explore', url: '' }, start: dayOffset(3), end: dayOffset(17),
    }),
    sample('S005', 'stopped', '2026-11-08 09:20', {
      name: '试用体验提醒', channel: 'popup', popupImage: imageSample,
      primary: { text: 'See your plan', ...openPlan }, audienceType: 'tags', tags: ['trialDay3'],
      trigger: 'cycle', cycle: 'weekly', days: ['0', '3'], start: dayOffset(-14), end: dayOffset(14),
    }, { shown: 350, primary: 62, secondary: 0 }),
    sample('S006', 'published', '2026-11-07 10:00', {
      name: '探索页推荐', channel: 'banner', bannerImage: imageSample,
      bannerAction: { type: 'internal', page: 'Gallery', url: '' }, order: '2', start: dayOffset(-6), end: dayOffset(6),
    }, { clicked: 238 }),
  ];
  const forTags = (form) => tags.filter((tag) => tag.channels.includes(form.channel) && (!tag.line || tag.line === form.line));
  const forGroups = (form) => groups.filter((group) => group.line === 'both' || group.line === form.line);
  const scope = (form) => `${lines[form.line]} · ${form.model} · ${form.region === 'all' ? '全部区域' : regions[form.region]}`;
  const stamp = () => new Date().toISOString().slice(0,16).replace('T',' ');
  const isCycle = (form) => form.channel === 'popup' && form.trigger === 'cycle';
  const formatUtcMinute = (value) => `${value.replace('T', ' ')}（UTC）`;

  function nextPushRun(form, now = new Date()) {
    if (form.pushSchedule === 'once') {
      return Date.parse(`${form.pushAt}Z`) > now.getTime() ? form.pushAt : '';
    }
    if (!form.start || !form.end || !form.pushTime) return '';
    const today = now.toISOString().slice(0, 10);
    let day = form.start > today ? form.start : today;
    if (day === today && Date.parse(`${day}T${form.pushTime}Z`) <= now.getTime()) {
      const tomorrow = new Date(now);
      tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
      day = tomorrow.toISOString().slice(0, 10);
    }
    return day <= form.end ? `${day}T${form.pushTime}` : '';
  }

  function hasCycleDate(form) {
    const start = new Date(`${form.start}T00:00:00Z`);
    const end = new Date(`${form.end}T00:00:00Z`);
    if (!(start <= end)) return false;
    if (form.cycle === 'daily') return true;
    if (form.cycle === 'weekly') {
      const mondayBasedDay = (start.getUTCDay() + 6) % 7;
      return form.days.some((day) => {
        const offset = (Number(day) - mondayBasedDay + 7) % 7;
        const next = new Date(start);
        next.setUTCDate(next.getUTCDate() + offset);
        return next <= end;
      });
    }
    const month = new Date(start);
    month.setUTCDate(1);
    while (month <= end) {
      const occurrence = new Date(month);
      occurrence.setUTCDate(Number(form.dayOfMonth));
      if (occurrence.getUTCMonth() === month.getUTCMonth() && occurrence >= start && occurrence <= end) return true;
      month.setUTCMonth(month.getUTCMonth() + 1);
    }
    return false;
  }

  const timing = (form) => {
    if (form.channel === 'push' && form.pushSchedule === 'once') {
      return form.pushAt ? `单次下发 · ${formatUtcMinute(form.pushAt)}` : '—';
    }
    if (!form.start || !form.end) return '—';
    if (form.channel === 'push') {
      return form.pushTime ? `时间段下发 · ${form.start} 至 ${form.end} · 每天 ${form.pushTime}（UTC）` : '—';
    }
    const range = `${form.start} 至 ${form.end}（UTC）`;
    if (!isCycle(form)) return range;
    if (form.cycle === 'weekly') return `${range} · 每周 ${weekdays.filter((_, i) => form.days.includes(String(i))).join('、')}`;
    if (form.cycle === 'monthly') return `${range} · 每月 ${form.dayOfMonth} 日`;
    return `${range} · 每天`;
  };
  return { channels, lines, models, regions, statuses, destinations, placements, weekdays, tags, groups,
    number, once, utcDate, makeForm, records, forTags, forGroups, scope, stamp, isCycle, hasCycleDate,
    formatUtcMinute, nextPushRun, timing };
})();
