// Magic Cat Party: a tap-and-giggle toy. All art is inline SVG, all sound is Web Audio.
'use strict';

const $ = (sel) => document.querySelector(sel);
const rand = (min, max) => min + Math.random() * (max - min);
const pick = (list) => list[Math.floor(Math.random() * list.length)];

const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
let calmMotion = motionQuery.matches;
motionQuery.addEventListener('change', (e) => { calmMotion = e.matches; });

const PARTY_COLORS = ['#FF7AAE', '#FFD23F', '#6CC4FF', '#3DD6C3', '#84DB6E', '#FFA24D', '#FF8F85', '#B49BFF'];
const INK = '#2A1846';

const store = {
    get(key, fallback) {
        try {
            const v = localStorage.getItem(`magic-cat-party:${key}`);
            return v === null ? fallback : v === 'true';
        } catch { return fallback; }
    },
    set(key, value) {
        try { localStorage.setItem(`magic-cat-party:${key}`, String(value)); } catch { /* storage blocked */ }
    }
};

/* ---------- Sound (Web Audio, created on the first tap) ---------- */

const NOTE = (midi) => 440 * Math.pow(2, (midi - 69) / 12);
const PENTA = [72, 74, 76, 79, 81, 84, 86, 88, 91, 93];

const MELODY = [
    76, null, 79, null, 81, 79, 76, null,
    74, null, 76, 74, 72, null, null, null,
    76, null, 79, null, 84, 81, 79, null,
    81, 79, 76, 74, 76, null, null, null,
    72, null, 76, null, 79, null, 76, null,
    77, null, 81, null, 79, null, 76, null,
    74, 76, 77, 79, 81, 79, 77, 74,
    72, null, 79, null, 72, null, null, null
];
const BASS_ROOTS = [48, 43, 48, 43, 48, 41, 43, 48];

