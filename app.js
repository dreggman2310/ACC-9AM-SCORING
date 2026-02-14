// Friday Standard Game — UI-first starter.
// This file is structured so you can plug in full Nassau/Scotch/Dogs later.

const LS_KEY = "friday_standard_game_v1";

const DEFAULT_ACC_ROSTER = [
  { id: "ray", name: "Ray", hcp: 10 },
  { id: "demps", name: "Demps", hcp: 12 },
  { id: "meyer", name: "Meyer", hcp: 16 },
  { id: "hotz", name: "Hotz", hcp: 20 },
  { id: "bj", name: "BJ", hcp: 8 },
  { id: "mike", name: "Mike", hcp: 11 },
  { id: "kevin", name: "Kevin", hcp: 13 },
  { id: "chris", name: "Chris", hcp: 15 },
  { id: "brian", name: "Brian", hcp: 17 },
  { id: "scott", name: "Scott", hcp: 19 },
  { id: "rob", name: "Rob", hcp: 21 },
  { id: "dan", name: "Dan", hcp: 23 }
];

const state = loadState() ?? {
  setup: {
    players: [
      { id: crypto.randomUUID(), name: "Ray", hcp: 10 },
      { id: crypto.randomUUID(), name: "Player 2", hcp: 14 },
      { id: crypto.randomUUID(), name: "Player 3", hcp: 18 },
      { id: crypto.randomUUID(), name: "Player 4", hcp: 22 },
    ],
    teams: { A: [null, null], B: [null, null] },
    stakes: { nassau: 5, scotch: 2, dogs: 1 },
    dogsEnabled: false,
    holeHcpOrder: Array.from({ length: 18 }, (_, i) => i + 1), // default 1..18
    accRoster: buildDefaultAccRoster(),
    accLastUsedSelection: []
  },
  round: {
    started: false,
    hole: 1,
    // scores[hole][playerId] = gross integer
    scores: {},
    // calls[hole] = { proxTeam: "A"/"B"/null, doubleProx: bool, sneakTeam: ..., etc. }
    calls: {},
    // placeholder tracking:
    nassau: { summary: "—" },
    scotch: { diff: 0 },
    dogs: { summary: "—" }
  }
};

// ---------- DOM ----------
const setupPanel = document.getElementById("setupPanel");
const roundPanel = document.getElementById("roundPanel");

const playersList = document.getElementById("playersList");
const btnAddPlayer = document.getElementById("btnAddPlayer");
const btnLoadAccRoster = document.getElementById("btnLoadAccRoster");
const accRosterPreview = document.getElementById("accRosterPreview");

const teamA1 = document.getElementById("teamA1");
const teamA2 = document.getElementById("teamA2");
const teamB1 = document.getElementById("teamB1");
const teamB2 = document.getElementById("teamB2");

const stakeNassau = document.getElementById("stakeNassau");
const stakeScotch = document.getElementById("stakeScotch");
const stakeDogs = document.getElementById("stakeDogs");
const toggleDogs = document.getElementById("toggleDogs");
const hcpOrder = document.getElementById("hcpOrder");

const btnStart = document.getElementById("btnStart");

const holeNum = document.getElementById("holeNum");
const btnPrevHole = document.getElementById("btnPrevHole");
const btnNextHole = document.getElementById("btnNextHole");

const scoreEntry = document.getElementById("scoreEntry");

const nassauBig = document.getElementById("nassauBig");
const nassauSub = document.getElementById("nassauSub");
const scotchBig = document.getElementById("scotchBig");
const scotchSub = document.getElementById("scotchSub");
const dogsTile = document.getElementById("dogsTile");
const dogsBig = document.getElementById("dogsBig");
const dogsSub = document.getElementById("dogsSub");

const pressAlert = document.getElementById("pressAlert");
const pressText = document.getElementById("pressText");
const btnPressAccept = document.getElementById("btnPressAccept");
const btnPressDecline = document.getElementById("btnPressDecline");

