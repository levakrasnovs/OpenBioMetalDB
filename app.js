/* OpenBioMetalDB demo: home, catalog, compound page, paper page, data. Hash routing, data from index.json + c/<ID>.json */
const $ = (s, r = document) => r.querySelector(s);
const NS = 'http://www.w3.org/2000/svg';
const el = (tag, attrs = {}, parent) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; };
const fmt = (v, d = 1) => v == null || v === '' || isNaN(+v) ? (v ?? '–') : (+v).toFixed(d).replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1');
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const doi = d => `<a href="#/paper/${encodeURIComponent(d)}">${esc(d)}</a>`;
const extUrl = d => d.startsWith('pmid_') ? 'https://pubmed.ncbi.nlm.nih.gov/' + d.slice(5) + '/' : 'https://doi.org/' + d;
const doiExt = d => `<a href="${esc(extUrl(d))}" target="_blank" rel="noopener">${esc(extUrl(d))}</a>`;
const ccdcLink = code => `<a class="saltchip" href="https://www.ccdc.cam.ac.uk/structures/Search?Ccdcid=${encodeURIComponent(code)}&amp;DatabaseToSearch=Published" target="_blank" rel="noopener">${esc(code)}</a>`;
const tip = $('#tip');
const showTip = (e, html) => { tip.innerHTML = html; tip.style.opacity = 1; tip.style.left = Math.min(e.clientX + 14, innerWidth - 290) + 'px'; tip.style.top = e.clientY + 14 + 'px'; };
const hideTip = () => tip.style.opacity = 0;
function showMeasurementTip(event, html) {
  showTip(event, html);
  if (tip.getBoundingClientRect().bottom > innerHeight - 8) {
    tip.style.top = Math.max(8, event.clientY - tip.offsetHeight - 8) + 'px';
  }
}
function measurementDetails({ result, conditions, method, counterion, doi, year }) {
  const paper = PM[doi];
  const source = [paper?.j, year ?? paper?.y, doi].filter(Boolean).join(' · ');
  return [result, conditions, method, counterion && `Counterion: ${counterion}`, source].filter(Boolean);
}
function measurementTip(details) {
  const [result, ...rest] = details;
  return `<b>${esc(result)}</b>${rest.map(line => `<div>${esc(line)}</div>`).join('')}`;
}
const app = $('#app');
let IDX = null, BY = {}, PM = {};
const pAu = (m, n) => !m.a?.length ? '' : (n && m.a.length > n ? m.a.slice(0, n).join(', ') + ' et al.' : m.a.join(', '));
const tHtml = t => esc(String(t).replace(/\s+/g, ' ').replace(/\s*(<(?:sub|sup)>)\s*/g, '$1').replace(/\s*(<\/(?:sub|sup)>)/g, '$1').replace(/<\/sub>\s+(?=[(\[])/g, '</sub>')).replace(/&lt;(\/?)(i|b|sub|sup|em|strong)&gt;/gi, '<$1$2>').replace(/&lt;\/?[a-z:]+[^&]*?&gt;/gi, '');
const pRef = (d, n) => {
  const m = PM[d];
  if (!m) return `<b>${esc(d)}</b>`;
  const authors = pAu(m, n);
  const separator = authors ? (authors.endsWith('.') ? ' ' : '. ') : '';
  return `<b>${tHtml(m.t || d)}</b><br>${esc(authors)}${separator}<i>${esc(m.j)}</i>, ${m.y ?? ''}`;
};
const cache = {};
async function loadCompound(id) {
  if (cache[id]) return cache[id];
  const response = await fetch(`c/${id}.json?v=35`);
  if (!response.ok) throw new Error(`Could not load ${id}`);
  return cache[id] = await response.json();
}

/* theme */
$('#theme').onclick = () => {
  const cur = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
  document.documentElement.dataset.theme = cur; try { localStorage.setItem('obmd-theme', cur); } catch (e) { }
};

const LD50 = 'LD₅₀';
const KIND = { efficacy: 'TGI', toxicity: `${LD50}/MTD`, pk: 'PK', survival: 'Survival', organs: 'Organs', biodist: 'Biodist', ic50: 'IC50', logp: 'logP', biomarkers: 'Biomarkers' };
const DATA_SECTIONS = { efficacy: '#bEff', toxicity: '#bTox', pk: '#bPK', survival: '#bSurv', organs: '#bOrg', biodist: '#bBio', ic50: '#ic', logp: '#lp', biomarkers: '#bSafety' };
const COMPOUND_DATA_ORDER = ['ic50', 'photo', 'logp', 'efficacy', 'toxicity', 'pk', 'survival', 'organs', 'biodist', 'biomarkers'];
const IC50_DARK = 'IC50_Dark(M*10^-6)';
const IC50_LIGHT = 'IC50_Light(M*10^-6)';
const cytoType = row => row.Type || 'IC50';
const cytoLabel = type => type.replace(/50$/, '₅₀');
const cytoCounts = compound => compound.cyto_types ?? { IC50: compound.k.ic50 || 0 };
const isCellular50 = type => /^[a-z]+50$/i.test(type);
const controlHref = comparison => `#/c/${encodeURIComponent(comparison.compound_id)}?control=${encodeURIComponent(comparison.measurement_id)}`;
const PHOTO_LABEL = 'Photocytotoxicity';
const PHOTO_SHORT_LABEL = 'Photo';
const DATA_ICONS = { efficacy: '🐁', photo: '🌞', logp: '💧', ic50: '🧫', fda: '💊', approved: '💊', jp: '🇯🇵', cn: '🇨🇳', trials: '🧪' };
const APPROVAL_LABELS = { fda: 'FDA approved', jp: 'Approved in Japan', cn: 'Approved in China' };
const APPROVAL_KINDS = Object.keys(APPROVAL_LABELS);
const CLINICAL_LABELS = { ...APPROVAL_LABELS, trials: 'Clinical trials' };
const clinicalPhaseLabel = phase => phase ? `Max phase ${esc(phase)}` : CLINICAL_LABELS.trials;
const dataIcon = kind => DATA_ICONS[kind] ? `<span aria-hidden="true">${DATA_ICONS[kind]}</span> ` : '';
const SECTION_DATA_KIND = { ic: 'ic50', photo: 'photo', iv: 'efficacy', lp: 'logp' };
const sectionIcon = id => dataIcon(SECTION_DATA_KIND[id]);
const IV = ['efficacy', 'toxicity', 'pk', 'survival', 'organs', 'biodist', 'biomarkers'];
const hasIV = c => IV.some(k => c.k[k]);
const label = c => c.n?.[0] ?? c.names?.[0] ?? c.id;
const img = (id, alt = '') => `<div class="struct"><img loading="lazy" src="s/${id}.svg" alt="${esc(alt)}" onerror="this.outerHTML='<span>No structure</span>'"></div>`;
const metalsOf = m => String(m ?? '').split(/[-;,|]/).map(s => s.trim()).filter(Boolean);

function card(c, o = {}) {
  const s = [];
  for (const [kind, name] of Object.entries(CLINICAL_LABELS)) {
    if (c.clinical?.[kind]) {
      const badge = kind === 'trials' ? clinicalPhaseLabel(c.clinical.max_phase) : name;
      s.push(`<span class="ms clinical-${kind}">${dataIcon(kind)}${badge}</span>`);
    }
  }
  if (o.sim != null) s.push(`<span class="ms sim">sim ${o.sim.toFixed(2)}</span>`);
  const count = cytoCounts(c).IC50;
  if (count) {
    const lineCount = c.cell_line_count;
    const lines = lineCount ? ` · ${lineCount.toLocaleString('en')} cell line${lineCount === 1 ? '' : 's'}` : '';
    s.push(`<span class="ms ic">${dataIcon('ic50')}${count.toLocaleString('en')} ${cytoLabel('IC50')} value${count === 1 ? '' : 's'}${lines}</span>`);
  }
  if (c.k.photo) s.push(`<span class="ms ic">${dataIcon('photo')}${PHOTO_SHORT_LABEL}</span>`);
  if (c.k.efficacy) s.push(`<span class="ms iv">${dataIcon('efficacy')}in vivo</span>`);
  if (c.k.pk) s.push('<span class="ms iv">PK</span>');
  if (c.ld50_mtd) s.push(`<span class="ms iv">${KIND.toxicity}</span>`);
  if (c.k.logp) s.push(`<span class="ms lp">${dataIcon('logp')}logP</span>`);
  return `<a class="card" href="#/c/${c.id}">${img(c.id, label(c))}<div class="meta"><div class="oid">${c.id} · ${esc(c.m)}</div>
    <div class="nm" title="${esc(c.n.join(', '))}">${esc(label(c))}</div><div class="mini-stats">${s.join('')}<span class="ms">${c.p} paper${c.p > 1 ? 's' : ''}</span></div></div></a>`;
}

/* ---------- routing ---------- */
const canonicalPaperDoi = doi => IDX.paper_aliases?.[doi.toLowerCase()] ?? doi;
async function route() {
  hideTip();
  if (!IDX) { IDX = await fetch('index.json?v=22').then(r => r.json()); IDX.compounds.forEach(c => BY[c.id] = c); PM = await fetch('paper_meta.json').then(r => r.json()).catch(() => ({})); }
  const h = location.hash.slice(1) || '/';
  const [encodedPath, qs] = h.split('?'); const path = decodeURIComponent(encodedPath); const q = new URLSearchParams(qs || '');
  document.querySelectorAll('nav a').forEach(a => a.classList.toggle('on', a.getAttribute('href') === '#' + h));
  if (path.startsWith('/c/')) {
    const id = path.slice(3);
    const canonical = Object.hasOwn(IDX.aliases ?? {}, id) ? IDX.aliases[id] : id;
    if (canonical !== id) history.replaceState(null, '', `#/c/${canonical}${qs ? '?' + qs : ''}`);
    return compoundPage(canonical, q.get('control'));
  }
  if (path.startsWith('/paper/')) {
    const source = path.slice(7);
    const canonical = canonicalPaperDoi(source);
    if (canonical !== source) history.replaceState(null, '', `#/paper/${encodeURIComponent(canonical)}${qs ? '?' + qs : ''}`);
    return paperPage(canonical);
  }
  if (path === '/compounds') return catalog(q);
  if (path === '/data') return dataPage();
  scrollTo(0, 0); home();
}
addEventListener('hashchange', route);
route();

const counter = (b, target) => { const t0 = performance.now(); const step = t => { const p = Math.min(1, (t - t0) / 1500); b.textContent = Math.round(target * (1 - Math.pow(1 - p, 3))).toLocaleString('en'); if (p < 1) requestAnimationFrame(step); }; requestAnimationFrame(step); };

/* ---------- home ---------- */
function home() {
  const S = IDX.stats, C = IDX.compounds;
  const iv = C.filter(hasIV).length, ic = C.filter(c => c.k.ic50).length, lp = C.filter(c => c.k.logp).length;
  app.innerHTML = `
  <section class="hero">
    <div class="hero-text">
      <h1>Explore<br><span class="grad">metal complexes</span></h1>
      <p class="lede">Cytotoxicity, lipophilicity and in vivo efficacy, toxicity, biodistribution and pharmacokinetics, curated from the primary literature and linked by one compound ID.</p>
      <form class="bigsearch" id="bs"><input type="search" id="bsq" placeholder="Name, OBMD ID, DOI…"><button>Search</button></form>
      <p class="hint">Try <a data-q="cisplatin">cisplatin</a> · <a data-q="NAMI-A">NAMI-A</a> · <a data-q="OBMD000028">OBMD000028</a> · <a data-q="Ir">Ir</a></p>
    </div>
    <div class="hero-mouse">
      <div class="orbit">${['Pt', 'Ru', 'Ir', 'Au', 'Cu', 'Os'].map((m, i) => `<span class="el" style="--a:${i * 60}deg">${m}</span>`).join('')}</div>
      <svg viewBox="0 0 600 340" class="mouse breathe"><use href="#mouse"/><circle cx="232" cy="122" r="26" fill="url(#tumorGrad)" class="hero-tumor"/></svg>
    </div>
  </section>
  <section class="panel home-stats" aria-label="Dataset statistics">
    <div class="counters c5">
      <div><b data-n="${S.compounds}">0</b><span>unique complexes (OBMD IDs)</span></div>
      <div><b data-n="${S.ic50}">0</b><span>IC50 values</span></div>
      <div><b data-n="${S.logp}">0</b><span>logP / logD values</span></div>
      <div><b data-n="${S.efficacy}">0</b><span>in vivo efficacy records</span></div>
      <div><b data-n="${S.papers}">0</b><span>papers</span></div>
    </div>
  </section>
  <section class="panel home-featured">
    <div class="sec-head"><h2>Most-studied complexes</h2>
      <p>Ranked by publication count among complexes covered by all three datasets.</p></div>
    <div class="grid" id="feat"></div>
  </section>
  <section class="panel">
    <div class="sec-head"><h2>Three datasets, one registry</h2>
      <p>Each unique complex ion gets a permanent OBMD ID. Salts are forms of the same compound.</p></div>
    <div class="dsets">
      <div class="dset" data-has="ic50"><p class="eyebrow">MetalCytoToxDB</p><h3>Cytotoxicity</h3><p>IC50 in the dark and under irradiation, with cell line, exposure time and cisplatin reference.</p><b>${ic.toLocaleString('en')}</b><small>compounds</small></div>
      <div class="dset" data-has="logp"><p class="eyebrow">MetalLipoDB</p><h3>Lipophilicity</h3><p>Experimental logP and logD with method, aqueous phase, pH and temperature.</p><b>${lp.toLocaleString('en')}</b><small>compounds</small></div>
      <div class="dset" data-has="efficacy"><p class="eyebrow">In vivo</p><h3>Living models</h3><p>Tumour growth inhibition, acute toxicity, organ effects, biodistribution, PK and survival.</p><b>${iv.toLocaleString('en')}</b><small>compounds</small></div>
    </div>
  </section>
  <section class="panel">
    <div class="sec-head"><h2>Compounds by metal</h2></div>
    <div class="ptable" id="ptable"></div>
  </section>`;
  app.querySelectorAll('[data-n]').forEach(b => counter(b, +b.dataset.n));
  $('#bs').onsubmit = e => { e.preventDefault(); go($('#bsq').value); };
  app.querySelectorAll('.hint a').forEach(a => a.onclick = () => go(a.dataset.q));
  app.querySelectorAll('.dset').forEach(d => d.onclick = () => location.hash = '/compounds?has=' + d.dataset.has);
  const byM = {}; C.forEach(c => metalsOf(c.m).forEach(m => byM[m] = (byM[m] || 0) + 1));
  const mx = Math.max(...Object.values(byM));
  $('#ptable').innerHTML = Object.entries(byM).filter(x => /^[A-Z][a-z]?$/.test(x[0])).sort((a, b) => b[1] - a[1])
    .map(([m, n]) => `<a class="tile" href="#/compounds?metal=${m}" style="--h:${Math.sqrt(n / mx)};color:inherit;text-decoration:none"><b>${m}</b><span>${n.toLocaleString('en')}</span></a>`).join('');
  const score = c => (hasIV(c) ? 1 : 0) + (c.k.ic50 ? 1 : 0) + (c.k.logp ? 1 : 0);
  $('#feat').innerHTML = C.filter(c => score(c) === 3).sort((a, b) => b.p - a.p).slice(0, 10).map(card).join('');
}
function go(q) {
  q = (q || '').trim(); if (!q) return;
  if (BY[q.toUpperCase()]) location.hash = '/c/' + q.toUpperCase();
  else location.hash = '/compounds?q=' + encodeURIComponent(q);
}

/* ---------- chemistry in the browser (RDKit.js), loaded on first structure search ---------- */
const RDV = 'https://unpkg.com/@rdkit/rdkit@2025.3.4-1.0.0/dist/';
let RD = null, LIG = null;
const loadScript = src => new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
async function chem() {
  if (!RD) { await loadScript(RDV + 'RDKit_minimal.js'); RD = await initRDKitModule({ locateFile: () => RDV + 'RDKit_minimal.wasm' }); }
  if (!LIG) {
    LIG = await fetch('ligands.json?v=2').then(r => r.json());
    LIG.bits = LIG.fp.map(b => Uint8Array.from(atob(b), ch => ch.charCodeAt(0)));
    LIG.mol = []; LIG.scm = [];
  }
}
const POP = Uint8Array.from({ length: 256 }, (_, i) => { let c = 0; while (i) { c += i & 1; i >>= 1; } return c; });
const packFp = s => Uint8Array.from({ length: s.length / 8 }, (_, k) => parseInt(s.substr(k * 8, 8), 2));
const tanimoto = (a, b) => { let x = 0, u = 0; for (let i = 0; i < a.length; i++) { x += POP[a[i] & b[i]]; u += POP[a[i] | b[i]]; } return u ? x / u : 0; };
const ligMol = i => LIG.mol[i] || (LIG.mol[i] = RD.get_mol(LIG.s[i]));
const ligScaf = i => LIG.scm[i] || (LIG.scm[i] = LIG.sc[i] ? RD.get_mol(LIG.sc[i]) : ligMol(i));
const hit = (m, q) => m && m.is_valid() && m.get_substruct_match(q) !== '{}';
const same = (a, b) => hit(a, b) && hit(b, a);
const METALS = new Set('Li Na K Be Mg Ca Sr Ba Al Ga In Tl Ge Sn Pb Sb Bi Sc Ti V Cr Mn Fe Co Ni Cu Zn Y Zr Nb Mo Tc Ru Rh Pd Ag Cd Hf Ta W Re Os Ir Pt Au Hg La Ce Pr Nd Sm Eu Gd Tb Dy Ho Er Tm Yb Lu'.split(' '));
/* Bemis-Murcko scaffold, same rule as RDKit MurckoScaffold: strip side chains, keep =X on ring/linker atoms */
function scaffoldOf(mol) {
  const j = JSON.parse(mol.get_json()), M = j.molecules[0], D = j.defaults?.atom || {};
  const atoms = M.atoms, bonds = M.bonds || [];
  const ext = (M.extensions || []).find(e => e.name === 'rdkitRepresentation') || {};
  const ring = new Set((ext.atomRings || []).flat());
  const alive = new Set(atoms.map((_, i) => i)), adj = atoms.map(() => []);
  bonds.forEach((b, k) => { const [x, y] = b.atoms; adj[x].push([y, b.bo ?? 1, k]); adj[y].push([x, b.bo ?? 1, k]); });
  const nb = a => adj[a].filter(([y]) => alive.has(y));
  const termDouble = a => !ring.has(a) && nb(a).length === 1 && nb(a)[0][1] === 2;
  for (let ch = true; ch;) {
    ch = false;
    for (const a of [...alive]) {
      if (ring.has(a)) continue;
      const n = nb(a);
      if (n.length > 1) continue;
      if (n.length === 1 && n[0][1] === 2 && nb(n[0][0]).filter(([y]) => y !== a && !termDouble(y)).length >= 2) continue;
      alive.delete(a); ch = true;
    }
  }
  if (!alive.size) return null;
  const keep = [...alive], idx = new Map(keep.map((a, i) => [a, i]));
  const na = keep.map(a => {
    const at = { ...atoms[a] }, lost = adj[a].filter(([y]) => !alive.has(y)).reduce((s, [, bo]) => s + bo, 0);
    at.impHs = (at.impHs ?? D.impHs ?? 0) + lost; return at;
  });
  const nbnd = bonds.filter(b => alive.has(b.atoms[0]) && alive.has(b.atoms[1])).map(b => ({ ...b, atoms: [idx.get(b.atoms[0]), idx.get(b.atoms[1])] }));
  const out = { ...j, molecules: [{ ...M, atoms: na, bonds: nbnd, extensions: undefined }] };
  const m = RD.get_mol(JSON.stringify(out));
  return m && m.is_valid() ? m : null;
}
/* returns {ids:Set, score:Map|null} in the Streamlit sense: every query ligand must be present */
async function structureSearch(smi, mode, thr) {
  await chem();
  const frags = smi.split('.').map(s => s.trim()).filter(Boolean);
  const qs = frags.map(s => RD.get_mol(s));
  if (!qs.length || qs.some(q => !q || !q.is_valid())) throw new Error('Invalid SMILES');
  const metalWarn = [...new Set(frags.flatMap(s => (s.match(/[A-Z][a-z]?/g) || []).filter(x => METALS.has(x))))];
  const L = LIG.s.length;
  if (mode === 'sim') {
    const whole = RD.get_mol(smi), qfp = packFp(whole.get_rdkit_fp(JSON.stringify({ minPath: 1, maxPath: 7, nBits: 2048 })));
    const score = new Map();
    for (let i = 0; i < L; i++) { const t = tanimoto(qfp, LIG.bits[i]); if (t >= thr) LIG.ids[i].forEach(id => score.set(id, Math.max(score.get(id) || 0, t))); }
    return { ids: new Set(score.keys()), score, metalWarn };
  }
  let ids = null;
  for (const q of qs) {
    const got = new Set(), qn = [q.get_num_atoms(), q.get_num_bonds()];
    if (mode === 'full') {
      for (let i = 0; i < L; i++) if (LIG.n[i][0] === qn[0] && LIG.n[i][1] === qn[1] && same(ligMol(i), q)) LIG.ids[i].forEach(x => got.add(x));
    } else if (mode === 'scaffold') {
      const qsc = scaffoldOf(q) || q, sn = [qsc.get_num_atoms(), qsc.get_num_bonds()];
      for (let i = 0; i < L; i++) { const n = LIG.sc[i] ? LIG.sn[i] : LIG.n[i]; if (n[0] === sn[0] && n[1] === sn[1] && same(ligScaf(i), qsc)) LIG.ids[i].forEach(x => got.add(x)); }
    } else {
      for (let i = 0; i < L; i++) if (LIG.n[i][0] >= qn[0] && hit(ligMol(i), q)) LIG.ids[i].forEach(x => got.add(x));
    }
    ids = ids ? new Set([...ids].filter(x => got.has(x))) : got;
  }
  return { ids, score: null, metalWarn };
}

/* ---------- catalog ---------- */
const EXAMPLES = [['p-cymene · Cl⁻', 'Cc1ccc(C(C)C)cc1.[Cl-]'], ['ppy', '[c-]1ccccc1-c1ccccn1'], ['bpy', 'c1ccc(-c2ccccn2)nc1'], ['PPh3', 'c1ccc(P(c2ccccc2)c2ccccc2)cc1'],
['phen · phen', 'c1cnc2c(c1)ccc1cccnc12.c1cnc2c(c1)ccc1cccnc12'], ['Cp', 'c1cc[cH-]c1'], ['dfppy', 'Fc1c[c-]c(-c2ccccn2)c(F)c1']];
const MODES = [['full', 'Full molecule match'], ['scaffold', 'Scaffold-based'], ['sub', 'Substructure'], ['sim', 'Similarity']];
const FILTER_KIND = { ...KIND, efficacy: 'in vivo', ic50: 'IC₅₀', photo: PHOTO_SHORT_LABEL };
const CLINICAL_FILTERS = { approved: 'Approved', trials: CLINICAL_LABELS.trials };
const CS = { smi: '', mode: 'full', thr: .7, res: null };   // structure search state survives navigation
function catalog(q) {
  const C = IDX.compounds, LN = IDX.lines, ORG = IDX.organ;
  const requestedData = (q.get('has') || '').split(',').map(k => {
    if (APPROVAL_KINDS.includes(k)) return 'approved';
    return isCellular50(k) ? 'ic50' : k;
  });
  const st = { q: q.get('q') || '', metal: q.get('metal') || 'All',
    has: new Set(requestedData.filter(k => Object.hasOwn(FILTER_KIND, k) || Object.hasOwn(CLINICAL_FILTERS, k))),
    tissue: '', line: '', time: '', lo: null, hi: null };
  const topM = Object.entries(C.reduce((m, c) => (metalsOf(c.m).forEach(x => m[x] = (m[x] || 0) + 1), m), {})).sort((a, b) => b[1] - a[1]).slice(0, 14).map(x => x[0]);
  if (st.metal !== 'All' && !topM.includes(st.metal)) topM.push(st.metal);
  const lineN = {}; C.forEach(c => c.ics.forEach(([l]) => lineN[l] = (lineN[l] || 0) + 1));
  const tissues = [...new Set(Object.values(ORG))].sort();
  const timeN = {}; C.forEach(c => c.ics.forEach(([, t]) => t != null && (timeN[t] = (timeN[t] || 0) + 1)));
  const times = Object.entries(timeN).sort((a, b) => b[1] - a[1]).slice(0, 6).map(x => x[0]).sort((a, b) => a - b);
  app.innerHTML = `<div class="page"><div class="sec-head catalog-heading"><p class="eyebrow">Compounds</p>
    <div class="catalog-title"><h2>Search the registry</h2><span class="catalog-count" id="cnt" role="status"></span></div>
  </div>
  <div class="sbox">
    <div class="srow">
      <input id="smi" placeholder='Ligand SMILES — use "." to combine several ligands' value="${esc(CS.smi)}" spellcheck="false">
      <button class="btn ghost" id="sclr" title="Clear">✕</button><button class="btn ghost" id="sdraw">✏ Draw</button>
      <select class="search-mode" id="smode" aria-label="Structure search mode">${MODES.map(([key, label]) => `<option value="${key}"${key === CS.mode ? ' selected' : ''}>${label}</option>`).join('')}</select>
      <button class="btn" id="sgo">Search</button>
    </div>
    <div class="sprev" id="sprev"></div>
    <div class="exrow"><span class="muted">Popular ligands:</span>${EXAMPLES.map(([l, s]) => `<button class="chip" data-s="${esc(s)}">${l}</button>`).join('')}</div>
    <label class="thr" id="thrBox"${CS.mode === 'sim' ? '' : ' hidden'}>Tanimoto ≥ <b id="thrV">${CS.thr.toFixed(2)}</b><input type="range" id="thr" min="0.3" max="1" step="0.05" value="${CS.thr}"></label>
    <p class="smsg" id="smsg" role="status"></p>
  </div>
  <div class="cat">
    <aside class="picker">
      <input id="cq" type="search" placeholder="Name, OBMD ID, DOI…" value="${esc(st.q)}">
      <p class="flab">Metal</p>
      <div class="chips" id="mchips">${['All', ...topM].map(m => `<button class="chip ${m === st.metal ? 'on' : ''}" data-m="${m}">${m}</button>`).join('')}</div>
      <p class="flab">Has data</p>
      <div class="chips has" id="hchips">${COMPOUND_DATA_ORDER.map(k => `<button class="chip ${st.has.has(k) ? 'on' : ''}" data-k="${k}" aria-pressed="${st.has.has(k)}"${k === 'ic50' ? ' title="Includes all cellular endpoints with a 50 index"' : ''}>+ ${esc(FILTER_KIND[k])}</button>`).join('')}</div>
      <p class="flab" id="clinicalFilterLabel">Clinical status</p>
      <div class="chips has" id="clinicalFilters" role="group" aria-labelledby="clinicalFilterLabel">${Object.entries(CLINICAL_FILTERS).map(([k, name]) => `<button type="button" class="chip ${st.has.has(k) ? 'on' : ''}" data-k="${k}" aria-pressed="${st.has.has(k)}"${k === 'approved' ? ' title="Approved in any country"' : ''}>${dataIcon(k)}${name}</button>`).join('')}</div>
      <p class="flab">Cytotoxicity</p>
      <select id="ftis"><option value="">All tissues</option>${tissues.map(t => `<option>${esc(t)}</option>`).join('')}</select>
      <select id="fline"></select>
      <select id="ftime"><option value="">All exposure times</option>${times.map(t => `<option value="${t}">${t} h</option>`).join('')}</select>
      <div class="two"><input id="flo" type="number" min="0" step="any" placeholder="IC₅₀ min, µM" aria-label="Minimum IC₅₀ (µM)"><input id="fhi" type="number" min="0" step="any" placeholder="IC₅₀ max, µM" aria-label="Maximum IC₅₀ (µM)"></div>
      <label class="flab" for="sort">Sort</label>
      <div class="filter-actions">
        <select id="sort"><option value="sim">Most similar</option><option value="p">Most papers</option><option value="ic">Most cytotoxic</option><option value="icd">Least cytotoxic</option><option value="new">Newest first</option><option value="old">Oldest first</option><option value="tgi">Best TGI</option><option value="lp">logP</option><option value="id">OBMD ID</option></select>
        <button class="btn ghost" id="freset">Reset filters</button>
      </div>
    </aside>
    <section aria-label="Search results"><div class="grid" id="grid"></div><button class="btn ghost more" id="more">Show more</button></section>
  </div></div>
  <div class="modal" id="dmodal" hidden><div class="mbox kbox"><div class="mhead"><b>Draw a ligand</b><button class="btn ghost" id="dclose">✕</button></div>
    <iframe id="kframe" title="Ketcher"></iframe><p class="muted" style="font-size:12px;margin:8px 0">Draw the free ligand without the metal and press <b>Apply</b>. Use the Metal filter for the metal.</p></div></div>`;
  const fillLines = () => {
    const ls = Object.keys(lineN).map(Number).filter(l => !st.tissue || ORG[LN[l]] === st.tissue).sort((a, b) => lineN[b] - lineN[a]).slice(0, st.tissue ? 500 : 60);
    $('#fline').innerHTML = `<option value="">All cell lines</option>` + ls.map(l => `<option value="${l}">${esc(LN[l])} (${lineN[l]})</option>`).join('');
  };
  fillLines();
  $('#sort').value = CS.res?.score ? 'sim' : 'p';
  let shown = 60;
  let searchVersion = 0;
  const searchButton = $('#sgo');
  const icFilter = () => st.tissue || st.line !== '' || st.time || st.lo != null || st.hi != null;
  const icOk = ([l, t, v]) => (!st.tissue || ORG[LN[l]] === st.tissue) && (st.line === '' || l === +st.line) && (!st.time || t == st.time) && (st.lo == null || v >= st.lo) && (st.hi == null || v <= st.hi);
  const hasData = (c, k) => {
    if (k === 'approved') return APPROVAL_KINDS.some(k => c.clinical?.[k]);
    if (k === 'ic50') return Object.entries(cytoCounts(c)).some(([type, count]) => count > 0 && isCellular50(type));
    return c.k[k] || c.clinical?.[k];
  };
  const render = () => {
    const t = st.q.toLowerCase(), so = $('#sort').value, R = CS.res, F = icFilter();
    let rows = C.filter(c => (!R || R.ids.has(c.id)) && (st.metal === 'All' || metalsOf(c.m).includes(st.metal)) && [...st.has].every(k => hasData(c, k)) &&
      (!t || c.id.toLowerCase().includes(t) || c.n.some(n => n.toLowerCase().includes(t)) || (t.startsWith('10.') && (IDX.papers[canonicalPaperDoi(t)] || []).includes(c.id))));
    const bestIC = new Map();
    if (F) rows = rows.filter(c => { const v = c.ics.filter(icOk).map(x => x[2]); if (v.length) bestIC.set(c.id, Math.min(...v)); return v.length; });
    const ic = c => bestIC.get(c.id) ?? (c.ics.length ? Math.min(...c.ics.map(x => x[2])) : null);
    const key = { sim: c => -(R?.score?.get(c.id) ?? 0) - c.p / 1e6, p: c => -c.p, id: c => c.id, tgi: c => -(c.tgi ?? -1e9), ic: c => ic(c) ?? 1e12, icd: c => -(ic(c) ?? -1e12), new: c => -(c.y ?? 0), old: c => c.y ?? 1e9, lp: c => c.lp ?? 1e9 }[so];
    rows.sort((a, b) => { const x = key(a), y = key(b); return x < y ? -1 : x > y ? 1 : 0; });
    const count = $('#cnt');
    const total = `${rows.length.toLocaleString('en')} ${rows.length === 1 ? 'result' : 'results'}`;
    if (count.textContent !== total) count.textContent = total;
    $('#grid').innerHTML = rows.slice(0, shown).map(c => card(c, { sim: R?.score?.get(c.id) })).join('');
    $('#more').style.display = rows.length > shown ? '' : 'none';
  };
  const preview = () => {
    const s = $('#smi').value.trim(); if (!s || !RD) { $('#sprev').innerHTML = ''; return; }
    const m = RD.get_mol(s);
    $('#sprev').innerHTML = m && m.is_valid() ? `<div class="pimg">${m.get_svg(140, 100)}</div><code>${esc(s)}</code>` : '<span class="warn">Invalid SMILES</span>';
  };
  const run = async () => {
    const search = ++searchVersion;
    const smi = CS.smi = $('#smi').value.trim();
    const { mode, thr } = CS;
    const current = () => searchButton.isConnected && search === searchVersion;
    if (!smi) { CS.res = null; searchButton.disabled = false; $('#smsg').textContent = ''; $('#sprev').innerHTML = ''; shown = 60; render(); return; }
    $('#smsg').innerHTML = '<span class="spin"></span> ' + (RD ? 'Searching…' : 'Loading the chemistry engine…'); searchButton.disabled = true;
    await new Promise(r => setTimeout(r, 30));
    if (!current()) return;
    try {
      const result = await structureSearch(smi, mode, thr);
      if (!current()) return;
      CS.res = result; preview();
      $('#smsg').innerHTML = result.metalWarn.length ? `<span class="warn">The query contains ${result.metalWarn.join(', ')}. Enter ligand SMILES only and use the Metal filter.</span>` : '';
      $('#sort').value = CS.res.score ? 'sim' : ($('#sort').value === 'sim' ? 'p' : $('#sort').value);
    } catch (e) {
      if (!current()) return;
      CS.res = null; $('#smsg').innerHTML = `<span class="warn">${esc(e.message || 'The chemistry engine could not load.')}</span>`;
    }
    searchButton.disabled = false; shown = 60; render();
  };
  $('#sgo').onclick = run; $('#smi').onkeydown = e => e.key === 'Enter' && run();
  $('#smi').oninput = () => { if (RD) preview(); };
  $('#sclr').onclick = () => { $('#smi').value = ''; run(); };
  app.querySelectorAll('.exrow .chip').forEach(b => b.onclick = () => { $('#smi').value = b.dataset.s; run(); });
  $('#smode').onchange = e => { CS.mode = e.target.value; $('#thrBox').hidden = CS.mode !== 'sim'; if (CS.smi) run(); };
  $('#thr').oninput = e => { CS.thr = +e.target.value; $('#thrV').textContent = CS.thr.toFixed(2); };
  $('#thr').onchange = () => CS.smi && run();
  $('#cq').oninput = e => { st.q = e.target.value; shown = 60; render(); };
  $('#mchips').onclick = e => { const b = e.target.closest('.chip'); if (!b) return; st.metal = b.dataset.m; $('#mchips').querySelectorAll('.chip').forEach(x => x.classList.toggle('on', x === b)); shown = 60; render(); };
  $('#hchips').onclick = $('#clinicalFilters').onclick = e => {
    const b = e.target.closest('.chip');
    if (!b) return;
    const k = b.dataset.k;
    if (st.has.has(k)) st.has.delete(k);
    else st.has.add(k);
    b.classList.toggle('on', st.has.has(k));
    if (b.hasAttribute('aria-pressed')) b.setAttribute('aria-pressed', st.has.has(k));
    shown = 60;
    render();
  };
  $('#ftis').onchange = e => { st.tissue = e.target.value; st.line = ''; fillLines(); shown = 60; render(); };
  $('#fline').onchange = e => { st.line = e.target.value; shown = 60; render(); };
  $('#ftime').onchange = e => { st.time = e.target.value; shown = 60; render(); };
  $('#flo').oninput = e => { st.lo = e.target.value === '' ? null : +e.target.value; shown = 60; render(); };
  $('#fhi').oninput = e => { st.hi = e.target.value === '' ? null : +e.target.value; shown = 60; render(); };
  $('#freset').onclick = () => { location.hash = '/compounds?r=' + Date.now(); };
  $('#sort').onchange = render;
  $('#more').onclick = () => { shown += 60; render(); };
  /* drawing: Ketcher (the build shipped with streamlit-ketcher), driven through the Streamlit component protocol */
  const kf = $('#kframe');
  const kRender = () => kf.contentWindow.postMessage({ isStreamlitMessage: true, type: 'streamlit:render', args: { molecule: $('#smi').value.trim(), height: 520, molecule_format: 'SMILES' }, dfs: [], disabled: false, theme: { base: 'light', primaryColor: '#5b4ae6', backgroundColor: '#ffffff', secondaryBackgroundColor: '#f0f2f6', textColor: '#15172a', font: 'Inter, sans-serif' } }, '*');
  onmessage = e => {
    const d = e.data; if (!d || e.source !== kf.contentWindow) return;
    if (d.type === 'streamlit:componentReady') kRender();
    if (d.type === 'streamlit:setFrameHeight') kf.style.height = Math.max(d.height, 520) + 'px';
    if (d.type === 'streamlit:setComponentValue' && typeof d.value === 'string') { $('#smi').value = d.value; $('#dmodal').hidden = true; run(); }
  };
  $('#sdraw').onclick = () => { $('#dmodal').hidden = false; if (!kf.src) kf.src = 'vendor/ketcher/index.html?v=2'; else kRender(); };
  $('#dclose').onclick = () => $('#dmodal').hidden = true;
  if (CS.smi && RD) preview();
  if (CS.smi && !CS.res) run(); else render();
}

/* ---------- paper ---------- */
async function paperPage(d) {
  const ids = IDX.papers[d] || [];
  app.innerHTML = `<div class="page"><p class="crumbs"><a href="#/">Home</a> / Paper</p>
    <div class="sec-head phead"><p class="eyebrow">Paper</p><h2>${tHtml(PM[d]?.t || d)}</h2>${PM[d] ? `<p>${esc(pAu(PM[d]))}</p><p><i>${esc(PM[d].j)}</i>, ${PM[d].y ?? ''}</p>` : ''}<p>Original article: ${doiExt(d)}</p></div>
    <section aria-labelledby="paperCompounds">
      <h3 id="paperCompounds">${ids.length} compound${ids.length === 1 ? '' : 's'}</h3>
      <div class="grid">${ids.map(i => card(BY[i])).join('')}</div>
    </section>
    <div id="paperData">${ids.length ? '<p class="muted" role="status">Loading study data…</p>' : ''}</div></div>`;
  scrollTo(0, 0);
  if (!ids.length) return;
  const data = $('#paperData');
  const results = await Promise.allSettled(ids.map(loadCompound));
  if (!data.isConnected) return;
  const compounds = results.filter(result => result.status === 'fulfilled').map(result => result.value);
  showPaperData(data, compounds, d, compounds.length !== ids.length);
}

function studyName(row) {
  return row.Abbreviation_in_the_article ?? row.abbreviation_in_the_article ?? row.paperCompound?.name ?? '–';
}

function studyNameCell(row) {
  const name = esc(studyName(row));
  const id = row.paperCompound?.id;
  return id ? `<a href="#/c/${id}">${name}</a><small>${id}</small>` : name;
}

function showPaperData(container, compounds, source, incomplete) {
  const doiKey = source.toLowerCase();
  const byId = new Map(compounds.map(c => {
    const rows = Object.fromEntries(Object.keys(KIND).map(kind => [kind, c[kind]
      .filter(r => String(r.DOI ?? r.doi ?? '').toLowerCase() === doiKey)
      .map(r => ({ ...r, paperCompound: { id: c.id, name: label(c) } }))]));
    const name = Object.values(rows).flat().find(r => r.Abbreviation_in_the_article || r.abbreviation_in_the_article);
    return [c.id, { rows, name: name ? studyName(name) : label(c) }];
  }));
  for (const [id, c] of byId) {
    if (!Object.values(c.rows).some(rows => rows.length)) byId.delete(id);
  }
  const state = incomplete ? '<p role="status">Some compound data could not be loaded.</p>' : '';
  container.innerHTML = state + (byId.size ? `<h3 class="paper-data-heading">Study data</h3>
    ${byId.size > 1 ? `<div class="record-controls"><label>Compound <select id="paperStudyCompound"><option value="">All compounds</option>
      ${[...byId].map(([id, c]) => `<option value="${id}">${esc(c.name)} · ${id}</option>`).join('')}
    </select></label></div>` : ''}
    <div id="paperStudySections"></div>` : '<p class="muted">No study records for this article.</p>');
  if (!byId.size) return;
  const picker = $('#paperStudyCompound', container);
  const target = $('#paperStudySections', container);
  const render = () => {
    hideTip();
    const selection = picker?.value ? [byId.get(picker.value)] : [...byId.values()];
    const rows = Object.fromEntries(Object.keys(KIND).map(k => [k, selection.flatMap(c => c.rows[k])]));
    const data = studyData(rows);
    target.innerHTML = studyNavigation(data.sections) + studySectionMarkup(data);
    bindSectionNavigation(target);
    fillStudySections(data);
  };
  if (picker) picker.onchange = render;
  render();
}

/* ---------- download and cite ---------- */
const AU_CT = 'Krasnov, L.; Malikov, D.; Kiseleva, M. A.; Nykhrikova, E. V.; Tatarin, S. V.; Bezzubov, S. I.';
const AU_LP = 'Krasnov, L.; Malikov, D.; Kiseleva, M. A.; Lvov, A.; Tatarin, S. V.; Bezzubov, S. I.';
const PAPERS = [
  { logo: 'img/medchem.svg', journal: 'J. Med. Chem.', db: 'MetalCytoToxDB', doi: '10.1021/acs.jmedchem.5c02755',
    title: 'Machine Learning Approach to Anticancer Activity Prediction of Transition-Metal Complexes Based on a Large-Scale Experimental Database',
    cite: `${AU_CT} Machine Learning Approach to Anticancer Activity Prediction of Transition-Metal Complexes Based on a Large-Scale Experimental Database. <i>J. Med. Chem.</i> <b>2026</b>, <i>69</i> (8), 8838–8851.`,
    bib: `@article{Krasnov2026CytoTox,\n  title = {Machine Learning Approach to Anticancer Activity Prediction of Transition-Metal Complexes Based on a Large-Scale Experimental Database},\n  author = {Krasnov, Lev and Malikov, Dmitry and Kiseleva, Marina A. and Nykhrikova, Ekaterina V. and Tatarin, Sergei V. and Bezzubov, Stanislav I.},\n  journal = {Journal of Medicinal Chemistry},\n  volume = {69}, number = {8}, pages = {8838--8851}, year = {2026},\n  doi = {10.1021/acs.jmedchem.5c02755}\n}` },
  { logo: 'img/jcim.png', journal: 'J. Chem. Inf. Model.', db: 'MetalLipoDB', doi: '10.1021/acs.jcim.6c03597',
    title: 'Beyond Organic Molecules: MetalLipoDB, a Lipophilicity Data Set for Metal Complexes and Machine Learning Benchmarks',
    cite: `${AU_LP} Beyond Organic Molecules: MetalLipoDB, a Lipophilicity Data Set for Metal Complexes and Machine Learning Benchmarks. <i>J. Chem. Inf. Model.</i> <b>2026</b>.`,
    bib: `@article{Krasnov2026MetalLipoDB,\n  title = {Beyond Organic Molecules: {MetalLipoDB}, a Lipophilicity Data Set for Metal Complexes and Machine Learning Benchmarks},\n  author = {Krasnov, Lev and Malikov, Dmitry and Kiseleva, Marina A. and Lvov, Artem and Tatarin, Sergei V. and Bezzubov, Stanislav I.},\n  journal = {Journal of Chemical Information and Modeling},\n  year = {2026},\n  doi = {10.1021/acs.jcim.6c03597}\n}` },
];
const ZEN = [
  { db: 'MetalCytoToxDB', doi: '10.5281/zenodo.20153879', title: 'MetalCytoToxDB: a dataset of transition metal complexes cytotoxicities against various cell lines',
    cite: 'Krasnov, L.; Malikov, D.; Kiseleva, M.; Nykhrikova, E.; Tatarin, S.; Bezzubov, S. MetalCytoToxDB: a Dataset of Transition Metal Complexes Cytotoxicities against Various Cell Lines. Zenodo, <b>2026</b>.' },
  { db: 'MetalLipoDB', doi: '10.5281/zenodo.23084573', title: 'MetalLipoDB: a dataset of experimental octanol-water lipophilicities of metal complexes',
    cite: 'Krasnov, L.; Malikov, D.; Kiseleva, M.; Lvov, A.; Tatarin, S.; Bezzubov, S. MetalLipoDB: a Dataset of Experimental Octanol-Water Lipophilicities of Metal Complexes. Zenodo, <b>2026</b>.' },
];
const doiUrl = d => `<a href="https://doi.org/${d}" target="_blank" rel="noopener">https://doi.org/${d}</a>`;
const plain = h => h.replace(/<[^>]+>/g, '');
function dataPage() {
  const S = IDX.stats;
  app.innerHTML = `<div class="page"><div class="sec-head"><p class="eyebrow">Download and cite</p><h2>Download and cite</h2>
  <p>If you use OpenBioMetalDB, please cite the papers describing the datasets.</p></div>
  <section class="sec"><h2>Papers</h2><p class="sub">Peer-reviewed descriptions of the datasets.</p>
    ${PAPERS.map((p, i) => `<div class="cite">
      <a class="jlogo" href="https://doi.org/${p.doi}" target="_blank" rel="noopener"><img src="${p.logo}" alt="${p.journal}"></a>
      <div><p class="dbname">${p.db}</p><p class="ctext">${p.cite} ${doiUrl(p.doi)}</p>
      <div class="cbtns"><button class="copy" data-c="p${i}">Copy citation</button><button class="copy" data-b="p${i}">Copy BibTeX</button></div></div></div>`).join('')}
  </section>
  <section class="sec"><h2>Datasets on Zenodo</h2><p class="sub">Versioned data files under CC BY 4.0. The DOI always resolves to the latest version.</p>
    ${ZEN.map((z, i) => `<div class="cite zen">
      <a class="zlogo" href="https://doi.org/${z.doi}" target="_blank" rel="noopener"><span>zenodo</span></a>
      <div><p class="dbname">${z.db}</p><p class="ctext">${z.cite} ${doiUrl(z.doi)}</p>
      <div class="cbtns"><a class="btn ghost" href="https://doi.org/${z.doi}" target="_blank" rel="noopener">Download from Zenodo</a><button class="copy" data-c="z${i}">Copy citation</button></div></div></div>`).join('')}
  </section>
  </div>`;
  const txt = k => k[0] === 'p' ? plain(PAPERS[+k.slice(1)].cite) + ' https://doi.org/' + PAPERS[+k.slice(1)].doi : plain(ZEN[+k.slice(1)].cite) + ' https://doi.org/' + ZEN[+k.slice(1)].doi;
  const done = b => { const t = b.textContent; b.textContent = 'Copied'; setTimeout(() => b.textContent = t, 1200); };
  app.querySelectorAll('[data-c]').forEach(b => b.onclick = () => { navigator.clipboard?.writeText(txt(b.dataset.c)); done(b); });
  app.querySelectorAll('[data-b]').forEach(b => b.onclick = () => { navigator.clipboard?.writeText(PAPERS[+b.dataset.b.slice(1)].bib); done(b); });
  scrollTo(0, 0);
}

/* ================= compound page ================= */
function studyData(c) {
  const dark = c.ic50.filter(r => (r[IC50_DARK] ?? r.IC50_Dark_value) != null);
  const light = c.ic50.filter(r => (r[IC50_LIGHT] ?? r.IC50_Light_value) != null);
  const controls = c.ic50.filter(r => r.role === 'study_control');
  const inVivo = IV.some(k => c[k].length);
  const sections = [
    (dark.length || controls.length) && ['ic', 'Cytotoxicity'],
    light.length && ['photo', PHOTO_LABEL],
    inVivo && ['iv', 'In vivo'],
    c.logp.length && ['lp', 'Lipophilicity'],
  ].filter(Boolean);
  return { c, dark, light, controls, inVivo, logp: c.logp, sections };
}

function studyNavigation(sections) {
  return `<nav class="secnav" aria-label="Data sections">${sections.map(([id, title]) =>
    `<a href="javascript:void(0)" data-to="#${id}">${sectionIcon(id)}${title}</a>`).join('')}</nav>`;
}

function bindSectionNavigation(container) {
  container.querySelectorAll('[data-to]').forEach(a => {
    a.onclick = () => {
      const section = $(a.dataset.to, container);
      const selector = section?.querySelector('[data-ic-type]');
      if (selector && a.dataset.type) {
        selector.value = a.dataset.type;
        selector.dispatchEvent(new Event('change', { bubbles: true }));
      }
      section?.scrollIntoView({ behavior: 'smooth' });
    };
  });
}

function studySectionMarkup({ dark, light, controls, inVivo, logp }) {
  return `${dark.length ? cytotoxicitySection('ic', 'Cytotoxicity', 'in the dark', 'var(--accent2)', dark.some(r => r.comparison && ic50Term(r.comparison.value, r.comparison.numeric).value > 0)) : ''}
  ${controls.length ? `<section class="sec" id="${dark.length ? 'icControlsOnly' : 'ic'}">
    <h2>${sectionIcon('ic')}${dark.length ? 'Cisplatin controls' : 'Cytotoxicity'}</h2>
    <p class="sub">Cisplatin controls from MetalCytoToxDB. Rows with the same DOI, cell line, exposure, method, type and result (including reported uncertainty) are grouped. Irradiation conditions for the controls are unspecified.</p>
    <div class="record-controls" id="controlFilters">
      <label>Search controls <input type="search" placeholder="Cell line, DOI or source ID"></label>
      <span role="status"></span>
      <button type="button" class="copy" data-step="-1">Previous</button>
      <button type="button" class="copy" data-step="1">Next</button>
    </div>
    <div class="dtab" id="controlTable"></div>
  </section>` : ''}
  ${light.length ? cytotoxicitySection('photo', PHOTO_LABEL, 'under irradiation', '#ffd166') : ''}
  ${inVivo ? ivSection() : ''}
  ${logp.length ? `<section class="sec" id="lp"><h2>${sectionIcon('lp')}Lipophilicity</h2><p class="sub">${logp.length} experimental measurement${logp.length === 1 ? '' : 's'} from MetalLipoDB. Hover over a point for conditions and source.</p><div id="lpPlot"></div><div class="dtab record-table lp-table" id="lpTab"></div></section>` : ''}`;
}

function fillStudySections({ c, dark, light, controls, inVivo, logp }, controlId) {
  if (dark.length) showCytotoxicity(dark, false);
  if (light.length) showCytotoxicity(light, true);
  if (controls.length) showCisplatinControls(controls, controlId);
  if (inVivo) fillIV(c);
  if (logp.length) showLipophilicity(logp);
}

function ionFormula(formula) {
  if (!formula) return '–';
  const charge = formula.match(/([+-])(\d*)$/);
  const composition = charge ? formula.slice(0, charge.index) : formula;
  const atoms = esc(composition).replace(/\d+/g, '<sub>$&</sub>');
  if (!charge) return atoms;
  const [, sign, magnitude] = charge;
  return `${atoms}<sup>${magnitude === '1' ? '' : magnitude}${sign === '-' ? '−' : '+'}</sup>`;
}

function clinicalDetails({ fda, drugbank, trials, max_phase, regional_approvals = {} }) {
  return `<dt>Clinical status</dt><dd class="clinical-status">
    ${fda ? `<div><a class="ms clinical-fda" href="${esc(fda.url)}" target="_blank" rel="noopener">${dataIcon('fda')}${CLINICAL_LABELS.fda} · ${esc(fda.year)}</a>
      <span class="clinical-context">${esc(fda.indication)}</span></div>` : ''}
    ${Object.entries(regional_approvals).map(([region, approval]) => `<div>
      <a class="ms clinical-${region}" href="${esc(approval.url)}" target="_blank" rel="noopener">${dataIcon(region)}${CLINICAL_LABELS[region]}${approval.year ? ` · ${esc(approval.year)}` : ''}</a>
      <span class="clinical-context">${esc([approval.brand, approval.number].filter(Boolean).join(' · '))}</span>
      ${approval.note ? `<p class="clinical-approval-note">${esc(approval.note)} ${approval.note_url ? `<a href="${esc(approval.note_url)}" target="_blank" rel="noopener">Source</a>` : ''}</p>` : ''}
    </div>`).join('')}
    ${trials?.length ? `<details><summary class="ms clinical-trials">${dataIcon('trials')}${clinicalPhaseLabel(max_phase)}</summary>
      <ul>${trials.map(t => `<li><a href="${esc(t.url)}" target="_blank" rel="noopener">${esc(t.id || 'Publication')}</a>${t.start_year
        ? ` · ${t.id ? '' : 'Started '}<time datetime="${esc(t.start_year)}" title="Study start year">${esc(t.start_year)}</time>`
        : t.publication_year ? ` · Published <time datetime="${esc(t.publication_year)}">${esc(t.publication_year)}</time>` : ''}
        ${t.start_year_url ? `<a class="clinical-context" href="${esc(t.start_year_url)}" target="_blank" rel="noopener">Start year source</a>` : ''}
        <span>${esc(['Phase ' + t.phase, t.completion_year ? `Completed in ${t.completion_year}` : t.status, t.role].filter(Boolean).join(' · '))}</span>
        ${t.protocol_phase ? `<span>Overall protocol: Phase ${esc(t.protocol_phase)}${t.phase_url ? ` · <a href="${esc(t.phase_url)}" target="_blank" rel="noopener">Cohort design</a>` : ''}</span>` : ''}
        ${t.enrollment_update ? `<span>${esc(t.enrollment_update)}${t.enrollment_url ? ` <a href="${esc(t.enrollment_url)}" target="_blank" rel="noopener">Sponsor update</a>` : ''}</span>` : ''}
        ${t.randomized_participants ? `<span>${esc(t.randomized_participants.toLocaleString('en'))} participants randomized</span>` : ''}
        ${t.outcome ? `<p>${esc(t.outcome)} ${t.results_url ? `<a href="${esc(t.results_url)}" target="_blank" rel="noopener">Published results</a>` : ''}</p>` : ''}
      </li>`).join('')}</ul></details>` : ''}
    ${drugbank ? `<a class="clinical-context" href="https://go.drugbank.com/drugs/${encodeURIComponent(drugbank)}" target="_blank" rel="noopener">DrugBank · ${esc(drugbank)}</a>` : ''}
  </dd>`;
}

async function compoundPage(id, controlId) {
  const s = BY[id];
  if (!s) { app.innerHTML = `<p class="empty">${esc(id)} not found</p>`; return; }
  app.innerHTML = `<p class="empty">Loading ${id}…</p>`;
  const c = await loadCompound(id);
  scrollTo(0, 0);
  const n = k => c[k]?.length || 0;
  const paperCount = c.dois.length;
  const data = studyData(c);
  const { dark, light, controls } = data;
  app.innerHTML = `<div class="page">
  <p class="crumbs"><a href="#/">Home</a> / <a href="#/compounds">Compounds</a> / <a href="#/compounds?metal=${esc(metalsOf(c.m)[0])}">${esc(c.m)}</a> / ${id}</p>
  <div class="chead">
    <div class="struct" style="aspect-ratio:21/17"><img src="s/${id}.svg" alt="" onerror="this.outerHTML='<span>No structure drawn</span>'"></div>
    <div>
      <div class="idrow"><span class="oidbig">${id}</span><button class="copy" data-copy="${id}">copy ID</button>${c.kt !== 'structure' ? '<span class="badge other">matched by ligands</span>' : ''}</div>
      <h1>${esc(label(c))}</h1>
      ${c.names.length > 1 ? `<p class="muted" style="margin:0">also ${c.names.slice(1, 10).map(esc).join(', ')}${c.names.length > 10 ? ' …' : ''}</p>` : ''}
      <dl class="props">
        ${c.clinical ? clinicalDetails(c.clinical) : ''}
        <dt>Metal</dt><dd>${esc(c.m)}</dd>
        <dt>Formula (ion)</dt><dd>${ionFormula(c.f)}</dd>
        <dt>Molecular weight</dt><dd>${Number.isFinite(c.molecular_weight) ? `${c.molecular_weight.toFixed(2)} g/mol` : '–'}</dd>
        ${c.iso ? `<dt>Isomer</dt><dd>${esc(c.iso)}</dd>` : ''}
        <dt>Salt forms</dt><dd>${c.salts.length ? c.salts.slice(0, 6).map(x => `<span class="saltchip">${esc(x)}</span>`).join('') : '<span class="muted">neutral or not stated</span>'}</dd>
        <dt>SMILES</dt><dd>${c.smi ? `<code class="smi">${esc(c.smi)}</code><button class="copy" data-copy="${esc(c.smi)}" style="margin-top:6px">copy SMILES</button>` : '<span class="muted">no structure in the source</span>'}</dd>
        ${c.ccdc?.length ? `<dt>CCDC</dt><dd>${c.ccdc.map(ccdcLink).join('')}</dd>` : ''}
        <dt>Data</dt><dd><div class="pills">${COMPOUND_DATA_ORDER.map(kind => {
          if (kind === 'photo') {
            return light.length ? `<button type="button" class="pill on" data-to="#photo">${dataIcon(kind)}${PHOTO_SHORT_LABEL} · ${light.length}</button>` : '';
          }
          if (kind === 'ic50') {
            const count = cytoCounts(c).IC50;
            if (!count) return '<span class="pill">IC<sub>50</sub></span>';
            const target = [...dark, ...controls].some(row => cytoType(row) === 'IC50') ? '#ic' : '#photo';
            return `<button type="button" class="pill on" data-type="IC50" data-to="${target}">${dataIcon(kind)}IC<sub>50</sub> · ${count}</button>`;
          }
          const count = n(kind);
          const text = kind === 'efficacy' ? 'in vivo' : KIND[kind];
          const target = DATA_SECTIONS[kind];
          return count ? `<button type="button" class="pill on" data-to="${target}">${dataIcon(kind)}${text} · ${count}</button>` : `<span class="pill">${text}</span>`;
        }).join('')}
        <button type="button" class="pill on" data-to="#lit" title="See literature">${paperCount} paper${paperCount === 1 ? '' : 's'}</button></div></dd>
      </dl>
      <p style="margin:16px 0 0"><a class="btn ghost" href="c/${id}.json" download="${id}.json">Download JSON</a></p>
    </div>
  </div>
  ${studyNavigation([...data.sections, ['lit', 'Literature']])}
  ${studySectionMarkup(data)}
  <section class="sec" id="lit">
    <h2>Literature</h2><p class="sub">${paperCount} ${paperCount === 1 ? 'paper reports' : 'papers report'} data for this compound.</p>
    ${paperCount > 1 ? `<div class="record-controls"><label>Sort by <select id="literatureSort">
      <option value="newest">Newest first</option><option value="oldest">Oldest first</option>
    </select></label></div>` : ''}
    <div class="lit"></div>
  </section>
  </div>`;
  bindSectionNavigation(app);
  app.querySelectorAll('[data-copy]').forEach(b => b.onclick = () => { navigator.clipboard?.writeText(b.dataset.copy); b.textContent = 'copied'; });
  fillStudySections(data, controlId);
  showLiterature(c);
}

function showLiterature(c) {
  const sort = $('#literatureSort');
  const list = $('#lit .lit');
  const papers = c.dois.map(d => {
    const kinds = Object.keys(KIND).filter(k => c[k]?.some(r => (r.DOI || r.doi) === d)).map(k => KIND[k]);
    const html = `<a class="row" href="#/paper/${encodeURIComponent(d)}"><span class="pref">${pRef(d, 3)}</span><span>${kinds.join(' · ')} · ${(IDX.papers[d] || []).length} compounds</span></a>`;
    return { doi: d, year: PM[d]?.y ?? null, html };
  });
  const render = () => {
    const direction = sort?.value === 'oldest' ? 1 : -1;
    papers.sort((a, b) => Number(a.year == null) - Number(b.year == null) ||
      direction * (a.year - b.year) || a.doi.localeCompare(b.doi));
    list.innerHTML = papers.map(paper => paper.html).join('');
  };
  if (sort) sort.onchange = render;
  render();
}

function cytotoxicityTable(container, cols) {
  let rows = [], sk = null, dir = 1, selected = null, first = 0, last;
  const draw = () => {
    const sortKey = cols.find(([key]) => key === sk)?.[3] ?? sk;
    const r = sk == null ? rows : rows.slice().sort((a, b) => { const x = a[sortKey], y = b[sortKey]; return (x == null) - (y == null) || (x < y ? -dir : x > y ? dir : 0); });
    container.innerHTML = `<table><tr>${cols.map(([k, l]) => `<th data-k="${k}">${l}${sk === k ? (dir > 0 ? ' ↑' : ' ↓') : ''}</th>`).join('')}</tr>` +
      r.slice(first, last).map(x => `<tr data-measurement="${x.rowId}" tabindex="-1"${x.rowId === selected ? ' class="ic-selected"' : ''}>` + cols.map(([k, , num, , render]) => `<td class="${num ? 'num' : ''}">${render ? render(x) : /doi/i.test(k) && x[k] ? doi(x[k]) : esc(num ? fmt(x[k], 3) : x[k] ?? '')}</td>`).join('') + '</tr>').join('') + '</table>';
    container.querySelectorAll('th').forEach(th => th.onclick = () => { dir = sk === th.dataset.k ? -dir : 1; sk = th.dataset.k; draw(); });
  };
  return {
    replace(next, start = 0, end = next.length) {
      rows = next;
      first = start;
      last = end;
      selected = null;
      draw();
      container.scrollTop = 0;
    },
    reveal(rowId) {
      const row = $(`tr[data-measurement="${rowId}"]`, container);
      if (!row) return;
      selected = rowId;
      $('.ic-selected', container)?.classList.remove('ic-selected');
      row.classList.add('ic-selected');
      row.scrollIntoView({ block: 'center', inline: 'nearest' });
      row.focus({ preventScroll: true });
    },
  };
}

function showCisplatinControls(controls, controlId) {
  const filters = $('#controlFilters');
  const search = $('input', filters);
  const status = $('[role="status"]', filters);
  const previous = $('[data-step="-1"]', filters);
  const next = $('[data-step="1"]', filters);
  const table = cytotoxicityTable($('#controlTable'), [
    ['Cell_line', 'Cell line'], ['Time(h)', 'Exposure, h', 1], ['Type', 'Type', false, null, r => esc(cytoLabel(cytoType(r)))],
    ['IC50', 'Value, µM', false, 'IC50_value'],
    ['Method', 'Method'], ['DOI', 'DOI'], ['Year', 'Year', 1],
    ['Measurement_ID', 'Source rows', false, null, row => {
      const links = row.source_measurements.map(source => source.compound_id
        ? `<a href="#/c/${encodeURIComponent(source.compound_id)}">${esc(source.id)}</a>` : esc(source.id));
      return links.length === 1 ? links[0] : `<details><summary>${links.length} source rows</summary>${links.join('<br>')}</details>`;
    }],
  ]);
  const entries = controls.map((r, rowId) => ({
    row: { ...r, rowId },
    searchText: [r.Cell_line, r.DOI, cytoType(r), ...r.source_measurements.flatMap(source => [source.id, source.compound_id])]
      .filter(Boolean).join(' ').toLowerCase(),
  }));
  const pageSize = 50;
  let matches = entries, start = 0;
  const render = () => {
    const end = Math.min(start + pageSize, matches.length);
    status.textContent = matches.length
      ? `${(start + 1).toLocaleString('en')}–${end.toLocaleString('en')} of ${matches.length.toLocaleString('en')} controls`
      : 'No matching controls';
    previous.disabled = start === 0;
    next.disabled = start + pageSize >= matches.length;
    table.replace(matches.map(entry => entry.row), start, end);
  };
  search.oninput = () => {
    const query = search.value.trim().toLowerCase();
    matches = entries.filter(e => e.searchText.includes(query));
    start = 0;
    render();
  };
  previous.onclick = () => { start -= pageSize; render(); };
  next.onclick = () => { start += pageSize; render(); };
  const linked = controlId && entries.find(e => e.row.source_measurements.some(source => source.id === controlId));
  if (linked) {
    search.value = controlId;
    search.oninput();
    table.reveal(linked.row.rowId);
  } else {
    render();
  }
}

/* strip chart, log or linear x */
const ic50BoundDirection = relation => ({ '<': -1, '≤': -1, '>': 1, '≥': 1 })[relation] ?? 0;

function strip(svg, groups, { log = true, unit = '', W = 1000, left = 170, domain, onSelect } = {}) {
  svg.innerHTML = '';
  const all = groups.flatMap(g => g.pts.map(p => p.v)).filter(v => v > 0 || !log);
  svg.style.display = all.length ? '' : 'none';
  if (!all.length) return;
  let [lo, hi] = domain ?? [Math.min(...all), Math.max(...all)];
  if (log) { lo = Math.pow(10, Math.floor(Math.log10(lo))); hi = Math.pow(10, Math.ceil(Math.log10(hi))); if (lo === hi) hi *= 10; }
  else { const pad = (hi - lo || 1) * .1; lo -= pad; hi += pad; }
  const T = v => log ? Math.log10(v) : v, X = v => left + (T(v) - T(lo)) / (T(hi) - T(lo)) * (W - left - 20);
  const rowH = 22;
  const H = groups.reduce((total, group) => total + (group.lanes?.length ?? 1), 0) * rowH + 40;
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  const ticks = log ? Array.from({ length: Math.round(Math.log10(hi / lo)) + 1 }, (_, i) => lo * Math.pow(10, i)) : Array.from({ length: 6 }, (_, i) => lo + i * (hi - lo) / 5);
  ticks.forEach(t => { el('line', { x1: X(t), x2: X(t), y1: 6, y2: H - 26, stroke: 'var(--line)' }, svg); el('text', { x: X(t), y: H - 8, 'text-anchor': 'middle' }, svg).textContent = (log ? (t >= 1 ? t : t.toPrecision(1)) : fmt(t, 1)) + (unit && t === ticks[ticks.length - 1] ? ' ' + unit : ''); });
  const drawPoint = (p, cy, delay) => {
    if (log && !(p.v > 0)) return;
    const cx = X(p.v);
    const direction = ic50BoundDirection(p.relation);
    let c;
    if (direction) {
      const end = cx + direction * 12, head = end - direction * 4;
      const path = `M${cx},${cy} H${end} M${head},${cy - 4} L${end},${cy} L${head},${cy + 4}`;
      c = el('g', { 'data-limit': p.relation }, svg);
      el('path', { d: path, fill: 'none', stroke: 'transparent', 'stroke-width': 10 }, c);
      el('path', { d: path, fill: 'none', stroke: p.col, 'stroke-width': p.ref ? 1.4 : 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, c);
    } else {
      c = el('circle', { cx, cy, r: p.ref ? 3.5 : 5, fill: p.col, 'fill-opacity': p.ref ? .6 : .85, stroke: p.ref ? 'none' : 'var(--card)', 'stroke-width': 1 }, svg);
    }
    c.setAttribute('role', 'button');
    c.setAttribute('tabindex', '0');
    c.setAttribute('aria-label', p.label);
    c.setAttribute('data-measurement', p.rowId);
    if (p.condition) c.setAttribute('data-ic-condition', p.condition);
    if (delay != null) {
      c.animate([{ opacity: 0, transform: 'scale(0)' }, { opacity: 1, transform: 'scale(1)' }], { duration: 500, delay, fill: 'backwards', easing: 'ease-out' });
      c.style.transformBox = 'fill-box'; c.style.transformOrigin = 'center';
    }
    c.onmousemove = e => showMeasurementTip(e, p.tip);
    c.onfocus = () => {
      const box = c.getBoundingClientRect();
      showMeasurementTip({ clientX: box.right, clientY: box.top }, p.tip);
    };
    c.onmouseleave = c.onblur = hideTip;
    c.onclick = () => { hideTip(); onSelect(p.rowId); };
    c.onkeydown = e => {
      if (e.key === 'Escape') hideTip();
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); c.onclick(); }
    };
  };
  let offset = 0;
  groups.forEach((g, i) => {
    const lanes = g.lanes?.length ?? 1;
    const start = 18 + offset * rowH;
    const center = start + (lanes - 1) * rowH / 2;
    offset += lanes;
    el('text', { x: left - 10, y: center + 4, 'text-anchor': 'end', class: 'lab' }, svg).textContent = g.label.length > 24 ? g.label.slice(0, 23) + '…' : g.label;
    el('line', { x1: left, x2: W - 20, y1: center, y2: center, stroke: 'var(--line)', 'stroke-dasharray': '2 4' }, svg);
    if (!g.lanes) {
      g.pts.forEach((p, j) => drawPoint(p, center + (Math.random() - .5) * 8, i * 25 + j * 8));
      return;
    }
    g.lanes.forEach(({ points, connect, bounded }, j) => {
      const [first, second] = points;
      const y = start + j * rowH;
      const separation = second && Math.abs(X(first.v) - X(second.v)) < 25 ? 5 : 0;
      if (second && connect) {
        const line = el('line', { x1: X(first.v), x2: X(second.v), y1: y - separation, y2: y + separation,
          class: bounded ? 'ic-pair-line ic-pair-bound' : 'ic-pair-line' }, svg);
        line.setAttribute('aria-hidden', 'true');
      }
      drawPoint(first, y - separation);
      if (second) drawPoint(second, y + separation);
    });
  });
}
function cytotoxicitySection(id, title, condition, color, reference = false) {
  return `<section class="sec" id="${id}"><h2>${sectionIcon(id)}${title}</h2>
    <p class="sub"><span data-cyto-type>IC₅₀</span> ${condition} by cell line, on a log scale. From MetalCytoToxDB.</p>
    <div class="record-controls" id="${id}Controls"></div>
    <div class="lgd" id="${id}Legend"><span><i style="background:${color}"></i>${condition}</span>${reference ? '<span><i style="background:var(--muted)"></i>cisplatin, same paper</span>' : ''}</div>
    <div class="ic-chart"><svg class="strip" id="${id}Strip"></svg></div><div class="dtab" id="${id}Tab"></div>
  </section>`;
}

function ic50Term(raw, numeric) {
  const text = String(raw ?? numeric ?? '').trim();
  const prefix = text.match(/^(>=|<=|[<>≤≥~≈])/)?.[0] ?? '';
  const relation = ({ '>=': '≥', '<=': '≤', '~': '≈' })[prefix] ?? prefix;
  const value = Number.isFinite(numeric) ? numeric : Number(text.slice(prefix.length).trim());
  return { value, relation };
}

function phototoxicityIndex(row) {
  const dark = ic50Term(row[IC50_DARK], row.IC50_Dark_value);
  const light = ic50Term(row[IC50_LIGHT], row.IC50_Light_value);
  const value = dark.value / light.value;
  if (!(dark.value > 0 && light.value > 0) || !Number.isFinite(value)) return { pi: '–' };

  const inverse = { '<': '>', '≤': '≥', '>': '<', '≥': '≤' };
  const signs = [dark.relation, inverse[light.relation] ?? light.relation];
  const lowerBound = signs.some(s => s === '>' || s === '≥');
  const upperBound = signs.some(s => s === '<' || s === '≤');
  const approximate = signs.includes('≈');
  if ((lowerBound && upperBound) || (approximate && (lowerBound || upperBound))) return { pi: '–' };

  const relation = lowerBound ? (signs.includes('>') ? '>' : '≥') :
    upperBound ? (signs.includes('<') ? '<' : '≤') : approximate ? '≈' : '';
  return { pi: relation + Number(value.toPrecision(4)), piSort: value };
}

function showCytotoxicity(rows, photo) {
  const id = photo ? 'photo' : 'ic';
  const raw = photo ? IC50_LIGHT : IC50_DARK;
  const numeric = photo ? 'IC50_Light_value' : 'IC50_Dark_value';
  const darkColor = 'var(--accent2)', lightColor = '#ffd166';
  const color = photo ? lightColor : darkColor;
  const conditions = [
    ['Excitation_Wavelength(nm)', 'Wavelength, nm', 'nm'],
    ['Irradiation_Time(minutes)', 'Irradiation, min', 'min irradiation'],
    ['Irradiation_Power(W*m^-2)', 'Irradiance, W/m²', 'W/m²'],
  ];
  const entries = rows.map((r, rowId) => {
    const type = cytoType(r);
    const typeLabel = cytoLabel(type);
    const line = r.Cell_line ?? '?';
    const exposure = String(r['Time(h)'] ?? '');
    const context = r.paperCompound ? [studyName(r)] : [];
    if (exposure) context.push(`${exposure} h exposure`);
    if (photo) for (const [key, , unit] of conditions) {
      if (r[key] != null) context.push(`${r[key]} ${unit}`);
    }
    const value = r[raw] ?? r[numeric];
    const fields = { conditions: [line, ...context].join(' · '), method: r.Method, counterion: r.Counterion, doi: r.DOI, year: r.Year };
    const point = (term, col, details, ref = false) => {
      if (!(term.value > 0) || !Number.isFinite(term.value)) return null;
      return { v: term.value, relation: term.relation, col, ref, rowId, label: details.join(', '), tip: measurementTip(details) };
    };
    const sampleTerm = ic50Term(r[raw], r[numeric]);
    const sample = point(sampleTerm, color, measurementDetails({ ...fields, result: `${typeLabel} ${value} µM` }));
    const points = [sample];
    if (!photo && r.comparison) {
      const { value, numeric } = r.comparison;
      const details = measurementDetails({ ...fields, counterion: null, result: `Cisplatin ${typeLabel} ${value} µM` });
      points.push(point(ic50Term(value, numeric), 'var(--muted)', details, true));
    }
    const ratio = photo ? phototoxicityIndex(r) : null;
    let lane = null;
    if (photo && sample) {
      const darkValue = r[IC50_DARK] ?? r.IC50_Dark_value;
      const darkTerm = ic50Term(r[IC50_DARK], r.IC50_Dark_value);
      const details = [
        `Dark vs Light ${typeLabel}`,
        `Dark: ${darkValue == null ? '–' : darkValue + ' µM'}`, `Light: ${value} µM`, `PI: ${ratio.pi}`,
        ...measurementDetails(fields),
      ];
      const dark = point(darkTerm, darkColor, details);
      const light = point(sampleTerm, lightColor, details);
      const bounded = !!(ic50BoundDirection(darkTerm.relation) || ic50BoundDirection(sampleTerm.relation));
      lane = {
        points: [...(dark ? [{ ...dark, condition: 'dark' }] : []), { ...light, condition: 'light' }],
        connect: !!dark && ratio.pi !== '–',
        bounded,
      };
    }
    const measurement = { ...r, [raw]: value, rowId, ...ratio };
    return { line, exposure, type, points: points.filter(Boolean), lane, measurement };
  });
  const measurements = cytotoxicityTable($(`#${id}Tab`), [
    ['Abbreviation_in_the_article', 'Name', false, null, studyNameCell], ['Cell_line', 'Cell line'], ['Time(h)', 'Exposure, h', 1],
    ['Type', 'Type', false, null, r => esc(cytoLabel(cytoType(r)))],
    [raw, 'Value, µM', false, numeric, row => {
      const comparison = row.comparison;
      return esc(row[raw]) + (comparison ? cisplatinComparison(comparison) : '');
    }], ...(photo ? [['pi', 'PI (Dark/Light)', false, 'piSort'], ...conditions.map(([key, title]) => [key, title])] : []),
    ['Counterion', 'Counterion'], ['Method', 'Method', false, null, r => r.Notes
      ? `<details class="ic-method-note"><summary>${esc(r.Method ?? 'Method details')}</summary><p>${esc(r.Notes)}</p></details>`
      : esc(r.Method)], ['DOI', 'DOI'], ['Year', 'Year', 1],
  ]);
  const getDomain = pointSets => {
    const values = pointSets.flat().map(p => p.v);
    return [Math.min(...values), Math.max(...values)];
  };
  const canCompare = entries.some(e => e.lane?.points.length === 2);
  const svg = $(`#${id}Strip`);
  const controls = $(`#${id}Controls`);
  const legend = $(`#${id}Legend`);
  const originalLegend = legend.innerHTML;
  const times = [...new Set(entries.map(e => e.exposure))].sort((a, b) => Number(!a) - Number(!b) || a.localeCompare(b, 'en', { numeric: true }));
  const types = [...new Set(entries.map(e => e.type))].sort((a, b) => Number(b === 'IC50') - Number(a === 'IC50') || a.localeCompare(b));
  if (times.length > 1 || canCompare || types.length > 1) {
    controls.innerHTML = (types.length > 1 ? `<label>Type <select data-ic-type>
      ${types.map(type => `<option value="${esc(type)}">${esc(cytoLabel(type))}</option>`).join('')}
    </select></label>` : '') + (times.length > 1 ? `<label>Exposure time <select data-ic-exposure><option value="">All exposure times</option>
      ${times.map((time, i) => `<option value="${i}">${time ? esc(time) + ' h' : 'Not reported'}</option>`).join('')}
    </select></label>` : '') + (canCompare ? `<label>View <select data-ic-view>
      <option value="paired" selected>Dark vs Light</option><option value="light">Light only</option>
    </select></label>` : '') + '<span role="status"></span>';
  }

  const render = () => {
    hideTip();
    const selection = $('select[data-ic-exposure]', controls)?.value;
    const paired = $('select[data-ic-view]', controls)?.value === 'paired';
    const type = $('select[data-ic-type]', controls)?.value || types[0];
    const typeEntries = entries.filter(e => e.type === type);
    const visible = selection ? typeEntries.filter(e => e.exposure === times[Number(selection)]) : typeEntries;
    $(`#${id} [data-cyto-type]`).textContent = cytoLabel(type);
    const by = new Map();
    for (const entry of visible) {
      if (!by.has(entry.line)) by.set(entry.line, []);
      by.get(entry.line).push(entry);
    }
    const groups = [...by].sort((a, b) => b[1].length - a[1].length).map(([line, group]) => {
      if (!paired) return { label: `${line} (${group.length})`, pts: group.flatMap(e => e.points) };
      const lanes = group.map(e => e.lane).filter(Boolean);
      return { label: `${line} (${lanes.length})`, lanes, pts: lanes.flatMap(lane => lane.points) };
    }).filter(group => !paired || group.lanes.length);
    const total = $('[role="status"]', controls);
    if (total) total.textContent = `${visible.length} of ${typeEntries.length} measurements`;
    measurements.replace(visible.map(e => e.measurement));
    svg.parentElement.classList.toggle('is-paired', paired);
    if (photo) {
      const dashed = paired && groups.some(g => g.lanes.some(lane => lane.connect && lane.bounded));
      legend.innerHTML = paired ? `<span><i style="background:${darkColor}"></i>Dark</span><span><i style="background:${lightColor}"></i>Light</span>
        ${dashed ? '<span><i class="ic-bound-key"></i>Dashed line to a reported limit</span>' : ''}` : originalLegend;
    }
    const domain = getDomain(typeEntries.map(e => paired ? e.lane?.points ?? [] : e.points));
    strip(svg, photo ? groups : groups.slice(0, 30), { unit: 'µM', domain, onSelect: rowId => measurements.reveal(rowId) });
  };
  controls.onchange = render;
  render();
}

function cisplatinComparison(comparison) {
  return `<div class="ic-comparison"><span aria-hidden="true">↳</span> <a href="${controlHref(comparison)}">Cisplatin</a> · ${esc(comparison.value)} µM</div>`;
}
const lpNumber = value => fmt(value, 4).replace(/^-/, '−');
const lpLimit = r => ['<', '>', '≤', '≥'].includes(r.value_relation);
const lpValue = r => {
  const relation = r.value_relation === '=' ? '' : r.value_relation ?? '';
  const uncertainty = r.std == null ? '' : ` ± ${lpNumber(r.std)}`;
  return r.value == null ? '–' : `${relation}${lpNumber(r.value)}${uncertainty}`;
};
const lpConditions = r => [r.pH != null && `pH ${r.pH}`, r.temperature_C != null && `${r.temperature_C} °C`].filter(Boolean).join(' · ');

function lpPointDetails(r) {
  return measurementDetails({
    result: [r.type_authors, lpValue(r)].filter(Boolean).join(' '),
    conditions: [r.paperCompound && studyName(r), r.aqueous_phase, lpConditions(r)].filter(Boolean).join(' · '),
    method: [r.method, r.detection].filter(Boolean).join(' · '),
    counterion: r.counterion, doi: r.doi, year: r.year,
  });
}

function lpPlot(rows) {
  const points = rows.filter(({ r }) => Number.isFinite(r.value)).sort((a, b) => a.r.value - b.r.value);
  if (!points.length) return '';
  const interval = r => Number.isFinite(r.std) && !lpLimit(r) ? r.std : 0;
  const min = Math.min(...points.map(({ r }) => r.value - interval(r)));
  const max = Math.max(...points.map(({ r }) => r.value + interval(r)));
  const pad = (max - min || 1) * .1;
  const lo = min - pad, hi = max + pad;
  const pos = v => 100 * (v - lo) / (hi - lo);
  const power = 10 ** Math.floor(Math.log10((hi - lo) / 5));
  const step = [1, 2, 5, 10].map(k => k * power).find(s => s >= (hi - lo) / 5);
  const ticks = [];
  for (let i = Math.ceil(lo / step); i <= Math.floor(hi / step); i++) ticks.push(i * step);
  const axis = ticks.map(t => `<span class="lp-tick${t === 0 ? ' lp-zero' : ''}" style="--x:${pos(t)}%">${lpNumber(t)}</span>`).join('');

  // Keep the reported x position. Offset nearby points vertically so each can be inspected.
  const lanes = [];
  const positioned = points.map(({ r, i }) => {
    const x = pos(r.value);
    let lane = lanes.findIndex(last => x - last >= 8);
    if (lane < 0) lane = lanes.length;
    lanes[lane] = x;
    return { r, i, x, lane };
  });
  const marks = positioned.map(({ r, i, x, lane }) => {
    const y = (lane - (lanes.length - 1) / 2) * 18;
    const direction = r.value_relation === '<' || r.value_relation === '≤' ? '←' : '→';
    const error = interval(r);
    return `${error ? `<i class="lp-error" style="--x:${pos(r.value - error)}%;--end:${pos(r.value + error)}%;--y:${y}px" aria-hidden="true"></i>` : ''}
      <button type="button" class="lp-mark${lpLimit(r) ? ' lp-limit' : ''}" style="--x:${x}%;--y:${y}px" data-lp-point="${i}" aria-label="${esc(lpPointDetails(r).join(', '))}">${lpLimit(r) ? `<span aria-hidden="true">${direction}</span>` : ''}</button>`;
  }).join('');
  return `<div class="lp-plot" role="group" aria-label="Experimental lipophilicity">
    <div class="lp-strip" style="--height:${Math.max(42, lanes.length * 18 + 12)}px">${marks}</div>
    <div class="lp-axis" aria-hidden="true">${axis}</div>
  </div>`;
}

function revealRecordDetails(details, block) {
  const body = $('.record-details-body', details);
  body.scrollIntoView({ block, inline: 'nearest' });
  body.focus({ preventScroll: true });
}

function showLipophilicity(records) {
  const rows = records.map((r, i) => ({ r, i }));
  const plot = $('#lpPlot'), table = $('#lpTab');
  const expanded = new Set();
  const columns = [['value', 'Result'], ['aqueous_phase', 'Conditions'], ['abbreviation_in_the_article', 'Name'], ['counterion', 'Counterion'], ['year', 'Source']];
  let sort = '', direction = 1;
  plot.innerHTML = lpPlot(rows);

  const draw = () => {
    const ordered = sort ? rows.slice().sort((a, b) => {
      const x = a.r[sort], y = b.r[sort];
      return (x == null) - (y == null) || (x < y ? -direction : x > y ? direction : 0);
    }) : rows;
    table.innerHTML = `<table aria-label="Lipophilicity measurements"><thead><tr>
      ${columns.map(([key, title]) => `<th scope="col"${sort === key ? ` aria-sort="${direction > 0 ? 'ascending' : 'descending'}"` : ''}><button type="button" data-lp-sort="${key}">${title}${sort === key ? (direction > 0 ? ' ↑' : ' ↓') : ''}</button></th>`).join('')}
      <th scope="col">Method</th>
    </tr></thead><tbody>${ordered.map(({ r, i }) => {
      const open = expanded.has(i), conditions = lpConditions(r);
      const method = [r.method, r.detection].filter(Boolean).map(esc).join(' · ');
      return `<tr>
        <td class="lp-result">${esc([r.type_authors, lpValue(r)].filter(Boolean).join(' '))}</td>
        <td>${esc(r.aqueous_phase || '–')}${conditions ? `<small>${esc(conditions)}</small>` : ''}</td>
        <td>${studyNameCell(r)}</td>
        <td><code>${esc(r.counterion || '–')}</code></td>
        <td>${r.doi ? doi(r.doi) : '–'}${r.year ? `<small>${esc(r.year)}</small>` : ''}</td>
        <td><button type="button" class="copy record-details-toggle" data-lp-method="${i}" aria-controls="lp-method-${i}" aria-expanded="${open}">Method details</button></td>
      </tr><tr id="lp-method-${i}" class="lp-method record-details"${open ? '' : ' hidden'}><td colspan="6"><div class="record-details-body" tabindex="-1">
        ${method ? `<b>${method}</b>` : ''}
        <p>${esc(r.method_description || 'No method description is available in MetalLipoDB for this measurement.')}</p>
      </div></td></tr>`;
    }).join('')}</tbody></table>`;
  };

  const setMethod = (i, open) => {
    const button = $(`[data-lp-method="${i}"]`, table);
    const details = $(`#lp-method-${i}`, table);
    if (open) expanded.add(i);
    else expanded.delete(i);
    details.hidden = !open;
    button.setAttribute('aria-expanded', open);
    return details;
  };
  table.onclick = event => {
    const method = event.target.closest('[data-lp-method]');
    if (method) {
      const i = +method.dataset.lpMethod;
      const open = !expanded.has(i);
      const details = setMethod(i, open);
      if (open && table.scrollLeft) revealRecordDetails(details, 'nearest');
      return;
    }
    const heading = event.target.closest('[data-lp-sort]');
    if (!heading) return;
    const key = heading.dataset.lpSort;
    direction = sort === key ? -direction : 1;
    sort = key;
    draw();
    $(`[data-lp-sort="${key}"]`, table).focus();
  };
  plot.querySelectorAll('[data-lp-point]').forEach(point => {
    const i = +point.dataset.lpPoint;
    const html = measurementTip(lpPointDetails(records[i]));
    const show = () => {
      const box = point.getBoundingClientRect();
      showMeasurementTip({ clientX: box.right, clientY: box.top }, html);
    };
    point.onmouseenter = point.onfocus = show;
    point.onmouseleave = point.onblur = hideTip;
    point.onkeydown = event => { if (event.key === 'Escape') hideTip(); };
    point.onclick = () => {
      hideTip();
      revealRecordDetails(setMethod(i, true), 'center');
    };
  });
  draw();
}

/* ================= in vivo block (from the in vivo prototype) ================= */
const ivSection = () => `<section class="sec" id="iv"><h2>${sectionIcon('iv')}In vivo</h2><p class="sub">Efficacy, toxicity, organ effects, biodistribution, pharmacokinetics and survival in animal models.</p>
  <div class="block" id="bEff"><h4>Tumour growth inhibition</h4>
    <div class="record-controls" id="effControls"></div>
    <div class="dtab record-table study-table" id="effTable"></div>
  </div>
  <div class="block" id="bBio"><h4>Biodistribution</h4>
    <div class="record-controls" id="bioControls"><label for="bioSel">Experiment <select id="bioSel"></select></label></div>
    <dl class="study-facts bio-context" id="bioContext"></dl>
    <div class="anatomy-layout">
      <div>
        <svg viewBox="0 65 600 245" class="xray" id="bioMouse" role="group" aria-label="Biodistribution by organ"></svg>
        <div class="legend" id="bioLegend"></div>
      </div>
      <div class="dtab bio-table" id="bioTable"></div>
    </div>
  </div>
  <div class="block" id="bOrg"><h4>Organ toxicity</h4>
    <div class="anatomy-layout">
      <svg viewBox="0 65 600 245" class="xray" id="cOrgMouse"></svg>
      <div class="ptab" id="orgTable"></div>
    </div>
  </div>
  <div class="block" id="bSafety"><h4>Safety biomarkers</h4><div class="dtab record-table study-table" id="biomarkerTable"></div></div>
  <div class="block" id="bTox"><h4>Acute toxicity</h4><div class="dtab record-table study-table" id="toxTable"></div></div>
  <div class="block" id="bPK"><h4>Pharmacokinetics</h4><div class="dtab record-table study-table" id="pkTable"></div></div>
  <div class="block" id="bSurv"><h4>Survival</h4>
    <div class="record-controls" id="survControls"></div>
    <div class="dtab record-table study-table" id="survTable"></div>
  </div>
</section>`;

const ORGANS = {
  brain: { path: 'M478,150 C480,132 516,128 530,146 C536,158 520,172 500,170 C486,168 476,162 478,150Z', lx: 505, ly: 124 },
  lung: { path: 'M362,160 C370,140 420,138 432,158 C440,178 428,196 404,194 C380,198 356,184 362,160Z', lx: 398, ly: 134 },
  heart: { path: 'M404,196 C396,184 380,190 384,202 C388,214 404,222 408,228 C412,222 428,212 430,202 C432,190 414,184 404,196Z', lx: 446, ly: 222 },
  liver: { path: 'M300,208 C306,186 370,184 384,204 C392,222 376,244 346,246 C316,248 296,230 300,208Z', lx: 340, ly: 264 },
  stomach: { path: 'M286,172 C296,160 322,164 324,182 C326,196 306,202 294,196 C282,190 280,180 286,172Z', lx: 300, ly: 154 },
  spleen: { path: 'M256,222 C262,212 296,212 300,222 C302,230 268,234 258,230Z', lx: 268, ly: 250 },
  kidney: { path: 'M236,166 C240,154 266,154 268,170 C270,182 258,188 252,180 C246,186 232,180 236,166Z', lx: 248, ly: 148 },
  intestine: { path: 'M180,238 C190,220 214,250 230,232 C246,214 262,250 250,262 C236,276 214,256 200,268 C186,280 170,254 180,238Z', lx: 214, ly: 286 },
  blood: { path: 'M150,200 C220,196 300,196 470,180', stroke: true, lx: 160, ly: 192 },
  tumor: { circle: [232, 122, 22], lx: 232, ly: 88 },
};
const ALIAS = { tumour: 'tumor', serum: 'blood', plasma: 'blood', 'blood cell pellet': 'blood', 'blood pellet': 'blood', 'small intestine': 'intestine', colon: 'intestine', urine: 'kidney', kidneys: 'kidney', lungs: 'lung' };
const SIL = 'M120,232 C108,150 200,104 300,108 C380,110 430,118 470,133 C522,148 560,170 573,190 C580,201 571,211 556,215 C520,226 480,242 440,263 C400,286 330,293 260,291 C190,289 128,272 120,232 Z';
function anatomy(svg, onPick) {
  svg.innerHTML = '';
  el('path', { d: SIL, class: 'silhouette' }, svg);
  el('ellipse', { cx: 452, cy: 122, rx: 30, ry: 36, class: 'silhouette' }, svg);
  el('path', { d: 'M128,238 C70,246 52,300 8,296', fill: 'none', stroke: 'var(--organ-line)', 'stroke-width': 3, 'stroke-dasharray': '4 5' }, svg);
  const nodes = {};
  for (const [name, o] of Object.entries(ORGANS)) {
    const n = o.circle ? el('circle', { cx: o.circle[0], cy: o.circle[1], r: o.circle[2], class: 'organ' }, svg) : el('path', { d: o.path, class: 'organ' }, svg);
    if (o.stroke) { n.style.fill = 'none'; n.setAttribute('stroke-width', 6); }
    n.dataset.organ = name; nodes[name] = n;
    if (onPick) n.addEventListener('click', () => onPick(name));
    el('text', { x: o.lx, y: o.ly, class: 'organ-label', 'text-anchor': 'middle' }, svg).textContent = name;
  }
  return nodes;
}
const ramp = t => { const st = [[44, 51, 96], [124, 108, 255], [34, 211, 197], [255, 245, 154]]; t = Math.max(0, Math.min(1, t)) * 3; const i = Math.min(2, Math.floor(t)), f = t - i; return `rgb(${st[i].map((c, k) => Math.round(c + (st[i + 1][k] - c) * f)).join(',')})`; };
const paint = (node, col, isStroke) => isStroke ? node.style.stroke = col : node.style.fill = col;
const organKey = o => { o = String(o).trim().toLowerCase(); return ALIAS[o] || o; };

function fillIV(c) {
  showEff(c); showBio(c); showOrgans(c); showBiomarkers(c); showTox(c); showPK(c); showSurv(c);
}

const hasTumourVolume = value => Number.isFinite(value) && value >= 0;

function tumourVolumeComparison(e) {
  const treated = e.result_tumor_volume_mm3, control = e.control_tumor_volume_mm3;
  const reference = e.reference_tumor_volume_mm3;
  if (e.Timepoint_days == null || !hasTumourVolume(treated) || !hasTumourVolume(control)) return '';
  const bars = [
    { label: 'Treated', kind: 'treated', volume: treated },
    { label: 'Control', kind: 'control', volume: control },
  ];
  if (hasTumourVolume(reference)) {
    bars.push({ label: 'Reference', kind: 'reference', volume: reference, drug: e.reference_drug });
  }
  const max = Math.max(...bars.map(bar => bar.volume));
  return `<div class="tgi-comparison"><b>Tumour volume at day ${esc(e.Timepoint_days)}</b>
    ${bars.map(({ label, kind, volume, drug }) => `<div class="tgi-bar tgi-bar-${kind}">
      <span>${label}${drug ? `<small>${esc(drug)}</small>` : ''}</span><div class="track" aria-hidden="true"><i style="width:${max ? volume / max * 100 : 0}%"></i></div>
      <strong>${esc(volume)} mm³</strong>
    </div>`).join('')}
  </div>`;
}

function showEff(c) {
  $('#bEff').hidden = !c.efficacy.length;
  if (!c.efficacy.length) return;
  const controls = $('#effControls'), table = $('#effTable');
  const entries = c.efficacy.map(e => {
    const model = [e.Cell_line_inoculated, e.Model].filter(Boolean).join(' · ') || 'Not reported';
    const modality = e.Activation_modality;
    const activation = e.Activation_therapy || (modality === 'none' ? 'No activation' : modality || 'Not reported');
    return { e, model, activation };
  });
  const filters = [['model', 'Model', 'All models'], ['activation', 'Activation', 'All activation types']].map(([key, label, all]) => ({
    key, label, all, options: [...new Set(entries.map(entry => entry[key]))].sort((a, b) => a.localeCompare(b)),
  })).filter(filter => filter.options.length > 1);
  const showActivation = entries.some(({ activation }) => activation !== 'No activation' && activation !== 'Not reported');
  if (filters.length) {
    controls.innerHTML = filters.map(({ key, label, all, options }) => `<label>${label}
      <select data-filter="${key}"><option value="">${all}</option>
      ${options.map(option => `<option value="${esc(option)}">${esc(option)}</option>`).join('')}</select></label>`).join('') + '<span role="status"></span>';
  }
  const headers = ['Treatment', 'Model', 'Group size', 'Dose / route', ...(showActivation ? ['Activation'] : []), 'Day', 'TGI by volume, %', 'TGI by weight, %', 'Source'];
  const fields = [
    ['schedule', 'Dosing schedule'], ['dosing_days', 'Dosing days'], ['Dose_umol_kg', 'Dose (µmol/kg)'],
    ['Experiment', 'Experiment'], ['Sex', 'Sex'], ['vehicle', 'Control vehicle'],
    ['baseline_volume_mm3', 'Treated baseline volume (mm³)'], ['control_baseline_volume_mm3', 'Control baseline volume (mm³)'],
    ['result_tumor_weight_g', 'Treated tumour weight (g)'], ['control_tumor_weight_g', 'Control tumour weight (g)'],
    ['TGI_volume_delta', 'TGI by volume change (%)'],
    ['reference_drug', 'Reference drug'], ['reference_dose_mg_kg', 'Reference dose (mg/kg)'],
    ['reference_TGI_volume', 'Reference TGI by volume (%)'], ['reference_TGI_weight', 'Reference TGI by weight (%)'],
    ['max_weight_loss_pct', 'Maximum weight loss (%)'], ['drug_related_deaths', 'Drug-related deaths'],
    ['Light_wavelength_nm', 'Wavelength (nm)'], ['Light_dose_J_cm2', 'Light dose (J/cm²)'], ['Light_power_mW', 'Light power (mW)'],
  ];
  const render = () => {
    const selects = [...controls.querySelectorAll('select')];
    const visible = entries.filter(entry => selects.every(s => !s.value || entry[s.dataset.filter] === s.value));
    const status = $('[role="status"]', controls);
    if (status) status.textContent = `${visible.length} of ${entries.length} experiments`;
    table.classList.toggle('study-table-scroll', visible.length > 12);
    table.scrollTop = 0;
    if (!visible.length) {
      table.innerHTML = '<p class="study-empty">No experiments match these filters.</p>';
      return;
    }
    const records = visible.map(({ e, model, activation }) => {
      const treatment = [e.Formulation, e.Treatment_context === 'combination' && 'Combination'].filter(Boolean).join(' · ');
      const dose = e.Dose_mg_kg != null ? `${e.Dose_mg_kg} mg/kg` : e.Dose_umol_kg != null ? `${e.Dose_umol_kg} µmol/kg` : null;
      const comparison = tumourVolumeComparison(e);
      return {
        cells: [
          `<td>${studyNameCell(e)}${treatment ? `<small>${esc(treatment)}</small>` : ''}</td>`,
          `<td>${esc(model)}${e.Target === 'distant_tumor' ? '<small>Distant tumour</small>' : ''}</td>`,
          `<td class="study-result">${esc(e.Group_size ?? '–')}</td>`,
          `<td>${esc([dose, e.Route].filter(Boolean).join(' · ') || '–')}</td>`,
          ...(showActivation ? [`<td>${esc(activation)}</td>`] : []),
          ...[e.Timepoint_days, e.TGI_volume, e.TGI_weight].map(value => `<td class="study-result">${esc(value ?? '–')}</td>`),
          `<td>${e.DOI ? doi(e.DOI) : '–'}</td>`,
        ],
        facts: [
          ['Animals', [e.Species, e.Strain].filter(Boolean).join(' ')],
          ['Tumour target', ({ primary_tumor: 'Primary tumour', distant_tumor: 'Distant tumour' })[e.Target] ?? e.Target],
          ...fields.map(([key, title]) => [title, e[key]]),
          ...(!comparison ? [['Treated tumour volume (mm³)', e.result_tumor_volume_mm3], ['Control tumour volume (mm³)', e.control_tumor_volume_mm3]] : []),
          ['Reference tumour volume (mm³)', comparison && hasTumourVolume(e.reference_tumor_volume_mm3) ? null : e.reference_tumor_volume_mm3],
        ],
        comparison,
      };
    });
    renderStudyTable(table, 'Tumour growth inhibition experiments', headers, records);
  };
  controls.onchange = render;
  render();
}

const bioUnit = b => String(b.Unit ?? '').replace(/\bug\b/g, 'µg');
const bioTime = b => [
  b.Time_after_last_dose_h != null && `${b.Time_after_last_dose_h} h after last dose`,
  b.Timepoint_days != null && `Study day ${b.Timepoint_days}`,
].filter(Boolean).join(' · ');

function bioScaleKey(b) {
  const context = b.context ?? {};
  if (!b.consistent_context || !b.DOI || !b.Unit || !b.Method || !b.Formulation || !b.Route || !context.Analyte || !context.schedule ||
      (b.Dose_mg_kg == null && context.Dose_umol_kg == null) || !bioTime(b)) return null;
  return JSON.stringify([b.DOI, b.paperCompound?.id, b.Abbreviation_in_the_article, b.Formulation, b.Route, b.Dose_mg_kg, b.Unit, b.Method,
    b.Cell_line_inoculated, b.Time_after_last_dose_h != null ? 'after-dose' : 'study-day', context]);
}

function showBio(c) {
  const sets = c.biodist;
  $('#bBio').hidden = !sets.length;
  if (!sets.length) return;
  const select = $('#bioSel'), series = new Map();
  $('#bioControls').hidden = sets.length === 1;
  const scales = sets.map((b, i) => {
    const unit = bioUnit(b), key = bioScaleKey(b);
    const label = [studyName(b), b.paperCompound?.id, bioTime(b), b.Method, unit].filter(Boolean).join(' · ');
    select.add(new Option(label, i));
    const maximum = Math.max(0, ...Object.values(b.tissues));
    if (!key) return { maximum, count: 1 };
    if (!series.has(key)) series.set(key, { maximum, count: 0 });
    const scale = series.get(key);
    scale.maximum = Math.max(scale.maximum, maximum);
    scale.count++;
    return scale;
  });
  select.onchange = () => drawBio(sets[select.value], scales[select.value]);
  drawBio(sets[0], scales[0]);
}

function drawBio(b, scale) {
  hideTip();
  const table = $('#bioTable'), unit = bioUnit(b), context = b.context ?? {};
  const dose = [
    b.Dose_mg_kg != null && `${b.Dose_mg_kg} mg/kg`,
    context.Dose_umol_kg != null && `${context.Dose_umol_kg} µmol/kg`,
    b.Route,
  ].filter(Boolean).join(' · ');
  const metadata = [
    ['Label in article', b.Abbreviation_in_the_article], ['Formulation', b.Formulation],
    ['Dose / route', dose], ['Sampling time', bioTime(b)], ['Analyte', context.Analyte],
    ['Method', b.Method], ['Unit', unit],
  ];
  $('#bioContext').innerHTML = metadata.filter(([, value]) => value != null && value !== '')
    .map(([label, value]) => `<div><dt>${label}</dt><dd>${esc(value)}</dd></div>`).join('') +
    (b.DOI ? `<div><dt>Source</dt><dd>${doi(b.DOI)}</dd></div>` : '');

  const byOrgan = new Map();
  const samples = Object.entries(b.tissues).sort((a, z) => z[1] - a[1]).map(([tissue, value]) => {
    const key = organKey(tissue);
    const organ = tissue.trim().toLowerCase() !== 'urine' && Object.hasOwn(ORGANS, key) ? key : null;
    const sample = { tissue, value, organ };
    if (organ) {
      if (!byOrgan.has(organ)) byOrgan.set(organ, []);
      byOrgan.get(organ).push(sample);
    }
    return sample;
  });
  table.innerHTML = `<table aria-label="Biodistribution measurements">
    <thead><tr><th scope="col">Tissue / sample</th><th scope="col">Value${unit ? ` <small>${esc(unit)}</small>` : ''}</th></tr></thead>
    <tbody>${samples.map(({ tissue, value, organ }) => `<tr${organ ? ` data-bio-organ="${organ}"` : ''}>
      <td>${organ ? `<button type="button" aria-pressed="false">${esc(tissue)}</button>` : esc(tissue)}</td>
      <td class="num">${esc(value)}</td>
    </tr>`).join('')}</tbody></table>`;

  const maximum = scale.maximum;
  $('#bioLegend').innerHTML = maximum > 0 ? `<span>0</span><i aria-hidden="true"></i><span>${esc([maximum, unit].filter(Boolean).join(' '))}</span>` :
    `<span>${esc([0, unit].filter(Boolean).join(' '))}</span>`;
  if (scale.count > 1) $('#bioLegend').insertAdjacentHTML('beforeend', '<span class="bio-scale-note">Shared scale across time points</span>');
  let selected = null;
  const nodes = anatomy($('#bioMouse'), organ => selectOrgan(organ, true));
  for (const [organ, node] of Object.entries(nodes)) {
    const matches = byOrgan.get(organ);
    if (!matches) {
      node.classList.add('bio-unmeasured');
      continue;
    }
    const color = matches.length === 1 ? ramp(maximum ? matches[0].value / maximum : 0) : 'var(--muted)';
    paint(node, color, ORGANS[organ].stroke);
    const values = matches.map(({ tissue, value }) => [tissue, value, unit].filter(v => v !== '').join(' '));
    const tipLines = [organ, ...values];
    node.setAttribute('role', 'button');
    node.setAttribute('tabindex', '0');
    node.setAttribute('aria-label', tipLines.join(', '));
    node.setAttribute('aria-pressed', 'false');
    const html = measurementTip(tipLines);
    node.onmousemove = event => showMeasurementTip(event, html);
    node.onfocus = () => {
      const box = node.getBoundingClientRect();
      showMeasurementTip({ clientX: box.right, clientY: box.top }, html);
    };
    node.onmouseleave = node.onblur = hideTip;
    node.onkeydown = event => {
      if (event.key === 'Escape') hideTip();
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); selectOrgan(organ, true); }
    };
  }
  table.onclick = event => {
    const row = event.target.closest('tr[data-bio-organ]');
    if (row) selectOrgan(row.dataset.bioOrgan, false);
  };

  function selectOrgan(organ, scroll) {
    if (!byOrgan.has(organ)) return;
    hideTip();
    selected = selected === organ ? null : organ;
    Object.entries(nodes).forEach(([key, node]) => {
      node.classList.toggle('sel', key === selected);
      if (byOrgan.has(key)) node.setAttribute('aria-pressed', key === selected);
    });
    table.querySelectorAll('tr[data-bio-organ]').forEach(row => {
      const active = row.dataset.bioOrgan === selected;
      row.classList.toggle('bio-selected', active);
      $('button', row).setAttribute('aria-pressed', active);
    });
    if (scroll && selected) $('.bio-selected', table)?.scrollIntoView({ block: 'nearest' });
  }
}
function showOrgans(c) {
  const rows = c.organs; $('#bOrg').hidden = !rows.length; if (!rows.length) return;
  const showCompound = rows.some(r => r.paperCompound);
  const by = {};
  rows.forEach(r => String(r.Organ).split(';').forEach(o => { const k = organKey(o); (by[k] = by[k] || []).push(r); }));
  const nodes = anatomy($('#cOrgMouse'), o => table(o));
  for (const [k, n] of Object.entries(nodes)) {
    const rs = by[k]; if (!rs) { n.style.opacity = .3; continue; }
    const ch = rs.filter(r => r.Outcome && r.Outcome !== 'no_change').length / rs.length;
    setTimeout(() => paint(n, ch ? `color-mix(in srgb, var(--hot) ${30 + 70 * ch}%, var(--organ))` : 'var(--accent2)', ORGANS[k].stroke), 200);
    n.onmousemove = e => showTip(e, `<b>${k}</b><br>${rs.length} records · ${Math.round(ch * 100)}% changed`); n.onmouseleave = hideTip;
  }
  function table(o) {
    Object.entries(nodes).forEach(([k, n]) => n.classList.toggle('sel', k === o));
    const rs = o ? by[o] || [] : rows;
    $('#orgTable').innerHTML = `<table><tr>${showCompound ? '<th>Compound</th>' : ''}<th>Organ</th><th>Parameter</th><th>Dose / route</th><th>Outcome</th><th>DOI</th></tr>` +
      rs.map(r => `<tr>${showCompound ? `<td>${studyNameCell(r)}</td>` : ''}<td>${esc(r.Organ)}</td><td>${esc(r.Parameter ?? r.Method ?? '–')}</td><td>${esc(studyDose(r))}</td><td class="o-${esc(r.Outcome)}">${esc(r.Outcome?.replaceAll('_', ' ') ?? '–')}</td><td>${r.DOI ? doi(r.DOI) : '–'}</td></tr>`).join('') + '</table>';
  }
  table(null);
}

