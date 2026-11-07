// ICU.Live Shield — i18n.js
// Textos en el idioma elegido en la ventana de la extensión (combo de idioma) o, si no se eligió, en el del navegador.
// chrome.i18n sólo usa el idioma del navegador; para poder cambiarlo (un extranjero con un Chrome en español), el idioma
// elegido se carga de _locales/<idioma>/messages.json. Lo usan la ventana, el ícono y la página de vinculación.
const ICU_LANGS = {
  ar: 'العربية', am: 'አማርኛ', bg: 'Български', bn: 'বাংলা', ca: 'Català', cs: 'Čeština', da: 'Dansk', de: 'Deutsch',
  el: 'Ελληνικά', en: 'English', es: 'Español', et: 'Eesti', fa: 'فارسی', fi: 'Suomi', fil: 'Filipino', fr: 'Français',
  gu: 'ગુજરાતી', he: 'עברית', hi: 'हिन्दी', hr: 'Hrvatski', hu: 'Magyar', id: 'Bahasa Indonesia', it: 'Italiano', ja: '日本語',
  kn: 'ಕನ್ನಡ', ko: '한국어', lt: 'Lietuvių', lv: 'Latviešu', ml: 'മലയാളം', mr: 'मराठी', ms: 'Bahasa Melayu', nl: 'Nederlands',
  no: 'Norsk', pl: 'Polski', pt_BR: 'Português (Brasil)', pt_PT: 'Português (Portugal)', ro: 'Română', ru: 'Русский',
  sk: 'Slovenčina', sl: 'Slovenščina', sr: 'Српски', sv: 'Svenska', sw: 'Kiswahili', ta: 'தமிழ்', te: 'తెలుగు', th: 'ไทย',
  tr: 'Türkçe', uk: 'Українська', vi: 'Tiếng Việt', zh_CN: '中文（简体）', zh_TW: '中文（繁體）'
};
const ICU_RTL = { ar: 1, he: 1, fa: 1 };
let icuLang = '';      // '' = el del navegador
let icuMsgs = null;    // mensajes del idioma elegido

async function icuLoadLang() {
  let lang = '';
  try { lang = (await chrome.storage.local.get('lang')).lang || ''; } catch (e) { /* sin storage */ }
  icuMsgs = null;
  icuLang = ICU_LANGS[lang] ? lang : '';
  if (!icuLang) return;
  try { icuMsgs = await (await fetch(chrome.runtime.getURL('_locales/' + icuLang + '/messages.json'))).json(); } catch (e) { icuLang = ''; }
}

/** Texto de una clave con sus valores ($1, $2…), en el idioma elegido o en el del navegador */
function icuT(key, subs) {
  const m = icuMsgs && icuMsgs[key];
  if (m) {
    const ph = m.placeholders || {};
    return m.message.replace(/\$(\w+)\$/g, (all, name) => {
      const p = ph[name.toLowerCase()];
      if (!p) return all;
      const i = parseInt(String(p.content).replace('$', ''), 10) - 1;
      return subs && subs[i] !== undefined ? String(subs[i]) : '';
    });
  }
  return chrome.i18n.getMessage(key, subs) || key;
}

/** Idioma para fechas y números (es-AR, pt-BR…) */
function icuLocale() { return icuLang ? icuLang.replace('_', '-') : chrome.i18n.getUILanguage(); }
function icuIsRtl() { const l = (icuLang || chrome.i18n.getUILanguage()).split(/[-_]/)[0]; return !!ICU_RTL[l]; }