const statusOut = document.getElementById("statusOut");

const btnReset = document.getElementById("btnReset");
const btnDemo = document.getElementById("btnDemo");

const callButtons = Array.from(document.querySelectorAll(".chip[data-call]"));
const btnClearCalls = document.getElementById("btnClearCalls");

// ---------- INIT ----------
render();

btnAddPlayer.addEventListener("click", () => {
  state.setup.players.push({ id: crypto.randomUUID(), name: `Player ${state.setup.players.length + 1}`, hcp: 18 });
  saveAndRender();
});

btnStart.addEventListener("click", () => {
  updateLastUsedSelection();
  state.round.started = true;
  state.round.hole = 1;
  saveAndRender();
});

btnPrevHole.addEventListener("click", () => {
  state.round.hole = Math.max(1, state.round.hole - 1);
  saveAndRender();
});
btnNextHole.addEventListener("click", () => {
  state.round.hole = Math.min(18, state.round.hole + 1);
  saveAndRender();
});

btnReset.addEventListener("click", () => {
  localStorage.removeItem(LS_KEY);
  location.reload();
});

btnDemo.addEventListener("click", () => {
  loadDemo();
  saveAndRender();
});

btnLoadAccRoster.addEventListener("click", () => {
  loadAccRosterIntoSetup();
  saveAndRender();
});

toggleDogs.addEventListener("change", () => {
  state.setup.dogsEnabled = toggleDogs.checked;
  saveAndRender();
});

stakeNassau.addEventListener("input", () => { state.setup.stakes.nassau = numOr0(stakeNassau.value); saveAndRender(); });
stakeScotch.addEventListener("input", () => { state.setup.stakes.scotch = numOr0(stakeScotch.value); saveAndRender(); });
stakeDogs.addEventListener("input",   () => { state.setup.stakes.dogs = numOr0(stakeDogs.value); saveAndRender(); });

hcpOrder.addEventListener("input", () => {
  const arr = parseOrder(hcpOrder.value);
  if (arr) state.setup.holeHcpOrder = arr;
  saveAndRender();
});

btnPressAccept.addEventListener("click", () => {
  // Hook: record press acceptance for relevant match
  pressAlert.classList.add("hidden");
});
btnPressDecline.addEventListener("click", () => {
  // Hook: record press decline
  pressAlert.classList.add("hidden");
});

callButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    const key = btn.dataset.call;
    const hole = state.round.hole;
    state.round.calls[hole] ||= {};
    state.round.calls[hole][key] = !state.round.calls[hole][key];
    saveAndRender();
  });
});
btnClearCalls.addEventListener("click", () => {
  const hole = state.round.hole;
  state.round.calls[hole] = {};
  saveAndRender();
});

// ---------- RENDER ----------
function render() {
  if (!state.round.started) {
    setupPanel.classList.remove("hidden");
    roundPanel.classList.add("hidden");
    renderSetup();
  } else {
    setupPanel.classList.add("hidden");
    roundPanel.classList.remove("hidden");
    renderRound();
  }
}

