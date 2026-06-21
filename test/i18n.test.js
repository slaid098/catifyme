import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { installDomMocks, resetDomMocks } from './helpers/dom-mock.js';

installDomMocks();

let i18n;

beforeEach(async () => {
  resetDomMocks();
  i18n = await import('../i18n.js');
});

afterEach(() => {
  resetDomMocks();
});

describe('initI18n', () => {
  test('detects en from navigator when no stored lang', async () => {
    const lang = await i18n.initI18n();
    assert.equal(lang, 'en');
  });

  test('detects ru from navigator.language', async () => {
    globalThis.navigator.language = 'ru-RU';
    const lang = await i18n.initI18n();
    assert.equal(lang, 'ru');
  });

  test('uses stored lang over navigator', async () => {
    globalThis.localStorage.setItem('catifyme-lang', 'ru');
    globalThis.navigator.language = 'en-US';
    const lang = await i18n.initI18n();
    assert.equal(lang, 'ru');
  });

  test('ignores unsupported stored lang', async () => {
    globalThis.localStorage.setItem('catifyme-lang', 'de');
    globalThis.navigator.language = 'en-US';
    const lang = await i18n.initI18n();
    assert.equal(lang, 'en');
  });

  test('falls back to en for unknown navigator language', async () => {
    globalThis.navigator.language = 'ja-JP';
    const lang = await i18n.initI18n();
    assert.equal(lang, 'en');
  });
});

describe('t (translation lookup)', () => {
  test('returns translated value after init', async () => {
    await i18n.initI18n();
    assert.equal(i18n.t('app.title'), 'CatifyMe');
  });

  test('returns key when translation missing', async () => {
    await i18n.initI18n();
    assert.equal(i18n.t('nonexistent.key'), 'nonexistent.key');
  });
});

describe('setLang', () => {
  test('switches to ru and persists', async () => {
    await i18n.initI18n();
    await i18n.setLang('ru');
    assert.equal(i18n.getLang(), 'ru');
    assert.equal(globalThis.localStorage.getItem('catifyme-lang'), 'ru');
  });

  test('switches to en and persists', async () => {
    globalThis.localStorage.setItem('catifyme-lang', 'ru');
    await i18n.initI18n();
    await i18n.setLang('en');
    assert.equal(i18n.getLang(), 'en');
    assert.equal(globalThis.localStorage.getItem('catifyme-lang'), 'en');
  });

  test('ignores unsupported language', async () => {
    await i18n.initI18n();
    const before = i18n.getLang();
    await i18n.setLang('de');
    assert.equal(i18n.getLang(), before);
  });

  test('no-op when setting same language', async () => {
    await i18n.initI18n();
    const before = i18n.getLang();
    await i18n.setLang(before);
    assert.equal(i18n.getLang(), before);
  });
});

describe('onLangChange', () => {
  test('fires callback when language changes', async () => {
    await i18n.initI18n();
    let fired = null;
    i18n.onLangChange((lang) => { fired = lang; });
    await i18n.setLang('ru');
    assert.equal(fired, 'ru');
  });

  test('unsubscribes when returned function called', async () => {
    await i18n.initI18n();
    let fired = null;
    const unsub = i18n.onLangChange((lang) => { fired = lang; });
    unsub();
    await i18n.setLang('ru');
    assert.equal(fired, null);
  });
});
