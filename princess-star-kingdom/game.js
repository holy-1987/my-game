(() => {
  "use strict";

  const SIZE = 8;
  const SAVE_KEY = "princess-star-kingdom-v1";
  const POWER_LABEL = { row: "藍晶飛翼", col: "金色星瀑", bomb: "玫瑰盛放", rainbow: "彩虹王冠" };
  const TILES = [
    { symbol: "◆", name: "藍寶石", color: "blue" },
    { symbol: "♥", name: "玫瑰心", color: "rose" },
    { symbol: "♛", name: "金皇冠", color: "gold" },
    { symbol: "●", name: "翡翠珠", color: "green" },
    { symbol: "✦", name: "紫星晶", color: "violet" },
    { symbol: "❀", name: "珊瑚花", color: "coral" }
  ];
  const DISTRICTS = [
    { name: "玫瑰拱門", icon: "❀", cost: 3 },
    { name: "水晶噴泉", icon: "♢", cost: 5 },
    { name: "白貓小屋", icon: "♜", cost: 7 },
    { name: "星光花圃", icon: "✦", cost: 9 },
    { name: "皇家茶亭", icon: "♨", cost: 11 },
    { name: "晨曦宮殿", icon: "♛", cost: 14 }
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
    bossHpText: $("bossHpText"), bossHpBar: $("bossHpBar"), petCharge: $("petCharge"),
    wandBtn: $("wandBtn"), wandCount: $("wandCount"), roseBtn: $("roseBtn"),
    roseCount: $("roseCount"), shuffleBtn: $("shuffleBtn"), shuffleCount: $("shuffleCount"),
    hourglassBtn: $("hourglassBtn"), hourglassCount: $("hourglassCount"), toolHint: $("toolHint"),
    effectBanner: $("effectBanner"),
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
  let uid = 0;

  function loadState() {
    const fallback = { princess: "星華", level: 1, potions: 0, stars: 0, built: 0 };
    try {
      const parsed = JSON.parse(localStorage.getItem(SAVE_KEY));
      if (!parsed || typeof parsed !== "object") return fallback;
      return {
        princess: typeof parsed.princess === "string" && parsed.princess.trim() ? parsed.princess.slice(0, 6) : fallback.princess,
        level: Math.max(1, Number(parsed.level) || 1),
        potions: Math.max(0, Number(parsed.potions) || 0),
        stars: Math.max(0, Number(parsed.stars) || 0),
        built: Math.min(DISTRICTS.length, Math.max(0, Number(parsed.built) || 0))
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

  function makeLevel(number) {
    const isBoss = number % 5 === 0;
    const targetType = (number + 1) % TILES.length;
    const moves = isBoss ? 29 + Math.min(5, Math.floor(number / 10)) : 25 + (number % 3);
    const target = Math.min(38, 11 + Math.floor(number * 1.25));
    const bossMax = 48 + number * 4;
    return {
      number, isBoss, targetType, target, remaining: target,
      bossMax, bossHp: bossMax, moves, pet: 0,
      tools: { wand: 2, rose: 1, shuffle: 1, hourglass: 1 }, won: false
    };
  }

  function buildFreshBoard() {
    const fresh = new Array(SIZE * SIZE);
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        let type;
        let tries = 0;
        do {
          type = randomType();
          tries++;
        } while (tries < 20 && (
          (c >= 2 && fresh[r * SIZE + c - 1]?.type === type && fresh[r * SIZE + c - 2]?.type === type) ||
          (r >= 2 && fresh[(r - 1) * SIZE + c]?.type === type && fresh[(r - 2) * SIZE + c]?.type === type)
        ));
        fresh[r * SIZE + c] = tile(type);
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
    const pct = Math.round((state.built / DISTRICTS.length) * 100);
    els.progress.style.width = `${pct}%`;
    els.progressText.textContent = `${state.built} / ${DISTRICTS.length} 座設施已修復`;
    els.districtPath.replaceChildren();
    DISTRICTS.forEach((district, index) => {
      const node = document.createElement("div");
      node.className = `district${index < state.built ? " done" : ""}${index === state.built ? " current" : ""}`;
      node.textContent = district.icon;
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
    state.built++;
    saveState();
    updateHome();
    showToast(`${next.name}修復完成！`);
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

  function startLevel() {
    level = makeLevel(state.level);
    board = buildFreshBoard();
    selected = null;
    locked = false;
    toolMode = null;
    clearToolSelection();
    showGame();
    updateHud();
    renderBoard();
    showEffect(level.isBoss ? "黑霧來襲！" : "開始冒險！");
  }

  function updateHud() {
    els.gameLevel.textContent = level.number;
    els.moves.textContent = level.moves;
    els.levelKind.textContent = level.isBoss ? "王國淨化戰" : "花園關卡";
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
    els.wandCount.textContent = level.tools.wand;
    els.roseCount.textContent = level.tools.rose;
    els.shuffleCount.textContent = level.tools.shuffle;
    els.hourglassCount.textContent = level.tools.hourglass;
    els.wandBtn.disabled = level.tools.wand <= 0;
    els.roseBtn.disabled = level.tools.rose <= 0;
    els.shuffleBtn.disabled = level.tools.shuffle <= 0;
    els.hourglassBtn.disabled = level.tools.hourglass <= 0;
  }

  function renderBoard() {
    const fragment = document.createDocumentFragment();
    board.forEach((item, index) => {
      const button = document.createElement("button");
      const info = item.power === "rainbow" ? { symbol: "✦", name: "彩虹星球" } : TILES[item.type];
      button.type = "button";
      button.className = "tile";
      button.dataset.index = index;
      button.dataset.type = item.type;
      button.setAttribute("role", "gridcell");
      button.setAttribute("aria-label", `${info.name}${item.power ? `，${POWER_LABEL[item.power]}` : ""}`);
      button.textContent = item.power ? "" : info.symbol;
      if (selected === index) button.classList.add("selected");
      if (item.power) button.classList.add("power", `power-${item.power}`);
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
    if (toolMode && (toolMode === "wand" || toolMode === "rose")) {
      locked = true;
      const activeTool = toolMode;
      level.tools[activeTool]--;
      clearToolSelection();
      const clear = activeTool === "rose" ? areaAround(index, 1) : new Set([index]);
      showEffect(activeTool === "rose" ? "玫瑰花雨！" : "星光魔杖！");
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
        const same = c < SIZE && source[r * SIZE + c]?.type === source[r * SIZE + start]?.type && source[r * SIZE + c]?.power !== "rainbow";
        if (!same) {
          if (c - start >= 3 && source[r * SIZE + start]?.power !== "rainbow") {
            groups.push({ axis: "h", cells: Array.from({ length: c - start }, (_, k) => r * SIZE + start + k) });
          }
          start = c;
        }
      }
    }
    for (let c = 0; c < SIZE; c++) {
      let start = 0;
      for (let r = 1; r <= SIZE; r++) {
        const same = r < SIZE && source[r * SIZE + c]?.type === source[start * SIZE + c]?.type && source[r * SIZE + c]?.power !== "rainbow";
        if (!same) {
          if (r - start >= 3 && source[start * SIZE + c]?.power !== "rainbow") {
            groups.push({ axis: "v", cells: Array.from({ length: r - start }, (_, k) => (start + k) * SIZE + c) });
          }
          start = r;
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
      if (creations.size) {
        const strongest = [...creations.values()].includes("rainbow") ? "彩虹星球！" : [...creations.values()].includes("bomb") ? "玫瑰爆破！" : "星光飛箭！";
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
    groups.forEach((group) => {
      if (group.cells.length < 4) return;
      const chosen = preferred.find((i) => group.cells.includes(i)) ?? group.cells[Math.floor(group.cells.length / 2)];
      if (creations.get(chosen) === "bomb") return;
      creations.set(chosen, group.cells.length >= 5 ? "rainbow" : group.axis === "h" ? "row" : "col");
    });
    return creations;
  }

  function expandPowerClear(seed) {
    const clear = new Set(seed);
    const queue = [...clear];
    const seen = new Set();
    while (queue.length) {
      const index = queue.shift();
      if (seen.has(index) || !board[index]) continue;
      seen.add(index);
      const item = board[index];
      const add = (i) => {
        if (i >= 0 && i < board.length && !clear.has(i)) {
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
      }
    }
    return clear;
  }

  async function clearCells(seed, creations) {
    if (!seed.size && !creations.size) return;
    const clear = expandPowerClear(seed);
    let powerCount = 0;
    clear.forEach((index) => { if (board[index]?.power) powerCount++; });
    applyImpact(clear, powerCount);
    clear.forEach((index) => els.board.children[index]?.classList.add("clearing"));
    await wait(190);
    clear.forEach((index) => { board[index] = null; });
    creations.forEach((power, index) => {
      const old = board[index];
      board[index] = tile(power === "rainbow" ? 0 : (old?.type ?? randomType()), power);
    });
    collapseBoard();
    renderBoard();
    updateHud();
    await wait(145);
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
      const column = [];
      for (let r = SIZE - 1; r >= 0; r--) {
        const item = board[r * SIZE + c];
        if (item) column.push(item);
      }
      for (let r = SIZE - 1, i = 0; r >= 0; r--, i++) {
        board[r * SIZE + c] = column[i] || tile();
      }
    }
  }

  async function finishAction(chargePet) {
    if (chargePet) level.pet = Math.min(5, level.pet + 1);
    updateHud();
    if (checkWon()) return winLevel();
    if (level.pet >= 5) {
      level.pet = 0;
      updateHud();
      showEffect("米露出動！");
      const target = choosePetTarget();
      const row = Math.floor(target / SIZE), col = target % SIZE;
      const clear = new Set([target]);
      [[-1,0],[1,0],[0,-1],[0,1]].forEach(([dr, dc]) => {
        const nr = row + dr, nc = col + dc;
        if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE) clear.add(nr * SIZE + nc);
      });
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
      board.forEach((item, i) => { if (item.type === level.targetType) targets.push(i); });
      if (targets.length) return targets[Math.floor(Math.random() * targets.length)];
    }
    return Math.floor(Math.random() * board.length);
  }

  function checkWon() {
    return level.isBoss ? level.bossHp <= 0 : level.remaining <= 0;
  }

  function winLevel() {
    if (level.won) return;
    level.won = true;
    locked = true;
    const reward = level.isBoss ? 6 : 3;
    state.level++;
    state.potions += reward;
    state.stars++;
    saveState();
    els.resultIcon.textContent = level.isBoss ? "♛" : "✦";
    els.resultKicker.textContent = level.isBoss ? "黑霧已淨化" : "魔法完成";
    els.resultTitle.textContent = level.isBoss ? `${state.princess}公主守護了王國！` : "王國更明亮了！";
    els.resultCopy.textContent = `你獲得 ${reward} 滴魔法露，可以回到王國修復新的設施。`;
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
    els.resultPrimary.onclick = startLevel;
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
    els.toolHint.textContent = toolMode === "rose" ? "點選棋盤位置，消除周圍九宮格" : toolMode === "wand" ? "點選一顆想直接消除的寶石" : "交換相鄰寶石；四顆以上可召喚專屬魔法道具";
    renderBoard();
  }

  function clearToolSelection(resetMode = true) {
    if (resetMode) toolMode = null;
    [els.wandBtn, els.roseBtn].forEach((button) => {
      button.classList.remove("active");
      button.setAttribute("aria-pressed", "false");
    });
    els.toolHint.textContent = "交換相鄰寶石；四顆以上可召喚專屬魔法道具";
  }

  function areaAround(index, radius) {
    const row = Math.floor(index / SIZE), col = index % SIZE;
    const clear = new Set();
    for (let dr = -radius; dr <= radius; dr++) for (let dc = -radius; dc <= radius; dc++) {
      const nr = row + dr, nc = col + dc;
      if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE) clear.add(nr * SIZE + nc);
    }
    return clear;
  }

  async function useShuffle() {
    if (locked || !level || level.tools.shuffle <= 0) return;
    locked = true;
    level.tools.shuffle--;
    clearToolSelection();
    showEffect("精靈洗牌！");
    for (let attempt = 0; attempt < 24; attempt++) {
      for (let i = board.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [board[i], board[j]] = [board[j], board[i]];
      }
      if (!findMatches().length) break;
    }
    renderBoard();
    updateHud();
    await wait(360);
    await resolveMatches(findMatches());
    await finishAction(false);
  }

  function useHourglass() {
    if (locked || !level || level.tools.hourglass <= 0) return;
    level.tools.hourglass--;
    level.moves += 5;
    clearToolSelection();
    updateHud();
    showEffect("時光回溯 ＋5 步！");
  }

  function showEffect(message) {
    els.effectBanner.textContent = message;
    els.effectBanner.classList.remove("show");
    void els.effectBanner.offsetWidth;
    els.effectBanner.classList.add("show");
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