function renderSetup() {
  accRosterPreview.textContent = state.setup.accRoster
    .map(p => `${p.name} (HCP ${p.hcp})`)
    .join(" • ");

  // players editor
  playersList.innerHTML = "";
  state.setup.players.forEach((p, idx) => {
    const row = document.createElement("div");
    row.className = "row";
    row.innerHTML = `
      <input class="input" value="${escapeHtml(p.name)}" data-pname="${p.id}" />
      <input class="input" type="number" min="0" step="1" value="${p.hcp}" data-phcp="${p.id}" />
      <button class="btn danger" data-del="${p.id}">Del</button>
    `;
    playersList.appendChild(row);
  });

  // wire player inputs
  playersList.querySelectorAll("input[data-pname]").forEach(inp => {
    inp.addEventListener("input", () => {
      const id = inp.dataset.pname;
      const p = state.setup.players.find(x => x.id === id);
      if (p) p.name = inp.value;
      saveAndRender();
    });
  });
  playersList.querySelectorAll("input[data-phcp]").forEach(inp => {
    inp.addEventListener("input", () => {
      const id = inp.dataset.phcp;
      const p = state.setup.players.find(x => x.id === id);
      if (p) p.hcp = numOr0(inp.value);
      saveAndRender();
    });
  });
  playersList.querySelectorAll("button[data-del]").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.del;
      state.setup.players = state.setup.players.filter(p => p.id !== id);
      // also clear team selections
      ["A","B"].forEach(t => state.setup.teams[t] = state.setup.teams[t].map(x => x === id ? null : x));
      saveAndRender();
    });
  });

  // populate team selects
  populateSelect(teamA1); populateSelect(teamA2); populateSelect(teamB1); populateSelect(teamB2);

  // restore selections
  setSelect(teamA1, state.setup.teams.A[0]);
  setSelect(teamA2, state.setup.teams.A[1]);
  setSelect(teamB1, state.setup.teams.B[0]);
  setSelect(teamB2, state.setup.teams.B[1]);

  // on change
  teamA1.onchange = () => { state.setup.teams.A[0] = teamA1.value || null; updateLastUsedSelection(); saveAndRender(); };
  teamA2.onchange = () => { state.setup.teams.A[1] = teamA2.value || null; updateLastUsedSelection(); saveAndRender(); };
  teamB1.onchange = () => { state.setup.teams.B[0] = teamB1.value || null; updateLastUsedSelection(); saveAndRender(); };
  teamB2.onchange = () => { state.setup.teams.B[1] = teamB2.value || null; updateLastUsedSelection(); saveAndRender(); };

  // stakes
  stakeNassau.value = state.setup.stakes.nassau ?? "";
  stakeScotch.value = state.setup.stakes.scotch ?? "";
  stakeDogs.value = state.setup.stakes.dogs ?? "";
  toggleDogs.checked = !!state.setup.dogsEnabled;

  // hole order
  hcpOrder.value = state.setup.holeHcpOrder.join(",");

  // start enable check
  btnStart.disabled = !isValidSetup();
}

function renderRound() {
  holeNum.textContent = String(state.round.hole);

  // show/hide dogs tile
  dogsTile.style.display = state.setup.dogsEnabled ? "block" : "none";

  // Big scoreboard (placeholder now — hooks ready)
  // TODO: plug in real Nassau/Scotch/Dogs engines.
  const derived = computeDerived(state);
  nassauBig.textContent = derived.nassauBig;
  scotchBig.textContent = String(derived.scotchDiff);
  dogsBig.textContent = derived.dogsBig;

  // Press alert demo hook (replace with actual dormie logic)
  if (derived.pressAvailable) {
    pressAlert.classList.remove("hidden");
    pressText.textContent = derived.pressText;
  } else {
    pressAlert.classList.add("hidden");
  }

  // Score entry
  const hole = state.round.hole;
  state.round.scores[hole] ||= {};
  scoreEntry.innerHTML = "";

  state.setup.players.forEach(p => {
    const gross = state.round.scores[hole][p.id] ?? 0;
    const net = computeNetScoreForHole(state, p.id, hole, gross);

    const div = document.createElement("div");
    div.className = "player-row";
    div.innerHTML = `
      <div>
        <div class="pname">${escapeHtml(p.name)}</div>
        <div class="phcp">HCP ${p.hcp} • Net: <strong>${net}</strong></div>
      </div>
      <div class="stepper">
        <button class="smallbtn" data-dec="${p.id}">−</button>
        <div class="num" id="num_${p.id}">${gross}</div>
        <button class="smallbtn" data-inc="${p.id}">+</button>
      </div>
    `;
    scoreEntry.appendChild(div);
  });

  scoreEntry.querySelectorAll("button[data-inc]").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.inc;
      const hole = state.round.hole;
      state.round.scores[hole][id] = clamp((state.round.scores[hole][id] ?? 0) + 1, 0, 30);
      saveAndRender();
    });
  });
  scoreEntry.querySelectorAll("button[data-dec]").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.dec;
      const hole = state.round.hole;
      state.round.scores[hole][id] = clamp((state.round.scores[hole][id] ?? 0) - 1, 0, 30);
      saveAndRender();
    });
  });

  // Calls UI active states
  const calls = state.round.calls[hole] || {};
  callButtons.forEach(btn => {
    const key = btn.dataset.call;
    btn.classList.toggle("active", !!calls[key]);
  });

  statusOut.textContent = JSON.stringify({
    hole: state.round.hole,
    teams: state.setup.teams,
    scores: state.round.scores[hole],
    calls: state.round.calls[hole] || {},
    derived
  }, null, 2);
}

