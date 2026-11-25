(() => {
  const rewardStorageKey = 'moss-microscape-water-drops';
  const legacyRewardStorageKey = 'moss-microscape-wallet';
  const collectionStorageKey = 'moss-microscape-collection';
  const reveal = document.getElementById('scratchReveal');
  const progressLabel = document.getElementById('scratchPercent');
  const progressBar = document.getElementById('scratchBar');
  const prizeTier = document.getElementById('prizeTier');
  const prizeArt = document.getElementById('prizeArt');
  const prizeTitle = document.getElementById('prizeTitle');
  const prizeDescription = document.getElementById('prizeDescription');
  const prizeLink = document.getElementById('prizeLink');
  const prizeAgain = document.getElementById('prizeAgain');
  const clearButton = document.getElementById('clearGarden');
  const cellSize = 22;
  let cols = 0;
  let rows = 0;
  let covered;
  let coveredCount = 0;
  let processedStampCount = 0;
  let scratchSessionId = createSessionId();
  let rewardClaimed = false;

  function createSessionId() {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
  }
  try {
    const saved = JSON.parse(localStorage.getItem(paintKey) || 'null');
    if (saved?.sessionId) scratchSessionId = saved.sessionId;
    rewardClaimed = Boolean(saved?.rewardClaimed);
  } catch {}

  function resizeCoverage() {
    cols = Math.max(1, Math.ceil(canvas.clientWidth / cellSize));
    rows = Math.max(1, Math.ceil(canvas.clientHeight / cellSize));
    covered = new Uint8Array(cols * rows);
    coveredCount = 0;
    stamps.forEach(markStamp);
    processedStampCount = stamps.length;
    updateProgress();
  }

  function markStamp(stamp) {
    const size = Number(stamp.size) || Number(brushSize.value) || 76;
    const radiusX = Math.max(18, size * 0.42);
    const radiusY = Math.max(12, size * 0.24);
    const minCol = Math.max(0, Math.floor((stamp.x - radiusX) / cellSize));
    const maxCol = Math.min(cols - 1, Math.floor((stamp.x + radiusX) / cellSize));
    const minRow = Math.max(0, Math.floor((stamp.y - radiusY) / cellSize));
    const maxRow = Math.min(rows - 1, Math.floor((stamp.y + radiusY) / cellSize));
    for (let row = minRow; row <= maxRow; row++) {
      for (let col = minCol; col <= maxCol; col++) {
        const dx = (col * cellSize + cellSize / 2 - stamp.x) / radiusX;
        const dy = (row * cellSize + cellSize / 2 - stamp.y) / radiusY;
        const index = row * cols + col;
        if (dx * dx + dy * dy <= 1 && !covered[index]) {
          covered[index] = 1;
          coveredCount++;
        }
      }
    }
  }

  function updateProgress() {
    const total = Math.max(1, cols * rows);
    const percent = Math.min(100, Math.floor((coveredCount / total) * 100));
    progressLabel.textContent = `${percent}%`;
    progressBar.style.width = `${percent}%`;
    if (percent >= 70 && !rewardClaimed) revealReward();
  }

  function processNewStamps() {
    while (processedStampCount < stamps.length) markStamp(stamps[processedStampCount++]);
    updateProgress();
  }

  function selectReward() {
    const roll = Math.random() * 100;
    if (roll < 5) return { tier: 'A', type: 'moss' };
    if (roll < 17) return { tier: 'B', type: 'drops', drops: 500 };
    if (roll < 35) return { tier: 'C', type: 'bottle' };
    if (roll < 60) return { tier: 'D', type: 'stone' };
    return { tier: 'E', type: 'drops', drops: 100 };
  }

  function chooseName(items) {
    return items[Math.floor(Math.random() * items.length)];
  }

  const catalog = {
    moss: ['大羽蘚', '小灰蘚', '白髮苔', '地錢', '扭口苔', '走燈苔', '泥炭苔', '蛇蘚', '萬年蘚'],
    stone: ['大理岩', '石灰岩', '安山岩', '板岩', '泥岩', '花崗岩', '紅磚塊', '浮石', '鵝卵石'],
    bottle: ['牛奶瓶', '可樂瓶', '布丁杯', '草莓牛奶瓶', '彈珠汽水瓶', '養樂多瓶', '燒酒瓶', '藍莓果醬瓶', '礦泉水瓶']
  };

  function readWaterDrops() {
    try {
      const current = localStorage.getItem(rewardStorageKey);
      if (current) return Number(JSON.parse(current).drops) || 0;
      const legacy = JSON.parse(localStorage.getItem(legacyRewardStorageKey) || '{}');
      const drops = Number(legacy.drops ?? legacy.coins) || 0;
      if (drops) localStorage.setItem(rewardStorageKey, JSON.stringify({ drops }));
      return drops;
    } catch { return 0; }
  }

  function addWaterDrops(amount) {
    const drops = readWaterDrops() + amount;
    localStorage.setItem(rewardStorageKey, JSON.stringify({ drops }));
  }

  function addCollectionItem(type, name, tier) {
    let collection = { mosses: [], stones: [], bottles: [] };
    try { collection = { ...collection, ...JSON.parse(localStorage.getItem(collectionStorageKey) || '{}') }; } catch {}
    const key = type === 'moss' ? 'mosses' : type === 'stone' ? 'stones' : 'bottles';
    collection[key] = Array.isArray(collection[key]) ? collection[key] : [];
    collection[key].push({ name, tier, sessionId: scratchSessionId, wonAt: new Date().toISOString() });
    localStorage.setItem(collectionStorageKey, JSON.stringify(collection));
  }

  function renderReward(reward) {
    prizeTier.textContent = `${reward.tier} 賞`;
    if (reward.type === 'drops') {
      prizeTitle.textContent = `獲得水滴 × ${reward.drops}`;
      prizeDescription.textContent = '水滴已存入這台裝置的收藏。前往主頁商店區，看看如何用水滴交換苔蘚夥伴、生態瓶與裝飾。';
      prizeArt.innerHTML = '<div class="prize-drop" role="img" aria-label="水滴">💧</div>';
      prizeLink.textContent = '水滴可以做什麼？';
      prizeLink.href = 'index.html#moss-coins';
      return;
    }
    const name = chooseName(catalog[reward.type]);
    addCollectionItem(reward.type, name, reward.tier);
    const isMoss = reward.type === 'moss';
    const isStone = reward.type === 'stone';
    prizeTitle.textContent = `獲得${isMoss ? '苔蘚角色' : isStone ? '石頭夥伴' : '生態瓶'}：${name}`;
    prizeDescription.textContent = `已將「${name}」加入本機收藏！到介紹圖鑑認識它的特色，繼續打造自己的微境。`;
    const image = document.createElement('img');
    image.alt = name;
    image.src = reward.type === 'bottle' ? `assets/moss-bottles/${name}.png` : `assets/card-faces/${name}.webp`;
    prizeArt.replaceChildren(image);
    const page = isMoss ? 'mosses.html' : isStone ? 'stones.html' : 'bottles.html';
    prizeLink.textContent = isMoss ? '認識苔蘚角色' : isStone ? '認識石頭夥伴' : '探索生態瓶';
    prizeLink.href = `${page}#${encodeURIComponent(name)}`;
  }

  function revealReward() {
    if (rewardClaimed) return;
    rewardClaimed = true;
    setPaintMode(false);
    const reward = selectReward();
    if (reward.type === 'drops') addWaterDrops(reward.drops);
    renderReward(reward);
    saveLocalPaths();
    reveal.classList.add('show');
    reveal.setAttribute('aria-hidden', 'false');
    document.getElementById('prizeClose').focus();
  }

  function closeReward() {
    reveal.classList.remove('show');
    reveal.setAttribute('aria-hidden', 'true');
  }
  document.getElementById('prizeClose').addEventListener('click', closeReward);
  reveal.addEventListener('click', (event) => { if (event.target === reveal) closeReward(); });
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && reveal.classList.contains('show')) closeReward(); });

  prizeAgain.addEventListener('click', () => {
    closeReward();
    stamps.splice(0, stamps.length);
    garden.clearRect(0, 0, canvas.width, canvas.height);
    scratchSessionId = createSessionId();
    rewardClaimed = false;
    resizeCoverage();
    saveLocalPaths();
    setPaintMode(true);
    paintStatus.textContent = '新的一張刮刮卡準備好了，開始刮開頁面吧！';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  clearButton.addEventListener('click', () => {
    scratchSessionId = createSessionId();
    rewardClaimed = false;
    resizeCoverage();
    saveLocalPaths();
  });

  canvas.addEventListener('pointerdown', () => requestAnimationFrame(processNewStamps));
  canvas.addEventListener('pointermove', () => requestAnimationFrame(processNewStamps));
  window.addEventListener('resize', () => requestAnimationFrame(resizeCoverage));
  resizeCoverage();
})();