function studyDose(row) {
  const dose = row.Dose_mg_kg == null ? '' : `${row.Dose_mg_kg} mg/kg`;
  return [dose, row.Route].filter(Boolean).join(' · ') || '–';
}

function showBiomarkers(c) {
  const rows = c.biomarkers ?? [];
  $('#bSafety').hidden = !rows.length;
  if (!rows.length) return;
  const table = $('#biomarkerTable');
  const showOutcome = rows.some(row => row.Outcome);
  const headers = ['Biomarker', 'Sample / organ', 'Treatment', 'Treated', 'Control', 'Unit', 'Dose / route', 'Day', ...(showOutcome ? ['Outcome'] : []), 'DOI'];
  table.classList.toggle('study-table-scroll', rows.length > 12);
  table.innerHTML = `<table aria-label="Safety biomarkers measurements"><thead><tr>
    ${headers.map(header => `<th scope="col">${header}</th>`).join('')}
  </tr></thead><tbody>${rows.map(r => `<tr>
    <td>${esc(r.Parameter ?? '–')}${r.Method ? `<small>${esc(r.Method.replaceAll('_', ' '))}</small>` : ''}</td>
    <td>${esc(r.Organ ?? '–')}</td>
    <td>${studyNameCell(r)}${r.Species ? `<small>${esc(r.Species)}</small>` : ''}</td>
    <td class="study-result">${esc(r.value_treated ?? '–')}</td>
    <td class="study-result">${esc(r.value_control ?? '–')}</td>
    <td>${esc(r.Unit ?? '–')}</td>
    <td>${esc(studyDose(r))}</td>
    <td class="study-result">${esc(r.Timepoint_days ?? '–')}</td>
    ${showOutcome ? `<td>${esc(r.Outcome?.replaceAll('_', ' ') ?? '–')}</td>` : ''}
    <td>${r.DOI ? doi(r.DOI) : '–'}</td>
  </tr>`).join('')}</tbody></table>`;
}