const Sound = {
    ctx: null,
    master: null,
    sfx: null,
    music: null,
    noise: null,
    muted: !store.get('sound', true),
    musicOn: store.get('music', true),
    timer: null,
    step: 0,
    nextTime: 0,
    party: false,

    unlock() {
        if (!this.ctx) {
            const AC = window.AudioContext || window.webkitAudioContext;
            if (!AC) return;
            const ctx = new AC();
            this.ctx = ctx;
            const comp = ctx.createDynamicsCompressor();
            comp.connect(ctx.destination);
            this.master = ctx.createGain();
            this.master.gain.value = this.muted ? 0 : 0.9;
            this.master.connect(comp);
            this.sfx = ctx.createGain();
            this.sfx.gain.value = 0.8;
            this.sfx.connect(this.master);
            this.music = ctx.createGain();
            this.music.gain.value = 0.2;
            this.music.connect(this.master);
            const buf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
            const data = buf.getChannelData(0);
            for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
            this.noise = buf;
            if (this.musicOn) this.startMusic();
        }
        if (this.ctx.state === 'suspended' && !document.hidden) this.ctx.resume();
    },

    ready() { return this.ctx && !this.muted; },

    setMuted(muted) {
        this.muted = muted;
        store.set('sound', !muted);
        if (this.master) this.master.gain.setTargetAtTime(muted ? 0 : 0.9, this.ctx.currentTime, 0.03);
    },

    setMusic(on) {
        this.musicOn = on;
        store.set('music', on);
        if (!this.ctx) return;
        if (on) this.startMusic(); else this.stopMusic();
    },

    tone(freq, at, dur, { type = 'sine', gain = 0.3, attack = 0.008, glide = null, dest = this.sfx } = {}) {
        const ctx = this.ctx;
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, at);
        if (glide) osc.frequency.exponentialRampToValueAtTime(glide, at + dur);
        g.gain.setValueAtTime(0.0001, at);
        g.gain.exponentialRampToValueAtTime(gain, at + attack);
        g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
        osc.connect(g).connect(dest);
        osc.start(at);
        osc.stop(at + dur + 0.05);
    },

    hiss(at, dur, { freq = 1500, to = null, q = 1, gain = 0.3, dest = this.sfx } = {}) {
        const ctx = this.ctx;
        const src = ctx.createBufferSource();
        src.buffer = this.noise;
        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.Q.value = q;
        bp.frequency.setValueAtTime(freq, at);
        if (to) bp.frequency.exponentialRampToValueAtTime(to, at + dur);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, at);
        g.gain.exponentialRampToValueAtTime(gain, at + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
        src.connect(bp).connect(g).connect(dest);
        src.start(at, Math.random() * 0.5);
        src.stop(at + dur + 0.05);
    },

    bell(midi, at, gain = 0.22) {
        this.tone(NOTE(midi), at, 0.9, { gain });
        this.tone(NOTE(midi + 12), at, 0.5, { type: 'triangle', gain: gain * 0.3 });
    },

    arp(notes, gap, gain) {
        const t = this.ctx.currentTime;
        notes.forEach((n, i) => this.bell(n, t + i * gap, gain));
    },

    play(name, opt = {}) {
        if (!this.ready()) return;
        const t = this.ctx.currentTime;
        switch (name) {
            case 'meow': {
                const p = opt.pitch || 1;
                const ctx = this.ctx;
                const osc = ctx.createOscillator();
                const lp = ctx.createBiquadFilter();
                const g = ctx.createGain();
                const vib = ctx.createOscillator();
                const vibAmt = ctx.createGain();
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(420 * p, t);
                osc.frequency.linearRampToValueAtTime(640 * p, t + 0.16);
                osc.frequency.exponentialRampToValueAtTime(360 * p, t + 0.6);
                vib.frequency.value = 7;
                vibAmt.gain.value = 10 * p;
                vib.connect(vibAmt).connect(osc.frequency);
                lp.type = 'lowpass';
                lp.Q.value = 7;
                lp.frequency.setValueAtTime(900, t);
                lp.frequency.linearRampToValueAtTime(2600, t + 0.15);
                lp.frequency.exponentialRampToValueAtTime(800, t + 0.6);
                g.gain.setValueAtTime(0.0001, t);
                g.gain.exponentialRampToValueAtTime(0.22, t + 0.05);
                g.gain.setValueAtTime(0.2, t + 0.4);
                g.gain.exponentialRampToValueAtTime(0.0001, t + 0.65);
                osc.connect(lp).connect(g).connect(this.sfx);
                osc.start(t); vib.start(t);
                osc.stop(t + 0.7); vib.stop(t + 0.7);
                break;
            }
            case 'pop':
                this.hiss(t, 0.07, { freq: 1300, q: 0.8, gain: 0.5 });
                this.tone(700, t, 0.09, { glide: 140, gain: 0.35 });
                break;
            case 'bloop':
                this.tone(rand(320, 420), t, 0.14, { glide: rand(900, 1300), gain: 0.25 });
                break;
            case 'confetti':
                this.hiss(t, 0.18, { freq: 900, to: 4000, q: 0.6, gain: 0.45 });
                this.arp([72, 76, 79, 84], 0.08, 0.2);
                break;
            case 'balloons':
                [0, 0.12, 0.24].forEach((d) => this.tone(260, t + d, 0.2, { glide: 520, type: 'triangle', gain: 0.18 }));
                break;
            case 'bubbles':
                for (let i = 0; i < 5; i++) this.tone(rand(380, 600), t + i * 0.07, 0.12, { glide: rand(900, 1400), gain: 0.15 });
                break;
            case 'rainbow':
                this.arp([72, 74, 76, 77, 79, 81, 83, 84], 0.09, 0.16);
                break;
            case 'stars':
                for (let i = 0; i < 6; i++) this.bell(pick(PENTA.slice(4)), t + i * 0.07, 0.12);
                break;
            case 'twinkle':
                this.bell(pick(PENTA.slice(3)), t, 0.1);
                break;
            case 'parade': {
                const tune = [67, 67, 72, 76, 79, 76, 72, 79];
                tune.forEach((n, i) => {
                    this.tone(NOTE(n), t + i * 0.16, 0.18, { type: 'square', gain: 0.07 });
                    this.tone(NOTE(n), t + i * 0.16, 0.25, { type: 'triangle', gain: 0.12 });
                    if (i % 2 === 0) this.hiss(t + i * 0.16, 0.08, { freq: 2500, q: 0.7, gain: 0.18 });
                });
                break;
            }
            case 'dance':
                this.hiss(t, 0.5, { freq: 300, to: 5000, q: 1.2, gain: 0.3 });
                [60, 64, 67, 72].forEach((n) => this.tone(NOTE(n), t + 0.3, 0.8, { type: 'triangle', gain: 0.12 }));
                break;
            case 'calm':
                this.arp([84, 79, 76, 72], 0.22, 0.12);
                break;
            case 'hop':
                this.tone(180, t, 0.25, { glide: 520, gain: 0.18 });
                break;
        }
    },

    startMusic() {
        if (this.timer || !this.ctx) return;
        this.step = 0;
        this.nextTime = this.ctx.currentTime + 0.15;
        this.timer = setInterval(() => this.schedule(), 60);
    },

    stopMusic() {
        clearInterval(this.timer);
        this.timer = null;
    },

    schedule() {
        const ctx = this.ctx;
        if (ctx.state !== 'running') return;
        if (this.nextTime < ctx.currentTime - 0.5) this.nextTime = ctx.currentTime + 0.05;
        while (this.nextTime < ctx.currentTime + 0.25) {
            this.playStep(this.step, this.nextTime);
            const bpm = this.party ? 128 : 100;
            this.nextTime += 60 / bpm / 2;
            this.step = (this.step + 1) % MELODY.length;
        }
    },

    playStep(step, at) {
        const dest = this.music;
        const note = MELODY[step];
        const party = this.party;
        if (note) {
            this.tone(NOTE(note), at, party ? 0.22 : 0.32, { type: 'triangle', gain: 0.5, dest });
            if (party) this.tone(NOTE(note), at, 0.15, { type: 'square', gain: 0.08, dest });
        }
        if (step % 2 === 0) {
            const root = BASS_ROOTS[Math.floor(step / 8)];
            const bass = step % 4 === 0 ? root : root + 7;
            this.tone(NOTE(bass), at, 0.3, { type: 'sine', gain: 0.45, dest });
            if (party) {
                this.tone(150, at, 0.16, { glide: 45, gain: 0.8, dest });
                if (step % 4 === 2) this.hiss(at, 0.12, { freq: 1800, q: 0.6, gain: 0.5, dest });
            }
        } else if (party) {
            this.hiss(at, 0.04, { freq: 8000, q: 1, gain: 0.25, dest });
        }
    }
};

