
// const t=document.getElementById('mainbtn');
// t.addEventListener('mousemove',e=>{
//   t.style.setProperty('--pos',`${e.clientX-t.offsetLeft}px ${e.clientY-t.offsetTop}px`);
// });
$cursor.query('#mainbtn').addEffect('hoverGlow', { varName: '--bg', bgColor: '#5ed5fd', glowColor: '#9cf2ff', size: 180 });
function go() {
    document.body.style.transition = '200ms cubic-bezier(0.55, 0.06, 0.68, 0.19)';
    document.body.style.transform = 'scale(0.3)';
    document.body.style.opacity = 0;
    document.body.parentElement.style.backgroundColor = '#000';
}

const themeKey = 'win12-theme-preference';
const themeToggle = document.getElementById('page-settings');
const switchTrack = themeToggle.querySelector('.switch-track');
const switchHandle = themeToggle.querySelector('.switch-handle');

const getSystemTheme = () => window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
const applyTheme = (theme) => {
    const actual = theme === 'system' ? getSystemTheme() : theme;
    document.documentElement.dataset.theme = actual;
    themeToggle.dataset.value = actual;
    switchHandle.style.transform = actual === 'dark' ? 'translateX(24px)' : 'translateX(0)';
};

const saveTheme = (theme) => localStorage.setItem(themeKey, theme);
applyTheme(localStorage.getItem(themeKey) || 'system');

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (!localStorage.getItem(themeKey)) {
        applyTheme('system');
    }
});

let dragState = null;
let preventClick = false;

switchTrack.addEventListener('click', () => {
    if (preventClick) {
        preventClick = false;
        return;
    }
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    saveTheme(next);
    applyTheme(next);
});

switchTrack.addEventListener('pointerdown', (event) => {
    dragState = {
        startX: event.clientX,
        originX: switchHandle.getBoundingClientRect().left,
        moved: false
    };
    switchHandle.setPointerCapture(event.pointerId);
    switchHandle.style.transition = 'none';
});

document.addEventListener('pointermove', (event) => {
    if (!dragState) return;
    const trackRect = switchTrack.getBoundingClientRect();
    const handleRect = switchHandle.getBoundingClientRect();
    const minX = trackRect.left + 4;
    const maxX = trackRect.right - handleRect.width - 4;
    const currentX = Math.min(maxX, Math.max(minX, dragState.originX + event.clientX - dragState.startX));
    if (Math.abs(event.clientX - dragState.startX) > 4) {
        dragState.moved = true;
    }
    switchHandle.style.transform = `translateX(${currentX - minX}px)`;
});

document.addEventListener('pointerup', (event) => {
    if (!dragState) return;
    const trackRect = switchTrack.getBoundingClientRect();
    const handleRect = switchHandle.getBoundingClientRect();
    const midpoint = trackRect.left + trackRect.width / 2;
    const next = handleRect.left + handleRect.width / 2 > midpoint ? 'dark' : 'light';
    saveTheme(next);
    applyTheme(next);
    switchHandle.style.transition = 'transform 180ms ease';
    preventClick = dragState.moved;
    dragState = null;
});

$cursor.query('#achievements .item,#bili>.card>.main>.img>img').addEffect('tiltRepel', { maxTilt: 12, perspective: 800 });
$cursor.query('#view>img').addEffect('tiltRepel', { maxTilt: 5, perspective: 1000 });

const bb = $cursor.query('.bubble').addEffect('magneticAttract', { maxOffset: 50 });
document.body.addEventListener('scroll', (e) => {
    if (document.body.scrollTop > document.body.clientHeight / 2) {
        bb.pause();
    } else {
        bb.resume();
    }
});

// 国际化逻辑
(function () {
    const langKey = 'site-lang';
    const langSelect = document.getElementById('lang-select');
    const available = ['zh_CN', 'zh_TW', 'en', 'fr'];

    function mapBrowserLang() {
        const nl = (navigator.language || navigator.userLanguage || '').toLowerCase();
        if (nl.startsWith('zh-hant') || nl.startsWith('zh-tw') || nl.startsWith('zh-hk')) return 'zh_TW';
        if (nl.startsWith('zh')) return 'zh_CN';
        if (nl.startsWith('fr')) return 'fr';
        return 'en';
    }

    function loadProps(lang) {
        const filename = available.includes(lang) ? lang : 'en';
        $.i18n.properties({
            name: filename,
            path: '/locales/',
            mode: 'map',
            callback: function () {
                document.querySelectorAll('[data-i18n]').forEach(el => {
                    const key = el.getAttribute('data-i18n');
                    const val = $.i18n.prop(key);
                    if (val !== undefined) el.innerHTML = val;
                });
                // 页面 title
                const t = document.querySelector('title[data-i18n]');
                if (t) {
                    const v = $.i18n.prop('page.title');
                    if (v) document.title = v;
                }
            }
        });
    }

    const saved = localStorage.getItem(langKey) || mapBrowserLang();
    if (langSelect) langSelect.value = saved;
    loadProps(saved);

    langSelect && langSelect.addEventListener('change', function () {
        const v = this.value;
        localStorage.setItem(langKey, v);
        loadProps(v);
    });
})();