function renderStudyTable(table, name, headings, records) {
  const prefix = table.id.replace(/Table$/, '');
  const headers = [...headings, 'Protocol'];
  table.innerHTML = `<table aria-label="${esc(name)}"><thead><tr>${headers.map(h => `<th scope="col">${h}</th>`).join('')}</tr></thead>
    <tbody>${records.map(({ cells, facts, comparison = '' }, i) => {
      const id = `${prefix}-details-${i}`;
      const details = facts.filter(([, value]) => value != null && value !== '').map(([label, value]) =>
        `<div><dt>${label}</dt><dd>${esc(value)}</dd></div>`).join('');
      const hasDetails = details || comparison;
      return `<tr>${cells.join('')}
        <td>${hasDetails ? `<button type="button" class="copy record-details-toggle" aria-controls="${id}" aria-expanded="false">Study details</button>` : '–'}</td>
      </tr>${hasDetails ? `<tr id="${id}" class="record-details" hidden><td colspan="${headers.length}">
        <div class="record-details-body" tabindex="-1">${comparison}${details ? `<dl class="study-facts">${details}</dl>` : ''}</div>
      </td></tr>` : ''}`;
    }).join('')}</tbody></table>`;
  table.onclick = event => {
    const button = event.target.closest('button[aria-controls]');
    if (!button) return;
    const details = document.getElementById(button.getAttribute('aria-controls'));
    const open = details.hidden;
    details.hidden = !open;
    button.setAttribute('aria-expanded', open);
    if (open && (table.scrollLeft || details.getBoundingClientRect().bottom > table.getBoundingClientRect().bottom)) revealRecordDetails(details, 'nearest');
  };
}