document.addEventListener('visibilitychange', () => {
    if (!Sound.ctx) return;
    if (document.hidden) Sound.ctx.suspend();
    else Sound.ctx.resume();
});

/* ---------- Cats ---------- */

const CATS = [
    { name: 'Mango', body: '#FFA24D', outline: '#D9661F', belly: '#FFE6C7', ear: '#FFB8CF', stripe: '#E0701F', eye: INK, mouth: INK, pitch: 1, hat: 'party' },
    { name: 'Pip', body: '#A9C0DE', outline: '#6F8DB3', belly: '#EEF4FB', ear: '#FFB8CF', eye: INK, mouth: INK, pitch: 1.35, hat: 'bow', small: true },
    { name: 'Luna', body: '#C2A8FF', outline: '#8C6CE6', belly: '#F4EEFF', ear: '#FFB8D9', eye: INK, mouth: INK, pitch: 1.12, hat: 'crown' },
    { name: 'Biscuit', body: '#FFF1DA', outline: '#D9B98A', belly: '#FFFFFF', ear: '#FFB8CF', patch: '#C98A5A', eye: INK, mouth: INK, pitch: 0.92, neck: 'bowtie' },
    { name: 'Ziggy', body: '#3A2E58', outline: '#1E1633', belly: '#5A4A80', ear: '#9A7CC4', eye: '#C6F36B', pupil: INK, mouth: '#EADFFF', pitch: 0.8, neck: 'scarf' }
];

