(() => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const storageKey = 'london-masters-week-one-v2';
  const manualStorageKey = `${storageKey}-manual-slot-1`;
  const completedStorageKey = `${storageKey}-completed-checkpoint`;
  const preferencesStorageKey = `${storageKey}-preferences`;
  const collectionStorageKey = 'london-masters-global-sticker-collection-v1';
  const assets = window.LONDON_GAME_ASSETS;
  const rawCardCatalog = window.LONDON_CARD_CATALOG;
  if (!assets) throw new Error('Game asset catalog failed to load.');
  if (!Array.isArray(rawCardCatalog)) throw new Error('Card catalog failed to load.');

  const effectKeys = {
    money: 'money', health: 'health', mental: 'mental', academic_progress: 'study', academic_ability: 'academic',
    social: 'social', luck: 'luck', professor_trust: 'professorTrust', chinese_classmate_relation: 'chinaRelation',
    foreign_classmate_relation: 'intlRelation', foreign_classmate_unlocked: 'unlockForeign'
  };
  const effectNames = {
    money: '资金', health: '生命', mental: '精神', study: '学业', academic: '学术能力', social: '社交值', luck: '幸运',
    professorTrust: '教授信任', chinaRelation: '中国同学亲密度', intlRelation: '外国同学亲密度'
  };
  const actionNames = { study: '学习', social: '社交', dine: '出去吃', rest: '休息', gym: '健身', shop: '购物', cook: '自己做饭' };
  const cardIcons = {
    A01: '📚', A02: '🎓', A03: '🧪', A04: '✍️', A05: '👥', A06: '📊', A07: '🧑‍🏫', A08: '☕', A09: '📄', A10: '💡',
    S01: '🎉', S02: '🍜', S03: '🎪', S04: '🍻', S05: '💬', S06: '🍲', S07: '🍽️', S08: '📱', S09: '🌟', S10: '🤝', S11: '🎬', S12: '🌙',
    L01: '🥤', L02: '💳', L03: '🏛️', L04: '🌳', L05: '🚇', L06: '☕', L07: '🛋️', L08: '🛍️', L09: '🏷️', L10: '🧥', L11: '🍳', L12: '🎧', L13: '🚆', L14: '🏰', L15: '🍀'
  };
  const shortTitles = {
    A01: '图书馆', A02: 'Seminar', A03: '安全培训', A04: '学术写作', A05: '小组彩排', A06: '编程工作坊', A07: 'Office Hour', A08: '咖啡聊研究', A09: '研究思路', A10: '大咖讲座',
    S01: 'Welcome', S02: '同学约饭', S03: '社团市集', S04: 'Pub Social', S05: '课后聊聊', S06: '火锅局', S07: '吃顿好的', S08: '组队聊天', S09: '新生聚会', S10: '社团活动', S11: '电影之约', S12: '晚十点',
    L01: '超市可乐', L02: '银行卡', L03: '大英博物馆', L04: 'Hyde Park', L05: 'Central Line', L06: "GAIL's", L07: '宅一天', L08: '买点小东西', L09: '牛津街', L10: '冬天外套', L11: '做顿中餐', L12: '咖啡馆学习', L13: '曼城周末', L14: '爱丁堡', L15: '好运彩蛋'
  };

  function parseEffects(source) {
    const effects = {};
    if (!source || source === 'none' || source === 'keep_fixed_effect') return effects;
    source.split(';').filter(Boolean).forEach(token => {
      const match = token.match(/^([^+=-]+)([+-])(\d+)$/);
      if (match) {
        const key = effectKeys[match[1]];
        if (key) effects[key] = (match[2] === '+' ? 1 : -1) * Number(match[3]);
        return;
      }
      const [rawKey, rawValue] = token.split('=');
      const key = effectKeys[rawKey];
      if (key) effects[key] = rawValue === 'true' ? true : rawValue;
      else effects.flags = { ...(effects.flags || {}), [rawKey]: rawValue === 'true' ? true : rawValue };
    });
    return effects;
  }

  function effectSummary(effects = {}) {
    const parts = Object.entries(effects).filter(([key, value]) => effectNames[key] && value).map(([key, value]) => `${effectNames[key]} ${value > 0 ? '+' : '−'}${Math.abs(value)}`);
    if (effects.unlockForeign) parts.push('认识外国同学');
    return parts.join('·') || '记录一段经历';
  }

  function parseRequirement(source) {
    if (!source || source === 'none') return null;
    const match = source.match(/^([^\u00d7]+)×(\d+)$/);
    if (!match) return null;
    const actionMap = { study: 'study', socialize: 'social', eat_out: 'dine', rest: 'rest', gym: 'gym', shopping: 'shop', cook: 'cook' };
    return { action: actionMap[match[1]] || match[1], count: Number(match[2]) };
  }

  function normalizeCard(source) {
    const req = parseRequirement(source.actionRequirement);
    const [check = 'none', difficulty = 'normal'] = (source.check || 'none').split(':');
    const kindMap = { main_plan: '私人计划', public_commitment: '公开承诺', important_public_commitment: '公开承诺', normal_opportunity: '普通机会' };
    const categoryMap = { academic: '理工学业', social: '社交', life: '伦敦生活' };
    const fixed = parseEffects(source.fixedEffect);
    const success = parseEffects(source.successEffect);
    const noShow = parseEffects(source.noShowEffect);
    const requirementBits = [req ? `需要 ${req.count} 次${actionNames[req.action] || req.action}行动` : '无需固定行动'];
    if (source.extraCost) requirementBits.push(`额外费用 £${source.extraCost}`);
    if (source.minShoppingTier) requirementBits.push(`购物档位≥£${source.minShoppingTier}`);
    return {
      ...source,
      kind: source.id === 'S01' ? '固定活动' : kindMap[source.mechanism] || '普通机会',
      category: categoryMap[source.category] || source.category,
      categoryKey: source.category,
      short: shortTitles[source.id] || source.title.slice(0, 6),
      icon: cardIcons[source.id] || '✦',
      requirement: requirementBits.join(' · '),
      reward: `${source.mechanism.includes('commitment') ? '履约' : '完成'} · ${effectSummary(fixed)}${Object.keys(success).length ? `；成功再加 ${effectSummary(success)}` : ''}`,
      penalty: Object.keys(noShow).length ? `爽约 · ${effectSummary(noShow)}` : '未完成 · 无惩罚',
      req,
      check: check === 'none' ? null : check,
      difficulty,
      fixed,
      success,
      noShow
    };
  }

  const cardCatalog = rawCardCatalog.map(normalizeCard);
  let cards = [];

  const actions = {
    study: { name: '学习', tag: '学业 +2～3' },
    cook: { name: '自己做饭', tag: '生活恢复' },
    dine: { name: '出去吃', tag: '饮食社交' },
    social: { name: '社交活动', tag: '关系' },
    rest: { name: '休息', tag: '恢复' },
    gym: { name: '健身', tag: '生命与精神' },
    shop: { name: '购物', tag: '安排时选档' },
    ask: { name: '向家里要钱', tag: '家庭' },
    deadline: { name: '期中必修作业', tag: '占用 2 格 · 学业 +6' }
  };

  const stickers = assets.stickers;

  const shoppingRewards = {
    0: { mental: 0, social: 0, tag: '不消费', label: '£0 · 暂时不买 · 无变化' },
    30: { mental: 2, social: 1, tag: '精神 +2 · 社交 +1', label: '资金 −£30 · 精神 +2 · 社交值 +1' },
    80: { mental: 5, social: 2, tag: '精神 +5 · 社交 +2', label: '资金 −£80 · 精神 +5 · 社交值 +2' },
    200: { mental: 8, social: 4, tag: '精神 +8 · 社交 +4', label: '资金 −£200 · 精神 +8 · 社交值 +4' }
  };

  const familyTiers = Object.freeze([
    { id: 'basic', name: '基础档', support: 1400, available: 600, weight: 40 },
    { id: 'stable', name: '稳定档', support: 1700, available: 900, weight: 30 },
    { id: 'comfortable', name: '宽裕档', support: 2100, available: 1300, weight: 20 },
    { id: 'ample', name: '充足档', support: 2600, available: 1800, weight: 10 }
  ]);

  function familyTierFor(value) {
    const id = typeof value === 'string' ? value : value?.id;
    return familyTiers.find(tier => tier.id === id) || familyTiers[0];
  }

  function randomFamilyTier() {
    const roll = rand(1, 100);
    let total = 0;
    return familyTiers.find(tier => {
      total += tier.weight;
      return roll <= total;
    }) || familyTiers[0];
  }

  function randomPersona() {
    const familyTier = randomFamilyTier();
    return {
      rulesVersion: 2,
      major: '理工类',
      graduation: 120,
      academic: rand(40, 60),
      social: rand(20, 40),
      luck: rand(0, 4),
      familyTier: { ...familyTier },
      trait: '学业手动重判',
      traitNote: '每四周可手动重判 1 次学业失败'
    };
  }

  function defaultAvatarFor(persona) {
    return familyTierFor(persona?.familyTier).id === 'ample' ? 'neutral-affluent-coffee' : 'neutral-stem-laptop';
  }

  function initialState() {
    const persona = randomPersona();
    return {
      started: false,
      week: 1,
      persona,
      avatarId: null,
      selectedCard: 0,
      accepted: [false, false, false, false],
      actionSlots: [null, null, null],
      socialInvites: [null, null, null],
      shoppingTiers: [null, null, null],
      activeSlot: 0,
      meal: null,
      contacted: false,
      familyResult: null,
      money: familyTierFor(persona.familyTier).available,
      health: 80,
      mental: 70,
      study: 0,
      professorTrust: 5,
      chinaRelation: 6,
      intlRelation: 0,
      traitUsed: false,
      debtSafety: false,
      behaviorCounts: { cook: 0, takeaway: 0, rest: 0, gym: 0 },
      actionCounts: { study: 0, social: 0, rest: 0, gym: 0, shop: 0, ask: 0, cook: 0, dine: 0, takeaway: 0, deadline: 0 },
      metrics: { accepted: 0, completed: 0, noShows: 0, city: 0 },
      completedCards: [],
      weekCards: [],
      weekHistory: [],
      experienceFlags: {},
      eventFlags: { phoneStolen: false, bankCardNearMiss: false },
      pendingEventStickers: [],
      introSeenWeeks: [],
      settings: { reduceMotion: false },
      unlocked: [],
      settled: false,
      weekSummary: null,
      demoComplete: false
    };
  }

  function loadState() {
    try {
      const record = JSON.parse(localStorage.getItem(completedStorageKey));
      if (record?.state?.persona && Array.isArray(record.state.actionSlots)) return record.state;
    } catch (_) {}
    return initialState();
  }

  function migrateState(value) {
    const migrated = value && value.persona ? value : initialState();
    if (typeof migrated.persona.social !== 'number') migrated.persona.social = Number(migrated.persona.charm) || 50;
    if (migrated.persona.rulesVersion !== 2 && Number(migrated.persona.luck) > 4) migrated.persona.luck = rand(0, 4);
    migrated.persona.rulesVersion = 2;
    migrated.persona.major = '理工类';
    migrated.persona.graduation = 120;
    migrated.persona.academic = clamp(Number(migrated.persona.academic) || rand(40, 60), 0, 100);
    migrated.persona.social = clamp(Number(migrated.persona.social) || rand(20, 40), 0, 100);
    migrated.persona.luck = clamp(Number(migrated.persona.luck) || 0, 0, 10);
    migrated.persona.familyTier = { ...familyTierFor(migrated.persona.familyTier) };
    migrated.persona.trait = '学业手动重判';
    migrated.persona.traitNote = '每四周可手动重判 1 次学业失败';
    migrated.avatarId = defaultAvatarFor(migrated.persona);
    let preferences = {};
    try { preferences = JSON.parse(localStorage.getItem(preferencesStorageKey)) || {}; } catch (_) {}
    migrated.settings = { reduceMotion: false, ...(migrated.settings || {}), ...preferences };
    migrated.socialInvites = Array.isArray(migrated.socialInvites) ? migrated.socialInvites.slice(0, 3) : [null, null, null];
    while (migrated.socialInvites.length < 3) migrated.socialInvites.push(null);
    migrated.shoppingTiers = Array.isArray(migrated.shoppingTiers) ? migrated.shoppingTiers.slice(0, 3) : [null, null, null];
    while (migrated.shoppingTiers.length < 3) migrated.shoppingTiers.push(null);
    migrated.behaviorCounts = { cook: 0, takeaway: 0, rest: 0, gym: 0, ...(migrated.behaviorCounts || {}) };
    migrated.actionCounts = { study: 0, social: 0, rest: 0, gym: 0, shop: 0, ask: 0, cook: 0, dine: 0, takeaway: 0, deadline: 0, ...(migrated.actionCounts || {}) };
    migrated.metrics = { accepted: 0, completed: 0, noShows: 0, city: 0, ...(migrated.metrics || {}) };
    migrated.week = clamp(Number(migrated.week) || 1, 1, 4);
    migrated.completedCards = Array.isArray(migrated.completedCards) ? migrated.completedCards : [];
    migrated.weekCards = Array.isArray(migrated.weekCards) ? migrated.weekCards : [];
    migrated.weekHistory = Array.isArray(migrated.weekHistory) ? migrated.weekHistory : [];
    migrated.experienceFlags = migrated.experienceFlags || {};
    migrated.eventFlags = { phoneStolen: false, bankCardNearMiss: false, ...(migrated.eventFlags || {}) };
    migrated.pendingEventStickers = Array.isArray(migrated.pendingEventStickers) ? migrated.pendingEventStickers : [];
    migrated.introSeenWeeks = Array.isArray(migrated.introSeenWeeks) ? migrated.introSeenWeeks : [];
    migrated.demoComplete = Boolean(migrated.demoComplete);
    migrated.debtSafety = Boolean(migrated.debtSafety);
    migrated.unlocked = (migrated.unlocked || []).filter(id => stickers.some(sticker => sticker.id === id));
    if (migrated.unlocked.length) commitGlobalStickers(migrated.unlocked);
    if (typeof migrated.traitUsed !== 'boolean') migrated.traitUsed = false;
    return migrated;
  }

  let state = migrateState(loadState());
  let pendingMessageAction = null;
  let pendingStickerQueue = [];
  let settlementRun = null;
  let activePlan = null;
  let hasActiveSession = false;

  const weekBoosts = {
    1: ['A01', 'A02', 'A03', 'S01', 'S02', 'S03', 'S04', 'L01', 'L02', 'L05'],
    2: ['A05', 'S03', 'S08', 'S09', 'L01', 'L02', 'L08', 'L09', 'L10', 'L15'],
    3: ['A04', 'A05', 'A06', 'A07', 'A08', 'S05', 'S08', 'L12', 'L13', 'L14'],
    4: ['A07', 'A08', 'A09', 'S02', 'S05', 'S06', 'S11', 'S12', 'L03', 'L04', 'L06', 'L09']
  };

  function availableInWeek(card, week = state.week) {
    if (card.availability === 'W1_fixed') return week === 1;
    const match = String(card.availability).match(/^W(\d)(?:-W(\d))?$/);
    if (!match) return true;
    const start = Number(match[1]);
    const end = Number(match[2] || match[1]);
    return week >= start && week <= end;
  }

  function prerequisiteMet(card) {
    const requirements = String(card.prerequisite || 'none').split(';');
    return requirements.every(requirement => {
      if (!requirement || requirement === 'none' || requirement === 'stem' || requirement === 'chinese_classmate_unlocked') return true;
      if (requirement === 'foreign_classmate_unlocked') return state.intlRelation > 0;
      if (requirement === 'professor_unlocked') return state.experienceFlags.professor_unlocked !== false;
      if (requirement === 'society_experience') return Boolean(state.experienceFlags.society_experience);
      return true;
    });
  }

  function weightedPick(pool) {
    if (!pool.length) return null;
    const weighted = pool.map(card => ({ card, weight: Math.max(.1, Number(card.weight) || 1) * (weekBoosts[state.week]?.includes(card.id) ? 2.2 : 1) }));
    const total = weighted.reduce((sum, item) => sum + item.weight, 0);
    let roll = Math.random() * total;
    return weighted.find(item => (roll -= item.weight) <= 0)?.card || weighted[weighted.length - 1].card;
  }

  function drawWeekCards() {
    const used = new Set();
    const eligible = cardCatalog.filter(card => availableInWeek(card) && prerequisiteMet(card) && !(card.repeatRule === 'once' && state.completedCards.includes(card.id)));
    const chosen = [];
    if (state.week === 1) {
      const welcome = eligible.find(card => card.id === 'S01');
      if (welcome) { chosen.push(welcome); used.add(welcome.id); }
    }
    ['academic', 'social', 'life'].forEach(category => {
      if (chosen.length >= 4 || chosen.some(card => card.categoryKey === category)) return;
      const pick = weightedPick(eligible.filter(card => card.categoryKey === category && !used.has(card.id)));
      if (pick) { chosen.push(pick); used.add(pick.id); }
    });
    while (chosen.length < 4) {
      const pick = weightedPick(eligible.filter(card => !used.has(card.id)));
      if (!pick) break;
      chosen.push(pick); used.add(pick.id);
    }
    return chosen.slice(0, 4);
  }

  function ensureWeekCards() {
    const resolved = (state.weekCards || []).map(id => cardCatalog.find(card => card.id === id)).filter(Boolean);
    cards = resolved.length === 4 ? resolved : drawWeekCards();
    state.weekCards = cards.map(card => card.id);
    state.accepted = Array.isArray(state.accepted) ? state.accepted.slice(0, 4) : [];
    while (state.accepted.length < 4) state.accepted.push(false);
    state.selectedCard = clamp(Number(state.selectedCard) || 0, 0, Math.max(0, cards.length - 1));
  }

  ensureWeekCards();

  function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
  function globalStickerIds() {
    try {
      const ids = JSON.parse(localStorage.getItem(collectionStorageKey));
      return Array.isArray(ids) ? ids.filter(id => stickers.some(sticker => sticker.id === id)) : [];
    } catch (_) { return []; }
  }
  function hasSticker(id) { return globalStickerIds().includes(id); }
  function queueSettlementSticker(id) {
    if (settlementRun && !hasSticker(id)) settlementRun.newStickers.push(id);
  }
  function commitGlobalStickers(ids) {
    localStorage.setItem(collectionStorageKey, JSON.stringify([...new Set([...globalStickerIds(), ...ids])]));
  }
  function save() {
    // 当前周只保存在内存中；刷新或读档会回到最近一次完整周结算检查点。
  }
  function show(id) { $(id).classList.add('visible'); }
  function hide(id) { $(id).classList.remove('visible'); }

  function renderPersona() {
    const p = state.persona;
    const family = familyTierFor(p.familyTier);
    const traitState = state.traitUsed ? '本周期已使用 0/1' : '本周期可用 1/1';
    const avatar = assets.avatars.find(item => item.id === state.avatarId) || assets.avatars[8];
    $('#personaMajor').textContent = p.major;
    $('#personaTrait').textContent = p.trait;
    $('#personaAcademic').textContent = p.academic;
    $('#personaCharm').textContent = p.social;
    $('#personaLuck').textContent = p.luck;
    $('#personaFamily').textContent = family.name;
    $('#personaSupport').textContent = `每 4 周 +£${family.support.toLocaleString('en-GB')} · 房租后可用约 £${family.available.toLocaleString('en-GB')}`;
    $('#personaNote').textContent = `毕业要求 ${p.graduation} · ${p.traitNote}（${traitState}）`;
    $('#attributeMajor').textContent = `${p.major}学生`;
    $('#attributeSupport').textContent = `学生公寓 · ${family.name}每 4 周 +£${family.support.toLocaleString('en-GB')}`;
    $('#avatarImage').src = avatar.src;
    $('#avatarImage').alt = avatar.name;
    $('#bigAvatarImage').src = avatar.src;
    $('#bigAvatarImage').alt = avatar.name;
    $('#attributeList').innerHTML = [
      ['学术能力', p.academic], ['社交值', p.social], ['幸运', p.luck],
      ['毕业要求', p.graduation], ['家庭支持', `${family.name} · 每 4 周 +£${family.support.toLocaleString('en-GB')}`], ['房租', '每 4 周 −£800'],
      ['专业特质', `${p.trait} · ${traitState}`]
    ].map(([label, value]) => `<div class="${label === '专业特质' ? 'wide' : ''}"><span>${label}</span><b>${value}</b></div>`).join('');
    renderSaveSettings();
  }

  function renderSaveSettings() {
    const raw = localStorage.getItem(manualStorageKey);
    let label = '暂无存档';
    try {
      const record = JSON.parse(raw);
      if (record?.savedAt) label = new Date(record.savedAt).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch (_) {}
    $('#manualSaveStatus').textContent = label;
    const hasCheckpoint = Boolean(localStorage.getItem(completedStorageKey));
    $('#manualSaveButton').disabled = !hasCheckpoint;
    $('#manualSaveButton').textContent = hasCheckpoint ? '保存已完成周' : '完成本周后可存档';
    $('#manualLoadButton').disabled = !raw;
    $('#reduceMotionToggle').checked = Boolean(state.settings.reduceMotion);
    document.documentElement.classList.toggle('reduce-motion', Boolean(state.settings.reduceMotion));
  }

  function renderHome() {
    const manual = localStorage.getItem(manualStorageKey);
    const checkpoint = localStorage.getItem(completedStorageKey);
    const hasSave = Boolean(manual || checkpoint);
    const active = hasActiveSession && state.started;
    const continueButton = $('#continueGameButton');
    continueButton.disabled = !(active || hasSave);
    continueButton.textContent = active && state.demoComplete ? '查看十月奖励' : active ? '继续本周' : hasSave ? '继续游戏' : '暂无进度';
    $('#homeLoadButton').disabled = !hasSave;
    $('#homeSaveHint').textContent = manual ? '将读取手动存档槽 1' : checkpoint ? '将读取最近完成周存档' : '暂无已完成周存档';
    if (active) {
      $('#homeProgressTitle').textContent = state.demoComplete ? '十月 Demo · 已完成' : state.settled ? `第 ${state.week} 周 · 已结算` : `第 ${state.week} 周 · 进行中`;
      $('#homeProgressMeta').textContent = `资金 £${state.money} · 学业 ${state.study}/${state.persona.graduation}`;
      return;
    }
    const raw = checkpoint || manual;
    if (!raw) {
      $('#homeProgressTitle').textContent = '尚未开始';
      $('#homeProgressMeta').textContent = '先随机一位理工科留学生';
      return;
    }
    try {
      const record = JSON.parse(raw);
      const saved = record.state;
      $('#homeProgressTitle').textContent = saved?.demoComplete ? '十月 Demo · 已完成' : `最近完成 · W${Math.max(0, Number(saved?.week || 1) - (saved?.settled ? 0 : 1))}`;
      $('#homeProgressMeta').textContent = `资金 £${saved?.money ?? 0} · 学业 ${saved?.study ?? 0}/${saved?.persona?.graduation ?? 120}`;
    } catch (_) {
      $('#homeProgressTitle').textContent = '已有存档';
      $('#homeProgressMeta').textContent = '点击读档查看最近进度';
    }
  }

  function showHome() {
    hide('#onboarding');
    renderHome();
    show('#homeOverlay');
  }

  function renderStats() {
    $('#money').textContent = `£${state.money}`;
    $('#health').textContent = state.health;
    $('#mental').textContent = state.mental;
    $('#studyProgress').textContent = `${state.study}/${state.persona.graduation}`;
    $('#trustChip').textContent = `教授信任 · ${state.professorTrust}/10`;
    $('#professorTrust').textContent = `${state.professorTrust}/10`;
    $('#chinaRelation').textContent = `${state.chinaRelation}/10`;
    $('#intlRelation').textContent = state.intlRelation ? `${state.intlRelation}/10` : '未认识';
  }

  function renderWeekChrome() {
    $('#weekNumber').textContent = `第 ${state.week} 周`;
    $('#weekMeta').textContent = '10月 · London';
    $('#calendarWeek').textContent = `W${state.week} / 36`;
    $('#calendarDeadline').textContent = state.week === 4 ? 'W7 学业判定 · 目标 18' : '10月无硬性 Deadline';
    $('.week-track i').style.width = `${Math.max(3, state.week / 36 * 100)}%`;
    $('#calendarNow').innerHTML = `<b>W${state.week}</b><span>${state.week === 1 ? 'Instruction Week 与 Welcome' : state.week === 2 ? '课程正式启动' : state.week === 3 ? '第一次小组作业' : '学院发布第一次学业预告'}</span>`;
    $('#deadlineActionButton').hidden = state.week !== 4;
    $('#resultsWeekStamp').textContent = `WEEK ${state.week}`;
  }

  function renderActions() {
    $$('.action-slot').forEach((button, index) => {
      const action = state.actionSlots[index];
      const forced = state.debtSafety && action === 'ask' && index === state.actionSlots.indexOf('ask');
      button.classList.toggle('filled', Boolean(action));
      button.classList.toggle('forced', forced);
      const invite = state.socialInvites[index];
      const shopTier = state.shoppingTiers[index];
      const deadlineIndex = action === 'deadline' ? state.actionSlots.slice(0, index).filter(value => value === 'deadline').length + 1 : 0;
      const actionName = action === 'deadline'
        ? `必修作业 ${deadlineIndex}/2`
        : action === 'social' && invite
        ? `社交 · ${invite === 'china' ? '中国同学' : '外国同学'}`
        : action === 'shop'
          ? `购物 · £${shopTier ?? 0}`
          : action ? actions[action].name : '＋';
      $('b', button).textContent = actionName;
      $('span', button).textContent = forced
        ? '欠款保底 · 已锁定'
        : action === 'shop'
          ? (shoppingRewards[shopTier ?? 0]?.tag || actions.shop.tag)
          : action ? actions[action].tag : `行动 ${index + 1}`;
    });
    const meal = state.meal ? state.meal.label : '未安排';
    $('#mealChip').textContent = `饮食 · ${meal}`;
    $('#mealChip').classList.toggle('warning', !state.meal);
    $('#familyButton').classList.toggle('done', state.contacted);
    $('#familyButton').innerHTML = state.contacted ? '✓ 本周已联系' : '☎ 联系家里 <small>免费</small>';
    const takeawaySelected = state.meal?.type === 'takeaway';
    $('#takeawayButton').classList.toggle('selected-meal', takeawaySelected);
    $('#takeawayTitle').textContent = takeawaySelected ? '取消外卖' : '点外卖 · £60';
    $('#takeawayHint').textContent = takeawaySelected ? '恢复为“饮食未安排”，不扣钱' : '不占行动点，只解决饮食';
  }

  function renderCards() {
    if (!cards.length) return;
    const card = cards[state.selectedCard];
    $('#detailKind').textContent = `${card.kind} · ${card.category}`;
    $('#detailTitle').textContent = card.title;
    $('#detailRequirement').textContent = card.requirement;
    if (card.check) {
      const metric = card.check === 'academic' ? '学术能力' : '社交值';
      const value = state.persona[card.check];
      const chance = chanceFor(card);
      const traitMatches = matchesTrait(card);
      const retry = traitMatches ? (state.traitUsed ? ' · 本月重判已用' : ' · 失败后可手动重判') : '';
      const socialBonus = card.check === 'social' && state.week === 1 ? ' · W1 新生加成 +20%' : '';
      $('#detailCheck').textContent = `判定 · ${metric} ${value} · 成功率约 ${chance}%${socialBonus}${retry}`;
    } else {
      $('#detailCheck').textContent = card.req ? '判定 · 满足固定行动条件后自动成功' : '判定 · 无需概率判定，参加即可获得基础结果';
    }
    $('#detailReward').textContent = card.reward.replace(/^\S+\s*·\s*/, '');
    $('#detailPenalty').textContent = card.penalty.replace(/^\S+\s*·\s*/, '');
    $('.outcome-success b').textContent = card.kind === '公开承诺' ? '履约' : '完成';
    $('.outcome-risk b').textContent = card.kind === '公开承诺' ? '爽约' : '未完成';
    const accepted = state.accepted[state.selectedCard];
    $('#acceptCardButton').textContent = accepted ? '取消计划' : '加入计划';
    $('#acceptCardButton').classList.toggle('accepted', accepted);
    $$('.opportunity-card').forEach((button, index) => {
      const item = cards[index];
      if (!item) { button.hidden = true; return; }
      button.hidden = false;
      button.className = `opportunity-card ${item.kind === '公开承诺' ? 'commit-public' : item.kind === '私人计划' ? 'commit-self' : 'commit-normal'}`;
      button.classList.toggle('selected', index === state.selectedCard);
      button.classList.toggle('accepted', state.accepted[index]);
      $('.card-icon', button).textContent = item.icon;
      $('small', button).textContent = item.kind;
      $('strong', button).textContent = item.short;
      $('.card-category', button).textContent = item.category.replace('理工学业', '理工');
      button.setAttribute('aria-label', `${item.kind}：${item.title}`);
      button.classList.toggle('selected', index === state.selectedCard);
      button.classList.toggle('accepted', state.accepted[index]);
      button.setAttribute('aria-pressed', String(state.accepted[index]));
    });
    const acceptedCards = state.accepted.map((value, index) => value ? cards[index] : null).filter(Boolean);
    $('#acceptedCount').textContent = `已接 ${acceptedCards.length}/4`;
    const publicCount = acceptedCards.filter(cardItem => cardItem.kind === '公开承诺').length;
    $('#promiseChip').textContent = publicCount ? `公开承诺 · ${publicCount}` : acceptedCards.length ? `计划 · ${acceptedCards.length}` : '暂无承诺';
  }

  function renderCollection() {
    const grid = $('#stickerGrid');
    const collected = globalStickerIds();
    grid.innerHTML = '';
    const previewSticker = stickers.find(sticker => sticker.id === collected[collected.length - 1]) || stickers[0];
    $('#collectionPreview').src = previewSticker.src;
    $('#collectionPreview').alt = collected.length ? `最近获得：${previewSticker.name}` : '尚未解锁贴纸';
    $('#collectionPreview').classList.toggle('locked', !collected.length);
    stickers.forEach(sticker => {
      const unlocked = collected.includes(sticker.id);
      const tile = document.createElement('div');
      tile.className = `sticker-tile${unlocked ? '' : ' locked'}`;
      tile.innerHTML = `<img class="sticker-art" src="${sticker.src}" alt="${unlocked ? sticker.name : '未解锁贴纸'}"><span>${unlocked ? sticker.name : '???'}</span>`;
      grid.appendChild(tile);
    });
    $('#stickerCount').textContent = `${collected.length}/${stickers.length}`;
  }

  function renderAll() {
    ensureWeekCards();
    renderWeekChrome();
    renderPersona();
    renderStats();
    renderActions();
    renderCards();
    renderCollection();
    renderHome();
  }

  function banner(title, detail) {
    const el = $('#feedbackBanner');
    $('strong', el).textContent = title;
    $('span', el).textContent = detail;
    el.classList.remove('show');
    void el.offsetWidth;
    el.classList.add('show');
  }

  function message({ icon = '✓', eyebrow = '已确认', title, body = '', deltas = [], button = '知道了', cancelLabel = '' }, onClose = null) {
    $('#messageIcon').textContent = icon;
    $('#messageEyebrow').textContent = eyebrow;
    $('#messageTitle').textContent = title;
    $('#messageBody').textContent = body;
    const deltaBox = $('#messageDeltas');
    const red = deltas.some(delta => /爽约|未完成|扣|−/.test(delta));
    const yellow = !red && deltas.some(delta => /未满足|失败|未安排|未通过/.test(delta));
    deltaBox.className = `delta-pills${red ? ' red' : yellow ? ' yellow' : ''}`;
    deltaBox.innerHTML = deltas.map(delta => `<span>${delta}</span>`).join('');
    $('#messageClose').textContent = button;
    $('#messageCancel').textContent = cancelLabel || '取消';
    $('#messageCancel').hidden = !cancelLabel;
    pendingMessageAction = onClose;
    show('#messageOverlay');
  }

  function animateSlot(index) {
    const slot = $(`.action-slot[data-slot="${index}"]`);
    slot.classList.remove('confirmed');
    void slot.offsetWidth;
    slot.classList.add('confirmed');
  }

  function animateDelta(id, text) {
    const el = $(id);
    el.textContent = text;
    el.classList.remove('animate');
    void el.offsetWidth;
    el.classList.add('animate');
  }

  function selectCard(index) {
    state.selectedCard = index;
    renderCards();
    save();
  }

  function setCardAccepted(index, accepted) {
    state.accepted[index] = accepted;
    state.selectedCard = index;
    renderCards();
    const button = $(`.opportunity-card[data-card="${index}"]`);
    button.classList.remove('just-accepted');
    if (accepted) {
      void button.offsetWidth;
      button.classList.add('just-accepted');
      banner('已加入本周', cards[index].title);
    } else {
      banner('已取消计划', cards[index].title);
    }
    save();
  }

  function toggleCard(index) {
    if (state.accepted[index]) {
      setCardAccepted(index, false);
      return;
    }
    const card = cards[index];
    if (card.kind === '公开承诺') {
      message({
        icon: '!', eyebrow: '公开承诺', title: '这不是普通的“想做”',
        body: `${card.title}。如果行动不够，周结算时会失去关系或信任。`,
        deltas: [card.requirement, card.penalty], button: '确认答应', cancelLabel: '暂不答应'
      }, () => setCardAccepted(index, true));
    } else {
      setCardAccepted(index, true);
    }
  }

  $$('.opportunity-card').forEach((button, index) => {
    button.addEventListener('click', () => selectCard(index));
  });
  $('#acceptCardButton').addEventListener('click', () => toggleCard(state.selectedCard));

  $$('.action-slot').forEach((button, index) => button.addEventListener('click', () => {
    if (state.debtSafety && state.actionSlots[index] === 'ask' && index === state.actionSlots.indexOf('ask')) {
      message({ icon: '£', eyebrow: '欠款保底', title: '这一格必须先解决欠款', body: '房租扣款后余额小于 £0，本周会强制占用一格向家里要钱。欠款结清后才会解除。', deltas: ['占用 1 个固定行动'] });
      return;
    }
    state.activeSlot = index;
    $('#actionTitle').textContent = `安排行动 ${index + 1}`;
    show('#sheetOverlay');
  }));

  $('#mealChip').addEventListener('click', () => {
    const currentMealSlot = state.actionSlots.findIndex(value => value === 'cook' || value === 'dine');
    const firstEmptySlot = state.actionSlots.findIndex(value => !value);
    state.activeSlot = currentMealSlot >= 0 ? currentMealSlot : firstEmptySlot >= 0 ? firstEmptySlot : 0;
    $('#actionTitle').textContent = state.meal?.type === 'takeaway' ? '修改或取消外卖' : '选择本周饮食';
    show('#sheetOverlay');
  });

  function commitAction(action, invite = null, shopTier = null) {
    const previousAction = state.actionSlots[state.activeSlot];
    if (previousAction === 'deadline' && action !== 'deadline') {
      state.actionSlots = state.actionSlots.map(value => value === 'deadline' ? null : value);
    }
    if ((previousAction === 'cook' || previousAction === 'dine') && state.meal?.type === previousAction) {
      state.meal = null;
    }
    if ((action === 'cook' || action === 'dine') && state.meal && state.meal.type !== action) {
      const previousMealActionIndex = state.actionSlots.findIndex((value, index) => index !== state.activeSlot && value === state.meal.type);
      if (previousMealActionIndex >= 0) {
        state.actionSlots[previousMealActionIndex] = null;
        state.socialInvites[previousMealActionIndex] = null;
        state.shoppingTiers[previousMealActionIndex] = null;
      }
    }
    state.actionSlots[state.activeSlot] = action;
    state.socialInvites[state.activeSlot] = action === 'social' ? invite : null;
    state.shoppingTiers[state.activeSlot] = action === 'shop' ? shopTier : null;
    if (action === 'cook') state.meal = { type: 'cook', label: '自己做饭 £30', cost: 30 };
    if (action === 'dine') state.meal = { type: 'dine', label: '出去吃 £120', cost: 120 };
    const slot = state.activeSlot;
    hide('#sheetOverlay');
    hide('#socialOverlay');
    hide('#shoppingOverlay');
    renderActions();
    animateSlot(slot);
    const inviteText = invite ? ` · 邀请${invite === 'china' ? '中国同学' : '外国同学'}` : '';
    const shopText = action === 'shop' ? ` · £${shopTier ?? 0} 档` : '';
    banner(`行动 ${slot + 1} 已安排`, `${actions[action].name}${inviteText}${shopText} · 点一下可以修改`);
    save();
  }

  function commitDeadlineAction() {
    if (state.week !== 4) return;
    state.actionSlots = state.actionSlots.map(value => value === 'deadline' ? null : value);
    const preferred = state.activeSlot;
    const candidates = [preferred, ...state.actionSlots.map((_, index) => index).filter(index => index !== preferred && !state.actionSlots[index])];
    const slots = candidates.filter((index, position) => position === 0 || !state.actionSlots[index]).slice(0, 2);
    if (slots.length < 2) {
      message({ icon: '!', eyebrow: '需要两个行动', title: '先空出两个固定行动格', body: '期中必修作业会连续占用两个行动。请先关闭一个已有安排，再重新选择。', deltas: ['占用 2 个固定行动', '完成后学业 +6'] });
      return;
    }
    slots.forEach(index => {
      state.actionSlots[index] = 'deadline';
      state.socialInvites[index] = null;
      state.shoppingTiers[index] = null;
    });
    hide('#sheetOverlay');
    renderActions();
    slots.forEach(animateSlot);
    banner('必修作业已安排', '连续占用 2 个行动 · 完成后学业 +6');
  }

  function renderSocialOptions() {
    const foreignButton = $('[data-social-target="foreign"]');
    foreignButton.disabled = state.intlRelation <= 0;
    foreignButton.title = foreignButton.disabled ? '参加 Welcome Week 后解锁' : '';
    const firstWeekLabel = state.week === 1 ? ' · 含 W1 新生 +20%' : '';
    $('#socialChanceChina').textContent = `当前成功率约 ${inviteChance('china')}%${firstWeekLabel}`;
    $('#socialChanceForeign').textContent = foreignButton.disabled ? '尚未认识' : `当前成功率约 ${inviteChance('foreign')}%${firstWeekLabel}`;
  }

  $$('[data-action]').forEach(button => button.addEventListener('click', () => {
    const action = button.dataset.action;
    if (button.dataset.free === 'true') {
      if (state.meal?.type === 'takeaway') {
        state.meal = null;
        hide('#sheetOverlay');
        renderActions();
        banner('外卖已取消', '本周饮食重新变为未安排');
        save();
        return;
      }
      if (state.meal?.type === 'cook' || state.meal?.type === 'dine') {
        const mealActionIndex = state.actionSlots.findIndex(value => value === state.meal.type);
        if (mealActionIndex >= 0) {
          state.actionSlots[mealActionIndex] = null;
          state.socialInvites[mealActionIndex] = null;
          state.shoppingTiers[mealActionIndex] = null;
        }
      }
      state.meal = { type: 'takeaway', label: '外卖 £60', cost: 60 };
      hide('#sheetOverlay');
      renderActions();
      banner('外卖已经安排', '不占行动点 · 周结算扣 £60');
      save();
      return;
    }
    if (action === 'shop' && state.actionSlots.some((value, index) => index !== state.activeSlot && value === 'shop')) {
      hide('#sheetOverlay');
      banner('本周已有购物行动', '购物只需要占用一个固定行动点');
      return;
    }
    if (action === 'social') {
      hide('#sheetOverlay');
      renderSocialOptions();
      show('#socialOverlay');
      return;
    }
    if (action === 'shop') {
      hide('#sheetOverlay');
      renderShoppingOptions();
      show('#shoppingOverlay');
      return;
    }
    if (action === 'deadline') {
      commitDeadlineAction();
      return;
    }
    commitAction(action);
  }));

  $$('[data-social-target]').forEach(button => button.addEventListener('click', () => {
    if (button.disabled) return;
    const target = button.dataset.socialTarget;
    commitAction('social', target === 'none' ? null : target);
  }));
  $('#socialCancel').addEventListener('click', () => { hide('#socialOverlay'); show('#sheetOverlay'); });
  $('#socialOverlay').addEventListener('click', event => { if (event.target === $('#socialOverlay')) hide('#socialOverlay'); });

  $('[data-close-sheet]').addEventListener('click', () => hide('#sheetOverlay'));
  $('#sheetOverlay').addEventListener('click', event => { if (event.target === $('#sheetOverlay')) hide('#sheetOverlay'); });

  $('#familyButton').addEventListener('click', () => {
    if (state.contacted) {
      message({ icon: '☎', eyebrow: '本周已联系', title: '“吃饭了吗？”', body: state.familyResult.body, deltas: state.familyResult.deltas });
      return;
    }
    const gotMoney = Math.random() < .35;
    state.contacted = true;
    state.mental = Math.min(100, state.mental + 2);
    if (gotMoney) state.money += 20;
    state.familyResult = {
      body: gotMoney ? '聊了十分钟家常。挂电话前，家里说“别总凑合吃”，顺手转了一点钱。' : '聊了十分钟家常。没解决什么大事，但伦敦的房间好像没有刚才那么安静了。',
      deltas: gotMoney ? ['精神 +2', '资金 +£20'] : ['精神 +2']
    };
    renderStats(); renderActions(); save();
    message({ icon: '☎', eyebrow: '家庭来电', title: '“吃饭了吗？”', body: state.familyResult.body, deltas: state.familyResult.deltas });
  });

  function closeMessage(confirm = false) {
    hide('#messageOverlay');
    const action = pendingMessageAction;
    const noCancelChoice = $('#messageCancel').hidden;
    pendingMessageAction = null;
    if ((confirm || noCancelChoice) && action) action();
  }

  $('#messageClose').addEventListener('click', () => closeMessage(true));
  $('#messageCancel').addEventListener('click', () => closeMessage(false));
  $('#messageOverlay').addEventListener('click', event => { if (event.target === $('#messageOverlay')) closeMessage(false); });

  function requirementMet(card) {
    if (card.req) {
      const count = state.actionSlots.filter(value => value === card.req.action).length;
      if (count < (card.req.count || 1)) return false;
    }
    const highestShoppingTier = Math.max(0, ...state.shoppingTiers.filter(value => Number.isFinite(value)));
    if (card.minShoppingTier && highestShoppingTier < card.minShoppingTier) return false;
    if (card.extraCost && state.money < card.extraCost) return false;
    return true;
  }

  function chanceFor(card) {
    if (!card.check) return 100;
    const value = state.persona[card.check];
    const firstWeekSocialBonus = card.check === 'social' && state.week === 1 ? 20 : 0;
    const modifier = (card.difficulty === 'simple' ? 15 : card.difficulty === 'hard' ? -10 : 0) + firstWeekSocialBonus;
    return Math.round(Math.max(20, Math.min(90, value + modifier)));
  }

  function inviteChance(target) {
    const relation = target === 'china' ? state.chinaRelation : state.intlRelation;
    const firstWeekBonus = state.week === 1 ? 20 : 0;
    return Math.round(Math.max(15, Math.min(90, state.persona.social * .5 + relation * 5 + firstWeekBonus)));
  }

  function matchesTrait(card) {
    return card.categoryKey === 'academic' && card.check === 'academic';
  }

  function usesStandaloneSettlement(card) {
    return ['私人计划', '公开承诺'].includes(card.kind) || matchesTrait(card);
  }

  function rollCard(card) {
    const chance = chanceFor(card);
    const roll = rand(1, 100);
    return { chance, roll, success: roll <= chance };
  }

  function applyEffects(effects = {}) {
    if (effects.money) state.money += effects.money;
    if (effects.health) state.health += effects.health;
    if (effects.mental) state.mental += effects.mental;
    if (effects.study) state.study += effects.study;
    if (effects.academic) state.persona.academic += effects.academic;
    if (effects.social) state.persona.social += effects.social;
    if (effects.luck) state.persona.luck += effects.luck;
    if (effects.professorTrust) state.professorTrust += effects.professorTrust;
    if (effects.chinaRelation) state.chinaRelation += effects.chinaRelation;
    if (effects.intlRelation) state.intlRelation += effects.intlRelation;
    if (effects.unlockForeign) state.intlRelation = Math.max(3, state.intlRelation);
    if (effects.flags) Object.assign(state.experienceFlags, effects.flags);
  }

  function effectText(effects = {}) {
    const labels = {
      money: '资金', health: '生命', mental: '精神', study: '学业', academic: '学术能力', social: '社交值', luck: '幸运',
      professorTrust: '教授信任', chinaRelation: '中国同学亲密度', intlRelation: '外国同学亲密度'
    };
    const parts = Object.entries(effects).filter(([key, value]) => labels[key] && value).map(([key, value]) => `${labels[key]} ${value > 0 ? '+' : '−'}${Math.abs(value)}`);
    if (effects.unlockForeign) parts.push('认识外国同学');
    return parts.join(' · ') || '记录了一段经历';
  }

  function addResult(results, label, outcome, failed = false, status = '', badge = '') {
    const defaultStatus = failed ? 'failed' : (label.startsWith('行动 ') || label.startsWith('本周饮食')) ? 'done' : 'success';
    results.push({ label, outcome, failed, status: status || defaultStatus, badge });
  }
  function clamp(value, min, max) { return Math.min(max, Math.max(min, value)); }

  function createSettlementRun() {
    const snapshot = JSON.parse(JSON.stringify(state));
    const before = { money: state.money, health: state.health, mental: state.mental, study: state.study };
    const results = [];
    const newStickers = [];
    const queueSticker = id => { if (!hasSticker(id)) newStickers.push(id); };

    let deadlineHandled = false;
    state.actionSlots.forEach((action, index) => {
      if (!action) { addResult(results, `行动 ${index + 1}`, '行动点没有使用', true, 'red', '未完成'); return; }
      if (state.actionCounts[action] !== undefined && action !== 'deadline') state.actionCounts[action] += 1;
      if (action === 'deadline') {
        if (!deadlineHandled) {
          deadlineHandled = true;
          state.actionCounts.deadline += 1;
          state.study += 6;
          addResult(results, '两个行动 · 期中必修作业', '按要求完成 · 学业 +6', false, 'success', '必修');
        }
        return;
      }
      if (action === 'study') {
        const roll = rand(1, 100);
        const bonus = roll <= state.persona.academic ? 1 : 0;
        state.study += 2 + bonus;
        addResult(results, `行动 ${index + 1} · 学习`, `学业 +${2 + bonus} · 加成率 ${state.persona.academic}% · 抽到 ${roll}`, false, bonus ? 'success' : 'done');
      }
      if (action === 'cook') {
        state.health += 2; state.mental += 2;
        state.behaviorCounts.cook += 1;
        addResult(results, `行动 ${index + 1} · 做饭`, '生命 +2 · 精神 +2');
        queueSticker('meal');
        if (state.behaviorCounts.cook > 10) queueSticker('kebab');
      }
      if (action === 'dine') {
        state.mental += 2; state.persona.social += 1;
        const metForeignClassmate = state.intlRelation <= 0;
        state.intlRelation = Math.max(1, state.intlRelation);
        addResult(results, `行动 ${index + 1} · 出去吃`, `精神 +2 · 社交值 +1${metForeignClassmate ? ' · 认识外国同学' : ''}`);
        queueSticker('fishchips');
        if (metForeignClassmate) queueSticker('whatsapp');
      }
      if (action === 'social') {
        state.mental += 2; state.persona.social += 1;
        const metForeignClassmate = state.intlRelation <= 0;
        state.intlRelation = Math.max(1, state.intlRelation);
        const invite = state.socialInvites[index];
        if (!invite) {
          addResult(results, `行动 ${index + 1} · 社交活动`, `精神 +2 · 社交值 +1${metForeignClassmate ? ' · 认识外国同学' : ''}`);
        } else {
          const chance = inviteChance(invite);
          const roll = rand(1, 100);
          const success = roll <= chance;
          if (success) {
            state.persona.social += 1;
            if (invite === 'china') state.chinaRelation += 1;
            else state.intlRelation += 1;
          }
          const who = invite === 'china' ? '中国同学' : '外国同学';
          const extra = success ? '邀请成功 · 社交值 +1 · 亲密度 +1' : '邀请未成功 · 无惩罚';
          addResult(results, `行动 ${index + 1} · 社交 · ${who}`, `精神 +2 · 社交值 +1 · 成功率 ${chance}% · 抽到 ${roll} · ${extra}`, false, success ? 'success' : 'yellow');
        }
        if (metForeignClassmate) queueSticker('whatsapp');
      }
      if (action === 'rest') {
        state.health += 4; state.mental += 4; state.behaviorCounts.rest += 1;
        addResult(results, `行动 ${index + 1} · 休息`, '生命 +4 · 精神 +4');
        if (state.behaviorCounts.rest === 1) queueSticker('benjerry');
      }
      if (action === 'gym') {
        state.health += 5; state.mental += 5; state.behaviorCounts.gym += 1;
        addResult(results, `行动 ${index + 1} · 健身`, '生命 +5 · 精神 +5');
        if (state.behaviorCounts.gym === 1) queueSticker('pistachio');
      }
      if (action === 'shop') {
        const cost = state.shoppingTiers[index] ?? 0;
        const reward = shoppingRewards[cost] || shoppingRewards[0];
        state.money -= cost;
        state.mental += reward.mental;
        state.persona.social += reward.social;
        addResult(results, `行动 ${index + 1} · 购物 £${cost}`, reward.label);
        if (cost === 30) queueSticker('tyrrells');
        if (cost === 80) queueSticker('penhaligons-bottle');
        if (cost === 200) queueSticker('selfridges-bag');
      }
      if (action === 'ask') {
        const debtRescue = state.debtSafety || state.money < 0;
        const success = debtRescue || Math.random() < .55;
        const amount = debtRescue ? Math.max(100, Math.abs(state.money) + 100) : 100;
        if (success) { state.money += amount; state.debtSafety = false; addResult(results, `行动 ${index + 1} · 向家里要钱`, debtRescue ? `欠款保底到账 £${amount}` : '拿到 £100'); }
        else addResult(results, `行动 ${index + 1} · 向家里要钱`, '没好意思继续开口', true);
      }
    });

    state.money -= state.meal.cost;
    addResult(results, `本周饮食 · ${state.meal.label}`, `资金 −£${state.meal.cost}`);
    if (state.meal.type === 'takeaway') {
      state.behaviorCounts.takeaway += 1;
      state.actionCounts.takeaway += 1;
      queueSticker('pho');
      if (state.behaviorCounts.takeaway > 10) queueSticker('nandos');
    }

    state.metrics.accepted += state.accepted.filter(Boolean).length;
    return {
      snapshot, before, results, newStickers,
      planQueue: state.accepted.map((accepted, index) => accepted && usesStandaloneSettlement(cards[index]) ? index : -1).filter(index => index >= 0),
      planCursor: 0
    };
  }

  function applyPlanOutcome(index, success, prefix = '', requirementFailed = false) {
    const card = cards[index];
    if (requirementFailed) {
      const isPublic = card.kind === '公开承诺';
      if (isPublic) applyEffects(card.noShow);
      if (isPublic) state.metrics.noShows += 1;
      const outcome = isPublic ? effectText(card.noShow) : '没有完成 · 无惩罚';
      addResult(settlementRun.results, card.title, `${prefix} · ${outcome}`, true, 'red', isPublic ? '爽约' : '未完成');
      return { outcome, status: 'red' };
    }

    if (card.extraCost) state.money -= card.extraCost;
    applyEffects(card.fixed);
    const parts = [effectText(card.fixed)];
    let status = card.check && !success ? 'yellow' : 'success';
    if (success && Object.keys(card.success || {}).length) {
      applyEffects(card.success);
      parts.push(`额外成果：${effectText(card.success)}`);
    } else if (card.check && !success) {
      parts.push('额外判定未成功，基础收益保留');
    }
    const outcome = parts.join(' · ');
    addResult(settlementRun.results, card.title, `${prefix}${prefix ? ' · ' : ''}${outcome}`, false, status);
    markCardExperienced(card);
    return { outcome, status };
  }

  function markCardExperienced(card) {
    state.metrics.completed += 1;
    if (card.repeatRule === 'once' && !state.completedCards.includes(card.id)) state.completedCards.push(card.id);
    if (['L03', 'L04', 'L05', 'L09', 'L13', 'L14'].includes(card.id)) state.metrics.city += 1;
    const stickerByCard = { L01: 'clubcard', L03: 'british-museum', L05: 'central-line', L06: 'gails' };
    if (stickerByCard[card.id]) queueSettlementSticker(stickerByCard[card.id]);
  }

  function planDialogue(index, status) {
    if (status === 'red') {
      if (index === 0) return '这次计划没有完成。没有额外惩罚，但它仍是一项未完成记录。';
      if (index === 1) return '教授只回了一个问号：“I thought you said Friday?”';
      return '对方回了句：“你不是说好一起吃饭吗？”';
    }
    if (status === 'incomplete') return '这次没有做到，也没有人扣分；只是你自己知道这张计划还欠着。';
    if (status === 'yellow') return '约定已经完成，只是额外成果没有拿到。基础收益仍然保留。';
    if (index === 0) return '你真的坐进了图书馆。计划不再只是写在备忘录里。';
    if (index === 1) return '教授回了一句：“Good start. Let’s discuss this next week.”';
    return '对方发来消息：“下周再去试一家？”';
  }

  function renderPlanOverlay(index, { status = 'success', pendingRetry = false, chance = 100, roll = 0, prefix = '', outcome = '' }) {
    const card = cards[index];
    const stamp = $('#planSettlementStamp');
    const visualStatus = pendingRetry ? 'yellow' : status;
    stamp.className = `plan-stamp ${visualStatus}`;
    stamp.textContent = pendingRetry
      ? '初次未通过'
      : status === 'success' ? '成功'
        : status === 'yellow' ? '判定失败'
          : status === 'red' ? (card.kind === '公开承诺' ? '爽约' : '未完成') : '未完成';
    $('#planSettlementKind').textContent = `${card.kind} · ${card.category}`;
    $('#planSettlementTitle').textContent = card.title;
    $('#planSettlementBody').textContent = pendingRetry
      ? `初次成功率 ${chance}%，抽到 ${roll}，没有通过。你可以手动使用本月唯一一次重判，也可以接受这次失败。`
      : status === 'success' && card.resultCopy ? card.resultCopy : planDialogue(index, status);
    const deltas = pendingRetry ? [`成功率 ${chance}%`, '重判机会 1/1'] : [prefix || (status === 'success' ? '判定成功' : '判定未通过'), outcome];
    const deltaBox = $('#planSettlementDeltas');
    deltaBox.className = `delta-pills ${visualStatus}`;
    deltaBox.innerHTML = deltas.filter(Boolean).map(delta => `<span>${delta}</span>`).join('');
    $('#planRetryButton').hidden = !pendingRetry;
    $('#planContinueButton').textContent = pendingRetry ? '接受失败' : '继续结算';
    show('#planSettlementOverlay');
  }

  function processNextPlan() {
    if (!settlementRun) return;
    if (settlementRun.planCursor >= settlementRun.planQueue.length) {
      finalizeOpportunityCards();
      return;
    }
    const index = settlementRun.planQueue[settlementRun.planCursor++];
    const card = cards[index];
    activePlan = { index, resolved: false };
    if (!requirementMet(card)) {
      const resolved = applyPlanOutcome(index, false, '行动条件未满足', true);
      activePlan.resolved = true;
      renderPlanOverlay(index, { status: resolved.status, prefix: '行动条件未满足', outcome: resolved.outcome });
      return;
    }
    if (!card.check) {
      const resolved = applyPlanOutcome(index, true, '行动条件已满足');
      activePlan.resolved = true;
      renderPlanOverlay(index, { status: resolved.status, prefix: '自动成功', outcome: resolved.outcome });
      return;
    }
    const result = rollCard(card);
    activePlan.initialResult = result;
    if (result.success) {
      const resolved = applyPlanOutcome(index, true, `成功率 ${result.chance}% · 抽到 ${result.roll}`);
      activePlan.resolved = true;
      renderPlanOverlay(index, { status: resolved.status, prefix: `成功率 ${result.chance}% · 抽到 ${result.roll}`, outcome: resolved.outcome });
      return;
    }
    if (matchesTrait(card) && !state.traitUsed) {
      renderPlanOverlay(index, { pendingRetry: true, chance: result.chance, roll: result.roll });
      return;
    }
    const resolved = applyPlanOutcome(index, false, `成功率 ${result.chance}% · 抽到 ${result.roll}`);
    activePlan.resolved = true;
    renderPlanOverlay(index, { status: resolved.status, prefix: `成功率 ${result.chance}% · 抽到 ${result.roll}`, outcome: resolved.outcome });
  }

  function finalizeOpportunityCards() {
    state.accepted.forEach((accepted, index) => {
      if (!accepted || settlementRun.planQueue.includes(index)) return;
      const card = cards[index];
      if (!requirementMet(card)) {
        addResult(settlementRun.results, card.title, '行动条件未满足 · 本次未完成 · 无额外惩罚', true, 'red', '未完成');
        return;
      }
      const metForeignClassmate = Boolean(card.fixed?.unlockForeign) && state.intlRelation <= 0;
      if (card.extraCost) state.money -= card.extraCost;
      applyEffects(card.fixed);
      if (!card.check) {
        addResult(settlementRun.results, card.title, effectText(card.fixed), false, 'success');
      } else {
        const result = rollCard(card);
        if (result.success) {
          applyEffects(card.success);
          addResult(settlementRun.results, card.title, `成功率 ${result.chance}% · 抽到 ${result.roll} · ${effectText(card.fixed)}${Object.keys(card.success || {}).length ? ` · 额外成果：${effectText(card.success)}` : ''}`, false, 'success');
        } else {
          addResult(settlementRun.results, card.title, `成功率 ${result.chance}% · 抽到 ${result.roll} · ${effectText(card.fixed)} · 额外判定未成功`, false, 'yellow');
        }
      }
      if (card.id === 'S01') queueSettlementSticker('bus');
      if (metForeignClassmate) queueSettlementSticker('whatsapp');
      markCardExperienced(card);
    });

    if (state.week === 1) queueSettlementSticker('bigben');
    state.pendingEventStickers.forEach(queueSettlementSticker);
    state.pendingEventStickers = [];
    if (state.chinaRelation >= 10) queueSettlementSticker('heytea-friend');
    if (state.intlRelation >= 10) queueSettlementSticker('london-photo-strip');
    if (state.professorTrust >= 10) queueSettlementSticker('professor-reference');
    if (state.money < 0) state.debtSafety = true;
    state.health = clamp(state.health, 0, 100);
    state.mental = clamp(state.mental, 0, 100);
    state.persona.academic = clamp(state.persona.academic, 0, 100);
    state.persona.social = clamp(state.persona.social, 0, 100);
    state.persona.luck = clamp(state.persona.luck, 0, 10);
    state.study = Math.max(0, state.study);
    state.professorTrust = clamp(state.professorTrust, 0, 10);
    state.chinaRelation = clamp(state.chinaRelation, 0, 10);
    state.intlRelation = clamp(state.intlRelation, 0, 10);
    state.settled = true;
    state.weekSummary = `伦敦第 ${state.week} 周：完成 ${settlementRun.results.filter(result => ['success', 'done', 'yellow'].includes(result.status)).length} 项经历，学业来到 ${state.study}。`;
    pendingStickerQueue = [...new Set(settlementRun.newStickers)].filter(id => !hasSticker(id));
    state.unlocked.push(...pendingStickerQueue);
    save();
    const finished = settlementRun;
    settlementRun = null;
    activePlan = null;
    displayResults(finished);
  }

  function displayResults(settlement) {
    $('#resultsWeekStamp').textContent = `WEEK ${state.week}`;
    const list = $('#resultList');
    list.innerHTML = '';
    settlement.results.forEach((result, index) => {
      const row = document.createElement('div');
      row.className = `result-row ${result.status}`;
      row.style.animationDelay = `${.28 + index * .08}s`;
      const badges = { success: '成功', yellow: '判定失败', condition: '条件未满足', red: '未完成', incomplete: '未完成', failed: '失败', skipped: '未完成', done: '执行' };
      const badge = result.badge || badges[result.status] || '执行';
      row.innerHTML = `<div class="result-main"><em>${badge}</em><b>${result.label}</b></div><span>${result.outcome}</span>`;
      list.appendChild(row);
    });
    const completed = settlement.results.filter(result => ['success', 'done', 'yellow'].includes(result.status)).length;
    $('#rewardBox strong').textContent = completed >= 4 ? `第 ${state.week} 周：日程塞得满满当当` : completed >= 2 ? `第 ${state.week} 周：开始找到自己的伦敦节奏` : '有时候，顺利过完一周就是成就';
    show('#resultsOverlay');
  }

  function restartPrototypeWeek() {
    const persona = state.persona;
    state = initialState();
    state.started = true;
    state.persona = persona;
    state.avatarId = defaultAvatarFor(persona);
    state = migrateState(state);
    save();
    renderAll();
    banner(`第 ${state.week} 周已重新开始`, '保留当前人设与全局收藏，清空本周行动和承诺');
  }

  function beginSettlement(skipEmptyWarning = false) {
    if (state.settled) {
      message({
        icon: '✓', eyebrow: '本周已结算', title: `第 ${state.week} 周的故事已经写下`, body: state.weekSummary,
        deltas: [`贴纸 ${globalStickerIds().length}/${stickers.length}`], button: '重新体验本周', cancelLabel: '保留当前进度'
      }, restartPrototypeWeek);
      return;
    }
    if (!state.meal) {
      message({ icon: '!', eyebrow: '还差一件事', title: '这周准备吃什么？', body: '做饭、外卖或出去吃必须选一种。关闭提示后，点任意行动槽即可安排。', deltas: ['饮食未安排'] });
      return;
    }
    if (!skipEmptyWarning && state.actionSlots.some(value => !value)) {
      message({ icon: '!', eyebrow: '还有行动点', title: '确定让时间空过去吗？', body: '没用完行动点也可以结算，但不会保留到下周。', deltas: [`剩余 ${state.actionSlots.filter(value => !value).length} 点`], button: '仍然结算', cancelLabel: '返回安排' }, () => beginSettlement(true));
      return;
    }
    settlementRun = createSettlementRun();
    processNextPlan();
  }

  function renderShoppingOptions() {
    $$('[data-shop-tier]').forEach(button => {
      const cost = Number(button.dataset.shopTier);
      button.disabled = cost > 0 && cost > state.money;
      button.title = button.disabled ? `还差 £${cost - state.money}` : '';
    });
  }

  function cancelSettlement() {
    if (!settlementRun) return;
    state = migrateState(settlementRun.snapshot);
    settlementRun = null;
    activePlan = null;
    hide('#planSettlementOverlay');
    renderAll();
    save();
    banner('已返回本周安排', '本次结算没有保存，可以继续修改行动');
  }

  $$('[data-shop-tier]').forEach(button => button.addEventListener('click', () => {
    const cost = Number(button.dataset.shopTier);
    if (cost > state.money) return;
    commitAction('shop', null, cost);
  }));

  function cancelShoppingChoice() {
    hide('#shoppingOverlay');
    show('#sheetOverlay');
  }

  $('#shoppingCancel').addEventListener('click', cancelShoppingChoice);
  $('#shoppingOverlay').addEventListener('click', event => { if (event.target === $('#shoppingOverlay')) cancelShoppingChoice(); });

  $('#planRetryButton').addEventListener('click', () => {
    if (!settlementRun || !activePlan || activePlan.resolved) return;
    state.traitUsed = true;
    const card = cards[activePlan.index];
    const result = rollCard(card);
    const prefix = result.success ? `手动重判 · 成功率 ${result.chance}% · 抽到 ${result.roll} · 成功` : `手动重判 · 成功率 ${result.chance}% · 抽到 ${result.roll} · 仍未通过`;
    const resolved = applyPlanOutcome(activePlan.index, result.success, prefix);
    activePlan.resolved = true;
    renderPlanOverlay(activePlan.index, { status: resolved.status, prefix, outcome: resolved.outcome });
  });

  $('#planContinueButton').addEventListener('click', () => {
    if (!settlementRun || !activePlan) return;
    if (!activePlan.resolved) {
      const first = activePlan.initialResult;
      applyPlanOutcome(activePlan.index, false, `初次成功率 ${first.chance}% · 抽到 ${first.roll} · 接受失败`);
      activePlan.resolved = true;
    }
    hide('#planSettlementOverlay');
    activePlan = null;
    processNextPlan();
  });

  $('#planSettlementOverlay').addEventListener('click', event => { if (event.target === $('#planSettlementOverlay')) cancelSettlement(); });

  $('#settleButton').addEventListener('click', () => beginSettlement());

  function writeCompletedCheckpoint() {
    const checkpointState = JSON.parse(JSON.stringify(state));
    checkpointState.weekCards = [];
    localStorage.setItem(completedStorageKey, JSON.stringify({ savedAt: new Date().toISOString(), state: checkpointState }));
    renderSaveSettings();
  }

  function resetWeeklyState() {
    state.selectedCard = 0;
    state.accepted = [false, false, false, false];
    state.actionSlots = [null, null, null];
    state.socialInvites = [null, null, null];
    state.shoppingTiers = [null, null, null];
    state.activeSlot = 0;
    state.meal = null;
    state.contacted = false;
    state.familyResult = null;
    state.settled = false;
    state.weekSummary = null;
    state.weekCards = [];
    if (state.debtSafety) state.actionSlots[0] = 'ask';
  }

  function maybeRunRandomEvent() {
    if (!state.eventFlags.phoneStolen && state.persona.luck <= 1 && Math.random() < .05) {
      state.eventFlags.phoneStolen = true;
      state.money -= 80;
      state.pendingEventStickers.push('iphone18');
      renderStats();
      message({ icon: '📱', eyebrow: '低幸运彩蛋', title: '手机不见了', body: '回过神时口袋已经空了。补办、临时通讯和后续支出先合并记为 £80。', deltas: ['资金 −£80', 'iPhone 18 贴纸待本周结算'], button: '先继续这一周' });
      return;
    }
    if (state.week >= 2 && !state.eventFlags.bankCardNearMiss && state.persona.luck >= 4 && Math.random() < .08) {
      state.eventFlags.bankCardNearMiss = true;
      message({ icon: '💳', eyebrow: '一场虚惊', title: '差点把银行卡丢了', body: '你翻了两遍包，最后在外套夹层里摸到了它。中等偏上的好运，大概就是先吓你一跳。', deltas: ['无属性变化', '本存档仅触发一次'] });
    }
  }

  function maybeRunRelationshipReward() {
    const candidates = [
      state.chinaRelation >= 9 && !state.experienceFlags.china_relation_reward && { flag: 'china_relation_reward', icon: '🧋', title: '“周末别自己吃了”', body: '中国同学发来了定好时间和地点的消息。你已经不是通讯录里的一个新名字。' },
      state.intlRelation >= 9 && !state.experienceFlags.intl_relation_reward && { flag: 'intl_relation_reward', icon: '📸', title: '你被加进了一个更小的群聊', body: '不是所有 Welcome Week 的关系都会留下，但这一个看起来会。' },
      state.professorTrust >= 9 && !state.experienceFlags.professor_relation_reward && { flag: 'professor_relation_reward', icon: '✉', title: '“有需要的话，可以再来聊”', body: '教授开始记得你在做什么。这不是推荐信，但是一个很好的开始。' }
    ].filter(Boolean);
    const event = candidates[0];
    if (!event) { maybeRunRandomEvent(); return; }
    state.experienceFlags[event.flag] = true;
    message({ icon: event.icon, eyebrow: '关系事件 · 9/10', title: event.title, body: event.body, deltas: ['不消耗行动', '关系 10 时解锁人物贴纸'], button: '收下这段记忆' }, maybeRunRandomEvent);
  }

  function runWeekStartStory() {
    if (state.introSeenWeeks.includes(state.week)) return;
    state.introSeenWeeks.push(state.week);
    const stories = {
      1: { eyebrow: 'INSTRUCTION WEEK', title: '七人小组，暂时只记住了几张脸', body: 'Welcome、学生证、超市和一堆群聊同时出现。这一周没有学业硬指标，先学会安排三个行动。' },
      2: { eyebrow: '课程开始', title: '正式开学之后，七人小组也没有每个人都出现', body: '课程、社团和伦敦生活开始抢同一份时间。你可以接更多承诺，也可以什么都不说死。' },
      3: { eyebrow: '第一次小组作业', title: 'Office Hour 前，你连自己要问什么都没想好', body: '紧张是真的，好在教授并没有不耐烦。这周的学业机会更多，但生活也不会停下。' },
      4: { eyebrow: '学院通知', title: 'W7 结束时，学业值需要达到 18', body: '期中必修作业已加入固定行动：连占两格，完成后学业 +6。如果你已经领先，也可以不做。' }
    };
    const story = stories[state.week];
    message({ icon: state.week === 4 ? '!' : '✉', eyebrow: story.eyebrow, title: story.title, body: story.body, deltas: state.week === 4 ? ['W7 目标：学业 18', '必修作业：2 行动→学业 +6'] : [`W${state.week} 新卡池已刷新`], button: '开始安排' }, maybeRunRelationshipReward);
  }

  function renderMonthReward() {
    const academicLean = state.actionCounts.study + state.actionCounts.deadline * 2;
    const socialLean = state.actionCounts.social + state.actionCounts.dine;
    const main = academicLean >= socialLean ? '节奏管理者' : '伦敦联络人';
    const sideOne = state.metrics.noShows ? '承诺的代价' : '说到做到';
    const sideTwo = state.metrics.city >= 2 ? '伦敦地图点亮中' : state.behaviorCounts.cook >= 2 ? '开火留学生' : '十月新生';
    $('#mainTitle').textContent = main;
    $('#sideTitleOne').textContent = sideOne;
    $('#sideTitleTwo').textContent = sideTwo;
    $('#monthRewardCopy').textContent = `4 周结束：学业 ${state.study}，接下 ${state.metrics.accepted} 张机会，完成 ${state.metrics.completed} 段经历。`;
    $('#monthStats').innerHTML = `<div><span>学业</span><b>${state.study}</b></div><div><span>贴纸</span><b>${globalStickerIds().length}</b></div><div><span>人际</span><b>${state.chinaRelation + state.intlRelation}</b></div>`;
  }

  function completeWeekTransition() {
    const completedWeek = state.week;
    state.weekHistory.push({ week: completedWeek, summary: state.weekSummary, study: state.study, money: state.money });
    if (completedWeek >= 4) {
      state.demoComplete = true;
      writeCompletedCheckpoint();
      renderMonthReward();
      confetti();
      show('#monthRewardOverlay');
      return;
    }
    state.week += 1;
    resetWeeklyState();
    writeCompletedCheckpoint();
    ensureWeekCards();
    renderAll();
    confetti();
    runWeekStartStory();
  }

  function finishResultsFlow() {
    hide('#resultsOverlay');
    renderAll();
    animateDelta('#moneyDelta', '更新');
    animateDelta('#healthDelta', '更新');
    animateDelta('#mentalDelta', '更新');
    animateDelta('#studyDelta', '更新');
    if (pendingStickerQueue.length) showStickerFan();
    else {
      completeWeekTransition();
    }
  }

  $('#finishResults').addEventListener('click', finishResultsFlow);
  $('#resultsOverlay').addEventListener('click', event => { if (event.target === $('#resultsOverlay')) finishResultsFlow(); });

  function showStickerFan() {
    const unlocked = pendingStickerQueue.map(id => stickers.find(item => item.id === id)).filter(Boolean);
    const fan = $('#unlockFan');
    fan.innerHTML = '';
    unlocked.slice(0, 4).forEach((sticker, index) => {
      const image = document.createElement('img');
      const center = (Math.min(4, unlocked.length) - 1) / 2;
      image.className = 'fan-sticker';
      image.src = sticker.src;
      image.alt = sticker.name;
      image.style.setProperty('--fan-offset', `${(index - center) * 42}px`);
      image.style.setProperty('--fan-rotate', `${(index - center) * 9}deg`);
      fan.appendChild(image);
    });
    if (unlocked.length > 4) {
      const more = document.createElement('b');
      more.textContent = `+${unlocked.length - 4}`;
      fan.appendChild(more);
    }
    $('#unlockTitle').textContent = `本周新收藏 ×${unlocked.length}`;
    $('#unlockText').textContent = unlocked.map(sticker => sticker.name).join('、');
    $('#unlockClose').textContent = '全部贴进收藏册';
    show('#stickerUnlockOverlay');
    confetti();
  }

  function closeStickerUnlock() {
    hide('#stickerUnlockOverlay');
    const confirmedStickers = [...pendingStickerQueue];
    pendingStickerQueue = [];
    commitGlobalStickers(confirmedStickers);
    renderCollection();
    banner('贴纸已经收好', '已经完成本周，准备进入下一周');
    completeWeekTransition();
  }

  $('#unlockClose').addEventListener('click', closeStickerUnlock);
  $('#stickerUnlockOverlay').addEventListener('click', event => { if (event.target === $('#stickerUnlockOverlay')) closeStickerUnlock(); });

  function confetti() {
    const box = $('#confetti');
    box.innerHTML = '';
    if (state.settings.reduceMotion) return;
    const colors = ['#244b55', '#d5913d', '#b75048', '#739273', '#725a83'];
    for (let i = 0; i < 24; i += 1) {
      const piece = document.createElement('i');
      piece.style.left = `${rand(3, 97)}%`;
      piece.style.background = colors[i % colors.length];
      piece.style.animationDelay = `${Math.random() * .45}s`;
      piece.style.transform = `rotate(${rand(0, 180)}deg)`;
      box.appendChild(piece);
    }
    setTimeout(() => { box.innerHTML = ''; }, 1900);
  }

  $('#rerollButton').addEventListener('click', () => {
    $('#personaCard').classList.add('rolling');
    setTimeout(() => {
      state.persona = randomPersona();
      state.avatarId = defaultAvatarFor(state.persona);
      state.traitUsed = false;
      renderPersona();
      $('#personaCard').classList.remove('rolling');
      save();
    }, 280);
  });
  $('#startButton').addEventListener('click', () => {
    state.started = true;
    hasActiveSession = true;
    save();
    hide('#onboarding');
    hide('#homeOverlay');
    renderAll();
    banner('第一周开始', '先看看四张机会，再安排三个行动');
    runWeekStartStory();
  });

  function startNewGame() {
    const preferences = state.settings;
    state = migrateState(initialState());
    state.settings = { ...state.settings, ...preferences };
    state.avatarId = defaultAvatarFor(state.persona);
    hasActiveSession = false;
    pendingStickerQueue = [];
    settlementRun = null;
    activePlan = null;
    hide('#homeOverlay');
    renderAll();
    show('#onboarding');
  }

  function loadHomeSave(preferCompleted = false) {
    const manual = localStorage.getItem(manualStorageKey);
    const checkpoint = localStorage.getItem(completedStorageKey);
    const raw = preferCompleted ? checkpoint || manual : manual || checkpoint;
    if (!raw) return;
    try {
      const record = JSON.parse(raw);
      state = migrateState(record.state);
      state.started = true;
      hasActiveSession = true;
      pendingStickerQueue = [];
      settlementRun = null;
      activePlan = null;
      hide('#homeOverlay');
      hide('#onboarding');
      renderAll();
      banner('存档读取成功', raw === manual ? '已读取手动存档槽 1' : '已读取最近完成周存档');
      if (state.demoComplete) { renderMonthReward(); show('#monthRewardOverlay'); }
      else runWeekStartStory();
    } catch (_) {
      banner('读取失败', '这个存档无法识别，请重新保存');
    }
  }

  $('#continueGameButton').addEventListener('click', () => {
    if (hasActiveSession && state.started) {
      hide('#homeOverlay');
      hide('#onboarding');
      if (state.demoComplete) { renderMonthReward(); show('#monthRewardOverlay'); }
      return;
    }
    loadHomeSave(true);
  });
  $('#newGameButton').addEventListener('click', () => {
    if (!(hasActiveSession && state.started)) { startNewGame(); return; }
    message({ icon: '↻', eyebrow: '新游戏', title: '重新随机一位留学生？', body: '当前本周尚未存档的安排会被清空，已经完成的周存档和贴纸册不会受影响。', button: '开始新游戏', cancelLabel: '继续当前周' }, startNewGame);
  });
  $('#homeLoadButton').addEventListener('click', () => loadHomeSave(false));
  $('#homeCollectionButton').addEventListener('click', () => { renderCollection(); show('#collectionOverlay'); });
  $('#showPreviewButton').addEventListener('click', () => { hide('#monthRewardOverlay'); show('#demoPreviewOverlay'); });
  $('#finishDemoButton').addEventListener('click', () => { hide('#demoPreviewOverlay'); hasActiveSession = false; renderHome(); show('#homeOverlay'); });

  function writeManualSave() {
    const checkpoint = localStorage.getItem(completedStorageKey);
    if (!checkpoint) {
      banner('当前没有可保存的周', '进行中的行动和随机结果不会写入存档');
      return;
    }
    const record = JSON.parse(checkpoint);
    localStorage.setItem(manualStorageKey, JSON.stringify({ ...record, savedAt: new Date().toISOString() }));
    renderSaveSettings();
    banner('已保存最近完成的周', '本周进行中的行动不会写入存档');
  }

  $('#manualSaveButton').addEventListener('click', () => {
    if (!localStorage.getItem(manualStorageKey)) {
      writeManualSave();
      return;
    }
    message({ icon: '▣', eyebrow: '覆盖存档', title: '替换手动存档槽 1？', body: '原来的手动存档会被最近一次完整周的进度替换。自动存档不受影响。', button: '确认覆盖', cancelLabel: '暂不覆盖' }, writeManualSave);
  });

  $('#manualLoadButton').addEventListener('click', () => {
    const raw = localStorage.getItem(manualStorageKey);
    if (!raw) return;
    message({ icon: '↶', eyebrow: '读取存档', title: '回到手动存档的进度？', body: '当前尚未手动保存的安排会被替换。已领取贴纸会严格按存档恢复，不会重复发放。', button: '确认读取', cancelLabel: '保留当前进度' }, () => {
      try {
        const record = JSON.parse(raw);
        state = migrateState(record.state);
        state.started = true;
        hasActiveSession = true;
        pendingStickerQueue = [];
        localStorage.setItem(completedStorageKey, JSON.stringify({ savedAt: record.savedAt, state }));
        save();
        renderAll();
        hide('#settingsOverlay');
        hide('#attributesOverlay');
        hide('#homeOverlay');
        banner('存档读取成功', '已经回到手动存档槽 1');
        if (state.demoComplete) { renderMonthReward(); show('#monthRewardOverlay'); }
        else runWeekStartStory();
      } catch (_) {
        banner('读取失败', '这个存档无法识别，请重新保存');
      }
    });
  });

  $('#reduceMotionToggle').addEventListener('change', event => {
    state.settings.reduceMotion = event.target.checked;
    localStorage.setItem(preferencesStorageKey, JSON.stringify(state.settings));
    save();
    renderSaveSettings();
    banner(event.target.checked ? '已减少动态效果' : '已恢复动态效果', '设置已经自动保存');
  });

  $('#returnHomeButton').addEventListener('click', () => {
    hide('#settingsOverlay');
    hide('#attributesOverlay');
    hasActiveSession = Boolean(state.started);
    showHome();
  });

  function closeSettings() {
    hide('#settingsOverlay');
    renderPersona();
    renderStats();
    show('#attributesOverlay');
  }

  $('#openSettingsButton').addEventListener('click', () => {
    hide('#attributesOverlay');
    renderSaveSettings();
    show('#settingsOverlay');
  });
  $('[data-close-settings]').addEventListener('click', closeSettings);
  $('#settingsOverlay').addEventListener('click', event => { if (event.target === $('#settingsOverlay')) closeSettings(); });

  const attributeOpeners = ['#avatarButton', '[data-open-attributes]'];
  attributeOpeners.forEach(selector => $$(selector).forEach(el => el.addEventListener('click', () => { renderPersona(); renderStats(); show('#attributesOverlay'); })));
  $('[data-close-attributes]').addEventListener('click', () => hide('#attributesOverlay'));
  $('#collectionButton').addEventListener('click', () => { renderCollection(); show('#collectionOverlay'); });
  $('[data-close-collection]').addEventListener('click', () => hide('#collectionOverlay'));
  $('#calendarButton').addEventListener('click', () => show('#calendarOverlay'));
  $('[data-close-calendar]').addEventListener('click', () => hide('#calendarOverlay'));
  ['#attributesOverlay', '#collectionOverlay', '#calendarOverlay'].forEach(id => $(id).addEventListener('click', event => { if (event.target === $(id)) hide(id); }));

  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    if ($('#planSettlementOverlay').classList.contains('visible')) cancelSettlement();
    else if ($('#shoppingOverlay').classList.contains('visible')) cancelShoppingChoice();
    else if ($('#stickerUnlockOverlay').classList.contains('visible')) closeStickerUnlock();
    else if ($('#resultsOverlay').classList.contains('visible')) finishResultsFlow();
    else if ($('#messageOverlay').classList.contains('visible')) closeMessage(false);
    else if ($('#settingsOverlay').classList.contains('visible')) closeSettings();
    else ['#socialOverlay', '#sheetOverlay', '#attributesOverlay', '#collectionOverlay', '#calendarOverlay'].some(id => {
      if (!$(id).classList.contains('visible')) return false;
      hide(id);
      return true;
    });
  });

  renderAll();
  showHome();
})();