function showTox(c) {
  $('#bTox').hidden = !c.toxicity.length;
  if (!c.toxicity.length) return;
  const fields = [
    ['doses_tested_mg_kg', 'Doses tested (mg/kg)'], ['Observation_period_days', 'Observation (days)'],
    ['survival_pct', 'Survival (%)'], ['max_weight_loss_pct', 'Maximum weight loss (%)'],
    ['Group_size', 'Group size'], ['Sex', 'Sex'], ['Age', 'Age'], ['Body_weight_range_g', 'Body weight (g)'],
    ['Vehicle', 'Vehicle'], ['Fasted', 'Fasted'], ['LD50_calculation_method', `${LD50} calculation method`],
  ];
  const records = c.toxicity.map(t => ({
    cells: [
      `<td class="study-result">${esc(t.LD50_mg_kg ?? '–')}</td>`,
      `<td class="study-result">${esc(t.MTD_mg_kg ?? '–')}</td>`,
      `<td>${studyNameCell(t)}</td>`,
      `<td>${esc([t.Species, t.Strain].filter(Boolean).join(' ') || '–')}</td>`,
      `<td>${esc(t.Route ?? '–')}</td>`,
      `<td>${esc(t.administration_type?.replaceAll('_', ' ') || '–')}</td>`,
      `<td>${t.DOI ? doi(t.DOI) : '–'}</td>`,
    ],
    facts: fields.map(([key, title]) => [title, key === 'Fasted' ? (({ TRUE: 'Yes', FALSE: 'No' })[t[key]] ?? t[key]) : t[key]]),
  }));
  renderStudyTable($('#toxTable'), 'Acute toxicity experiments',
    [`${LD50}, mg/kg`, 'MTD, mg/kg', 'Label in article', 'Animals', 'Route', 'Dosing', 'Source'], records);
}

