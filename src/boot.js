/* boot.js — CR-12 §4.1 (D106 · D111): in <head>, before the page draws (no white flash) — needs no other file.
   The language: ?lang=th|en (this load only, not remembered) → pref lang → th · the theme: ?theme=light|dark|system (this load only) → pref theme → system.
   Sets CP.lang · <html lang> · data-theme (light | dark — what the CSS reads) · data-theme-pref (light | dark | system — what the buttons show). */
(function () {
  'use strict';
  var P = 'charmiss_campaign_pnl_', get = function (k) { try { return localStorage.getItem(P + k); } catch (e) { return null; } };
  var q = {}; try { var u = new URLSearchParams(location.search); q.lang = u.get('lang'); q.theme = u.get('theme'); q.check = u.get('i18n'); } catch (e) { /* no URL options */ }
  var LANGS = ['th', 'en'], THEMES = ['light', 'dark', 'system'];
  var lang = LANGS.indexOf(q.lang) >= 0 ? q.lang : LANGS.indexOf(get('lang')) >= 0 ? get('lang') : 'th';
  var tp = THEMES.indexOf(q.theme) >= 0 ? q.theme : THEMES.indexOf(get('theme')) >= 0 ? get('theme') : 'system';
  var sysDark = false; try { sysDark = !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches); } catch (e) { sysDark = false; }
  window.CP = window.CP || {};
  CP.lang = lang; CP.langForced = LANGS.indexOf(q.lang) >= 0;
  CP.themePref = tp; CP.themeForced = THEMES.indexOf(q.theme) >= 0;
  CP.i18nCheck = q.check === 'check';
  var h = document.documentElement;
  h.lang = lang; h.setAttribute('data-theme', tp === 'dark' || (tp === 'system' && sysDark) ? 'dark' : 'light'); h.setAttribute('data-theme-pref', tp);
})();