function catSVG(c) {
    const o = c.outline;
    const stripes = c.stripe ? `
        <path d="M51 25q9 5 18 0M54 32q6 3 12 0" fill="none" stroke="${c.stripe}" stroke-width="3.5" stroke-linecap="round"/>
        <path d="M25 46h8M26 53h7M87 46h8M87 53h7" fill="none" stroke="${c.stripe}" stroke-width="3.5" stroke-linecap="round"/>` : '';
    const tailStripes = c.stripe ? `<path d="M100 104l6-3M108 92l6 1" stroke="${c.stripe}" stroke-width="3.5" stroke-linecap="round"/>` : '';
    const patch = c.patch ? `<ellipse cx="38" cy="32" rx="13" ry="10" fill="${c.patch}"/>` : '';
    const bodyPatch = c.patch ? `<ellipse cx="80" cy="96" rx="10" ry="9" fill="${c.patch}"/>` : '';
    const pupil = c.pupil ? (x) => `<ellipse cx="${x}" cy="51" rx="2.6" ry="5" fill="${c.pupil}"/>` : () => '';
    const eye = (x) => `<g class="eye"><ellipse cx="${x}" cy="50" rx="6.2" ry="7.6" fill="${c.eye}"/>${pupil(x)}<circle cx="${x + 2.2}" cy="46.6" r="2.3" fill="#fff"/></g>`;

    let hat = '';
    if (c.hat === 'party') {
        hat = `<path d="M46 24 61 -12 76 21z" fill="#FF4F8B" stroke="#FF4F8B" stroke-width="3" stroke-linejoin="round"/>
            <circle cx="60" cy="6" r="2.6" fill="#FFD23F"/><circle cx="66" cy="15" r="2.6" fill="#FFD23F"/><circle cx="55" cy="16" r="2.6" fill="#FFD23F"/>
            <circle cx="61" cy="-12" r="5.5" fill="#FFD23F"/>`;
    } else if (c.hat === 'bow') {
        hat = `<path d="M80 21 69 12v18zM80 21l11-9v18z" fill="#FFC93C" stroke="#FFC93C" stroke-width="3" stroke-linejoin="round"/>
            <circle cx="80" cy="21" r="4.4" fill="#E89B00"/>`;
    } else if (c.hat === 'crown') {
        hat = `<path d="M42 25 44 6l8 9 8-13 8 13 8-9 2 19z" fill="#FFD23F" stroke="#FFD23F" stroke-width="3" stroke-linejoin="round"/>
            <circle cx="60" cy="17" r="3" fill="#FF4F8B"/><circle cx="49" cy="20" r="2.2" fill="#1FB5A6"/><circle cx="71" cy="20" r="2.2" fill="#1FB5A6"/>`;
    }

    let neck = '';
    if (c.neck === 'bowtie') {
        neck = `<path d="M60 81 46 73v16zM60 81l14-8v16z" fill="#1FB5A6" stroke="#1FB5A6" stroke-width="3" stroke-linejoin="round"/>
            <circle cx="60" cy="81" r="4.6" fill="#0E8A7C"/>`;
    } else if (c.neck === 'scarf') {
        neck = `<path d="M31 74q29 16 58 0v8q-29 16-58 0z" fill="#FF4F8B"/>
            <path d="M70 84l7 22 9-3-5-21z" fill="#FF4F8B"/>
            <path d="M42 81l3 7M56 84l1 7M72 92l7-2M74 99l7-2" stroke="#FFD23F" stroke-width="3" stroke-linecap="round"/>`;
    }

    return `<svg class="cat-svg" viewBox="0 -18 120 152" aria-hidden="true" focusable="false">
        <g class="tail">
            <path d="M84 112C110 110 118 88 106 72" fill="none" stroke="${o}" stroke-width="15" stroke-linecap="round"/>
            <path d="M84 112C110 110 118 88 106 72" fill="none" stroke="${c.body}" stroke-width="10" stroke-linecap="round"/>
            ${tailStripes}
        </g>
        <ellipse cx="60" cy="101" rx="31" ry="27" fill="${c.body}" stroke="${o}" stroke-width="2.5"/>
        ${bodyPatch}
        <ellipse cx="60" cy="107" rx="17" ry="17" fill="${c.belly}"/>
        <ellipse cx="46" cy="125" rx="10.5" ry="6.5" fill="${c.belly}" stroke="${o}" stroke-width="2.5"/>
        <ellipse cx="74" cy="125" rx="10.5" ry="6.5" fill="${c.belly}" stroke="${o}" stroke-width="2.5"/>
        <g class="head">
            <path d="M27 42 30 8l25 18z" fill="${c.body}" stroke="${o}" stroke-width="3" stroke-linejoin="round"/>
            <path d="M93 42 90 8 65 26z" fill="${c.body}" stroke="${o}" stroke-width="3" stroke-linejoin="round"/>
            <path d="M33 33 35 17l12 9.5z" fill="${c.ear}" stroke="${c.ear}" stroke-width="2" stroke-linejoin="round"/>
            <path d="M87 33 85 17 73 26.5z" fill="${c.ear}" stroke="${c.ear}" stroke-width="2" stroke-linejoin="round"/>
            <ellipse cx="60" cy="50" rx="35" ry="29" fill="${c.body}" stroke="${o}" stroke-width="2.5"/>
            ${patch}${stripes}
            <circle cx="34" cy="62" r="5.5" fill="#FF8FB1" opacity=".6"/>
            <circle cx="86" cy="62" r="5.5" fill="#FF8FB1" opacity=".6"/>
            ${eye(45)}${eye(75)}
            <path d="M55.5 58h9L60 63z" fill="#FF6F9C" stroke="#FF6F9C" stroke-width="2" stroke-linejoin="round"/>
            <path d="M60 63q-3.5 5-8 1.5M60 63q3.5 5 8 1.5" fill="none" stroke="${c.mouth}" stroke-width="2" stroke-linecap="round"/>
            <path d="M30 60 13 57M30 65l-16 2M90 60l17-3M90 65l16 2" stroke="${c.mouth}" stroke-width="1.6" stroke-linecap="round" opacity=".55"/>
            ${hat}
        </g>
        ${neck}
    </svg>`;
}

function makeCatEl(c, tag = 'div') {
    const el = document.createElement(tag);
    el.className = c.small ? 'cat small' : 'cat';
    el.innerHTML = catSVG(c);
    return el;
}

const stage = $('#stage');
const stageFx = $('#stageFx');
const screenFx = $('#screenFx');
const castEl = $('#cast');

const castEls = CATS.map((c, i) => {
    const el = makeCatEl(c, 'button');
    el.type = 'button';
    el.setAttribute('aria-label', `${c.name} the cat says meow`);
    el.addEventListener('click', (e) => {
        e.stopPropagation();
        Sound.play('meow', { pitch: c.pitch });
        restartClass(el, 'hop');
        const r = el.getBoundingClientRect();
        Particles.burst(r.left + r.width / 2, r.top + r.height * 0.2, 10, 'star');
    });
    el.dataset.index = i;
    castEl.appendChild(el);
    return el;
});

function restartClass(el, cls) {
    el.classList.remove(cls);
    void el.offsetWidth;
    el.classList.add(cls);
}