function showPK(c) {
  $('#bPK').hidden = !c.pk.length;
  if (!c.pk.length) return;
  const endpoints = [
    ['t_half_h', 't½', 'h'], ['Tmax_h', 'T<sub>max</sub>', 'h'], ['Cmax_ug_mL', 'C<sub>max</sub>', 'µg/mL'],
    ['AUC_0_t_ug_h_mL', 'AUC<sub>0–t</sub>', 'µg·h/mL'], ['AUC_0_inf_ug_h_mL', 'AUC<sub>0–∞</sub>', 'µg·h/mL'],
  ].filter(([key]) => c.pk.some(p => p[key] != null));
  const quantity = (value, unit) => value == null ? null : [value, unit].filter(v => v != null && v !== '').join(' ');
  const records = c.pk.map(p => {
    const animals = [p.Species, p.Strain].filter(Boolean).join(' ');
    const dose = [quantity(p.Dose_mg_kg, 'mg/kg'), p.Route].filter(Boolean).join(' · ');
    const study = [p.Formulation !== 'free complex' && p.Formulation, animals, dose].filter(Boolean).join(' · ');
    return {
      cells: [
        `<td>${studyNameCell(p)}${study ? `<small>${esc(study)}</small>` : ''}</td>`,
        `<td>${esc(p.Analyte ?? '–')}${p.Matrix ? `<small>${esc(p.Matrix)}</small>` : ''}</td>`,
        ...endpoints.map(([key]) => `<td class="study-result">${esc(p[key] ?? '–')}</td>`),
        `<td>${p.DOI ? doi(p.DOI) : '–'}</td>`,
      ],
      facts: [
        ['Clearance (CL)', quantity(p.CL, p.CL_unit)], ['Volume of distribution (Vd)', quantity(p.Vd, p.Vd_unit)],
        ['Mean residence time (h)', p.MRT_h], ['PK model', p.PK_model],
        ['Formulation', p.Formulation], ['Dosing', p.Dosing], ['Counterion', p.Counterion],
        ['Group size', p.Group_size], ['Sex', p.Sex],
        ['Tumour bearing', ({ TRUE: 'Yes', FALSE: 'No' })[p.Tumor_bearing] ?? p.Tumor_bearing],
      ],
    };
  });
  renderStudyTable($('#pkTable'), 'Pharmacokinetics experiments',
    ['Treatment', 'Analyte / matrix', ...endpoints.map(([, title, unit]) => `${title} <small>${unit}</small>`), 'Source'], records);
}
function survivalComparison(row) {
  const treated = row.median_survival_days, control = row.control_median_survival_days;
  if (![treated, control].every(value => Number.isFinite(value) && value >= 0)) return '';
  const step = Math.max(1, Math.ceil(Math.max(treated, control) / 4));
  const x = days => 20 + 380 * days / (step * 4);
  const treatedColor = treated >= control ? 'var(--accent2)' : 'var(--hot)';
  const ticks = [0, 1, 2, 3, 4].map(i => {
    const day = i * step, position = x(day);
    return `<line x1="${position}" x2="${position}" y1="8" y2="37" stroke="var(--line)"/>
      <text x="${position}" y="52" text-anchor="middle">${day} d</text>`;
  }).join('');
  return `<figure class="surv-comparison">
    <figcaption><b>Median survival</b><span class="surv-key"><i></i>Control ${control} days</span>
      <span class="surv-key" style="--point-color:${treatedColor}"><i></i>Treated ${treated} days</span></figcaption>
    <svg viewBox="0 0 420 58" role="img" aria-label="Median survival in days. Control ${control}, treated ${treated}.">
      ${ticks}
      <line x1="${x(control)}" x2="${x(treated)}" y1="23" y2="23" stroke="${treatedColor}" stroke-width="3"/>
      <circle cx="${x(treated)}" cy="23" r="6" fill="${treatedColor}"><title>Treated ${treated} days</title></circle>
      <circle cx="${x(control)}" cy="23" r="${control === treated ? 3 : 5}" fill="var(--muted)"><title>Control ${control} days</title></circle>
    </svg>
  </figure>`;
}