function loadAccRosterIntoSetup() {
  const roster = state.setup.accRoster?.length ? state.setup.accRoster : buildDefaultAccRoster();
  state.setup.accRoster = roster;
  state.setup.players = roster.map(p => ({
    id: `acc-${p.id}`,
    name: p.name,
    hcp: p.hcp
  }));

  const validIds = new Set(state.setup.players.map(p => p.id));
  const restored = (state.setup.accLastUsedSelection || []).filter(id => validIds.has(id));
  const fallback = state.setup.players.slice(0, 4).map(p => p.id);
  const picks = restored.length === 4 ? restored : fallback;

  state.setup.teams = {
    A: [picks[0] || null, picks[1] || null],
    B: [picks[2] || null, picks[3] || null]
  };
  updateLastUsedSelection();
}

function updateLastUsedSelection() {
  const picks = [...state.setup.teams.A, ...state.setup.teams.B];
  if (picks.length !== 4 || picks.some(x => !x)) return;
  if (picks.every(id => String(id).startsWith("acc-"))) {
    state.setup.accLastUsedSelection = picks;
  }
}

// ---------- DERIVED / SCORING HOOKS ----------
function computeDerived(s) {
  // Placeholder: keeps UI alive and shows where logic will land.
  // Replace with full Standard Game engine:
  // - Nassau (Front/Back/Day) match states + presses
  // - Scotch point differential
  // - Dogs (silent; show at turn / on request)

  const hole = s.round.hole;
  const isTurn = hole === 9;
  return {
    nassauBig: "—",
    scotchDiff: 0,
    dogsBig: isTurn ? "Turn" : "—",
    pressAvailable: false,
    pressText: "Press available."
  };
}

// Standard stroke allocation: play off the low, apply by hole handicap order.
// Supports hcp > 18 (2 strokes on hardest holes, etc.)
function computeNetScoreForHole(s, playerId, hole, gross) {
  const p = s.setup.players.find(x => x.id === playerId);
  if (!p) return gross;

  // Play off the low (lowest becomes 0)
  const low = Math.min(...s.setup.players.map(x => x.hcp));
  const adj = Math.max(0, p.hcp - low);

  const strokes = strokesOnHole(adj, hole, s.setup.holeHcpOrder);
  return Math.max(0, gross - strokes);
}

// holeHcpOrder is an array length 18 where each element is the HOLE INDEX RANK? (1 hardest..18 easiest)
// Example: if holeHcpOrder[0] = 11 means hole 1 is stroke index 11.
// We want: allocate strokes to holes with lowest stroke index first.
function strokesOnHole(adjHcp, hole, holeHcpOrder) {
  if (!Number.isFinite(adjHcp) || adjHcp <= 0) return 0;

  const holeStrokeIndex = holeHcpOrder[hole - 1]; // 1..18

  // base strokes if adjHcp > 18 etc.
  const base = Math.floor(adjHcp / 18);          // full loops of 18
  const rem = adjHcp % 18;                       // extra strokes on hardest 'rem' holes
  const extra = holeStrokeIndex <= rem ? 1 : 0;  // hardest holes have low stroke index (1 hardest)
  return base + extra;
}