document.addEventListener('animationend', (e) => {
    const el = e.target;
    if (el.classList && el.classList.contains('hop') && e.animationName.startsWith('hop')) el.classList.remove('hop');
    if (el.classList && el.classList.contains('boing') && e.animationName === 'badgeBoing') el.closest('.fx-btn').classList.remove('boing');
});

function castHop(stagger = 70) {
    castEls.forEach((el, i) => setTimeout(() => restartClass(el, 'hop'), i * stagger));
}

function castLook(ms = 1600) {
    castEls.forEach((el) => el.classList.add('look'));
    clearTimeout(castLook.t);
    castLook.t = setTimeout(() => castEls.forEach((el) => el.classList.remove('look')), ms);
}

/* ---------- Particles (one canvas, one rAF loop that sleeps when idle) ---------- */

const Particles = {
    canvas: $('#particles'),
    ctx: null,
    list: [],
    max: 260,
    running: false,
    last: 0,
    w: 0,
    h: 0,

    init() {
        this.ctx = this.canvas.getContext('2d');
        this.resize();
        window.addEventListener('resize', () => this.resize());
    },

    resize() {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        this.w = window.innerWidth;
        this.h = window.innerHeight;
        this.canvas.width = Math.round(this.w * dpr);
        this.canvas.height = Math.round(this.h * dpr);
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    },

    add(p) {
        if (this.list.length >= this.max) return;
        this.list.push(p);
        if (!this.running) {
            this.running = true;
            this.last = performance.now();
            requestAnimationFrame((t) => this.frame(t));
        }
    },

    confetti(x, y, count, { spread = Math.PI / 3, angle = -Math.PI / 2, speed = 900, colors = PARTY_COLORS } = {}) {
        const n = calmMotion ? Math.ceil(count / 2) : count;
        for (let i = 0; i < n; i++) {
            const a = angle + rand(-spread, spread);
            const s = calmMotion ? rand(0.15, 0.35) * speed : rand(0.45, 1) * speed;
            this.add({
                kind: Math.random() < 0.3 ? 'dot' : 'rect',
                x, y,
                vx: Math.cos(a) * s,
                vy: Math.sin(a) * s,
                g: calmMotion ? 140 : 900,
                drag: calmMotion ? 0.6 : 1.4,
                size: rand(7, 13),
                rot: rand(0, Math.PI * 2),
                spin: rand(-8, 8),
                flip: rand(0, Math.PI * 2),
                color: pick(colors),
                life: calmMotion ? 3.2 : rand(2.6, 3.6),
                age: 0
            });
        }
    },

    burst(x, y, count, kind = 'star') {
        const n = calmMotion ? Math.ceil(count / 2) : count;
        for (let i = 0; i < n; i++) {
            const a = (i / n) * Math.PI * 2 + rand(-0.3, 0.3);
            const s = calmMotion ? rand(20, 50) : rand(140, 380);
            this.add({
                kind, x, y,
                vx: Math.cos(a) * s,
                vy: Math.sin(a) * s,
                g: calmMotion ? 0 : 260,
                drag: 2.2,
                size: kind === 'star' ? rand(9, 16) : rand(4, 7),
                rot: rand(0, Math.PI),
                spin: rand(-3, 3),
                flip: 0,
                color: pick(PARTY_COLORS),
                life: rand(0.9, 1.4),
                age: 0
            });
        }
    },

    shootingStar() {
        const fromLeft = Math.random() < 0.5;
        const speed = rand(700, 950);
        this.add({
            kind: 'comet',
            x: fromLeft ? -20 : this.w + 20,
            y: rand(this.h * 0.05, this.h * 0.35),
            vx: (fromLeft ? 1 : -1) * speed,
            vy: speed * 0.35,
            g: 0, drag: 0,
            size: 16, rot: 0, spin: 4, flip: 0,
            color: pick(['#FFD23F', '#FFA24D', '#FF7AAE']),
            life: 2.2, age: 0, trail: []
        });
    },

    clear() {
        this.list.length = 0;
    },

    frame(now) {
        const dt = Math.min((now - this.last) / 1000, 0.05);
        this.last = now;
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.w, this.h);
        const next = [];
        for (const p of this.list) {
            p.age += dt;
            const k = Math.max(0, 1 - p.drag * dt);
            p.vx *= k;
            p.vy = p.vy * k + p.g * dt;
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.rot += p.spin * dt;
            p.flip += 9 * dt;
            if (p.age >= p.life || p.y > this.h + 60) continue;
            if (p.kind === 'comet' && (p.x < -80 || p.x > this.w + 80)) continue;
            next.push(p);
            const fade = Math.min(1, (p.life - p.age) / 0.5);
            ctx.globalAlpha = fade;
            ctx.fillStyle = p.color;
            if (p.kind === 'comet') this.drawComet(p);
            else {
                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate(p.rot);
                if (p.kind === 'rect') {
                    ctx.scale(1, Math.cos(p.flip));
                    ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
                } else if (p.kind === 'dot') {
                    ctx.beginPath();
                    ctx.arc(0, 0, p.size / 2.6, 0, Math.PI * 2);
                    ctx.fill();
                } else {
                    starPath(ctx, p.size);
                    ctx.fill();
                }
                ctx.restore();
            }
        }
        ctx.globalAlpha = 1;
        this.list = next;
        if (next.length) requestAnimationFrame((t) => this.frame(t));
        else {
            ctx.clearRect(0, 0, this.w, this.h);
            this.running = false;
        }
    },

    drawComet(p) {
        const ctx = this.ctx;
        p.trail.push(p.x, p.y);
        if (p.trail.length > 24) p.trail.splice(0, 2);
        ctx.strokeStyle = p.color;
        ctx.lineCap = 'round';
        for (let i = 2; i < p.trail.length; i += 2) {
            ctx.lineWidth = (i / p.trail.length) * 6;
            ctx.beginPath();
            ctx.moveTo(p.trail[i - 2], p.trail[i - 1]);
            ctx.lineTo(p.trail[i], p.trail[i + 1]);
            ctx.stroke();
        }
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        starPath(ctx, p.size);
        ctx.fill();
        ctx.restore();
    }
};