function survivalResults(row) {
  const results = [];
  const duration = (kind, label, treated, control) => {
    if (treated == null && control == null) return;
    const value = treated == null ? `Control ${control} days` :
      `${treated}${control == null ? '' : ` vs ${control}`} days`;
    results.push({ kind, label, value });
  };
  duration('median', 'Median', row.median_survival_days, row.control_median_survival_days);
  duration('mean', 'Mean', row.mean_survival_days, row.control_mean_survival_days);
  if (row.ILS_pct != null) {
    const value = `${row.ILS_pct > 0 && Number.isFinite(row.ILS_pct) ? '+' : ''}${row.ILS_pct}%`;
    results.push({ kind: 'ils', label: 'ILS', value });
  }
  if (row.survivors_end_n != null || row.survivors_end_pct != null) {
    const count = row.survivors_end_n;
    const size = row.Group_size;
    const value = count != null
      ? Number.isInteger(count) && Number.isInteger(size) && size > 0 && count >= 0 && count <= size
        ? `${count}/${size}` : `${count} animals`
      : `${row.survivors_end_pct}%`;
    const when = row.Observation_days == null ? '' : ` at day ${row.Observation_days}`;
    const label = ['tumour-volume threshold', 'tumour appearance', 'humane', 'death or humane'].includes(row.Endpoint) ? 'Event-free' : 'Survived';
    results.push({ kind: 'end', label, value: value + when });
  }
  if (row.toxic_deaths != null) results.push({ kind: 'deaths', label: 'Drug-related deaths', value: row.toxic_deaths });
  if (!results.length) results.push({ kind: 'other', label: 'Follow-up', value: row.Observation_days == null ? 'See study details' : `${row.Observation_days} days` });
  return results;
}