// ---------- HELPERS ----------
function isValidSetup() {
  if (state.setup.players.length < 4) return false;
  const ids = state.setup.players.map(p => p.id);
  const picks = [...state.setup.teams.A, ...state.setup.teams.B].filter(Boolean);
  if (picks.length !== 4) return false;
  // ensure unique
  const uniq = new Set(picks);
  if (uniq.size !== 4) return false;
  // ensure picks exist
  if (![...uniq].every(id => ids.includes(id))) return false;
  return true;
}

function populateSelect(sel) {
  sel.innerHTML = `<option value="">—</option>`;
  state.setup.players.forEach(p => {
    const opt = document.createElement("option");
    opt.value = p.id;
    opt.textContent = `${p.name} (HCP ${p.hcp})`;
    sel.appendChild(opt);
  });
}
function setSelect(sel, value) {
  sel.value = value ?? "";
}

function parseOrder(text) {
  const raw = text.trim();
  if (!raw) return Array.from({ length: 18 }, (_, i) => i + 1);
  const parts = raw.split(/[,\s]+/).map(x => Number(x)).filter(x => Number.isFinite(x));
  if (parts.length !== 18) return null;
  // must be 1..18 all once
  const set = new Set(parts);
  if (set.size !== 18) return null;
  if (![...set].every(n => n >= 1 && n <= 18)) return null;
  return parts;
}

function saveState(s) {
  localStorage.setItem(LS_KEY, JSON.stringify(s));
}
function loadState() {
  try {
    const v = localStorage.getItem(LS_KEY);
    const parsed = v ? JSON.parse(v) : null;
    if (!parsed) return null;
    parsed.setup ||= {};
    parsed.setup.accRoster = normalizeAccRoster(parsed.setup.accRoster);
    parsed.setup.accLastUsedSelection ||= [];
    return parsed;
  } catch {
    return null;
  }
}

function normalizeAccRoster(roster) {
  if (!Array.isArray(roster) || roster.length === 0) {
    return buildDefaultAccRoster();
  }
  const normalized = roster
    .filter(item => item && typeof item.name === "string")
    .map(item => ({
      id: String(item.id || item.name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
      name: String(item.name).trim(),
      hcp: numOr0(item.hcp)
    }))
    .filter(item => item.id && item.name);

  return normalized.length ? normalized : buildDefaultAccRoster();
}

function buildDefaultAccRoster() {
  return DEFAULT_ACC_ROSTER.map(player => ({ ...player }));
}
function saveAndRender(doSave=true) {
  if (doSave) saveState(state);
  render();
}

function numOr0(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
function clamp(n, a, b){ return Math.max(a, Math.min(b, n)); }
function escapeHtml(str){
  return String(str)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function loadDemo() {
  const p1 = { id: crypto.randomUUID(), name: "Ray", hcp: 10 };
  const p2 = { id: crypto.randomUUID(), name: "Demps", hcp: 12 };
  const p3 = { id: crypto.randomUUID(), name: "Meyer", hcp: 16 };
  const p4 = { id: crypto.randomUUID(), name: "Hotz", hcp: 20 };

  state.setup.players = [p1,p2,p3,p4];
  state.setup.teams = { A:[p1.id,p2.id], B:[p3.id,p4.id] };
  state.setup.stakes = { nassau: 5, scotch: 2, dogs: 1 };
  state.setup.dogsEnabled = true;
  state.setup.holeHcpOrder = Array.from({ length: 18 }, (_, i) => i + 1);

  state.round.started = false;
  state.round.hole = 1;
  state.round.scores = {};
  state.round.calls = {};
}
