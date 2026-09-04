(() => {
  "use strict";

  const SIZE = 10;
  const SAVE_KEY = "princess-star-kingdom-v1";
  const UNLIMITED_TOOLS = true;
  const POWER_LABEL = {
    row: "皇家橫向火箭：轟擊整個橫排",
    col: "皇家直向火箭：轟擊整個直排",
    bomb: "玫瑰炸彈：爆炸周圍九宮格",
    rainbow: "彩虹王冠：消除全部同色寶石",
    seal: "星光飛碟：飛向隨機寶石消除"
  };
  const POWER_BADGE = { row: "↔火箭", col: "↕火箭", bomb: "炸彈", rainbow: "同色", seal: "飛碟" };
  const TILES = [
    { symbol: "✦", name: "藍晶王星", color: "blue" },
    { symbol: "♥", name: "皇冠紅寶石", color: "rose" },
    { symbol: "☀", name: "皇家太陽石", color: "gold" },
    { symbol: "❧", name: "翡翠魔法葉", color: "green" },
    { symbol: "☾", name: "紫月水晶", color: "violet" },
    { symbol: "❀", name: "珍珠玫瑰", color: "pearl" }
  ];
  const DISTRICTS = [
    { name: "玫瑰拱門", icon: "🌹", cost: 3 },
    { name: "水晶噴泉", icon: "⛲", cost: 5 },
    { name: "白貓小屋", icon: "🏠", cost: 7 },
    { name: "星光花圃", icon: "🌷", cost: 9 },
    { name: "皇家茶亭", icon: "🫖", cost: 11 },
    { name: "晨曦宮殿", icon: "🏰", cost: 14 }
  ];
  const EVENTS = [
    { name: "玫瑰星雨", copy: "收集皇冠紅寶石，獎勵魔法露 ×2", targetType: 1, moves: 22, target: 30 },
    { name: "月光寶藏", copy: "收集紫月水晶，召喚米露加速蓄力", targetType: 4, moves: 24, target: 32 },
    { name: "太陽慶典", copy: "收集皇家太陽石，大消除更容易獲得祝福", targetType: 2, moves: 20, target: 28 }
  ];

  const $ = (id) => document.getElementById(id);
  const els = {
    home: $("homeScreen"), game: $("gameScreen"), board: $("gameBoard"),
    princessName: $("princessName"), homeLevel: $("homeLevel"), homePotions: $("homePotions"),
    homeStars: $("homeStars"), playLevel: $("playLevel"), gameLevel: $("gameLevel"),
    progress: $("kingdomProgress"), progressText: $("progressText"), districtPath: $("districtPath"),
    buildBtn: $("buildBtn"), buildLabel: $("buildLabel"), buildCost: $("buildCost"),
    moves: $("movesLeft"), levelKind: $("levelKind"), normalMission: $("normalMission"),
    bossMission: $("bossMission"), goalIcon: $("goalIcon"), goalLeft: $("goalLeft"),
    bossHpText: $("bossHpText"), bossHpBar: $("bossHpBar"), petMeter: $("petMeter"), petCharge: $("petCharge"),
    wandBtn: $("wandBtn"), wandCount: $("wandCount"), roseBtn: $("roseBtn"),
    roseCount: $("roseCount"), shuffleBtn: $("shuffleBtn"), shuffleCount: $("shuffleCount"),
    hourglassBtn: $("hourglassBtn"), hourglassCount: $("hourglassCount"), toolHint: $("toolHint"),
    effectBanner: $("effectBanner"), eventBtn: $("eventBtn"), eventTitle: $("eventTitle"), eventCopy: $("eventCopy"),
    modal: $("resultModal"), resultIcon: $("resultIcon"), resultKicker: $("resultKicker"),
    resultTitle: $("resultTitle"), resultCopy: $("resultCopy"), resultPrimary: $("resultPrimary"),
    resultSecondary: $("resultSecondary"), toast: $("toast")
  };

  let state = loadState();
  let board = [];
  let level = null;
  let selected = null;
  let locked = false;
  let toolMode = null;
  let toastTimer = null;
  let lastBuiltIndex = null;
  let uid = 0;

  function loadState() {
    const fallback = { princess: "星華", level: 1, potions: 0, stars: 0, built: 0, eventWins: 0 };
    try {
      const parsed = JSON.parse(localStorage.getItem(SAVE_KEY));
      if (!parsed || typeof parsed !== "object") return fallback;
      return {
        princess: typeof parsed.princess === "string" && parsed.princess.trim() ? parsed.princess.slice(0, 6) : fallback.princess,
        level: Math.max(1, Number(parsed.level) || 1),
        potions: Math.max(0, Number(parsed.potions) || 0),
        stars: Math.max(0, Number(parsed.stars) || 0),
        built: Math.min(DISTRICTS.length, Math.max(0, Number(parsed.built) || 0)),
        eventWins: Math.max(0, Number(parsed.eventWins) || 0)
      };
    } catch (_) {
      return fallback;
    }
  }

  function saveState() {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  }

  function tile(type = randomType(), power = null) {
    return { type, power, id: ++uid };
  }

  function randomType() {
    return Math.floor(Math.random() * TILES.length);
  }

  function dailyEvent() {
    const day = Math.floor(Date.now() / 86400000);
    return EVENTS[day % EVENTS.length];
  }

  function makeBoardPattern(number, isEvent) {
    const blocked = new Set();
    const add = (row, col) => blocked.add(row * SIZE + col);
    const variant = isEvent ? 4 : (number - 1) % 4;
    let name = "月光花窗";
    if (variant === 0) {
      [[4,4],[4,5],[5,4],[5,5]].forEach(([r,c]) => add(r,c));
    } else if (variant === 1) {
      name = "玫瑰拱門";
      for (const r of [0,1,8,9]) for (const c of [0,1,8,9]) add(r,c);
    } else if (variant === 2) {
      name = "王冠階梯";
      for (let r = 0; r < 3; r++) for (let c = 0; c < 3 - r; c++) { add(r,c); add(r,SIZE - 1 - c); }
      add(9,0); add(9,9);
    } else if (variant === 3) {
      name = "雙星迴廊";
      for (const r of [0,1,2,7,8,9]) { add(r,4); add(r,5); }
    } else {
      name = "星雨祭壇";
      [[0,0],[0,9],[9,0],[9,9],[4,4],[4,5],[5,4],[5,5]].forEach(([r,c]) => add(r,c));
    }
    return { name, blocked };
  }

  function makeLevel(number, isEvent = false) {
    const event = isEvent ? dailyEvent() : null;
    const isBoss = !isEvent && number % 5 === 0;
    const targetType = event?.targetType ?? ((number + 1) % TILES.length);
    const moves = event?.moves ?? (isBoss ? 29 + Math.min(5, Math.floor(number / 10)) : 25 + (number % 3));
    const target = event?.target ?? Math.min(38, 11 + Math.floor(number * 1.25));
    const bossMax = 48 + number * 4;
    const pattern = makeBoardPattern(number, isEvent);
    return {
      number, isBoss, isEvent, eventName: event?.name ?? "", targetType, target, remaining: target,
      bossMax, bossHp: bossMax, moves, pet: 0,
      patternName: pattern.name, blocked: pattern.blocked,
      tools: UNLIMITED_TOOLS
        ? { wand: Infinity, rose: Infinity, shuffle: Infinity, hourglass: Infinity }
        : { wand: 5, rose: 3, shuffle: 3, hourglass: 3 },
      won: false
    };
  }

  function buildFreshBoard() {
    const fresh = new Array(SIZE * SIZE);
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const index = r * SIZE + c;
        if (level.blocked.has(index)) {
          fresh[index] = { blocked: true, id: ++uid };
          continue;
        }
        let type;
        let tries = 0;
        do {
          type = randomType();
          tries++;
        } while (tries < 20 && (
          (c >= 2 && fresh[r * SIZE + c - 1]?.type === type && fresh[r * SIZE + c - 2]?.type === type) ||
          (r >= 2 && fresh[(r - 1) * SIZE + c]?.type === type && fresh[(r - 2) * SIZE + c]?.type === type) ||
          (r >= 1 && c >= 1 && fresh[r * SIZE + c - 1]?.type === type && fresh[(r - 1) * SIZE + c]?.type === type && fresh[(r - 1) * SIZE + c - 1]?.type === type)
        ));
        fresh[index] = tile(type);
      }
    }
    return fresh;
  }

  function updateHome() {
    els.princessName.textContent = state.princess;
    els.homeLevel.textContent = state.level;
    els.homePotions.textContent = state.potions;
    els.homeStars.textContent = state.stars;
    els.playLevel.textContent = state.level;
    const event = dailyEvent();
    els.eventTitle.textContent = event.name;
    els.eventCopy.textContent = event.copy;
    const pct = Math.round((state.built / DISTRICTS.length) * 100);
    els.progress.style.width = `${pct}%`;
    els.progressText.textContent = `${state.built} / ${DISTRICTS.length} 座王國設施已修復`;
    els.districtPath.replaceChildren();
    DISTRICTS.forEach((district, index) => {
      const node = document.createElement("div");
      node.className = `district${index < state.built ? " done" : ""}${index === state.built ? " current" : ""}${index === lastBuiltIndex ? " just-built" : ""}`;
      const object = document.createElement("span");
      object.className = "facility-object";
      object.textContent = district.icon;
      const label = document.createElement("small");
      label.className = "facility-name";
      label.textContent = district.name;
      node.append(object, label);
      node.title = district.name;
      node.setAttribute("aria-label", `${district.name}${index < state.built ? "，已完成" : index === state.built ? "，等待修復" : "，尚未開放"}`);
      els.districtPath.append(node);
    });
    const next = DISTRICTS[state.built];
    if (next) {
      els.buildLabel.textContent = `修復${next.name}`;
      els.buildCost.textContent = next.cost;
      els.buildBtn.disabled = state.potions < next.cost;
    } else {
      els.buildLabel.textContent = "晨曦花園修復完成";
      els.buildCost.textContent = "✓";
      els.buildBtn.disabled = true;
    }
  }

  function buildDistrict() {
    const next = DISTRICTS[state.built];
    if (!next) return;
    if (state.potions < next.cost) {
      showToast(`還需要 ${next.cost - state.potions} 滴魔法露`);
      return;
    }
    state.potions -= next.cost;
    lastBuiltIndex = state.built;
    state.built++;
    saveState();
    updateHome();
    playBuildFx(lastBuiltIndex);
    showToast(`${next.name}修復完成！`);
  }

  function playBuildFx(index) {
    const node = els.districtPath.children[index];
    if (!node) return;
    for (let i = 0; i < 6; i++) {
      const drop = document.createElement("i");
      drop.className = "build-drop";
      drop.textContent = i % 2 ? "✦" : "💧";
      drop.style.setProperty("--x", `${-34 + i * 14}px`);
      drop.style.setProperty("--delay", `${i * 70}ms`);
      node.append(drop);
    }
    window.setTimeout(() => {
      lastBuiltIndex = null;
      node.classList.remove("just-built");
      node.querySelectorAll(".build-drop").forEach((drop) => drop.remove());
    }, 1450);
  }

  function renamePrincess() {
    const input = window.prompt("替公主取一個名字（最多 6 個字）", state.princess);
    if (input === null) return;
    const clean = input.replace(/[<>]/g, "").trim().slice(0, 6);
    if (!clean) return showToast("請輸入公主名字");
    state.princess = clean;
    saveState();
    updateHome();
  }

  function showGame() {
    els.home.hidden = true;
    els.game.hidden = false;
    window.scrollTo(0, 0);
  }

  function showHome() {
    locked = false;
    selected = null;
    toolMode = null;
    els.modal.hidden = true;
    els.game.hidden = true;
    els.home.hidden = false;
    updateHome();
    window.scrollTo(0, 0);
  }

  function startMode(isEvent) {
    level = makeLevel(state.level, isEvent);
    board = buildFreshBoard();
    selected = null;
    locked = false;
    toolMode = null;
    clearToolSelection();
    showGame();
    updateHud();
    renderBoard();
    showEffect(level.isEvent ? `${level.eventName}開始！` : level.isBoss ? "黑霧來襲！" : `${level.patternName}開始！`);
  }

  function startLevel() {
    startMode(false);
  }

  function startEvent() {
    startMode(true);
  }

  function updateHud() {
    els.gameLevel.textContent = level.number;
    els.moves.textContent = level.moves;
    els.levelKind.textContent = level.isEvent ? `活動・${level.eventName}` : level.isBoss ? `淨化戰・${level.patternName}` : `花園・${level.patternName}`;
    els.normalMission.hidden = level.isBoss;
    els.bossMission.hidden = !level.isBoss;
    if (level.isBoss) {
      els.bossHpText.textContent = `${Math.max(0, level.bossHp)} / ${level.bossMax}`;
      els.bossHpBar.style.width = `${Math.max(0, level.bossHp) / level.bossMax * 100}%`;
    } else {
      const info = TILES[level.targetType];
      els.goalIcon.textContent = info.symbol;
      els.goalIcon.className = `mini-gem ${info.color}`;
      els.goalLeft.textContent = Math.max(0, level.remaining);
    }
    els.petCharge.style.width = `${level.pet / 5 * 100}%`;
    els.petMeter.classList.toggle("ready", level.pet >= 4);
    els.wandCount.textContent = toolCount(level.tools.wand);
    els.roseCount.textContent = toolCount(level.tools.rose);
    els.shuffleCount.textContent = toolCount(level.tools.shuffle);
    els.hourglassCount.textContent = toolCount(level.tools.hourglass);
    els.wandBtn.disabled = level.tools.wand <= 0;
    els.roseBtn.disabled = level.tools.rose <= 0;
    els.shuffleBtn.disabled = level.tools.shuffle <= 0;
    els.hourglassBtn.disabled = level.tools.hourglass <= 0;
  }

  function toolCount(value) {
    return Number.isFinite(value) ? value : "∞";
  }

  function spendTool(name) {
    if (Number.isFinite(level.tools[name])) level.tools[name]--;
  }

  function renderBoard() {
    const fragment = document.createDocumentFragment();
    board.forEach((item, index) => {
      const button = document.createElement("button");
      if (item?.blocked) {
        button.type = "button";
        button.className = "tile blocked";
        button.disabled = true;
        button.dataset.index = index;
        button.setAttribute("role", "gridcell");
        button.setAttribute("aria-label", "魔法障礙");
        fragment.append(button);
        return;
      }
      const info = item.power === "rainbow" ? { symbol: "✦", name: "彩虹王冠" } : TILES[item.type];
      button.type = "button";
      button.className = "tile";
      button.dataset.index = index;
      button.dataset.type = item.type;
      button.setAttribute("role", "gridcell");
      button.setAttribute("aria-label", `${info.name}${item.power ? `，${POWER_LABEL[item.power]}` : ""}`);
      button.textContent = "";
      if (selected === index) button.classList.add("selected");
      if (item.power) {
        button.classList.add("power", `power-${item.power}`);
        button.dataset.effect = POWER_BADGE[item.power];
      }
      fragment.append(button);
    });
    els.board.replaceChildren(fragment);
  }

  function adjacent(a, b) {
    const ar = Math.floor(a / SIZE), ac = a % SIZE;
    const br = Math.floor(b / SIZE), bc = b % SIZE;
    return Math.abs(ar - br) + Math.abs(ac - bc) === 1;
  }

  async function handleTile(index) {
    if (locked || !level || level.won) return;
    if (board[index]?.blocked) return;
    if (toolMode && (toolMode === "wand" || toolMode === "rose")) {
      locked = true;
      const activeTool = toolMode;
      spendTool(activeTool);
      clearToolSelection();
      const clear = activeTool === "rose" ? areaAround(index, 1) : new Set([index]);
      showEffect(activeTool === "rose" ? "玫瑰花雨！" : "星光魔杖！");
      playToolFx(activeTool, index);
      await wait(activeTool === "rose" ? 240 : 170);
      await clearCells(clear, new Map());
      await resolveMatches(findMatches());
      await finishAction(false);
      return;
    }
    if (selected === null) {
      selected = index;
      renderBoard();
      return;
    }
    if (selected === index) {
      if (board[index].power) {
        selected = null;
        await activatePower(index);
        return;
      }
      selected = null;
      renderBoard();
      return;
    }
    if (!adjacent(selected, index)) {
      selected = index;
      renderBoard();
      return;
    }
    const from = selected;
    selected = null;
    await swapTiles(from, index);
  }

  async function swapTiles(a, b) {
    locked = true;
    const first = board[a], second = board[b];
    board[a] = second;
    board[b] = first;
    renderBoard();
    await wait(115);

    if (first.power && second.power) {
      level.moves--;
      const combo = buildPowerCombo(a, b);
      showEffect(combo.label);
      playPowerComboFx(a, b, combo.kind);
      await wait(220);
      await clearCells(combo.clear, new Map(), true);
      await resolveMatches(findMatches());
      await finishAction(true);
      return;
    }

    if (first.power === "rainbow" || second.power === "rainbow") {
      level.moves--;
      const rainbowIndex = board[a].power === "rainbow" ? a : b;
      const otherIndex = rainbowIndex === a ? b : a;
      const targetType = board[otherIndex].type;
      const clear = new Set([rainbowIndex]);
      board.forEach((item, i) => { if (item.type === targetType) clear.add(i); });
      showEffect("彩虹魔法！");
      await clearCells(clear, new Map());
      await resolveMatches(findMatches());
      await finishAction(true);
      return;
    }

    if (first.power || second.power) {
      level.moves--;
      const clear = new Set();
      if (board[a].power) clear.add(a);
      if (board[b].power) clear.add(b);
      showEffect(first.power && second.power ? "雙重魔法！" : "魔法啟動！");
      await clearCells(clear, new Map());
      await resolveMatches(findMatches());
      await finishAction(true);
      return;
    }

    const groups = findMatches();
    if (!groups.length) {
      board[a] = first;
      board[b] = second;
      renderBoard();
      const nodes = [els.board.children[a], els.board.children[b]];
      nodes.forEach((node) => node?.classList.add("invalid"));
      await wait(285);
      renderBoard();
      locked = false;
      return;
    }

    level.moves--;
    await resolveMatches(groups, [a, b]);
    await finishAction(true);
  }

  function buildPowerCombo(a, b) {
    const clear = new Set();
    const pa = board[a].power;
    const pb = board[b].power;
    const playable = (index) => index >= 0 && index < board.length && board[index] && !board[index].blocked;
    const add = (index) => { if (playable(index)) clear.add(index); };
    const addRow = (row, radius = 0) => {
      for (let r = Math.max(0, row - radius); r <= Math.min(SIZE - 1, row + radius); r++) {
        for (let c = 0; c < SIZE; c++) add(r * SIZE + c);
      }
    };
    const addCol = (col, radius = 0) => {
      for (let c = Math.max(0, col - radius); c <= Math.min(SIZE - 1, col + radius); c++) {
        for (let r = 0; r < SIZE; r++) add(r * SIZE + c);
      }
    };
    const addArea = (index, radius) => areaAround(index, radius).forEach(add);
    const addRandom = (count) => {
      const choices = board.map((item, index) => ({ item, index })).filter(({ item, index }) => item && !item.blocked && !clear.has(index));
      for (let i = choices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [choices[i], choices[j]] = [choices[j], choices[i]];
      }
      choices.slice(0, count).forEach(({ index }) => add(index));
    };

    add(a);
    add(b);
    if (pa === "rainbow" && pb === "rainbow") {
      board.forEach((_, index) => add(index));
      return { clear, kind: "aurora", label: "皇家極光！全棋盤淨化！" };
    }
    if (pa === "rainbow" || pb === "rainbow") {
      const otherIndex = pa === "rainbow" ? b : a;
      const type = board[otherIndex].type;
      board.forEach((item, index) => { if (!item?.blocked && item?.type === type) add(index); });
      addRandom(12);
      return { clear, kind: "rainbow", label: "彩虹共鳴！雙色星雨！" };
    }
    if (pa === "seal" || pb === "seal") {
      addRandom(pa === "seal" && pb === "seal" ? 18 : 11);
      return { clear, kind: "fairy", label: pa === pb ? "飛碟編隊！十八次空中突襲！" : "飛碟共鳴！鎖定多個目標！" };
    }
    if (pa === "bomb" && pb === "bomb") {
      addArea(a, 2);
      addArea(b, 2);
      return { clear, kind: "nova", label: "玫瑰超新星！雙重 5×5 爆破！" };
    }
    if (pa === "bomb" || pb === "bomb") {
      const linePower = pa === "bomb" ? pb : pa;
      const bombIndex = pa === "bomb" ? a : b;
      if (linePower === "col") addCol(bombIndex % SIZE, 1);
      else addRow(Math.floor(bombIndex / SIZE), 1);
      addArea(bombIndex, 1);
      return { clear, kind: "cannon", label: "玫瑰光炮！三排華麗連擊！" };
    }
    if ((pa === "row" && pb === "col") || (pa === "col" && pb === "row")) {
      addRow(Math.floor(a / SIZE), 1);
      addCol(b % SIZE, 1);
      return { clear, kind: "cross", label: "王國十字光！三橫三直！" };
    }
    if (pa === "row" && pb === "row") {
      addRow(Math.floor((Math.floor(a / SIZE) + Math.floor(b / SIZE)) / 2), 1);
      return { clear, kind: "waves", label: "雙翼星河！三橫排齊射！" };
    }
    addCol(Math.floor(((a % SIZE) + (b % SIZE)) / 2), 1);
    return { clear, kind: "waves", label: "雙重星瀑！三直排降臨！" };
  }

  async function activatePower(index) {
    locked = true;
    level.moves--;
    showEffect(POWER_LABEL[board[index].power] || "魔法啟動！");
    await clearCells(new Set([index]), new Map());
    await resolveMatches(findMatches());
    await finishAction(true);
  }

  function findMatches(source = board) {
    const groups = [];
    for (let r = 0; r < SIZE; r++) {
      let start = 0;
      for (let c = 1; c <= SIZE; c++) {
        const anchor = source[r * SIZE + start];
        const current = c < SIZE ? source[r * SIZE + c] : null;
        const same = Boolean(current && anchor && !current.blocked && !anchor.blocked && current.type !== undefined && current.type === anchor.type && current.power !== "rainbow" && anchor.power !== "rainbow");
        if (!same) {
          if (c - start >= 3 && anchor && !anchor.blocked && anchor.type !== undefined && anchor.power !== "rainbow") {
            groups.push({ axis: "h", cells: Array.from({ length: c - start }, (_, k) => r * SIZE + start + k) });
          }
          start = c;
        }
      }
    }
    for (let c = 0; c < SIZE; c++) {
      let start = 0;
      for (let r = 1; r <= SIZE; r++) {
        const anchor = source[start * SIZE + c];
        const current = r < SIZE ? source[r * SIZE + c] : null;
        const same = Boolean(current && anchor && !current.blocked && !anchor.blocked && current.type !== undefined && current.type === anchor.type && current.power !== "rainbow" && anchor.power !== "rainbow");
        if (!same) {
          if (r - start >= 3 && anchor && !anchor.blocked && anchor.type !== undefined && anchor.power !== "rainbow") {
            groups.push({ axis: "v", cells: Array.from({ length: r - start }, (_, k) => (start + k) * SIZE + c) });
          }
          start = r;
        }
      }
    }
    for (let r = 0; r < SIZE - 1; r++) {
      for (let c = 0; c < SIZE - 1; c++) {
        const start = r * SIZE + c;
        const cells = [start, start + 1, start + SIZE, start + SIZE + 1];
        const type = source[start]?.type;
        if (!source[start]?.blocked && type !== undefined && cells.every((index) => !source[index]?.blocked && source[index]?.type === type && source[index]?.power !== "rainbow")) {
          groups.push({ axis: "box", cells });
        }
      }
    }
    return groups;
  }

  async function resolveMatches(initialGroups, preferred = []) {
    let groups = initialGroups;
    let cascade = 0;
    while (groups.length && cascade < 12) {
      const clear = new Set();
      groups.forEach((group) => group.cells.forEach((i) => clear.add(i)));
      const creations = choosePowerCreations(groups, preferred);
      creations.forEach((_, index) => clear.delete(index));
      if (cascade === 2) {
        level.moves++;
        updateHud();
        showEffect("3 連鎖！獎勵 ＋1 步");
      } else if (creations.size) {
        const powers = [...creations.values()];
        const strongest = powers.includes("rainbow") ? "彩虹王冠誕生！" : powers.includes("bomb") ? "玫瑰炸彈完成！" : powers.includes("seal") ? "星光飛碟完成！" : "皇家火箭完成！";
        showEffect(strongest);
      } else if (cascade >= 1) {
        showEffect(`${cascade + 1} 連鎖！`);
      }
      await clearCells(clear, creations);
      groups = findMatches();
      preferred = [];
      cascade++;
    }
  }

  function choosePowerCreations(groups, preferred) {
    const creations = new Map();
    const horizontal = groups.filter((g) => g.axis === "h");
    const vertical = groups.filter((g) => g.axis === "v");
    horizontal.forEach((h) => {
      vertical.forEach((v) => {
        const cross = h.cells.find((i) => v.cells.includes(i));
        if (cross !== undefined) creations.set(cross, "bomb");
      });
    });
    const claimedBoxes = new Set();
    groups.filter((group) => group.axis === "box").forEach((group) => {
      if (group.cells.some((index) => claimedBoxes.has(index))) return;
      const chosen = preferred.find((index) => group.cells.includes(index)) ?? group.cells[0];
      group.cells.forEach((index) => claimedBoxes.add(index));
      if (!creations.has(chosen)) creations.set(chosen, "seal");
    });
    groups.forEach((group) => {
      if (group.axis === "box" || group.cells.length < 4) return;
      const chosen = preferred.find((i) => group.cells.includes(i)) ?? group.cells[Math.floor(group.cells.length / 2)];
      if (creations.get(chosen) === "bomb") return;
      creations.set(chosen, group.cells.length >= 5 ? "rainbow" : group.axis === "h" ? "row" : "col");
    });
    return creations;
  }

  function expandPowerClear(seed, ufoTargets = new Map()) {
    const clear = new Set([...seed].filter((index) => board[index] && !board[index].blocked));
    const queue = [...clear];
    const seen = new Set();
    while (queue.length) {
      const index = queue.shift();
      if (seen.has(index) || !board[index]) continue;
      seen.add(index);
      const item = board[index];
      const add = (i) => {
        if (i >= 0 && i < board.length && board[i] && !board[i].blocked && !clear.has(i)) {
          clear.add(i);
          queue.push(i);
        }
      };
      if (item.power === "row") {
        const row = Math.floor(index / SIZE);
        for (let c = 0; c < SIZE; c++) add(row * SIZE + c);
      } else if (item.power === "col") {
        const col = index % SIZE;
        for (let r = 0; r < SIZE; r++) add(r * SIZE + col);
      } else if (item.power === "bomb") {
        const row = Math.floor(index / SIZE), col = index % SIZE;
        for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
          const nr = row + dr, nc = col + dc;
          if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE) add(nr * SIZE + nc);
        }
      } else if (item.power === "rainbow") {
        const counts = new Array(TILES.length).fill(0);
        board.forEach((candidate) => { if (candidate && candidate.type >= 0) counts[candidate.type]++; });
        const common = counts.indexOf(Math.max(...counts));
        board.forEach((candidate, i) => { if (candidate?.type === common) add(i); });
      } else if (item.power === "seal") {
        const candidates = [];
        board.forEach((candidate, i) => {
          if (candidate && !candidate.blocked && i !== index && !clear.has(i)) candidates.push(i);
        });
        if (candidates.length) {
          const target = candidates[Math.floor(Math.random() * candidates.length)];
          ufoTargets.set(index, target);
          add(target);
        }
      }
    }
    return clear;
  }

  async function clearCells(seed, creations, staggerPowers = false) {
    if (!seed.size && !creations.size) return;
    const ufoTargets = new Map();
    const clear = expandPowerClear(seed, ufoTargets);
    creations.forEach((power, index) => playPowerFx(index, power, true));
    const powered = [...clear].filter((index) => board[index]?.power);
    powered.forEach((index, order) => {
      const launch = () => playPowerFx(index, board[index]?.power, false, ufoTargets.get(index));
      if (staggerPowers) window.setTimeout(launch, order * 190);
      else launch();
    });
    const powerCount = powered.length;
    applyImpact(clear, powerCount);
    if (staggerPowers && powerCount) {
      await wait(330 + (powerCount - 1) * 190);
      clear.forEach((index) => els.board.children[index]?.classList.add("clearing"));
      await wait(190);
    } else {
      if (powerCount) await wait(360);
      clear.forEach((index) => els.board.children[index]?.classList.add("clearing"));
      await wait(powerCount ? 140 : 190);
    }
    clear.forEach((index) => { board[index] = null; });
    creations.forEach((power, index) => {
      const old = board[index];
      board[index] = tile(power === "rainbow" ? 0 : (old?.type ?? randomType()), power);
    });
    collapseBoard();
    if (clear.size >= 9 && creations.size === 0) grantPrincessBlessing();
    renderBoard();
    updateHud();
    await wait(145);
  }

  function grantPrincessBlessing() {
    const candidates = [];
    board.forEach((item, index) => { if (item && !item.blocked && !item.power) candidates.push(index); });
    if (!candidates.length) return;
    const index = candidates[Math.floor(Math.random() * candidates.length)];
    const powers = ["row", "col", "bomb", "seal"];
    const power = powers[Math.floor(Math.random() * powers.length)];
    board[index] = tile(board[index].type, power);
    showEffect("公主祝福！贈送特殊圖案");
  }

  function applyImpact(clear, powerCount) {
    if (level.isBoss) {
      const damage = clear.size + powerCount * 4;
      level.bossHp = Math.max(0, level.bossHp - damage);
    } else {
      let collected = 0;
      clear.forEach((index) => { if (board[index]?.type === level.targetType) collected++; });
      level.remaining = Math.max(0, level.remaining - collected);
    }
  }

  function collapseBoard() {
    for (let c = 0; c < SIZE; c++) {
      let end = SIZE - 1;
      while (end >= 0) {
        if (board[end * SIZE + c]?.blocked) {
          end--;
          continue;
        }
        let start = end;
        while (start >= 0 && !board[start * SIZE + c]?.blocked) start--;
        const pieces = [];
        for (let r = end; r > start; r--) {
          const item = board[r * SIZE + c];
          if (item && !item.blocked) pieces.push(item);
        }
        for (let r = end, i = 0; r > start; r--, i++) {
          board[r * SIZE + c] = pieces[i] || tile();
        }
        end = start - 1;
      }
    }
  }

  async function finishAction(chargePet) {
    if (chargePet) {
      const charge = level.isEvent && level.eventName === "月光寶藏" ? 2 : 1;
      level.pet = Math.min(5, level.pet + charge);
    }
    updateHud();
    if (checkWon()) return winLevel();
    if (level.pet >= 5) {
      level.pet = 0;
      updateHud();
      showEffect("米露施放星光爪！");
      const target = choosePetTarget();
      playPetFx(target);
      await wait(360);
      const clear = areaAround(target, 1);
      await clearCells(clear, new Map());
      await resolveMatches(findMatches());
      if (checkWon()) return winLevel();
    }
    updateHud();
    if (level.moves <= 0) return loseLevel();
    locked = false;
  }

  function choosePetTarget() {
    if (!level.isBoss) {
      const targets = [];
      board.forEach((item, i) => { if (!item?.blocked && item?.type === level.targetType) targets.push(i); });
      if (targets.length) return targets[Math.floor(Math.random() * targets.length)];
    }
    const playable = [];
    board.forEach((item, index) => { if (item && !item.blocked) playable.push(index); });
    return playable[Math.floor(Math.random() * playable.length)];
  }

  function checkWon() {
    return level.isBoss ? level.bossHp <= 0 : level.remaining <= 0;
  }

  function winLevel() {
    if (level.won) return;
    level.won = true;
    locked = true;
    const reward = level.isEvent ? 8 : level.isBoss ? 6 : 3;
    if (level.isEvent) state.eventWins++;
    else state.level++;
    state.potions += reward;
    state.stars++;
    saveState();
    els.resultIcon.textContent = level.isEvent ? "❀" : level.isBoss ? "♛" : "✦";
    els.resultKicker.textContent = level.isEvent ? "每日活動完成" : level.isBoss ? "黑霧已淨化" : "魔法完成";
    els.resultTitle.textContent = level.isEvent ? `${level.eventName}完成！` : level.isBoss ? `${state.princess}公主守護了王國！` : "王國更明亮了！";
    els.resultCopy.textContent = level.isEvent ? `獲得 ${reward} 滴活動魔法露，明天還會換上新活動。` : `你獲得 ${reward} 滴魔法露，可以回到王國修復新的設施。`;
    els.resultPrimary.textContent = "返回王國";
    els.resultPrimary.onclick = showHome;
    els.resultSecondary.hidden = true;
    window.setTimeout(() => { els.modal.hidden = false; }, 260);
  }

  function loseLevel() {
    locked = true;
    els.resultIcon.textContent = "☾";
    els.resultKicker.textContent = "魔法需要再聚集一次";
    els.resultTitle.textContent = "差一點就成功了！";
    els.resultCopy.textContent = "不用等待體力，也不會失去任何道具，可以立刻重新挑戰。";
    els.resultPrimary.textContent = "重新挑戰";
    els.resultPrimary.onclick = level.isEvent ? startEvent : startLevel;
    els.resultSecondary.textContent = "返回王國";
    els.resultSecondary.hidden = false;
    els.resultSecondary.onclick = showHome;
    els.modal.hidden = false;
  }

  function selectTargetTool(name) {
    if (locked || !level || level.tools[name] <= 0) return;
    toolMode = toolMode === name ? null : name;
    selected = null;
    clearToolSelection(false);
    const button = name === "wand" ? els.wandBtn : els.roseBtn;
    button.classList.toggle("active", toolMode === name);
    button.setAttribute("aria-pressed", String(toolMode === name));
    els.toolHint.textContent = toolMode === "rose" ? "點選位置，玫瑰花瓣會落在九宮格" : toolMode === "wand" ? "點選寶石，魔杖會飛到目標消除" : "飛碟、皇家火箭與玫瑰炸彈可互換連續引爆";
    renderBoard();
  }

  function clearToolSelection(resetMode = true) {
    if (resetMode) toolMode = null;
    [els.wandBtn, els.roseBtn].forEach((button) => {
      button.classList.remove("active");
      button.setAttribute("aria-pressed", "false");
    });
    els.toolHint.textContent = "飛碟、皇家火箭與玫瑰炸彈可互換連續引爆";
  }

  function areaAround(index, radius) {
    const row = Math.floor(index / SIZE), col = index % SIZE;
    const clear = new Set();
    for (let dr = -radius; dr <= radius; dr++) for (let dc = -radius; dc <= radius; dc++) {
      const nr = row + dr, nc = col + dc;
      const next = nr * SIZE + nc;
      if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE && board[next] && !board[next].blocked) clear.add(next);
    }
    return clear;
  }

  async function useShuffle() {
    if (locked || !level || level.tools.shuffle <= 0) return;
    locked = true;
    spendTool("shuffle");
    clearToolSelection();
    showEffect("精靈洗牌！");
    playToolFx("shuffle");
    for (let attempt = 0; attempt < 24; attempt++) {
      shufflePlayableBoard();
      if (!findMatches().length) break;
    }
    renderBoard();
    updateHud();
    await wait(360);
    await resolveMatches(findMatches());
    await finishAction(false);
  }

  function shufflePlayableBoard() {
    const slots = [];
    const pieces = [];
    board.forEach((item, index) => {
      if (item && !item.blocked) {
        slots.push(index);
        pieces.push(item);
      }
    });
    for (let i = pieces.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pieces[i], pieces[j]] = [pieces[j], pieces[i]];
    }
    slots.forEach((index, i) => { board[index] = pieces[i]; });
  }

  function useHourglass() {
    if (locked || !level || level.tools.hourglass <= 0) return;
    spendTool("hourglass");
    level.moves += 5;
    clearToolSelection();
    updateHud();
    showEffect("時光回溯 ＋5 步！");
    playToolFx("hourglass");
  }

  function showEffect(message) {
    els.effectBanner.textContent = message;
    els.effectBanner.classList.remove("show");
    void els.effectBanner.offsetWidth;
    els.effectBanner.classList.add("show");
  }

  function playPowerFx(index, power, creation = false, targetIndex = null) {
    const tileNode = els.board.children[index];
    const shell = els.board.parentElement;
    if (!tileNode || !shell) return;
    if (!creation && (power === "row" || power === "col")) return playRoyalRocketFx(index, power);
    if (!creation && power === "bomb") return playPrincessBombFx(index);
    if (!creation && power === "seal" && targetIndex !== null) return playUfoFx(index, targetIndex);
    const tileRect = tileNode.getBoundingClientRect();
    const shellRect = shell.getBoundingClientRect();
    const fx = document.createElement("div");
    fx.className = `power-burst fx-${power}${creation ? " fx-create" : " fx-activate"}`;
    fx.setAttribute("aria-hidden", "true");
    fx.style.left = `${tileRect.left - shellRect.left + tileRect.width / 2}px`;
    fx.style.top = `${tileRect.top - shellRect.top + tileRect.height / 2}px`;
    const beam = document.createElement("i");
    beam.className = "power-beam";
    const core = document.createElement("i");
    core.className = "power-core";
    fx.append(beam, core);
    const sparkCount = creation ? 7 : 11;
    for (let i = 0; i < sparkCount; i++) {
      const spark = document.createElement("span");
      spark.className = "magic-spark";
      spark.style.setProperty("--angle", `${i * (360 / sparkCount)}deg`);
      spark.style.setProperty("--distance", `${creation ? 34 + (i % 4) * 9 : 52 + (i % 5) * 15}px`);
      spark.style.setProperty("--delay", `${(i % 5) * 18}ms`);
      fx.append(spark);
    }
    if (!creation) {
      const flash = document.createElement("div");
      flash.className = `magic-screen-flash flash-${power}`;
      flash.setAttribute("aria-hidden", "true");
      shell.append(flash);
      els.board.classList.remove("magic-impact");
      void els.board.offsetWidth;
      els.board.classList.add("magic-impact");
      window.setTimeout(() => {
        flash.remove();
        els.board.classList.remove("magic-impact");
      }, 900);
    }
    shell.append(fx);
    window.setTimeout(() => fx.remove(), creation ? 900 : 1250);
  }

  function playRoyalRocketFx(index, power) {
    const tileNode = els.board.children[index];
    const shell = els.board.parentElement;
    if (!tileNode || !shell) return;
    const tileRect = tileNode.getBoundingClientRect();
    const shellRect = shell.getBoundingClientRect();
    const volley = document.createElement("div");
    volley.className = `rocket-volley rocket-${power}`;
    volley.setAttribute("aria-hidden", "true");
    volley.style.left = `${tileRect.left - shellRect.left + tileRect.width / 2}px`;
    volley.style.top = `${tileRect.top - shellRect.top + tileRect.height / 2}px`;
    for (let i = 0; i < 3; i++) {
      const rocket = document.createElement("span");
      rocket.className = "royal-rocket";
      rocket.textContent = "🚀";
      rocket.style.setProperty("--delay", `${i * 95}ms`);
      rocket.style.setProperty("--lane", `${(i - 1) * 9}px`);
      volley.append(rocket);
    }
    const crown = document.createElement("i");
    crown.className = "rocket-crown";
    crown.textContent = "♛";
    volley.append(crown);
    shell.append(volley);
    els.board.classList.add("royal-impact");
    window.setTimeout(() => {
      volley.remove();
      els.board.classList.remove("royal-impact");
    }, 720);
  }

  function playPrincessBombFx(index) {
    const tileNode = els.board.children[index];
    const shell = els.board.parentElement;
    if (!tileNode || !shell) return;
    const tileRect = tileNode.getBoundingClientRect();
    const shellRect = shell.getBoundingClientRect();
    const fx = document.createElement("div");
    fx.className = "princess-bomb-fx";
    fx.setAttribute("aria-hidden", "true");
    fx.style.left = `${tileRect.left - shellRect.left + tileRect.width / 2}px`;
    fx.style.top = `${tileRect.top - shellRect.top + tileRect.height / 2}px`;
    const bomb = document.createElement("span");
    bomb.className = "bomb-icon";
    bomb.textContent = "💣";
    const wave = document.createElement("i");
    wave.className = "bomb-wave";
    fx.append(bomb, wave);
    for (let i = 0; i < 10; i++) {
      const petal = document.createElement("b");
      petal.className = "bomb-petal";
      petal.textContent = i % 2 ? "✦" : "🌹";
      petal.style.setProperty("--angle", `${i * 36}deg`);
      fx.append(petal);
    }
    shell.append(fx);
    els.board.classList.add("royal-impact");
    window.setTimeout(() => {
      fx.remove();
      els.board.classList.remove("royal-impact");
    }, 760);
  }

  function playUfoFx(fromIndex, targetIndex) {
    const from = els.board.children[fromIndex];
    const target = els.board.children[targetIndex];
    const shell = els.board.parentElement;
    if (!from || !target || !shell) return;
    const one = from.getBoundingClientRect();
    const two = target.getBoundingClientRect();
    const shellRect = shell.getBoundingClientRect();
    const flight = document.createElement("div");
    flight.className = "ufo-flight";
    flight.setAttribute("aria-hidden", "true");
    flight.textContent = "🛸";
    flight.style.left = `${one.left - shellRect.left + one.width / 2}px`;
    flight.style.top = `${one.top - shellRect.top + one.height / 2}px`;
    flight.style.setProperty("--dx", `${two.left - one.left + (two.width - one.width) / 2}px`);
    flight.style.setProperty("--dy", `${two.top - one.top + (two.height - one.height) / 2}px`);
    target.classList.add("ufo-target");
    shell.append(flight);
    window.setTimeout(() => {
      flight.remove();
      target.classList.remove("ufo-target");
    }, 560);
  }

  function playToolFx(name, index = null) {
    const shell = els.board.parentElement;
    if (!shell) return;
    const shellRect = shell.getBoundingClientRect();
    const target = index === null ? els.board : els.board.children[index];
    if (!target) return;
    const rect = target.getBoundingClientRect();
    const fx = document.createElement("div");
    fx.className = `tool-cast tool-${name}`;
    fx.setAttribute("aria-hidden", "true");
    fx.style.left = `${rect.left - shellRect.left + rect.width / 2}px`;
    fx.style.top = `${rect.top - shellRect.top + rect.height / 2}px`;
    const icon = document.createElement("span");
    icon.className = "tool-cast-icon";
    icon.textContent = { wand: "🪄", rose: "🌹", shuffle: "🔄", hourglass: "⏳" }[name];
    fx.append(icon);
    for (let i = 0; i < 8; i++) {
      const particle = document.createElement("i");
      particle.className = "tool-particle";
      particle.textContent = name === "rose" ? "🌸" : "✦";
      particle.style.setProperty("--angle", `${i * 45}deg`);
      particle.style.setProperty("--distance", `${34 + (i % 3) * 12}px`);
      fx.append(particle);
    }
    shell.append(fx);
    if (name === "shuffle") els.board.classList.add("tool-shuffling");
    window.setTimeout(() => {
      fx.remove();
      els.board.classList.remove("tool-shuffling");
    }, 720);
  }

  function playPowerComboFx(a, b, kind) {
    const first = els.board.children[a];
    const second = els.board.children[b];
    const shell = els.board.parentElement;
    if (!first || !second || !shell) return;
    const one = first.getBoundingClientRect();
    const two = second.getBoundingClientRect();
    const shellRect = shell.getBoundingClientRect();
    const fx = document.createElement("div");
    fx.className = `combo-burst combo-${kind}`;
    fx.setAttribute("aria-hidden", "true");
    fx.style.left = `${((one.left + one.width / 2) + (two.left + two.width / 2)) / 2 - shellRect.left}px`;
    fx.style.top = `${((one.top + one.height / 2) + (two.top + two.height / 2)) / 2 - shellRect.top}px`;
    const ring = document.createElement("i");
    ring.className = "combo-ring";
    const emblem = document.createElement("b");
    emblem.className = "combo-emblem";
    emblem.textContent = kind === "fairy" ? "🛸" : kind === "nova" ? "💣" : "♛";
    fx.append(ring, emblem);
    for (let i = 0; i < 18; i++) {
      const star = document.createElement("span");
      star.className = "combo-star";
      star.textContent = i % 3 === 0 ? "✦" : "•";
      star.style.setProperty("--angle", `${i * 20}deg`);
      star.style.setProperty("--distance", `${62 + (i % 5) * 15}px`);
      star.style.setProperty("--delay", `${(i % 6) * 24}ms`);
      fx.append(star);
    }
    const flash = document.createElement("div");
    flash.className = `combo-screen combo-screen-${kind}`;
    flash.setAttribute("aria-hidden", "true");
    shell.append(flash, fx);
    els.board.classList.remove("combo-impact");
    void els.board.offsetWidth;
    els.board.classList.add("combo-impact");
    window.setTimeout(() => {
      fx.remove();
      flash.remove();
      els.board.classList.remove("combo-impact");
    }, 1450);
  }

  function playPetFx(index) {
    const tileNode = els.board.children[index];
    const shell = els.board.parentElement;
    if (!tileNode || !shell) return;
    const tileRect = tileNode.getBoundingClientRect();
    const shellRect = shell.getBoundingClientRect();
    const fx = document.createElement("div");
    fx.className = "pet-cast";
    fx.setAttribute("aria-hidden", "true");
    fx.style.left = `${tileRect.left - shellRect.left + tileRect.width / 2}px`;
    fx.style.top = `${tileRect.top - shellRect.top + tileRect.height / 2}px`;
    const avatar = document.createElement("span");
    avatar.className = "pet-cast-avatar";
    avatar.textContent = "🐱";
    fx.append(avatar);
    for (let i = 0; i < 7; i++) {
      const paw = document.createElement("i");
      paw.className = "pet-paw";
      paw.textContent = "🐾";
      paw.style.setProperty("--x", `${-76 + i * 24}px`);
      paw.style.setProperty("--y", `${(i % 2 ? -1 : 1) * (18 + (i % 3) * 7)}px`);
      paw.style.setProperty("--delay", `${i * 45}ms`);
      fx.append(paw);
    }
    shell.append(fx);
    window.setTimeout(() => fx.remove(), 1250);
  }

  function showToast(message) {
    window.clearTimeout(toastTimer);
    els.toast.textContent = message;
    els.toast.classList.add("show");
    toastTimer = window.setTimeout(() => els.toast.classList.remove("show"), 1900);
  }

  function wait(ms) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
  }

  els.board.addEventListener("click", (event) => {
    const tileNode = event.target.closest(".tile");
    if (tileNode) handleTile(Number(tileNode.dataset.index));
  });
  $("playBtn").addEventListener("click", startLevel);
  els.eventBtn.addEventListener("click", startEvent);
  $("backBtn").addEventListener("click", showHome);
  $("renameBtn").addEventListener("click", renamePrincess);
  els.buildBtn.addEventListener("click", buildDistrict);
  els.wandBtn.addEventListener("click", () => selectTargetTool("wand"));
  els.roseBtn.addEventListener("click", () => selectTargetTool("rose"));
  els.shuffleBtn.addEventListener("click", useShuffle);
  els.hourglassBtn.addEventListener("click", useHourglass);

  updateHome();

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
  }
})();