function starPath(ctx, r) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
        const rr = i % 2 ? r * 0.45 : r;
        const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
        ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    ctx.closePath();
}

/* ---------- DOM effect helpers ---------- */

function spawn(parent, el, ms) {
    parent.appendChild(el);
    el._timer = setTimeout(() => el.remove(), ms);
    return el;
}

function count(parent, sel) {
    return parent.querySelectorAll(sel).length;
}

function balloonSVG(color) {
    return `<svg viewBox="0 0 60 104" aria-hidden="true" focusable="false">
        <path d="M30 4C46 4 56 18 56 34c0 18-14 32-26 34C18 66 4 52 4 34 4 18 14 4 30 4z" fill="${color}"/>
        <path d="M15 24q2-10 11-13" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".75"/>
        <path d="M25 67h10l-5 7z" fill="${color}" stroke="${color}" stroke-width="2" stroke-linejoin="round"/>
        <path d="M30 74q-7 8 0 14t0 14" fill="none" stroke="${INK}" stroke-opacity=".45" stroke-width="1.8" stroke-linecap="round"/>
    </svg>`;
}

function bubbleSVG(color) {
    return `<svg viewBox="0 0 60 60" aria-hidden="true" focusable="false">
        <circle cx="30" cy="30" r="27" fill="${color}" fill-opacity=".18" stroke="${color}" stroke-width="2.6"/>
        <path d="M14 22q4-9 13-11" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round"/>
        <circle cx="42" cy="42" r="3" fill="#fff" opacity=".8"/>
    </svg>`;
}

function makeFloaty(kind, color, size) {
    const el = document.createElement('div');
    el.className = `floaty ${kind}`;
    el.dataset.color = color;
    el.style.width = `${size}px`;
    el.style.left = `${rand(4, 96) * window.innerWidth / 100 - size / 2}px`;
    const life = (kind === 'balloon' ? rand(7, 9.5) : rand(6, 8.5)) * (calmMotion ? 1.5 : 1);
    el.style.setProperty('--life', `${life}s`);
    el.style.setProperty('--sway', `${rand(1.6, 3.2)}s`);
    el.style.animationDelay = `${rand(0, 0.6)}s`;
    el.innerHTML = kind === 'balloon' ? balloonSVG(color) : bubbleSVG(color);
    el.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        popFloaty(el);
    });
    return spawn(screenFx, el, (life + 0.7) * 1000);
}

function popFloaty(el) {
    if (el.classList.contains('popped')) return;
    el.classList.add('popped');
    clearTimeout(el._timer);
    const svg = el.firstElementChild;
    const r = svg.getBoundingClientRect();
    const isBalloon = el.classList.contains('balloon');
    const cy = r.top + (isBalloon ? r.height * 0.33 : r.height / 2);
    Sound.play(isBalloon ? 'pop' : 'bloop');
    Particles.confetti(r.left + r.width / 2, cy, isBalloon ? 16 : 8, {
        spread: Math.PI, speed: 420, colors: [el.dataset.color, '#FFFFFF', pick(PARTY_COLORS)]
    });
    setTimeout(() => el.remove(), 220);
}

/* ---------- Effects ---------- */

let danceTimer = null;
const danceBtn = $('[data-fx="dance"]');