function showSurv(c) {
  const block = $('#bSurv'), controls = $('#survControls'), table = $('#survTable');
  block.hidden = !c.survival.length;
  if (block.hidden) return;
  const entries = c.survival.map(row => ({
    row,
    model: [row.Cell_line_inoculated, row.Model].filter(Boolean).join(' · ') || 'Not reported',
    results: survivalResults(row),
  }));
  const models = [...new Set(entries.map(entry => entry.model))].sort((a, b) => a.localeCompare(b));
  const kinds = [['median', 'Median survival'], ['mean', 'Mean survival'], ['ils', 'ILS'],
    ['end', 'Survival at end of follow-up'], ['deaths', 'Drug-related deaths'], ['other', 'Follow-up']];
  const available = new Set(entries.flatMap(entry => entry.results.map(result => result.kind)));
  controls.innerHTML = `<label>Model <select id="survModel"><option value="">All models</option>
    ${models.map(model => `<option value="${esc(model)}">${esc(model)}</option>`).join('')}</select></label>
    <label>Result <select id="survResult"><option value="">All result types</option>
    ${kinds.filter(([key]) => available.has(key)).map(([key, title]) => `<option value="${key}">${title}</option>`).join('')}</select></label>
    <span role="status"></span>`;
  const render = () => {
    const model = $('#survModel', controls).value, kind = $('#survResult', controls).value;
    const visible = entries.filter(entry => (!model || model === entry.model) &&
      (!kind || entry.results.some(result => result.kind === kind)));
    $('[role="status"]', controls).textContent = `${visible.length} of ${entries.length} records`;
    table.classList.toggle('study-table-scroll', visible.length > 12);
    table.scrollTop = 0;
    if (!visible.length) {
      table.innerHTML = '<p class="study-empty">No survival records match these filters.</p>';
      return;
    }
    const records = visible.map(({ row, model, results }) => ({
      cells: [
        `<td>${studyNameCell(row)}</td>`,
        `<td>${esc(model)}</td>`,
        `<td>${esc(row.Dose_mg_kg == null && row.Dose_umol_kg != null
          ? [`${row.Dose_umol_kg} µmol/kg`, row.Route].filter(Boolean).join(' · ') : studyDose(row))}</td>`,
        `<td>${results.map(({ label, value }) => `<div class="surv-result"><span>${label}</span> <b>${esc(value)}</b></div>`).join('')}</td>`,
        `<td>${row.DOI ? doi(row.DOI) : '–'}</td>`,
      ],
      facts: [
        ['Endpoint', row.Endpoint], ['Time origin', row.Time_origin], ['Observation (days)', row.Observation_days],
        ['Animals', [row.Species, row.Strain, row.Sex].filter(Boolean).join(' · ')],
        ['Treated group size', row.Group_size], ['Control group size', row.control_group_size],
        ['Dosing schedule', row.schedule], ['Dosing days', row.dosing_days], ['Formulation', row.Formulation],
        ['Treatment context', row.Treatment_context], ['ILS basis', row.ILS_basis],
        ['At end of follow-up (%)', row.survivors_end_pct],
        ['Reference drug', row.reference_drug], ['Reference dose (mg/kg)', row.reference_dose_mg_kg],
        ['Reference median (days)', row.reference_median_survival_days], ['Reference ILS (%)', row.reference_ILS_pct],
        ['DOI', row.DOI],
      ],
      comparison: survivalComparison(row),
    }));
    renderStudyTable(table, 'Survival records', ['Treatment', 'Model', 'Dose / route', 'Result', 'Source'], records);
  };
  controls.onchange = render;
  render();
}