const EFFECTS = {
    meow() {
        const idx = Math.floor(Math.random() * CATS.length);
        const c = CATS[idx];
        Sound.play('meow', { pitch: c.pitch });
        restartClass(castEls[idx], 'hop');
        if (count(screenFx, '.popcat') >= 3) return;
        const el = document.createElement('div');
        el.className = Math.random() < 0.4 ? 'popcat spin' : 'popcat';
        el.style.left = `${rand(22, 78)}%`;
        el.innerHTML = catSVG(c) + '<span class="speech">Meow!</span>';
        spawn(screenFx, el, 2300);
        setTimeout(() => {
            if (!el.isConnected) return;
            const r = el.getBoundingClientRect();
            Particles.burst(r.left + r.width / 2, r.top + r.height * 0.15, 12, 'star');
        }, 450);
    },

    confetti() {
        Sound.play('confetti');
        const w = window.innerWidth;
        const h = window.innerHeight;
        Particles.confetti(0, h * 0.85, 55, { angle: -Math.PI / 3, spread: 0.45, speed: Math.max(900, h * 1.4) });
        Particles.confetti(w, h * 0.85, 55, { angle: -Math.PI * 2 / 3, spread: 0.45, speed: Math.max(900, h * 1.4) });
        castHop();
    },

    balloons() {
        Sound.play('balloons');
        const room = 16 - count(screenFx, '.balloon');
        const n = Math.min(calmMotion ? 3 : 6, room);
        const base = Math.min(Math.max(window.innerWidth * 0.12, 74), 120);
        for (let i = 0; i < n; i++) makeFloaty('balloon', pick(PARTY_COLORS), base * rand(0.85, 1.15));
        castLook();
    },

    bubbles() {
        Sound.play('bubbles');
        const room = 24 - count(screenFx, '.bubble');
        const n = Math.min(calmMotion ? 5 : 10, room);
        const base = Math.min(Math.max(window.innerWidth * 0.09, 56), 100);
        for (let i = 0; i < n; i++) makeFloaty('bubble', pick(['#3DD6C3', '#6CC4FF', '#B49BFF', '#FF7AAE']), base * rand(0.6, 1.3));
        castLook();
    },

    rainbow() {
        Sound.play('rainbow');
        const old = stageFx.querySelector('.rainbow');
        if (old) old.remove();
        const colors = ['#FF5A5F', '#FFA24D', '#FFD23F', '#84DB6E', '#3DA5FF', '#9B6BFF'];
        const bands = colors.map((col, i) => {
            const r = 180 - i * 15;
            return `<path class="band" pathLength="1" d="M${200 - r} 200A${r} ${r} 0 0 1 ${200 + r} 200" stroke="${col}" style="animation-delay:${i * 0.12}s"/>`;
        }).join('');
        const cloud = (x) => `<g fill="#fff"><circle cx="${x - 24}" cy="199" r="12"/><circle cx="${x - 8}" cy="190" r="17"/><circle cx="${x + 13}" cy="192" r="14"/><circle cx="${x + 28}" cy="201" r="10"/><ellipse cx="${x + 1}" cy="203" rx="36" ry="9"/></g>`;
        const el = document.createElement('div');
        el.className = 'rainbow';
        el.style.setProperty('--life', '5s');
        el.innerHTML = `<svg viewBox="0 0 400 214" aria-hidden="true" focusable="false">${bands}${cloud(26)}${cloud(374)}</svg>`;
        spawn(stageFx, el, 5100);
        castHop(90);
    },

    stars() {
        Sound.play('stars');
        const w = window.innerWidth;
        const h = window.innerHeight;
        for (let i = 0; i < 3; i++) {
            setTimeout(() => {
                Particles.burst(rand(w * 0.15, w * 0.85), rand(h * 0.12, h * 0.5), 14, 'star');
                Sound.play('twinkle');
            }, i * 160);
        }
        if (!calmMotion) {
            Particles.shootingStar();
            setTimeout(() => Particles.shootingStar(), 350);
        }
        castLook();
    },

    parade() {
        Sound.play('parade');
        if (count(stageFx, '.parade') >= 2) return;
        const el = document.createElement('div');
        el.className = 'parade';
        el.innerHTML = `<svg class="pennant" viewBox="0 0 40 60" aria-hidden="true" focusable="false">
            <path d="M6 58V4" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>
            <path d="M7 5h28l-8 10 8 10H7z" fill="#FF4F8B" stroke="#FF4F8B" stroke-width="2" stroke-linejoin="round"/></svg>`;
        const order = [...CATS].sort(() => Math.random() - 0.5);
        order.forEach((c) => el.appendChild(makeCatEl(c)));
        const life = calmMotion ? 14 : 9;
        el.style.setProperty('--life', `${life}s`);
        el.style.setProperty('--to', `${stage.clientWidth}px`);
        spawn(stageFx, el, life * 1000 + 100);
        stage.classList.add('parading');
        setTimeout(() => {
            if (!count(stageFx, '.parade')) stage.classList.remove('parading');
        }, life * 1000 + 200);
    },

    dance() {
        Sound.play('dance');
        if (!stage.classList.contains('dance')) {
            stage.classList.add('dance');
            danceBtn.setAttribute('aria-pressed', 'true');
            Sound.party = true;
            const lights = document.createElement('div');
            lights.className = 'dance-lights';
            lights.innerHTML = `<div class="spot"></div><div class="spot"></div><div class="spot"></div>
                <svg class="disco" viewBox="0 0 60 84" aria-hidden="true" focusable="false">
                    <path d="M30 0v22" stroke="#EADFFF" stroke-width="2"/>
                    <circle cx="30" cy="52" r="28" fill="#D8D2EE"/>
                    <path d="M2 52h56M6 38h48M6 66h48M30 24c-12 8-12 48 0 56M30 24c12 8 12 48 0 56M16 28c-6 10-6 38 0 48M44 28c6 10 6 38 0 48" fill="none" stroke="#8E84B8" stroke-width="1.6"/>
                    <path d="M14 40l6-4 2 6-6 3z" fill="#fff"/><path d="M38 60l6-2 1 6-6 2z" fill="#FFD23F"/><path d="M36 34l5 1-1 5-5-1z" fill="#3DD6C3"/>
                </svg>`;
            stageFx.appendChild(lights);
        }
        clearTimeout(danceTimer);
        danceTimer = setTimeout(endDance, 12000);
        const r = stage.getBoundingClientRect();
        Particles.burst(r.left + r.width / 2, r.top + r.height * 0.3, 18, 'star');
    }
};

function endDance() {
    clearTimeout(danceTimer);
    danceTimer = null;
    stage.classList.remove('dance');
    danceBtn.setAttribute('aria-pressed', 'false');
    Sound.party = false;
    const lights = stageFx.querySelector('.dance-lights');
    if (lights) lights.remove();
}

function calmDown() {
    Sound.play('calm');
    endDance();
    stage.classList.remove('parading');
    Particles.clear();
    screenFx.replaceChildren();
    stageFx.replaceChildren();
    castEls.forEach((el, i) => {
        el.classList.remove('hop', 'look');
        el.classList.add('sleepy');
        if (i % 2 === 0) {
            const z = document.createElement('span');
            z.className = 'zzz';
            z.textContent = 'z';
            spawn(el, z, 2500);
        }
    });
    clearTimeout(calmDown.t);
    calmDown.t = setTimeout(() => castEls.forEach((el) => el.classList.remove('sleepy')), 2600);
}

function wake() {
    if (!castEls[0].classList.contains('sleepy')) return;
    clearTimeout(calmDown.t);
    castEls.forEach((el) => el.classList.remove('sleepy'));
}

/* ---------- Controls ---------- */

const fxButtons = [...document.querySelectorAll('.fx-btn')];
const keyMap = {};
fxButtons.forEach((btn) => {
    keyMap[btn.dataset.key] = btn;
    btn.addEventListener('click', () => {
        wake();
        restartClass(btn, 'boing');
        EFFECTS[btn.dataset.fx]();
        if (fxButtons[0].classList.contains('nudge')) fxButtons[0].classList.remove('nudge');
    });
});
fxButtons[0].classList.add('nudge');

const soundBtn = $('#soundBtn');
const musicBtn = $('#musicBtn');

function renderToggles() {
    soundBtn.setAttribute('aria-pressed', String(!Sound.muted));
    soundBtn.querySelector('use').setAttribute('href', Sound.muted ? '#i-sound-off' : '#i-sound');
    musicBtn.setAttribute('aria-pressed', String(Sound.musicOn));
    musicBtn.querySelector('use').setAttribute('href', Sound.musicOn ? '#i-music' : '#i-music-off');
}

soundBtn.addEventListener('click', () => {
    Sound.setMuted(!Sound.muted);
    renderToggles();
    Sound.play('twinkle');
});
musicBtn.addEventListener('click', () => {
    Sound.setMusic(!Sound.musicOn);
    renderToggles();
});
$('#calmBtn').addEventListener('click', calmDown);

stage.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.cat')) return;
    Particles.burst(e.clientX, e.clientY, 9, 'star');
    Sound.play('twinkle');
});

function flashPress(btn) {
    btn.classList.add('pressed');
    setTimeout(() => btn.classList.remove('pressed'), 120);
}

document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
    const key = e.key.toLowerCase();
    const btn = keyMap[key];
    if (btn) {
        flashPress(btn);
        btn.click();
    } else if (key === '0' || key === 'escape') {
        calmDown();
    } else if (key === 'm') {
        soundBtn.click();
    } else if (key === 'n') {
        musicBtn.click();
    } else if (key === 'p') {
        const target = screenFx.querySelector('.floaty:not(.popped)');
        if (target) popFloaty(target);
    }
});

// Audio may only start after a real tap or key press.
['pointerdown', 'keydown'].forEach((type) => {
    document.addEventListener(type, () => Sound.unlock(), { capture: true, passive: true });
});

Particles.init();
renderToggles();
