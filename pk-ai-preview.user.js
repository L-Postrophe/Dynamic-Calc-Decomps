// ==UserScript==
// @name         Platinum Kaizo AI Odds — verified damage and flag scoring
// @namespace    https://github.com/hzla/Dynamic-Calc-Decomps
// @version      1.13.0
// @description  Inline AI odds; Doubles board, partner targeting, AI damage approximation and all eleven flags.
// @match        https://hzla.github.io/Dynamic-Calc-Decomps/*
// @match        https://l-postrophe.github.io/Dynamic-Calc-Decomps/*
// @match        https://hzla.github.io/Dynamic-Calc/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

/* Platinum Kaizo AI score distribution prototype.
 * The distribution math and per-target selection rules are exact for the modeled rules.
 * Unmodeled move-specific rules and calculator-vs-AI damage differences are reported.
 * Assumptions and native/display-derived damage are shown as conditional estimates.
 * Source: https://bparkpk.github.io/PKMoveScoring/ (individual move pages).
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.PKAI = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const P = n => n / 256;
  const ONE = new Map([[0, 1]]);
  // Kaizo reference snapshot, 2026-11-13. Data contains memberships, not runtime HTML.
  const RULES={"assurance":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":false,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"aromatherapy":{"setup":false,"risky":false,"prio":true,"harass":false,"baton":1,"double":1,"ally":0,"hp":[],"expertNoop":false,"basicNoop":true,"basicImmunity":false,"absorbPenalty":-10,"eval":"status"},"spiderweb":{"setup":false,"risky":false,"prio":true,"harass":false,"baton":1,"double":1,"ally":0,"hp":[],"expertNoop":false,"basicNoop":false,"basicImmunity":false,"absorbPenalty":-10,"eval":"status"},"sunnyday":{"setup":false,"risky":false,"prio":true,"harass":false,"baton":1,"double":2,"ally":0,"hp":[],"expertNoop":false,"basicNoop":false,"basicImmunity":false,"absorbPenalty":-10,"eval":"status"},"skillswap":{"setup":false,"risky":false,"prio":true,"harass":false,"baton":1,"double":3,"ally":1,"hp":[],"expertNoop":false,"basicNoop":true,"basicImmunity":false,"absorbPenalty":-10,"eval":"status"},"sludge":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"crushclaw":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"leafstorm":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"mefirst":{"setup":false,"risky":false,"prio":true,"harass":false,"baton":1,"double":1,"ally":0,"hp":[],"expertNoop":false,"basicNoop":true,"basicImmunity":false,"absorbPenalty":-10,"eval":"status"},"signalbeam":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"rockwrecker":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"aurasphere":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":false,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"sonicboom":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":4,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"twister":{"setup":true,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"ominouswind":{"setup":false,"risky":true,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"firepunch":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":5,"ally":2,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"extremespeed":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"magiccoat":{"setup":false,"risky":false,"prio":true,"harass":false,"baton":1,"double":1,"ally":0,"hp":[],"expertNoop":false,"basicNoop":false,"basicImmunity":false,"absorbPenalty":-10,"eval":"status"},"headbutt":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"safeguard":{"setup":false,"risky":false,"prio":true,"harass":false,"baton":1,"double":1,"ally":0,"hp":[["user",[["under",70]]],["target",[["under",71]]]],"expertNoop":true,"basicNoop":false,"basicImmunity":false,"absorbPenalty":-10,"eval":"status"},"healbell":{"setup":false,"risky":false,"prio":true,"harass":false,"baton":1,"double":1,"ally":0,"hp":[],"expertNoop":false,"basicNoop":true,"basicImmunity":false,"absorbPenalty":-10,"eval":"status"},"withdraw":{"setup":true,"risky":false,"prio":true,"harass":false,"baton":1,"double":1,"ally":0,"hp":[["user",[["under",71]]]],"expertNoop":false,"basicNoop":false,"basicImmunity":false,"absorbPenalty":-10,"eval":"status"},"whirlwind":{"setup":false,"risky":false,"prio":true,"harass":false,"baton":1,"double":1,"ally":0,"hp":[],"expertNoop":false,"basicNoop":false,"basicImmunity":false,"absorbPenalty":-10,"eval":"status"},"acid":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"nightshade":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":4,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"shadowball":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"hpflying":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"magnetrise":{"setup":true,"risky":false,"prio":true,"harass":false,"baton":1,"double":1,"ally":0,"hp":[],"expertNoop":false,"basicNoop":false,"basicImmunity":false,"absorbPenalty":-10,"eval":"status"},"megakick":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"heartswap":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":6,"ally":3,"hp":[],"expertNoop":false,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"aquajet":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":6,"ally":3,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"priority"},"guardswap":{"setup":false,"risky":false,"prio":true,"harass":false,"baton":1,"double":1,"ally":0,"hp":[["user",[["over",30],["under",71]]]],"expertNoop":false,"basicNoop":false,"basicImmunity":false,"absorbPenalty":-10,"eval":"status"},"blastburn":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":7,"ally":2,"hp":[],"expertNoop":false,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"swagger":{"setup":true,"risky":true,"prio":true,"harass":true,"baton":1,"double":1,"ally":4,"hp":[],"expertNoop":false,"basicNoop":false,"basicImmunity":false,"absorbPenalty":-10,"eval":"status"},"eruption":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":7,"ally":2,"hp":[],"expertNoop":false,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"secretpower":{"setup":false,"risky":false,"prio":false,"harass":true,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"stealthrock":{"setup":false,"risky":false,"prio":true,"harass":true,"baton":1,"double":1,"ally":0,"hp":[],"expertNoop":false,"basicNoop":false,"basicImmunity":false,"absorbPenalty":-10,"eval":"status"},"lastresort":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":false,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"stoneedge":{"setup":false,"risky":true,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":false,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"icefang":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"lockon":{"setup":false,"risky":false,"prio":true,"harass":false,"baton":1,"double":1,"ally":0,"hp":[["user",[["under",31]]],["target",[["under",31]]]],"expertNoop":false,"basicNoop":false,"basicImmunity":false,"absorbPenalty":-10,"eval":"status"},"eggbomb":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"spacialrend":{"setup":false,"risky":true,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":false,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"swallow":{"setup":true,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"wildcharge":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":8,"ally":5,"hp":[],"expertNoop":false,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"tailglow":{"setup":true,"risky":false,"prio":true,"harass":false,"baton":2,"double":1,"ally":0,"hp":[["user",[["under",70]]],["target",[["under",71]]]],"expertNoop":false,"basicNoop":false,"basicImmunity":false,"absorbPenalty":-10,"eval":"status"},"shadowclaw":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"powerswap":{"setup":false,"risky":false,"prio":true,"harass":false,"baton":1,"double":1,"ally":0,"hp":[["user",[["over",30],["under",71]]]],"expertNoop":false,"basicNoop":false,"basicImmunity":false,"absorbPenalty":-10,"eval":"status"},"punishment":{"setup":false,"risky":false,"prio":true,"harass":false,"baton":1,"double":1,"ally":0,"hp":[],"expertNoop":false,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"status"},"drillpeck":{"setup":false,"risky":true,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":false,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"encore":{"setup":false,"risky":false,"prio":true,"harass":true,"baton":1,"double":1,"ally":0,"hp":[],"expertNoop":false,"basicNoop":false,"basicImmunity":false,"absorbPenalty":-10,"eval":"status"},"seismictoss":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":4,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"poisonpowder":{"setup":true,"risky":false,"prio":true,"harass":true,"baton":1,"double":1,"ally":6,"hp":[["target",[["under",71]]]],"expertNoop":false,"basicNoop":false,"basicImmunity":false,"absorbPenalty":-10,"eval":"status"},"horndrill":{"setup":false,"risky":true,"prio":true,"harass":false,"baton":1,"double":1,"ally":0,"hp":[["target",[["under",31]]]],"expertNoop":false,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"status"},"agility":{"setup":true,"risky":false,"prio":true,"harass":false,"baton":1,"double":1,"ally":0,"hp":[["user",[["under",70]]],["target",[["under",71]]]],"expertNoop":false,"basicNoop":false,"basicImmunity":false,"absorbPenalty":-10,"eval":"status"},"smellingsalts":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":false,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"mudshot":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":false,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"dragonpulse":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":false,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"bide":{"setup":false,"risky":true,"prio":true,"harass":false,"baton":1,"double":1,"ally":0,"hp":[["user",[["under",31]]]],"expertNoop":false,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"status"},"rockthrow":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"tailwind":{"setup":true,"risky":false,"prio":true,"harass":false,"baton":1,"double":1,"ally":0,"hp":[["user",[["under",70]]],["target",[["under",71]]]],"expertNoop":false,"basicNoop":false,"basicImmunity":false,"absorbPenalty":-10,"eval":"status"},"scaryface":{"setup":true,"risky":false,"prio":true,"harass":true,"baton":1,"double":1,"ally":0,"hp":[["user",[["under",70]]],["target",[["under",71]]]],"expertNoop":false,"basicNoop":false,"basicImmunity":false,"absorbPenalty":-10,"eval":"status"},"triplekick":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"featherdance":{"setup":true,"risky":false,"prio":true,"harass":true,"baton":1,"double":1,"ally":0,"hp":[["user",[["under",70]]],["target",[["under",71]]]],"expertNoop":false,"basicNoop":false,"basicImmunity":false,"absorbPenalty":-10,"eval":"status"},"milkdrink":{"setup":false,"risky":false,"prio":true,"harass":false,"baton":1,"double":1,"ally":0,"hp":[["user",[["over",70]]]],"expertNoop":false,"basicNoop":false,"basicImmunity":false,"absorbPenalty":-10,"eval":"status"},"poisontail":{"setup":false,"risky":true,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":false,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"tripleaxel":{"setup":false,"risky":true,"prio":false,"harass":false,"baton":0,"double":4,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"aquacutter":{"setup":false,"risky":true,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":false,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"reflect":{"setup":true,"risky":false,"prio":true,"harass":false,"baton":1,"double":1,"ally":0,"hp":[["user",[["under",71]]],["target",[["under",31]]]],"expertNoop":false,"basicNoop":false,"basicImmunity":false,"absorbPenalty":-10,"eval":"status"},"heatwave":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":5,"ally":2,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"flatter":{"setup":true,"risky":true,"prio":true,"harass":true,"baton":1,"double":1,"ally":0,"hp":[["target",[["under",31]]]],"expertNoop":false,"basicNoop":false,"basicImmunity":false,"absorbPenalty":-10,"eval":"status"},"magicalleaf":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":false,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"frustration":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"uturn":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":false,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"judgement":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"vitalthrow":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":false,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"wingattack":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"hurricane":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"shadowpunch":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":false,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"brine":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":6,"ally":3,"hp":[],"expertNoop":false,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"roaroftime":{"setup":false,"risky":false,"prio":true,"harass":false,"baton":0,"double":1,"ally":0,"hp":[],"expertNoop":false,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"moonlight":{"setup":false,"risky":false,"prio":true,"harass":false,"baton":1,"double":1,"ally":0,"hp":[["user",[["over",70]]]],"expertNoop":false,"basicNoop":false,"basicImmunity":false,"absorbPenalty":-10,"eval":"status"},"peck":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"leer":{"setup":true,"risky":false,"prio":true,"harass":true,"baton":1,"double":1,"ally":0,"hp":[["user",[["under",71]]],["target",[["under",72]]]],"expertNoop":false,"basicNoop":false,"basicImmunity":false,"absorbPenalty":-10,"eval":"status"},"zapcannon":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":8,"ally":5,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"pursuit":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":false,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"miracleeye":{"setup":false,"risky":false,"prio":true,"harass":false,"baton":1,"double":1,"ally":0,"hp":[],"expertNoop":false,"basicNoop":false,"basicImmunity":false,"absorbPenalty":-10,"eval":"status"},"rollingkick":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"crosschop":{"setup":false,"risky":true,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":false,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"embargo":{"setup":true,"risky":false,"prio":true,"harass":true,"baton":1,"double":1,"ally":0,"hp":[],"expertNoop":false,"basicNoop":false,"basicImmunity":false,"absorbPenalty":-10,"eval":"status"},"thundershock":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":8,"ally":5,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"spore":{"setup":true,"risky":true,"prio":true,"harass":true,"baton":1,"double":1,"ally":0,"hp":[["target",[["under",31]]]],"expertNoop":false,"basicNoop":false,"basicImmunity":false,"absorbPenalty":-10,"eval":"status"},"triattack":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"perishsong":{"setup":false,"risky":false,"prio":true,"harass":false,"baton":1,"double":1,"ally":0,"hp":[["target",[["under",71]]]],"expertNoop":true,"basicNoop":false,"basicImmunity":false,"absorbPenalty":-10,"eval":"status"},"snore":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":false,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"extrasensory":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"haze":{"setup":false,"risky":false,"prio":true,"harass":false,"baton":1,"double":1,"ally":0,"hp":[],"expertNoop":false,"basicNoop":false,"basicImmunity":false,"absorbPenalty":-10,"eval":"status"},"dragonrush":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"worryseed":{"setup":true,"risky":false,"prio":true,"harass":false,"baton":1,"double":1,"ally":0,"hp":[],"expertNoop":false,"basicNoop":false,"basicImmunity":false,"absorbPenalty":-10,"eval":"status"},"iciclespear":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"powerwhip":{"setup":false,"risky":true,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":false,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"rocktomb":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":false,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"dynamicpunch":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"crushgrip":{"setup":true,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"metalsound":{"setup":true,"risky":false,"prio":true,"harass":true,"baton":1,"double":1,"ally":0,"hp":[["user",[["under",70]]],["target",[["under",71]]]],"expertNoop":false,"basicNoop":false,"basicImmunity":false,"absorbPenalty":-10,"eval":"status"},"psychoboost":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"earthquake":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":9,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"crunch":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"attract":{"setup":true,"risky":true,"prio":true,"harass":true,"baton":1,"double":1,"ally":0,"hp":[["target",[["under",31]]]],"expertNoop":true,"basicNoop":false,"basicImmunity":false,"absorbPenalty":-10,"eval":"status"},"bravebird":{"setup":false,"risky":false,"prio":true,"harass":false,"baton":1,"double":1,"ally":0,"hp":[],"expertNoop":false,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"status"},"chargebeam":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":8,"ally":5,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"tickle":{"setup":true,"risky":false,"prio":true,"harass":true,"baton":1,"double":1,"ally":0,"hp":[["user",[["under",70]]],["target",[["under",71]]]],"expertNoop":true,"basicNoop":false,"basicImmunity":false,"absorbPenalty":-10,"eval":"status"},"vicegrip":{"setup":true,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"thief":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":1,"ally":0,"hp":[],"expertNoop":true,"basicNoop":true,"basicImmunity":false,"absorbPenalty":-10,"eval":"status"},"petaldance":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"brickbreak":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":false,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"focuspunch":{"setup":false,"risky":true,"prio":true,"harass":false,"baton":1,"double":1,"ally":0,"hp":[],"expertNoop":false,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"risky"},"closecombat":{"setup":false,"risky":false,"prio":true,"harass":false,"baton":1,"double":1,"ally":0,"hp":[],"expertNoop":false,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"status"},"hydropump":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":6,"ally":3,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"avalanche":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"spikes":{"setup":false,"risky":false,"prio":true,"harass":true,"baton":1,"double":1,"ally":0,"hp":[],"expertNoop":false,"basicNoop":false,"basicImmunity":false,"absorbPenalty":-10,"eval":"status"},"slam":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"razorleaf":{"setup":false,"risky":true,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":false,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"hpdark":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"rest":{"setup":false,"risky":false,"prio":true,"harass":false,"baton":1,"double":1,"ally":0,"hp":[["user",[["under",71]]]],"expertNoop":false,"basicNoop":true,"basicImmunity":false,"absorbPenalty":-10,"eval":"status"},"howl":{"setup":true,"risky":false,"prio":true,"harass":false,"baton":1,"double":1,"ally":0,"hp":[["user",[["under",71]]]],"expertNoop":false,"basicNoop":false,"basicImmunity":false,"absorbPenalty":-10,"eval":"status"},"poisongas":{"setup":true,"risky":false,"prio":true,"harass":true,"baton":1,"double":1,"ally":6,"hp":[["target",[["under",31]]]],"expertNoop":false,"basicNoop":false,"basicImmunity":false,"absorbPenalty":-10,"eval":"status"},"overheat":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":7,"ally":2,"hp":[],"expertNoop":false,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"swordsdance":{"setup":true,"risky":false,"prio":true,"harass":false,"baton":2,"double":1,"ally":0,"hp":[["user",[["under",70]]],["target",[["under",71]]]],"expertNoop":false,"basicNoop":false,"basicImmunity":false,"absorbPenalty":-10,"eval":"status"},"confusion":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"hpfire":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":5,"ally":2,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"smog":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"submission":{"setup":true,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"pound":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"pinmissile":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"sacredfire":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":7,"ally":2,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"bugbuzz":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"fireblast":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":5,"ally":2,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"lick":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"spite":{"setup":false,"risky":false,"prio":true,"harass":true,"baton":1,"double":1,"ally":0,"hp":[["target",[["under",31]]]],"expertNoop":true,"basicNoop":true,"basicImmunity":false,"absorbPenalty":-10,"eval":"status"},"psybeam":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"lavaplume":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":10,"ally":2,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"rockblast":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"thunderpunch":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":8,"ally":5,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"gust":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"refresh":{"setup":false,"risky":false,"prio":true,"harass":false,"baton":1,"double":1,"ally":0,"hp":[],"expertNoop":false,"basicNoop":false,"basicImmunity":false,"absorbPenalty":-10,"eval":"status"},"gyroball":{"setup":false,"risky":true,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"bodyslam":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"twineedle":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"rocksmash":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"stomp":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"mistball":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"razorwind":{"setup":false,"risky":true,"prio":true,"harass":false,"baton":1,"double":1,"ally":0,"hp":[],"expertNoop":false,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"status"},"seedflare":{"setup":true,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"hyperbeam":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":false,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"falseswipe":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"doomdesire":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":11,"ally":2,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"conditional"},"wish":{"setup":false,"risky":false,"prio":true,"harass":false,"baton":1,"double":1,"ally":0,"hp":[["user",[["under",71]]]],"expertNoop":true,"basicNoop":true,"basicImmunity":false,"absorbPenalty":-10,"eval":"status"},"bulkup":{"setup":true,"risky":false,"prio":true,"harass":false,"baton":1,"double":1,"ally":0,"hp":[["user",[["under",70]]],["target",[["under",71]]]],"expertNoop":false,"basicNoop":false,"basicImmunity":false,"absorbPenalty":-10,"eval":"status"},"disable":{"setup":false,"risky":false,"prio":true,"harass":false,"baton":1,"double":1,"ally":0,"hp":[],"expertNoop":false,"basicNoop":false,"basicImmunity":false,"absorbPenalty":-10,"eval":"status"},"dizzypunch":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"hailball":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"rockslide":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"acupressure":{"setup":true,"risky":true,"prio":true,"harass":false,"baton":1,"double":1,"ally":7,"hp":[["user",[["under",31]]],["target",[["under",71]]]],"expertNoop":false,"basicNoop":false,"basicImmunity":false,"absorbPenalty":-10,"eval":"status"},"magnetbomb":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":false,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"aurorabeam":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":false,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"firespin":{"setup":true,"risky":false,"prio":false,"harass":false,"baton":0,"double":5,"ally":2,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"leafblade":{"setup":false,"risky":true,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":false,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"ironhead":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"beatup":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"darkpulse":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"doublehit":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"mysticalfire":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"poisonsting":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"bulldoze":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":9,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"shadowsneak":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"priority"},"shadowforce":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":false,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"ember":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":5,"ally":2,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"darkvoid":{"setup":true,"risky":true,"prio":true,"harass":true,"baton":1,"double":1,"ally":0,"hp":[["target",[["under",31]]]],"expertNoop":false,"basicNoop":false,"basicImmunity":false,"absorbPenalty":-10,"eval":"status"},"reversal":{"setup":false,"risky":false,"prio":true,"harass":false,"baton":1,"double":1,"ally":0,"hp":[["user",[["over",71]]]],"expertNoop":false,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"status"},"thrash":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":false,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"poisonfang":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"teeterdance":{"setup":true,"risky":true,"prio":true,"harass":true,"baton":1,"double":1,"ally":0,"hp":[["target",[["under",71]]]],"expertNoop":false,"basicNoop":false,"basicImmunity":false,"absorbPenalty":-10,"eval":"status"},"furycutter":{"setup":false,"risky":true,"prio":false,"harass":false,"baton":0,"double":4,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"bite":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"recover":{"setup":false,"risky":false,"prio":true,"harass":false,"baton":1,"double":1,"ally":0,"hp":[["user",[["over",70]]]],"expertNoop":false,"basicNoop":false,"basicImmunity":false,"absorbPenalty":-10,"eval":"status"},"trumpcard":{"setup":false,"risky":false,"prio":true,"harass":false,"baton":1,"double":1,"ally":0,"hp":[],"expertNoop":false,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"status"},"followme":{"setup":false,"risky":false,"prio":true,"harass":false,"baton":1,"double":12,"ally":0,"hp":[],"expertNoop":true,"basicNoop":true,"basicImmunity":false,"absorbPenalty":-10,"eval":"status"},"mindreader":{"setup":false,"risky":false,"prio":true,"harass":false,"baton":1,"double":1,"ally":0,"hp":[["user",[["under",31]]],["target",[["under",31]]]],"expertNoop":false,"basicNoop":false,"basicImmunity":false,"absorbPenalty":-10,"eval":"status"},"hypervoice":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"gastroacid":{"setup":false,"risky":false,"prio":true,"harass":false,"baton":1,"double":1,"ally":8,"hp":[],"expertNoop":false,"basicNoop":false,"basicImmunity":false,"absorbPenalty":-10,"eval":"status"},"skyattack":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":false,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"watergun":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":6,"ally":3,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"furyattack":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"gunkshot":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"psychup":{"setup":false,"risky":false,"prio":true,"harass":false,"baton":1,"double":1,"ally":0,"hp":[["user",[["under",31]]],["target",[["under",31]]]],"expertNoop":false,"basicNoop":false,"basicImmunity":false,"absorbPenalty":-10,"eval":"status"},"memento":{"setup":false,"risky":true,"prio":true,"harass":false,"baton":1,"double":1,"ally":0,"hp":[["user",[["over",30]]],["target",[["under",31]]]],"expertNoop":false,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"risky"},"growl":{"setup":true,"risky":false,"prio":true,"harass":true,"baton":1,"double":1,"ally":0,"hp":[["user",[["under",71]]],["target",[["under",72]]]],"expertNoop":false,"basicNoop":false,"basicImmunity":false,"absorbPenalty":-10,"eval":"status"},"aquaring":{"setup":false,"risky":false,"prio":true,"harass":false,"baton":2,"double":1,"ally":0,"hp":[],"expertNoop":false,"basicNoop":false,"basicImmunity":false,"absorbPenalty":-10,"eval":"status"},"irondefense":{"setup":true,"risky":false,"prio":true,"harass":false,"baton":1,"double":1,"ally":0,"hp":[["user",[["under",70]]],["target",[["under",71]]]],"expertNoop":false,"basicNoop":false,"basicImmunity":false,"absorbPenalty":-10,"eval":"status"},"flail":{"setup":false,"risky":false,"prio":true,"harass":false,"baton":1,"double":1,"ally":0,"hp":[["user",[["over",71]]]],"expertNoop":false,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"status"},"seedbomb":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"mirrorcoat":{"setup":false,"risky":true,"prio":true,"harass":false,"baton":1,"double":1,"ally":0,"hp":[["user",[["under",31]]],["target",[["under",31]]]],"expertNoop":false,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"status"},"amnesia":{"setup":true,"risky":false,"prio":true,"harass":false,"baton":1,"double":1,"ally":0,"hp":[["user",[["under",70]]],["target",[["under",71]]]],"expertNoop":false,"basicNoop":false,"basicImmunity":false,"absorbPenalty":-10,"eval":"status"},"swift":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":false,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"hpground":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"wrap":{"setup":true,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"sandstorm":{"setup":false,"risky":false,"prio":true,"harass":false,"baton":1,"double":13,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":false,"absorbPenalty":-10,"eval":"status"},"scald":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":6,"ally":3,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"thunderbolt":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":8,"ally":5,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"accelerock":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"sing":{"setup":true,"risky":true,"prio":true,"harass":true,"baton":1,"double":1,"ally":0,"hp":[["target",[["under",31]]]],"expertNoop":false,"basicNoop":false,"basicImmunity":false,"absorbPenalty":-10,"eval":"status"},"foresight":{"setup":false,"risky":false,"prio":true,"harass":false,"baton":1,"double":1,"ally":0,"hp":[],"expertNoop":false,"basicNoop":false,"basicImmunity":false,"absorbPenalty":-10,"eval":"status"},"thunder":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":8,"ally":5,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"selfdestruct":{"setup":false,"risky":true,"prio":true,"harass":false,"baton":1,"double":1,"ally":0,"hp":[["user",[["over",30]]],["target",[["under",31]]]],"expertNoop":false,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"risky"},"doubleteam":{"setup":true,"risky":false,"prio":true,"harass":false,"baton":1,"double":1,"ally":0,"hp":[["user",[["under",71]]]],"expertNoop":false,"basicNoop":false,"basicImmunity":false,"absorbPenalty":-10,"eval":"status"},"whirlpool":{"setup":true,"risky":false,"prio":false,"harass":false,"baton":0,"double":6,"ally":3,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"headsmash":{"setup":false,"risky":false,"prio":true,"harass":false,"baton":1,"double":1,"ally":0,"hp":[],"expertNoop":false,"basicNoop":true,"basicImmunity":false,"absorbPenalty":-10,"eval":"status"},"tackle":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"pluck":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":false,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"sheercold":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":false,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"psychocut":{"setup":false,"risky":true,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":false,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"harden":{"setup":true,"risky":false,"prio":true,"harass":false,"baton":1,"double":1,"ally":0,"hp":[["user",[["under",71]]]],"expertNoop":false,"basicNoop":false,"basicImmunity":false,"absorbPenalty":-10,"eval":"status"},"hpwater":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":6,"ally":3,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"vacuumwave":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"priority"},"icywind":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":false,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"morningsun":{"setup":false,"risky":false,"prio":true,"harass":false,"baton":1,"double":1,"ally":0,"hp":[["user",[["over",70]]]],"expertNoop":false,"basicNoop":false,"basicImmunity":false,"absorbPenalty":-10,"eval":"status"},"faketears":{"setup":true,"risky":false,"prio":true,"harass":true,"baton":1,"double":1,"ally":0,"hp":[["user",[["under",70]]],["target",[["under",71]]]],"expertNoop":false,"basicNoop":false,"basicImmunity":false,"absorbPenalty":-10,"eval":"status"},"substitute":{"setup":true,"risky":false,"prio":true,"harass":false,"baton":1,"double":1,"ally":0,"hp":[],"expertNoop":false,"basicNoop":false,"basicImmunity":false,"absorbPenalty":-10,"eval":"status"},"toxicspikes":{"setup":false,"risky":false,"prio":true,"harass":true,"baton":1,"double":1,"ally":0,"hp":[],"expertNoop":false,"basicNoop":false,"basicImmunity":false,"absorbPenalty":-10,"eval":"status"},"gigaimpact":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":false,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"waterpulse":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":6,"ally":3,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"recycle":{"setup":false,"risky":false,"prio":true,"harass":false,"baton":1,"double":1,"ally":0,"hp":[],"expertNoop":false,"basicNoop":false,"basicImmunity":false,"absorbPenalty":-10,"eval":"status"},"charm":{"setup":true,"risky":false,"prio":true,"harass":true,"baton":1,"double":1,"ally":0,"hp":[["user",[["under",70]]],["target",[["under",71]]]],"expertNoop":false,"basicNoop":false,"basicImmunity":false,"absorbPenalty":-10,"eval":"status"},"metronome":{"setup":false,"risky":true,"prio":true,"harass":false,"baton":1,"double":1,"ally":0,"hp":[],"expertNoop":true,"basicNoop":true,"basicImmunity":false,"absorbPenalty":-10,"eval":"status"},"gigadrain":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":false,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"dragonbreath":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"sweetkiss":{"setup":true,"risky":true,"prio":true,"harass":true,"baton":1,"double":1,"ally":0,"hp":[["target",[["under",71]]]],"expertNoop":false,"basicNoop":false,"basicImmunity":false,"absorbPenalty":-10,"eval":"status"},"mist":{"setup":false,"risky":false,"prio":true,"harass":false,"baton":1,"double":1,"ally":0,"hp":[["user",[["under",71]]],["target",[["over",71]]]],"expertNoop":true,"basicNoop":false,"basicImmunity":false,"absorbPenalty":-10,"eval":"status"},"slash":{"setup":false,"risky":true,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":false,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"needlearm":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"attackorder":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"conversion2":{"setup":false,"risky":false,"prio":true,"harass":false,"baton":1,"double":1,"ally":0,"hp":[["user",[["under",70]]],["target",[["under",31]]]],"expertNoop":true,"basicNoop":true,"basicImmunity":false,"absorbPenalty":-10,"eval":"status"},"fireball":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":5,"ally":2,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"hammerarm":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":false,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"doubleslap":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"octazooka":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":6,"ally":3,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"bonemerang":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"batonpass":{"setup":false,"risky":false,"prio":true,"harass":false,"baton":3,"double":1,"ally":0,"hp":[],"expertNoop":false,"basicNoop":false,"basicImmunity":false,"absorbPenalty":-10,"eval":"status"},"aquatail":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":6,"ally":3,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"glare":{"setup":true,"risky":false,"prio":true,"harass":true,"baton":1,"double":1,"ally":0,"hp":[["target",[["under",31]]]],"expertNoop":false,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-10,"eval":"status"},"bubblebeam":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":6,"ally":3,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"flareblitz":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":5,"ally":2,"hp":[],"expertNoop":false,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"endure":{"setup":false,"risky":false,"prio":true,"harass":false,"baton":1,"double":1,"ally":0,"hp":[],"expertNoop":false,"basicNoop":true,"basicImmunity":false,"absorbPenalty":-10,"eval":"status"},"flashcannon":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"shockwave":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":8,"ally":5,"hp":[],"expertNoop":false,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"hpelectric":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":8,"ally":5,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"iceball":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":false,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"aeroblast":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"stockpile":{"setup":true,"risky":false,"prio":true,"harass":false,"baton":1,"double":1,"ally":0,"hp":[["user",[["under",70]]],["target",[["under",71]]]],"expertNoop":false,"basicNoop":false,"basicImmunity":false,"absorbPenalty":-10,"eval":"status"},"magmastorm":{"setup":true,"risky":false,"prio":false,"harass":false,"baton":0,"double":5,"ally":2,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"present":{"setup":false,"risky":true,"prio":true,"harass":false,"baton":1,"double":1,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"status"},"mudbomb":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"quickattack":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"priority"},"lightscreen":{"setup":true,"risky":false,"prio":true,"harass":false,"baton":1,"double":1,"ally":0,"hp":[["user",[["under",71]]],["target",[["under",31]]]],"expertNoop":false,"basicNoop":false,"basicImmunity":false,"absorbPenalty":-10,"eval":"status"},"drainpunch":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":false,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"defog":{"setup":true,"risky":false,"prio":true,"harass":true,"baton":1,"double":1,"ally":0,"hp":[],"expertNoop":false,"basicNoop":false,"basicImmunity":false,"absorbPenalty":-10,"eval":"status"},"jumpkick":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"supersonic":{"setup":true,"risky":true,"prio":true,"harass":true,"baton":1,"double":1,"ally":0,"hp":[["target",[["under",71]]]],"expertNoop":false,"basicNoop":false,"basicImmunity":false,"absorbPenalty":-10,"eval":"status"},"bonerush":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"mimic":{"setup":false,"risky":false,"prio":true,"harass":false,"baton":1,"double":1,"ally":0,"hp":[],"expertNoop":true,"basicNoop":true,"basicImmunity":false,"absorbPenalty":-10,"eval":"status"},"frenzyplant":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":false,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"lovelykiss":{"setup":true,"risky":true,"prio":true,"harass":true,"baton":1,"double":1,"ally":0,"hp":[["target",[["under",31]]]],"expertNoop":false,"basicNoop":false,"basicImmunity":false,"absorbPenalty":-10,"eval":"status"},"volttackle":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":8,"ally":5,"hp":[],"expertNoop":false,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"bugbite":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":false,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"knockoff":{"setup":false,"risky":false,"prio":false,"harass":true,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":false,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"mudslap":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"healorder":{"setup":false,"risky":false,"prio":true,"harass":false,"baton":1,"double":1,"ally":0,"hp":[["user",[["over",70]]]],"expertNoop":false,"basicNoop":false,"basicImmunity":false,"absorbPenalty":-10,"eval":"status"},"waterfall":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"payback":{"setup":false,"risky":true,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":false,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"hppsychic":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"sandtomb":{"setup":true,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"energyball":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"detect":{"setup":false,"risky":false,"prio":true,"harass":false,"baton":4,"double":1,"ally":0,"hp":[],"expertNoop":false,"basicNoop":true,"basicImmunity":false,"absorbPenalty":-10,"eval":"status"},"dive":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":6,"ally":3,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"focusenergy":{"setup":false,"risky":false,"prio":true,"harass":false,"baton":1,"double":1,"ally":0,"hp":[["user",[["under",70]]]],"expertNoop":true,"basicNoop":false,"basicImmunity":false,"absorbPenalty":-10,"eval":"status"},"nastyplot":{"setup":true,"risky":false,"prio":true,"harass":false,"baton":2,"double":1,"ally":0,"hp":[["user",[["under",70]]],["target",[["under",71]]]],"expertNoop":false,"basicNoop":false,"basicImmunity":false,"absorbPenalty":-10,"eval":"status"},"hpfighting":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"furyswipes":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"dragonclaw":{"setup":false,"risky":true,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":false,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"lowkick":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"ancientpower":{"setup":false,"risky":true,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"sketch":{"setup":false,"risky":false,"prio":true,"harass":false,"baton":1,"double":1,"ally":0,"hp":[],"expertNoop":true,"basicNoop":true,"basicImmunity":false,"absorbPenalty":-10,"eval":"status"},"tailwhip":{"setup":true,"risky":false,"prio":true,"harass":true,"baton":1,"double":1,"ally":0,"hp":[["user",[["under",71]]],["target",[["under",72]]]],"expertNoop":false,"basicNoop":false,"basicImmunity":false,"absorbPenalty":-10,"eval":"status"},"airslash":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"fling":{"setup":false,"risky":false,"prio":true,"harass":false,"baton":1,"double":1,"ally":0,"hp":[["user",[["under",70]]],["target",[["under",71]]]],"expertNoop":false,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"status"},"solarbeam":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"helpinghand":{"setup":false,"risky":false,"prio":true,"harass":false,"baton":1,"double":1,"ally":9,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":false,"absorbPenalty":-10,"eval":"status"},"sleeptalk":{"setup":false,"risky":false,"prio":true,"harass":false,"baton":1,"double":1,"ally":0,"hp":[],"expertNoop":false,"basicNoop":false,"basicImmunity":false,"absorbPenalty":-10,"eval":"status"},"grasswhistle":{"setup":true,"risky":true,"prio":true,"harass":true,"baton":1,"double":1,"ally":0,"hp":[["target",[["under",31]]]],"expertNoop":false,"basicNoop":false,"basicImmunity":false,"absorbPenalty":-10,"eval":"status"},"nightslash":{"setup":false,"risky":true,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":false,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"leechseed":{"setup":true,"risky":false,"prio":true,"harass":true,"baton":1,"double":1,"ally":0,"hp":[],"expertNoop":false,"basicNoop":false,"basicImmunity":false,"absorbPenalty":-10,"eval":"status"},"zenheadbutt":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"cottonspore":{"setup":true,"risky":false,"prio":true,"harass":true,"baton":1,"double":1,"ally":0,"hp":[["user",[["under",70]]],["target",[["under",71]]]],"expertNoop":false,"basicNoop":false,"basicImmunity":false,"absorbPenalty":-10,"eval":"status"},"hpice":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"screech":{"setup":true,"risky":false,"prio":true,"harass":true,"baton":1,"double":1,"ally":0,"hp":[["user",[["under",70]]],["target",[["under",71]]]],"expertNoop":false,"basicNoop":false,"basicImmunity":false,"absorbPenalty":-10,"eval":"status"},"block":{"setup":false,"risky":false,"prio":true,"harass":false,"baton":1,"double":1,"ally":0,"hp":[],"expertNoop":false,"basicNoop":false,"basicImmunity":false,"absorbPenalty":-10,"eval":"status"},"rockball":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"imprison":{"setup":true,"risky":false,"prio":true,"harass":true,"baton":1,"double":1,"ally":0,"hp":[],"expertNoop":false,"basicNoop":false,"basicImmunity":false,"absorbPenalty":-10,"eval":"status"},"crosspoison":{"setup":false,"risky":true,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":false,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"karatechop":{"setup":false,"risky":true,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":false,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"yawn":{"setup":true,"risky":true,"prio":true,"harass":true,"baton":1,"double":1,"ally":0,"hp":[["target",[["under",31]]]],"expertNoop":false,"basicNoop":false,"basicImmunity":false,"absorbPenalty":-10,"eval":"status"},"payday":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"drillrun":{"setup":false,"risky":true,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":false,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"suckerpunch":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"constrict":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"kinesis":{"setup":true,"risky":false,"prio":true,"harass":true,"baton":1,"double":1,"ally":0,"hp":[["user",[["under",70]]],["target",[["under",71]]]],"expertNoop":false,"basicNoop":false,"basicImmunity":false,"absorbPenalty":-10,"eval":"status"},"metalclaw":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"odorsleuth":{"setup":false,"risky":false,"prio":true,"harass":false,"baton":1,"double":1,"ally":0,"hp":[],"expertNoop":false,"basicNoop":false,"basicImmunity":false,"absorbPenalty":-10,"eval":"status"},"counter":{"setup":false,"risky":true,"prio":true,"harass":false,"baton":1,"double":1,"ally":0,"hp":[["user",[["under",31]]],["target",[["under",31]]]],"expertNoop":false,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"status"},"mirrorshot":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"painsplit":{"setup":false,"risky":false,"prio":true,"harass":false,"baton":1,"double":1,"ally":0,"hp":[["target",[["under",71]]]],"expertNoop":false,"basicNoop":true,"basicImmunity":false,"absorbPenalty":-10,"eval":"status"},"dreameater":{"setup":false,"risky":false,"prio":true,"harass":false,"baton":1,"double":1,"ally":0,"hp":[],"expertNoop":false,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-10,"eval":"status"},"wringout":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":false,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"grudge":{"setup":false,"risky":false,"prio":true,"harass":false,"baton":1,"double":1,"ally":0,"hp":[["user",[["over",70]]]],"expertNoop":true,"basicNoop":true,"basicImmunity":false,"absorbPenalty":-10,"eval":"status"},"revenge":{"setup":false,"risky":true,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":false,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"hijumpkick":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"blizzard":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":false,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"bubble":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":6,"ally":3,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"minimize":{"setup":true,"risky":false,"prio":true,"harass":false,"baton":1,"double":1,"ally":0,"hp":[["user",[["under",70]]],["target",[["under",71]]]],"expertNoop":false,"basicNoop":false,"basicImmunity":false,"absorbPenalty":-10,"eval":"status"},"camouflage":{"setup":true,"risky":false,"prio":true,"harass":true,"baton":1,"double":1,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":false,"absorbPenalty":-10,"eval":"status"},"megahorn":{"setup":false,"risky":true,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":false,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"trickroom":{"setup":false,"risky":false,"prio":true,"harass":false,"baton":1,"double":14,"ally":0,"hp":[],"expertNoop":false,"basicNoop":false,"basicImmunity":false,"absorbPenalty":-10,"eval":"status"},"sludgebomb":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"naturepower":{"setup":false,"risky":false,"prio":true,"harass":true,"baton":1,"double":1,"ally":0,"hp":[],"expertNoop":true,"basicNoop":true,"basicImmunity":false,"absorbPenalty":-10,"eval":"status"},"xscissor":{"setup":false,"risky":true,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":false,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"guillotine":{"setup":false,"risky":true,"prio":true,"harass":false,"baton":1,"double":1,"ally":0,"hp":[["target",[["under",31]]]],"expertNoop":false,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"status"},"charge":{"setup":true,"risky":false,"prio":true,"harass":false,"baton":1,"double":1,"ally":0,"hp":[["user",[["under",70]]],["target",[["under",71]]]],"expertNoop":true,"basicNoop":true,"basicImmunity":false,"absorbPenalty":-10,"eval":"status"},"thunderfang":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":8,"ally":5,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"facade":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":false,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"lusterpurge":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"roleplay":{"setup":false,"risky":false,"prio":true,"harass":false,"baton":1,"double":1,"ally":0,"hp":[],"expertNoop":false,"basicNoop":true,"basicImmunity":false,"absorbPenalty":-10,"eval":"status"},"woodhammer":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":false,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"smokescreen":{"setup":true,"risky":false,"prio":true,"harass":true,"baton":1,"double":1,"ally":0,"hp":[["user",[["under",71]]],["target",[["under",72]]]],"expertNoop":false,"basicNoop":false,"basicImmunity":false,"absorbPenalty":-10,"eval":"status"},"captivate":{"setup":true,"risky":false,"prio":true,"harass":false,"baton":1,"double":1,"ally":0,"hp":[["user",[["under",70]]],["target",[["under",71]]]],"expertNoop":false,"basicNoop":false,"basicImmunity":false,"absorbPenalty":-10,"eval":"status"},"forcepalm":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"bulletseed":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"dragondance":{"setup":true,"risky":false,"prio":true,"harass":false,"baton":2,"double":1,"ally":0,"hp":[["user",[["under",70]]],["target",[["under",71]]]],"expertNoop":false,"basicNoop":false,"basicImmunity":false,"absorbPenalty":-10,"eval":"status"},"steelwing":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"aircutter":{"setup":false,"risky":true,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":false,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"rockclimb":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"flamewheel":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":7,"ally":2,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"uproar":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"roar":{"setup":false,"risky":false,"prio":true,"harass":false,"baton":1,"double":1,"ally":0,"hp":[],"expertNoop":false,"basicNoop":false,"basicImmunity":false,"absorbPenalty":-10,"eval":"status"},"bounce":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"assist":{"setup":false,"risky":false,"prio":true,"harass":false,"baton":1,"double":1,"ally":0,"hp":[],"expertNoop":true,"basicNoop":true,"basicImmunity":false,"absorbPenalty":-10,"eval":"status"},"cut":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"lunardance":{"setup":false,"risky":false,"prio":true,"harass":false,"baton":1,"double":1,"ally":0,"hp":[["user",[["over",70]]]],"expertNoop":false,"basicNoop":false,"basicImmunity":false,"absorbPenalty":-10,"eval":"status"},"stringshot":{"setup":true,"risky":false,"prio":true,"harass":false,"baton":1,"double":1,"ally":0,"hp":[["user",[["under",71]]],["target",[["under",72]]]],"expertNoop":false,"basicNoop":false,"basicImmunity":false,"absorbPenalty":-10,"eval":"status"},"thunderwave":{"setup":true,"risky":false,"prio":true,"harass":true,"baton":1,"double":15,"ally":10,"hp":[["target",[["under",31]]]],"expertNoop":false,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"status"},"powergem":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"fakeout":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":false,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"copycat":{"setup":false,"risky":false,"prio":true,"harass":false,"baton":1,"double":1,"ally":0,"hp":[],"expertNoop":false,"basicNoop":false,"basicImmunity":false,"absorbPenalty":-10,"eval":"status"},"slackoff":{"setup":false,"risky":false,"prio":true,"harass":false,"baton":1,"double":1,"ally":0,"hp":[["user",[["over",70]]]],"expertNoop":false,"basicNoop":false,"basicImmunity":false,"absorbPenalty":-10,"eval":"status"},"synthesis":{"setup":false,"risky":false,"prio":true,"harass":false,"baton":1,"double":1,"ally":0,"hp":[["user",[["over",70]]]],"expertNoop":false,"basicNoop":false,"basicImmunity":false,"absorbPenalty":-10,"eval":"status"},"silverwind":{"setup":false,"risky":true,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"blazekick":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":7,"ally":2,"hp":[],"expertNoop":false,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"doubleedge":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":false,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"torment":{"setup":true,"risky":false,"prio":true,"harass":true,"baton":1,"double":1,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":false,"absorbPenalty":-10,"eval":"status"},"flamethrower":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":5,"ally":2,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"crabhammer":{"setup":false,"risky":true,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":false,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"machpunch":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"priority"},"waterspout":{"setup":false,"risky":false,"prio":true,"harass":false,"baton":1,"double":16,"ally":0,"hp":[["user",[["under",31]]]],"expertNoop":false,"basicNoop":true,"basicImmunity":false,"absorbPenalty":-10,"eval":"status"},"hail":{"setup":false,"risky":false,"prio":true,"harass":false,"baton":1,"double":17,"ally":0,"hp":[],"expertNoop":false,"basicNoop":false,"basicImmunity":false,"absorbPenalty":-10,"eval":"status"},"hydrocannon":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":false,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"outrage":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":false,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"astonish":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"naturalgift":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"sweetscent":{"setup":true,"risky":false,"prio":true,"harass":true,"baton":1,"double":1,"ally":0,"hp":[["user",[["under",71]]],["target",[["under",72]]]],"expertNoop":false,"basicNoop":false,"basicImmunity":false,"absorbPenalty":-10,"eval":"status"},"sharpen":{"setup":true,"risky":false,"prio":true,"harass":false,"baton":1,"double":1,"ally":0,"hp":[["user",[["under",71]]]],"expertNoop":false,"basicNoop":false,"basicImmunity":false,"absorbPenalty":-10,"eval":"status"},"aerialace":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":false,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"mirrormove":{"setup":false,"risky":true,"prio":true,"harass":false,"baton":1,"double":1,"ally":0,"hp":[],"expertNoop":false,"basicNoop":true,"basicImmunity":false,"absorbPenalty":-10,"eval":"status"},"meditate":{"setup":true,"risky":false,"prio":true,"harass":false,"baton":1,"double":1,"ally":0,"hp":[["user",[["under",71]]]],"expertNoop":false,"basicNoop":false,"basicImmunity":false,"absorbPenalty":-10,"eval":"status"},"defendorder":{"setup":true,"risky":false,"prio":true,"harass":false,"baton":1,"double":1,"ally":0,"hp":[["user",[["under",70]]],["target",[["under",71]]]],"expertNoop":false,"basicNoop":false,"basicImmunity":false,"absorbPenalty":-10,"eval":"status"},"futuresight":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":11,"ally":2,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"conditional"},"fly":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":false,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"acidarmor":{"setup":true,"risky":false,"prio":true,"harass":false,"baton":1,"double":1,"ally":0,"hp":[["user",[["under",70]]],["target",[["under",71]]]],"expertNoop":false,"basicNoop":false,"basicImmunity":false,"absorbPenalty":-10,"eval":"status"},"discharge":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":18,"ally":5,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"teleport":{"setup":false,"risky":false,"prio":true,"harass":false,"baton":1,"double":1,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":false,"absorbPenalty":-10,"eval":"status"},"cosmicpower":{"setup":true,"risky":false,"prio":true,"harass":false,"baton":1,"double":1,"ally":0,"hp":[["user",[["under",70]]],["target",[["under",71]]]],"expertNoop":false,"basicNoop":false,"basicImmunity":false,"absorbPenalty":-10,"eval":"status"},"rockpolish":{"setup":true,"risky":false,"prio":true,"harass":false,"baton":1,"double":1,"ally":0,"hp":[["user",[["under",70]]],["target",[["under",71]]]],"expertNoop":false,"basicNoop":false,"basicImmunity":false,"absorbPenalty":-10,"eval":"status"},"return":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"takedown":{"setup":false,"risky":false,"prio":true,"harass":false,"baton":1,"double":1,"ally":0,"hp":[],"expertNoop":false,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"status"},"barrier":{"setup":true,"risky":false,"prio":true,"harass":false,"baton":1,"double":1,"ally":0,"hp":[["user",[["under",70]]],["target",[["under",71]]]],"expertNoop":false,"basicNoop":false,"basicImmunity":false,"absorbPenalty":-10,"eval":"status"},"boneclub":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"ingrain":{"setup":true,"risky":false,"prio":true,"harass":false,"baton":1,"double":1,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":false,"absorbPenalty":-10,"eval":"status"},"leechlife":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":false,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"clamp":{"setup":true,"risky":false,"prio":false,"harass":false,"baton":0,"double":6,"ally":3,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"gravity":{"setup":false,"risky":false,"prio":true,"harass":false,"baton":1,"double":19,"ally":0,"hp":[],"expertNoop":false,"basicNoop":false,"basicImmunity":false,"absorbPenalty":-10,"eval":"status"},"rage":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":false,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"psychic":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"focusblast":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"calmmind":{"setup":true,"risky":false,"prio":true,"harass":false,"baton":2,"double":1,"ally":0,"hp":[["user",[["under",70]]],["target",[["under",71]]]],"expertNoop":false,"basicNoop":false,"basicImmunity":false,"absorbPenalty":-10,"eval":"status"},"meteormash":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"powdersnow":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"iceshard":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"priority"},"flash":{"setup":true,"risky":false,"prio":true,"harass":true,"baton":1,"double":1,"ally":0,"hp":[["user",[["under",71]]],["target",[["under",72]]]],"expertNoop":false,"basicNoop":false,"basicImmunity":false,"absorbPenalty":-10,"eval":"status"},"growth":{"setup":true,"risky":false,"prio":true,"harass":false,"baton":1,"double":1,"ally":0,"hp":[["user",[["under",71]]]],"expertNoop":false,"basicNoop":false,"basicImmunity":false,"absorbPenalty":-10,"eval":"status"},"dracometeor":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":false,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"psychoshift":{"setup":false,"risky":false,"prio":true,"harass":true,"baton":1,"double":1,"ally":0,"hp":[],"expertNoop":false,"basicNoop":false,"basicImmunity":false,"absorbPenalty":-10,"eval":"status"},"hpghost":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"stunspore":{"setup":true,"risky":false,"prio":true,"harass":true,"baton":1,"double":1,"ally":0,"hp":[["target",[["under",31]]]],"expertNoop":false,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-10,"eval":"status"},"vinewhip":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"bulletpunch":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"priority"},"protect":{"setup":false,"risky":false,"prio":true,"harass":false,"baton":4,"double":1,"ally":0,"hp":[],"expertNoop":false,"basicNoop":true,"basicImmunity":false,"absorbPenalty":-10,"eval":"status"},"skyuppercut":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"confuseray":{"setup":true,"risky":true,"prio":true,"harass":true,"baton":1,"double":1,"ally":0,"hp":[["target",[["under",71]]]],"expertNoop":false,"basicNoop":false,"basicImmunity":false,"absorbPenalty":-10,"eval":"status"},"icebeam":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"doublekick":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"poisonjab":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"faintattack":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":false,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"muddywater":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":6,"ally":3,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"sandattack":{"setup":true,"risky":false,"prio":true,"harass":true,"baton":1,"double":1,"ally":0,"hp":[["user",[["under",71]]],["target",[["under",72]]]],"expertNoop":false,"basicNoop":false,"basicImmunity":false,"absorbPenalty":-10,"eval":"status"},"endeavor":{"setup":false,"risky":false,"prio":true,"harass":false,"baton":1,"double":1,"ally":0,"hp":[],"expertNoop":false,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"status"},"hpgrass":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"wakeupslap":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":false,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"softboiled":{"setup":false,"risky":false,"prio":true,"harass":false,"baton":1,"double":1,"ally":0,"hp":[["user",[["over",70]]]],"expertNoop":false,"basicNoop":false,"basicImmunity":false,"absorbPenalty":-10,"eval":"status"},"icepunch":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"raindance":{"setup":false,"risky":false,"prio":true,"harass":false,"baton":1,"double":20,"ally":0,"hp":[],"expertNoop":false,"basicNoop":false,"basicImmunity":false,"absorbPenalty":-10,"eval":"status"},"superpower":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":false,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"luckychant":{"setup":true,"risky":false,"prio":true,"harass":false,"baton":1,"double":1,"ally":0,"hp":[["user",[["over",30],["under",71]]]],"expertNoop":false,"basicNoop":false,"basicImmunity":false,"absorbPenalty":-10,"eval":"status"},"explosion":{"setup":false,"risky":true,"prio":true,"harass":false,"baton":1,"double":1,"ally":0,"hp":[["user",[["over",30]]],["target",[["under",31]]]],"expertNoop":false,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"risky"},"chatter":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"megapunch":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"hyperfang":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"irontail":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"destinybond":{"setup":false,"risky":true,"prio":true,"harass":false,"baton":1,"double":1,"ally":0,"hp":[["user",[["over",71]]]],"expertNoop":false,"basicNoop":true,"basicImmunity":false,"absorbPenalty":-10,"eval":"status"},"firefang":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":5,"ally":2,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"absorb":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":false,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"grassknot":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"weatherball":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"feint":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":false,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"strength":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"hprock":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"hypnosis":{"setup":true,"risky":true,"prio":true,"harass":true,"baton":1,"double":1,"ally":0,"hp":[["target",[["under",31]]]],"expertNoop":false,"basicNoop":false,"basicImmunity":false,"absorbPenalty":-10,"eval":"status"},"willowisp":{"setup":true,"risky":false,"prio":true,"harass":true,"baton":1,"double":1,"ally":11,"hp":[["target",[["under",31]]]],"expertNoop":true,"basicNoop":false,"basicImmunity":false,"absorbPenalty":-10,"eval":"status"},"hiddenpower":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"fissure":{"setup":false,"risky":true,"prio":true,"harass":false,"baton":1,"double":1,"ally":0,"hp":[["target",[["under",31]]]],"expertNoop":false,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"status"},"roost":{"setup":false,"risky":false,"prio":true,"harass":false,"baton":1,"double":1,"ally":0,"hp":[["user",[["over",71]]]],"expertNoop":false,"basicNoop":false,"basicImmunity":false,"absorbPenalty":-10,"eval":"status"},"surf":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":21,"ally":3,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"earthpower":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"curse":{"setup":false,"risky":false,"prio":true,"harass":false,"baton":1,"double":1,"ally":0,"hp":[],"expertNoop":false,"basicNoop":false,"basicImmunity":false,"absorbPenalty":-10,"eval":"status"},"sleeppowder":{"setup":true,"risky":true,"prio":true,"harass":true,"baton":1,"double":1,"ally":0,"hp":[["target",[["under",31]]]],"expertNoop":false,"basicNoop":false,"basicImmunity":false,"absorbPenalty":-10,"eval":"status"},"waterball":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":6,"ally":3,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"dig":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"megadrain":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":false,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"toxic":{"setup":true,"risky":false,"prio":true,"harass":true,"baton":1,"double":1,"ally":6,"hp":[["target",[["under",31]]]],"expertNoop":false,"basicNoop":false,"basicImmunity":false,"absorbPenalty":-10,"eval":"status"},"dragonrage":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":4,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"powertrick":{"setup":false,"risky":false,"prio":true,"harass":false,"baton":1,"double":1,"ally":0,"hp":[],"expertNoop":false,"basicNoop":false,"basicImmunity":false,"absorbPenalty":-10,"eval":"status"},"meanlook":{"setup":false,"risky":false,"prio":true,"harass":false,"baton":1,"double":1,"ally":0,"hp":[],"expertNoop":false,"basicNoop":false,"basicImmunity":false,"absorbPenalty":-10,"eval":"status"},"transform":{"setup":false,"risky":false,"prio":true,"harass":false,"baton":1,"double":1,"ally":0,"hp":[],"expertNoop":true,"basicNoop":true,"basicImmunity":false,"absorbPenalty":-10,"eval":"status"},"metalburst":{"setup":false,"risky":true,"prio":true,"harass":false,"baton":1,"double":1,"ally":0,"hp":[["user",[["under",31]]]],"expertNoop":false,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"status"},"bellydrum":{"setup":true,"risky":true,"prio":true,"harass":false,"baton":1,"double":1,"ally":0,"hp":[["user",[["under",70]]],["target",[["under",71]]]],"expertNoop":false,"basicNoop":false,"basicImmunity":false,"absorbPenalty":-10,"eval":"status"},"superfang":{"setup":false,"risky":false,"prio":true,"harass":false,"baton":1,"double":1,"ally":0,"hp":[["target",[["under",31]]]],"expertNoop":false,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"status"},"judgment":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":true,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"feintattack":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":false,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"smellingsalt":{"setup":false,"risky":false,"prio":false,"harass":false,"baton":0,"double":0,"ally":0,"hp":[],"expertNoop":false,"basicNoop":false,"basicImmunity":true,"absorbPenalty":-12,"eval":"attack"},"conversion":{"setup":false,"risky":false,"prio":true,"harass":false,"baton":1,"double":1,"ally":0,"hp":[["user",[["under",70]]],["target",[["under",31]]]],"expertNoop":true,"basicNoop":true,"basicImmunity":false,"absorbPenalty":-10,"eval":"status"}};
  const pmap = (entries) => new Map(entries);
  const clean = d => new Map([...d].filter(([,p]) => p > 1e-15));
  function convolve(a, b) {
    const out = new Map();
    for (const [x, px] of a) for (const [y, py] of b)
      out.set(x+y, (out.get(x+y)||0) + px*py);
    return clean(out);
  }
  function delta(n) { return pmap([[n,1]]); }
  function chance(deltaScore, probability) {
    return pmap([[0,1-probability],[deltaScore,probability]]);
  }
  const nameKey = s => String(s||'').toLowerCase().replace(/[^a-z0-9]/g, '');
  const group = (s, names) => names.some(n => nameKey(n) === nameKey(s));
  const statusMoves = new Set(['Curse','Dragon Dance','Swords Dance','Nasty Plot','Calm Mind','Bulk Up','Agility','Rock Polish','Stealth Rock','Spikes','Toxic Spikes','Tailwind','Yawn','Hypnosis','Spore','Sleep Powder','Thunder Wave','Will-O-Wisp','Toxic','Leech Seed','Confuse Ray','Swagger','Reflect','Light Screen','Protect','Detect','Recover','Roost','Rest','Helping Hand','Trick Room','Substitute','Iron Defense','Amnesia','Acid Armor','Harden','Double Team','Growth','Belly Drum'].map(nameKey));
  const harassMoves = new Set(['Hypnosis','Spore','Sleep Powder','Yawn','Thunder Wave','Will-O-Wisp','Toxic','Confuse Ray','Swagger','Leech Seed','Encore','Torment','Spikes','Toxic Spikes','Knock Off','Defog'].map(nameKey));
  // Platinum Kaizo, not the vanilla Gen 4 preliminary-exclusion list.
  // Primary reference: https://bparkpk.github.io/PKMoveScoring/index.html
  // These 26 moves have ZERO AI damage and cannot supply the usual KO bonus.
  // Important: Close Combat / Brave Bird / Take Down ARE in this list, whereas
  // Hidden Power / Sucker Punch / Low Kick / Return / Superpower are NOT.
  const noDamageCompare = new Set(('Guillotine,Horn Drill,Counter,Fissure,Bide,Super Fang,Flail,Reversal,Present,Mirror Coat,Endeavor,Metal Burst,Fling,Trump Card,Punishment,Selfdestruct,Explosion,Dream Eater,Razor Wind,SolarBeam,Focus Punch,Close Combat,Brave Bird,Water Spout,Take Down,Head Smash').split(',').map(nameKey));
  const modeledExpert = new Set(['Curse','Dragon Dance','Calm Mind','Light Screen','Reflect','Hypnosis'].map(nameKey));
  const modeledCheckHP = new Set(['Curse','Dragon Dance','Calm Mind','Light Screen','Reflect','Hypnosis'].map(nameKey));
  const modeledPrio = new Set(['Curse','Dragon Dance','Calm Mind','Light Screen','Reflect','Hypnosis'].map(nameKey));
  const firstTurnEligible = new Set(['Dragon Dance','Calm Mind','Light Screen','Reflect','Hypnosis','Agility','Rock Polish','Swords Dance','Nasty Plot','Bulk Up','Iron Defense','Amnesia','Yawn','Thunder Wave','Toxic'].map(nameKey));
  const genericAttack = new Set(['Thunderbolt','Flamethrower','Ice Beam','Earthquake','Rock Slide','Iron Head','Stone Edge','Waterfall','Shadow Ball','Dark Pulse','Psychic','Surf','Blizzard','Discharge','Lava Plume','Pluck','Tri Attack','Crunch','Dragon Claw','Dragon Pulse','Fire Blast','Hydro Pump','Energy Ball','Giga Drain','Aerial Ace','Brick Break','Air Slash','Bug Buzz','Heat Wave','Flash Cannon','Earth Power','Body Slam','Sludge Bomb','Poison Jab','Rock Tomb','Razor Leaf'].map(nameKey));
  const boosting = new Set(['Curse','Dragon Dance','Swords Dance','Nasty Plot','Calm Mind','Bulk Up','Agility','Rock Polish','Iron Defense','Amnesia','Acid Armor','Harden','Double Team','Cosmic Power','Growth','Tail Glow','Howl','Sharpen','Barrier','Defense Curl'].map(nameKey));
  const sleepMoves = new Set(['Hypnosis','Spore','Sleep Powder','GrassWhistle','Sing','Lovely Kiss','Dark Void','Yawn'].map(nameKey));
  const directStatus = new Set(['Hypnosis','Spore','Sleep Powder','GrassWhistle','Sing','Lovely Kiss','Dark Void','Yawn','Toxic','Thunder Wave','Will-O-Wisp','Stun Spore','PoisonPowder','Glare'].map(nameKey));
  // Flag eligibility is effect-based. These lists follow the Platinum Kaizo
  // move pages where verified, with the Gen 4 source as the general fallback.
  const riskyMoves = new Set(('Explosion,Selfdestruct,Mirror Move,Guillotine,Horn Drill,Fissure,Sheer Cold,Metronome,Psywave,Counter,Mirror Coat,Metal Burst,Destiny Bond,Swagger,Attract,Present,Ancient Power,Silver Wind,Ominous Wind,Belly Drum,Focus Punch,Gyro Ball,Acupressure,Payback,Me First,Sucker Punch,Confuse Ray,Supersonic,Sweet Kiss,Teeter Dance,Flatter,Night Slash,Slash,Stone Edge,Razor Leaf,Cross Chop,Cross Poison,Psycho Cut,Leaf Blade,Shadow Claw,Air Cutter,Crabhammer,Karate Chop,Poison Tail,Attack Order,Spacial Rend,Drill Run,Blaze Kick,Aeroblast').split(',').map(nameKey));
  const setupFlagExtra = new Set(('Conversion,Reflect,Light Screen,Leech Seed,Substitute,Camouflage,Torment,Ingrain,Imprison,Tailwind,Lucky Chant,Magnet Rise,Defog,Whirlpool').split(',').map(nameKey));
  const harassExtra = new Set(('Spite,Flatter,Nature Power,Imprison,Secret Power,Tickle,Camouflage,Embargo,Psycho Shift,Captivate').split(',').map(nameKey));
  const checkRecovery = new Set(('Recover,Roost,Softboiled,Slack Off,Milk Drink,Heal Order,Moonlight,Morning Sun,Synthesis,Wish,Rest,Destiny Bond,Flail,Reversal,Memento,Healing Wish,Lunar Dance,Grudge').split(',').map(nameKey));
  const checkSetup = new Set(('Focus Energy,Bide,Conversion,Conversion2,Light Screen,Mist,Safeguard,Belly Drum').split(',').map(nameKey));
  const checkMid = new Set(('Lucky Chant,Power Swap,Guard Swap').split(',').map(nameKey));
  const checkCritical = new Set(('Rage,Lock On,Mind Reader,Psych Up,Mirror Coat,Metal Burst,Water Spout,Eruption,Mud Sport,Water Sport,Acupressure').split(',').map(nameKey));
  const checkTargetEarly = new Set(('Poison Gas,Mist,Pain Split,Safeguard,Acupressure,Wring Out,Perish Song').split(',').map(nameKey));
  const checkTargetLate = new Set(('Bide,Conversion,Conversion2,Toxic,Light Screen,Guillotine,Horn Drill,Fissure,Sheer Cold,Super Fang,Lock On,Mind Reader,Spite,Fury Cutter,Rollout,Psych Up,Mirror Coat,Explosion,Selfdestruct').split(',').map(nameKey));
  const prioNonstandard = new Set(('Selfdestruct,Explosion,Dream Eater,Razor Wind,Sky Attack,Skull Bash,SolarBeam,Hyper Beam,Giga Impact,Frenzy Plant,Blast Burn,Hydro Cannon,Roar of Time,Rock Wrecker,Water Spout,Eruption,Gyro Ball,Low Kick,Grass Knot,Head Smash,Seismic Toss,Night Shade,Return,Frustration,Dragon Rage,Sonic Boom,Spit Up,Focus Punch,Superpower,Sucker Punch,Hidden Power,Natural Gift,Judgment,Psywave,Counter,Mirror Coat,Metal Burst,Endeavor,Flail,Reversal,Present,Trump Card,Punishment,Crush Grip,Wring Out,Magnitude,Super Fang').split(',').map(nameKey));
  const statusVerifiedExpert = new Set(['Curse','Dragon Dance','Calm Mind','Light Screen','Reflect','Hypnosis','Agility','Rock Polish','Swords Dance','Nasty Plot','Stealth Rock','Tailwind','Pluck','Iron Head','Earthquake','Rock Slide','Yawn','Recover','Roost','Aqua Ring','Hail'].map(nameKey));
  const clamp = (n, lo, hi) => Math.max(lo,Math.min(hi,n));
  function pct(h,m) { return Math.floor(100 * Math.max(0, Number(h)||0) / Math.max(1,Number(m)||1)); }
  const status = x => !['healthy','none','no status','', '0'].includes(String(x??'Healthy').toLowerCase());
  // Basic flag is evaluated by MOVE EFFECT, not by whether a move deals damage.
  // This covers every effect family in the Gen 4 Basic reference. An unknown
  // battle-history value is reported instead of silently interpreted as false.
  const BASIC_SETS = Object.fromEntries(Object.entries({
    sleep:'Hypnosis,GrassWhistle,Sing,Lovely Kiss,Sleep Powder,Spore,Dark Void,Yawn',
    poison:'Toxic,Poison Gas,PoisonPowder',
    paralysis:'Thunder Wave,Stun Spore,Glare',
    burn:'Will-O-Wisp',
    confusion:'Confuse Ray,Supersonic,Sweet Kiss,Teeter Dance,Swagger,Flatter,DynamicPunch,Water Pulse,Psybeam,Signal Beam,Chatter',
    attraction:'Attract',
    recovery:'Recover,Roost,Softboiled,Slack Off,Milk Drink,Heal Order,Moonlight,Morning Sun,Synthesis,Wish,Rest,Swallow',
    recharging:'Hyper Beam,Giga Impact,Blast Burn,Frenzy Plant,Hydro Cannon,Roar of Time,Rock Wrecker',
    nonstandard:'Razor Wind,Sky Attack,Blast Burn,Frenzy Plant,Giga Impact,Hydro Cannon,Hyper Beam,Roar of Time,Rock Wrecker,Skull Bash,Focus Punch,Superpower,Bide,Super Fang,Dragon Rage,Night Shade,Seismic Toss,Psywave,Counter,Flail,Reversal,Return,Present,Frustration,Sonic Boom,Hidden Power,Mirror Coat,Endeavor,Low Kick,Grass Knot,Gyro Ball,Trump Card,Crush Grip,Wring Out,Punishment,Magnitude,Metal Burst',
    reset:'Haze,Psych Up,Heart Swap',
    forceSwitch:'Roar,Whirlwind,Dragon Tail,Circle Throw',
    screen:'Reflect,Light Screen,Mist,Safeguard',
    oneTime:'Focus Energy,Ingrain,Mud Sport,Water Sport,Camouflage,Power Trick,Lucky Chant,Aqua Ring,Magnet Rise',
    disabling:'Disable,Encore',
    targetEffect:'Lock-On,Mind Reader,Mean Look,Block,Spider Web,Foresight,Odor Sleuth,Perish Song,Torment,Miracle Eye,Heal Block,Gastro Acid',
    weather:'Sandstorm,Rain Dance,Sunny Day,Hail',
    future:'Future Sight,Doom Desire',
    hazard:'Spikes,Toxic Spikes,Stealth Rock',
    multiStat:'Cosmic Power,Bulk Up,Calm Mind,Dragon Dance',
    singleStat:'Howl,Sharpen,Swords Dance,Nasty Plot,Tail Glow,Agility,Rock Polish,Iron Defense,Amnesia,Acid Armor,Harden,Defense Curl,Barrier,Double Team,Minimize,Growth,Meditate,Focus Energy,Charge,Withdraw,Defend Order',
    lowering:'Growl,Tail Whip,Sand-Attack,String Shot,Scary Face,Screech,Charm,FeatherDance,Flash,Smokescreen,Kinesis,Leer,Metal Sound,Cotton Spore,Sweet Scent,Tickle,Captivate',
    ohko:'Guillotine,Horn Drill,Fissure,Sheer Cold',
    swap:'Power Swap,Guard Swap',
    hpSacrifice:'Healing Wish,Lunar Dance',
    item:'Trick,Switcheroo,Knock Off'
  }).map(([key,list])=>[key,new Set(list.split(',').map(nameKey))]));
  const BASIC_BUFF={
    howl:['atk'],sharpen:['atk'],swordsdance:['atk'],meditate:['atk'],
    nastyplot:['spa'],tailglow:['spa'],agility:['spe'],rockpolish:['spe'],
    irondefense:['def'],acidarmor:['def'],harden:['def'],defensecurl:['def'],barrier:['def'],withdraw:['def'],
    amnesia:['spd'],doubleteam:['evasion'],minimize:['evasion'],growth:['spa'],
    bulkup:['atk','def'],calmmind:['spa','spd'],cosmicpower:['def','spd'],
    dragondance:['atk','spe'],defendorder:['def','spd'],charge:['spd']
  };
  delete BASIC_BUFF['nast yplot']; BASIC_BUFF.nastyplot=['spa'];
  const BASIC_DEBUFF={
    growl:['atk'],charm:['atk'],featherdance:['atk'],
    tailwhip:['def'],leer:['def'],screech:['def'],
    scaryface:['spe'],stringshot:['spe'],cottonspore:['spe'],
    metalsound:['spd'],sandattack:['accuracy'],flash:['accuracy'],smokescreen:['accuracy'],kinesis:['accuracy'],
    sweetscent:['evasion'],tickle:['atk','def'],captivate:['spa']
  };
  delete BASIC_DEBUFF['metal sound'];BASIC_DEBUFF.metalsound=['spd'];

  function legacyBasicScore(state,move,foe,eff,targetIndex) {
    const k=nameKey(move.name),type=String(move.type||'');
    const rule=RULES[k];
    if(rule?.basicNoop)return {score:0,reason:'',notes:[]};
    const inSet=(group)=>BASIC_SETS[group]?.has(k);
    const a=state.ability||'', fa=foe.ability||'', isMold=a==='Mold Breaker';
    const selfTypes=state.types||[], foeTypes=foe.types||[];
    const asNum=v=>v===null||v===undefined||v===''?null:Number(v);
    const selfStage=s=>asNum(state.stages?.[s]);
    const foeStage=s=>asNum(foe.stages?.[s]);
    const knownBool=x=>typeof x==='boolean';
    const notes=[];let penalty=0,reason='';
    function mark(n,why){if(!reason){penalty=n;reason=why;}}
    function need(value,field){if(value===null||value===undefined||value==='')notes.push('Basic: '+move.name+' needs '+field);return value;}
    function truth(value,field){need(value,field);return value===true;}
    function blocked(){return foe.status!=null && status(foe.status) || truth(foe.safeguard,'target Safeguard');}
    const selfPercent=pct(state.hp,state.maxHp);
    const foePercent=pct(foe.hp,foe.maxHp);
    const sides=foe.hasReserves??(state.noTargetReserves==null?null:!state.noTargetReserves);
    const holdsItem=foe.item!=null && !['none','no item',''].includes(String(foe.item).toLowerCase());
    const immuneByType=eff===0&&(rule?rule.basicImmunity:move.category!=='Status');
    const abilityImmune=(!isMold) && ((type==='Ground'&&fa==='Levitate') ||
      (type==='Electric'&&['Volt Absorb','Motor Drive'].includes(fa)) ||
      (type==='Water'&&fa==='Water Absorb') || (type==='Fire'&&fa==='Flash Fire') ||
      (fa==='Wonder Guard'&&eff!=null&&![2,4].includes(eff)) ||
      (fa==='Soundproof'&&(['Uproar','Hyper Voice','Bug Buzz','Chatter','Perish Song','Roar','Growl','Sing','Supersonic','GrassWhistle','Screech','Metal Sound','Snore'].map(nameKey).includes(k))));
    // In the actual AI's Step 1, immunity checks precede effect-specific logic.
    if(immuneByType) mark(-10,'type immunity');
    else if(abilityImmune&&(rule?.basicImmunity||move.category!=='Status'))mark(rule?.absorbPenalty??-12,'ability immunity');
    if(reason)return {score:penalty,reason,notes};

    if(inSet('sleep')){if(blocked()||['Insomnia','Vital Spirit'].includes(fa))mark(-10,'sleep blocked');}
    else if(inSet('poison')){if(blocked()||foeTypes.some(t=>t==='Steel'||t==='Poison')||
        ['Immunity','Magic Guard','Poison Heal'].includes(fa) ||
        (fa==='Leaf Guard'&&state.weather==='Sun')||(fa==='Hydration'&&state.weather==='Rain'))mark(-10,'poison blocked');}
    else if(inSet('paralysis')){if(blocked()||['Limber','Magic Guard'].includes(fa)||
        (k==='thunderwave'&&['Motor Drive','Volt Absorb'].includes(fa)&&!isMold))mark(-10,'paralysis blocked');}
    else if(inSet('burn')){if(blocked()||foeTypes.includes('Fire')||['Water Veil','Magic Guard'].includes(fa))mark(-10,'burn blocked');}
    else if(inSet('confusion') && move.category==='Status'){
      if(foe.confused===true)mark(-5,'target already confused');
      else if(fa==='Own Tempo'||truth(foe.safeguard,'target Safeguard'))mark(-10,'confusion blocked');
      else need(foe.confused,'target confusion');
    }else if(inSet('attraction')){
      if(truth(foe.infatuated,'target infatuation')||fa==='Oblivious'||foe.gender==='Genderless'||
        (state.gender!=null && foe.gender!=null && state.gender===foe.gender))mark(-10,'Attract fails');
      else {need(foe.gender,'target gender');need(state.gender,'user gender');}
    }else if(inSet('reset')){
      const self=Object.values(state.stages||{}),other=Object.values(foe.stages||{});
      if(!self.some(n=>n<0)&&!other.some(n=>n>0))mark(-10,'no beneficial stat stages to reset');
    }else if(inSet('forceSwitch')){
      if(sides===false)mark(-10,'opponent has no reserves');
      else if(fa==='Suction Cups'&&!isMold)mark(-10,'Suction Cups');
      else need(sides,'opponent reserve Pokémon');
    }else if(k==='nightmare'){
      if(truth(foe.nightmare,'target Nightmare')||fa==='Magic Guard')mark(-10,'Nightmare already active or immune');
      else if(!['SLP','Asleep','Sleep'].includes(String(foe.status)))mark(-8,'target not asleep');
    }else if(k==='dreameater'){
      if(!['SLP','Asleep','Sleep'].includes(String(foe.status)))mark(-8,'target not asleep');
    }else if(k==='explosion'||k==='selfdestruct'){
      if(fa==='Damp'&&!isMold)mark(-10,'Damp');
      else if((RULES[k]?.baton??(isStatusMove(move)||explosion?1:0))===0){/* no routine for this move */}
      else if(state.partyHasReserve===false){
        if(sides===true)mark(-10,'last AI Pokémon, player has reserves');
        else if(sides===false)mark(-1,'both sides have last Pokémon');
        else need(sides,'opponent reserve Pokémon');
      }else need(state.partyHasReserve,'AI reserve Pokémon');
    }else if(k==='bellydrum'){
      if(selfPercent<51)mark(-10,'Belly Drum requires at least 51% HP');
    }else if(k==='curse'){
      if(selfTypes.includes('Ghost')){
        if(truth(foe.cursed,'target cursed')||fa==='Magic Guard')mark(-10,'Ghost Curse blocked');
      }else{
        if(a==='Simple'&&(selfStage('atk')>=2||selfStage('def')>=2))mark(-10,'Simple boosted stat');
        else if(selfStage('atk')>=6||selfStage('def')>=6)mark(-10,'Curse stat at cap');
      }
    }else if(inSet('multiStat')){
      const stages=BASIC_BUFF[k]||[];
      if(k==='dragondance'&&state.trickRoom===true)mark(-10,'Dragon Dance in Trick Room');
      else if(a==='Simple'&&stages.some(s=>selfStage(s)>=3))mark(-10,'Simple stat cap');
      else if(stages.length && selfStage(stages[0])>=6)mark(-10,'first stat at cap');
      else if(stages.length>1&&selfStage(stages[1])>=6)mark(-8,'second stat at cap');
    }else if(inSet('singleStat')){
      const stages=BASIC_BUFF[k]||[];
      if(stages.includes('spe')&&state.trickRoom===true)mark(-10,'Speed boost during Trick Room');
      else if(stages.some(s=>['accuracy','evasion'].includes(s))&&a==='No Guard')mark(-10,'No Guard makes accuracy/evasion boosts redundant');
      else if(a==='Simple'&&stages.some(s=>selfStage(s)>=3))mark(-10,'Simple stat cap');
      else if(stages.some(s=>selfStage(s)>=6))mark(-10,'boosted stat at cap');
    }else if(k==='tickle') {
      if(['Clear Body','White Smoke'].includes(fa)&&!isMold||foeStage('atk')<=-6)mark(-10,'Tickle blocked or Attack at floor');
      else if(foeStage('def')<=-6)mark(-8,'Defense at floor');
    }else if(k==='captivate'){
      if(['Oblivious','Clear Body','White Smoke'].includes(fa)&&!isMold||foe.gender==='Genderless'||
        state.gender!=null&&foe.gender===state.gender||foeStage('spa')<=-6)mark(-10,'Captivate blocked');
      else {need(foe.gender,'target gender');need(state.gender,'user gender');}
    }else if(BASIC_DEBUFF[k]){
      const stages=BASIC_DEBUFF[k];
      if(stages.includes('spe')&&state.trickRoom===true)mark(-10,'Speed reduction during Trick Room');
      else if(stages.includes('atk')&&fa==='Hyper Cutter')mark(-10,'Hyper Cutter');
      else if(stages.includes('spe')&&fa==='Speed Boost')mark(-10,'Speed Boost');
      else if(stages.some(s=>['accuracy','evasion'].includes(s))&&(a==='No Guard'||fa==='No Guard'))mark(-10,'No Guard');
      else if(stages.includes('accuracy')&&a==='Keen Eye')mark(-10,'Keen Eye');
      else if(['Clear Body','White Smoke'].includes(fa) && !isMold)mark(-10,'Clear Body / White Smoke');
      else if(stages.some(s=>foeStage(s)<=-6))mark(-10,'reduced stat already at floor');
    }else if(inSet('recovery')&&k!=='swallow'){
      if(selfPercent===100)mark(-8,'recovery at full HP');
    }else if(inSet('screen')){
      const field={reflect:'reflectActive',lightscreen:'lightScreenActive',mist:'mistActive',safeguard:'ownSafeguard'}[k];
      if(truth(state[field],move.name+' active'))mark(-8,'effect already active');
    }else if(inSet('ohko')){
      if(fa==='Sturdy'&&!isMold || Number(foe.level)>Number(state.level))mark(-10,'OHKO move cannot hit');
      if(foe.level==null||state.level==null)need(null,'both Pokémon levels');
    }else if(inSet('oneTime')){
      const field={focusenergy:'focusEnergyActive',ingrain:'ingrainActive',mudsport:'mudSportActive',watersport:'waterSportActive',camouflage:'camouflageActive',powertrick:'powerTrickActive',luckychant:'luckyChantActive',aquaring:'aquaRingActive',magnetrise:'magnetRiseActive'}[k];
      if(truth(state[field],move.name+' active'))mark(-10,'effect already active');
      else if(k==='magnetrise'&&(a==='Levitate'||selfTypes.includes('Flying')))mark(-10,'Magnet Rise redundant');
    }else if(k==='substitute'){
      if(truth(state.substituteActive,'user Substitute'))mark(-8,'already substituted');
      else if(selfPercent<26)mark(-10,'too little HP for Substitute');
    }else if(k==='leechseed'){
      if(truth(foe.seeded,'target Leech Seed')||foeTypes.includes('Grass')||fa==='Magic Guard')mark(-10,'Leech Seed blocked');
    }else if(inSet('disabling')){
      const field=k==='disable'?'disabled':'encored';
      if(truth(foe[field],'target '+move.name))mark(-8,'effect already active');
    }else if(k==='snore'||k==='sleeptalk'){
      if(!['SLP','Sleep','Asleep'].includes(String(state.aiStatus)))mark(-8,'user not asleep');
    }else if(inSet('targetEffect')){
      const prop={lockon:'lockOn',mindreader:'lockOn',meanlook:'trapped',block:'trapped',spiderweb:'trapped',foresight:'foresight',odorsleuth:'foresight',perishsong:'perishSong',torment:'tormented',miracleeye:'miracleEye',healblock:'healBlocked',gastroacid:'gastroAcid'}[k];
      if(truth(foe[prop],'target '+move.name))mark(-10,'target already affected');
      else if(['lockon','mindreader'].includes(k)&&(a==='No Guard'||fa==='No Guard'))mark(-10,'No Guard');
      else if(k==='gastroacid'&&['Multitype','Truant','Slow Start','Stench','Run Away','Pickup','Honey Gather'].includes(fa))mark(-10,'Gastro Acid undesirable');
    }else if(inSet('hazard')){
      const maximum={spikes:3,toxicspikes:2,stealthrock:1}[k];
      const value={spikes:state.spikesLayers,toxicspikes:state.toxicSpikesLayers,stealthrock:state.stealthRockActive===true?1:state.stealthRockActive===false?0:null}[k];
      if(Number(value)>=maximum&&value!=null)mark(-10,'maximum hazard layers');
      else if(sides===false)mark(-10,'opponent has no reserves');
      else need(sides,'opponent reserve Pokémon');
    }else if(inSet('weather')){
      const w={sandstorm:'Sandstorm',raindance:'Rain',sunnyday:'Sun',hail:'Hail'}[k];
      if(state.weather===w)mark(-8,'weather already active');
      else if(k==='raindance'&&!['Swift Swim','Hydration'].includes(a)&&fa==='Hydration'&&status(foe.status))mark(-8,'Rain cures opponent');
      else if(k==='sunnyday'&&!['Flower Gift','Leaf Guard','Solar Power'].includes(a)&&fa==='Hydration'&&status(foe.status))mark(-10,'Sun check against Hydration');
      else if(k==='hail'&&fa==='Ice Body'&&a!=='Ice Body')mark(-8,'Hail helps foe Ice Body');
      // Both Ice Body abilities cancel the documented -8 with a subsequent +8.
    }else if(inSet('future')){
      if(state.futureSightPending===true || foe.futureSightPending===true)mark(-12,'Future Sight pending');
      else{need(state.futureSightPending,'pending Future Sight on AI side');need(foe.futureSightPending,'pending Future Sight on target side');}
    }else if(k==='batonpass'){
      if((RULES[k]?.baton??(isStatusMove(move)||explosion?1:0))===0){/* no routine for this move */}
      else if(state.partyHasReserve===false)mark(-10,'no reserve Pokémon to pass to');
      else need(state.partyHasReserve,'AI reserve Pokémon');
    }else if(k==='fakeout'){
      if(state.firstTurnOut===false)mark(-10,'Fake Out after entry turn');
      else need(state.firstTurnOut,'user first turn out');
    }else if(k==='stockpile'){
      if(Number(state.stockpileCount)>=3)mark(-10,'Stockpile at 3');
      else need(state.stockpileCount,'Stockpile count');
    }else if(k==='spitup'||k==='swallow'){
      if((k==='swallow'&&foeTypes.includes('Ghost')) || Number(state.stockpileCount)===0)mark(-10,'Stockpile unavailable');
      else if(k==='swallow'&&selfPercent===100)mark(-8,'Swallow at full HP');
      else need(state.stockpileCount,'Stockpile count');
    }else if(k==='memento'){
      if(['Clear Body','White Smoke'].includes(fa)&&!isMold||foeStage('atk')<=-6||state.partyHasReserve===false)mark(-10,'Memento blocked or last Pokémon');
      else if(foeStage('spa')<=-6)mark(-8,'SpAttack stage floor');
    }else if(k==='helpinghand'){
      if(state.format!=='Doubles')mark(-10,'Helping Hand in Singles');
    }else if(inSet('item')){
      if(fa==='Sticky Hold'||!holdsItem)mark(-10,'target item inaccessible');
      else need(foe.item,'target held item');
    }else if(k==='imprison'){
      if(truth(state.imprisonActive,'user Imprison')||truth(foe.imprisonActive,'target Imprison'))mark(-10,'Imprison already in effect');
    }else if(k==='refresh'){
      if(!['BRN','Burn','PSN','TOX','Poison','Badly Poisoned','PAR','Paralysis','Paralyzed'].includes(String(state.aiStatus)))mark(-10,'no refreshable status');
    }else if(k==='gravity'||k==='tailwind'){
      if(k==='gravity'&&state.gravityActive===true||k==='tailwind'&&state.tailwindActive===true||k==='tailwind'&&state.trickRoom===true)mark(-10,'field effect already active or Trick Room');
    }else if(k==='trickroom'){
      // 'Slower' means lower *effective Speed*, not reversed Trick Room order.
      const targetSlower=foe.userSlower;
      if(targetSlower===false)mark(-10,'user faster or speed tie');
      else need(targetSlower,'opponent Speed comparison');
    }else if(inSet('hpSacrifice')){
      penalty=-20;reason='starts at -20';
      if((RULES[k]?.baton??(isStatusMove(move)||explosion?1:0))===0){/* no routine for this move */}
      else if(state.partyHasReserve===false)penalty-=10;
      if(state.benchNeedsHealing===false)penalty-=10;
      if(state.partyHasReserve==null)need(null,'AI reserve Pokémon');
      if(state.benchNeedsHealing==null)need(null,'injured/statused reserve Pokémon');
      if(k==='lunardance'&&state.benchNeedsPP===false&&state.benchNeedsHealing===false){ /* -10 already applied */ }
    }else if(k==='naturalgift'){
      if(!String(state.item||'').toLowerCase().includes('berry')||eff===0)mark(-10,'no Berry or immune Natural Gift');
    }else if(k==='feint'){
      if(foe.knowsProtect===false)missing('Feint: unmodeled 75% early stop branch');
      if(residualSelf)prob(1,.5,'Feint during own residual condition');
      else if(fp<100&&['Leftovers','Black Sludge'].includes(foe.item))prob(1,.5,'Feint against passive healing');
      if(foe.protectChain===0)prob(1,.5,'Feint when foe Protect count 0');
      else if(foe.protectChain===1)prob(1,.25,'Feint when foe Protect count 1');
      else if(foe.protectChain>=2)add(-2,'Feint after repeated Protect');
      else missing('opponent Protect chain');
    }else if(k==='powertrick'){
      if(sp>90)prob(1,.625,'Power Trick high HP');
      if(sp>60)prob(1,.5,'Power Trick mid HP');
      if(sp>30)prob(1,P(92),'Power Trick low HP');
    }else if(k==='gastroacid'){
      const p=.75;
      let choice=fp>70?delta(1):fp<=30?new Map([[-2,.5],[-3,.5]]):fp<=50?new Map([[-1,.5],[-2,.5]]):new Map([[0,.5],[-1,.5]]);
      const d=new Map([[0,1-p]]);
      for(const [n,q] of choice)d.set(n,(d.get(n)||0)+p*q);
      pmf=convolve(pmf,d);
    }else if(k==='luckychant'){
      if(sp<70)add(-1,'Lucky Chant user low HP');
      if(foe.knowsHighCritMove===true)add(1,'Lucky Chant vs critical-hit move');
      else if(foe.knowsHighCritMove===false)prob(1,.25,'Lucky Chant general');
      else missing('opponent knows high-critical-hit move');
    }else if(k==='wringout'||k==='crushgrip'){
      if(Number.isFinite(eff)&&eff<1)add(-1,'Wring Out resisted');
      if(fp<50)add(-1,'Wring Out weakened foe');
      if(fp===100){prob(1,P(231),'Wring Out full HP foe');
        if(slow===false)add(2,'Wring Out faster user');else if(slow===true)add(1,'Wring Out slower user');}
      else if(fp>85)prob(1,P(231),'Wring Out foe high HP');
    }else if(k==='acupressure'){
      if(Object.values(state.stages||{}).some(v=>v >= (a==='Simple'?3:6)))mark(-10,'some stat already maxed');
    }else if(k==='metalburst'){
      if(fa==='Stall'||foe.item==='Shiny Stone')mark(-10,'target Stall or Shiny Stone');
      else if(a==='Stall'||state.item==='Shiny Stone')mark(10,'user Stall or Shiny Stone');
      else if(foe.userSlower===false)mark(-10,'Metal Burst user faster');
    }else if(k==='embargo'){
      if(truth(foe.embargo,'target Embargo'))mark(-10,'already Embargoed');
      else if(state.frontierBattle===true&&foe.recyclableItem!==null&&foe.recyclableItem!==undefined)mark(-10,'Frontier Embargo special case');
    }else if(k==='fling'){
      if(!state.item||['None',''].includes(state.item)||a==='Multitype'||state.flingPower===0)mark(-10,'Fling unavailable');
      else if(state.flingInflictsBlockedStatus===true)mark(-5,'Fling status blocked');
    }else if(k==='psychoshift'){
      if(!status(state.aiStatus)||blocked())mark(-10,'Psycho Shift cannot transfer status');
      else if(['PSN','TOX','Poison','Badly Poisoned'].includes(state.aiStatus)&&
        (a==='Poison Heal'||foeTypes.some(t=>['Poison','Steel'].includes(t))||['Immunity','Poison Heal'].includes(fa)))mark(-10,'Poison transfer blocked');
      else if(['BRN','Burn'].includes(state.aiStatus)&&(foeTypes.includes('Fire')||fa==='Water Veil'))mark(-10,'Burn transfer blocked');
      else if(['PAR','Paralysis'].includes(state.aiStatus)&&fa==='Limber')mark(-10,'Paralysis transfer blocked');
    }else if(k==='copycat'){
      if(state.firstTurn===true&&foe.userSlower===false)mark(-10,'Copycat turn 1 and user faster');
    }else if(inSet('swap')){
      const attrs=k==='powerswap'?['atk','spa']:['def','spd'];
      if(attrs.every(s=>selfStage(s)!=null && foeStage(s)!=null && selfStage(s)>foeStage(s)))mark(-10,'both swapped stages would decrease');
    }else if(k==='lastresort'){
      if(state.usedAllOtherMoves===false)mark(-10,'not all other moves used');
      else need(state.usedAllOtherMoves,'use of all other moves');
    }else if(k==='worryseed'){
      if(['Truant','Insomnia','Vital Spirit','Multitype'].includes(fa)||
        (['SLP','Sleep','Asleep'].includes(String(foe.status))&&foe.knowsSleepMove===false))mark(-10,'Worry Seed blocked');
    }else if(k==='defog'){
      if(foeStage('evasion')!=null&&foeStage('evasion')>-6 || foe.reflectActive===true || foe.lightScreenActive===true || state.weather==='Fog'){/* useful */}
      else if(sides===false)mark(-10,'Defog: last opposing Pokémon');
      else if(foe.spikesLayers===0 && !foe.stealthRockActive && foe.toxicSpikesLayers===0)mark(-10,'Defog: no hazards');
      else {need(sides,'opponent reserves');need(foe.spikesLayers,'opponent Spikes');}
    }
    return {score:penalty,reason,notes};
  }

  const BASIC_FAMILIES={"assurance":0,"aromatherapy":1,"spiderweb":2,"sunnyday":3,"skillswap":1,"sludge":0,"crushclaw":0,"leafstorm":0,"mefirst":1,"signalbeam":0,"rockwrecker":0,"aurasphere":0,"sonicboom":0,"twister":0,"ominouswind":0,"firepunch":4,"extremespeed":0,"magiccoat":5,"headbutt":0,"safeguard":6,"healbell":1,"withdraw":7,"whirlwind":8,"acid":0,"nightshade":0,"shadowball":0,"hpflying":0,"magnetrise":9,"megakick":0,"heartswap":10,"aquajet":10,"guardswap":11,"blastburn":4,"swagger":12,"eruption":4,"secretpower":0,"stealthrock":13,"lastresort":14,"stoneedge":0,"icefang":0,"lockon":15,"eggbomb":0,"spacialrend":0,"swallow":0,"wildcharge":16,"tailglow":17,"shadowclaw":0,"powerswap":18,"punishment":0,"drillpeck":0,"encore":19,"seismictoss":0,"poisonpowder":20,"horndrill":21,"agility":22,"smellingsalts":0,"mudshot":23,"dragonpulse":0,"bide":24,"rockthrow":0,"tailwind":25,"scaryface":26,"triplekick":0,"featherdance":27,"milkdrink":28,"poisontail":0,"tripleaxel":0,"aquacutter":10,"reflect":29,"heatwave":4,"flatter":12,"magicalleaf":0,"frustration":0,"uturn":0,"judgement":30,"vitalthrow":0,"wingattack":0,"hurricane":0,"shadowpunch":0,"brine":31,"roaroftime":0,"moonlight":28,"peck":0,"leer":32,"zapcannon":16,"pursuit":0,"miracleeye":33,"rollingkick":0,"crosschop":0,"embargo":34,"thundershock":16,"spore":35,"triattack":0,"perishsong":36,"snore":37,"extrasensory":0,"haze":38,"dragonrush":0,"worryseed":39,"iciclespear":0,"powerwhip":0,"rocktomb":0,"dynamicpunch":0,"crushgrip":0,"metalsound":40,"psychoboost":0,"earthquake":23,"crunch":0,"attract":41,"bravebird":0,"chargebeam":16,"tickle":42,"vicegrip":0,"thief":1,"petaldance":0,"brickbreak":0,"focuspunch":0,"closecombat":0,"hydropump":10,"avalanche":0,"spikes":43,"slam":0,"razorleaf":0,"hpdark":0,"rest":1,"howl":44,"poisongas":20,"overheat":4,"swordsdance":44,"confusion":0,"hpfire":4,"smog":0,"submission":0,"pound":0,"pinmissile":0,"sacredfire":4,"bugbuzz":45,"fireblast":4,"lick":0,"spite":1,"psybeam":0,"lavaplume":4,"rockblast":0,"thunderpunch":16,"gust":0,"refresh":46,"gyroball":0,"bodyslam":0,"twineedle":0,"rocksmash":0,"stomp":0,"mistball":0,"razorwind":0,"seedflare":0,"hyperbeam":0,"falseswipe":0,"doomdesire":47,"wish":1,"bulkup":48,"disable":49,"dizzypunch":0,"hailball":0,"rockslide":0,"acupressure":50,"magnetbomb":0,"aurorabeam":0,"firespin":4,"leafblade":0,"ironhead":0,"beatup":0,"darkpulse":0,"doublehit":0,"mysticalfire":4,"poisonsting":0,"bulldoze":23,"shadowsneak":0,"shadowforce":0,"ember":4,"darkvoid":35,"reversal":0,"thrash":0,"poisonfang":0,"teeterdance":12,"furycutter":0,"bite":0,"recover":28,"trumpcard":0,"followme":1,"mindreader":15,"hypervoice":0,"gastroacid":51,"skyattack":0,"watergun":10,"furyattack":0,"gunkshot":0,"psychup":38,"memento":52,"growl":53,"aquaring":54,"irondefense":7,"flail":0,"seedbomb":0,"mirrorcoat":0,"amnesia":55,"swift":0,"hpground":23,"wrap":0,"sandstorm":56,"scald":31,"thunderbolt":16,"accelerock":0,"sing":57,"foresight":58,"thunder":16,"selfdestruct":52,"doubleteam":59,"whirlpool":31,"headsmash":1,"tackle":0,"pluck":0,"sheercold":0,"psychocut":0,"harden":7,"hpwater":60,"vacuumwave":0,"icywind":0,"morningsun":28,"faketears":26,"substitute":61,"toxicspikes":62,"gigaimpact":0,"waterpulse":10,"recycle":63,"charm":27,"metronome":1,"gigadrain":0,"dragonbreath":0,"sweetkiss":12,"mist":64,"slash":0,"needlearm":0,"attackorder":0,"conversion2":1,"fireball":4,"hammerarm":0,"doubleslap":0,"octazooka":10,"bonemerang":23,"batonpass":65,"aquatail":10,"glare":66,"bubblebeam":10,"flareblitz":4,"endure":1,"flashcannon":0,"shockwave":16,"hpelectric":16,"iceball":0,"aeroblast":0,"stockpile":67,"magmastorm":4,"present":0,"mudbomb":23,"quickattack":0,"lightscreen":68,"drainpunch":0,"defog":69,"jumpkick":0,"supersonic":70,"bonerush":23,"mimic":1,"frenzyplant":0,"lovelykiss":35,"volttackle":16,"bugbite":0,"knockoff":71,"mudslap":23,"healorder":28,"waterfall":10,"payback":0,"hppsychic":0,"sandtomb":23,"energyball":0,"detect":1,"dive":10,"focusenergy":72,"nastyplot":17,"hpfighting":0,"furyswipes":0,"dragonclaw":0,"lowkick":0,"ancientpower":0,"sketch":1,"tailwhip":32,"airslash":0,"fling":73,"solarbeam":0,"helpinghand":74,"sleeptalk":75,"grasswhistle":57,"nightslash":0,"leechseed":76,"zenheadbutt":0,"cottonspore":26,"hpice":0,"screech":77,"block":2,"rockball":0,"imprison":78,"crosspoison":0,"karatechop":0,"yawn":35,"payday":0,"drillrun":23,"suckerpunch":0,"constrict":0,"kinesis":79,"metalclaw":0,"odorsleuth":58,"counter":0,"mirrorshot":0,"painsplit":1,"dreameater":80,"wringout":0,"grudge":1,"revenge":0,"hijumpkick":0,"blizzard":0,"bubble":10,"minimize":59,"camouflage":81,"megahorn":0,"trickroom":82,"sludgebomb":0,"naturepower":1,"xscissor":0,"guillotine":21,"charge":1,"thunderfang":16,"facade":0,"lusterpurge":0,"roleplay":1,"woodhammer":0,"smokescreen":83,"captivate":84,"forcepalm":0,"bulletseed":0,"dragondance":85,"steelwing":0,"aircutter":0,"rockclimb":0,"flamewheel":4,"uproar":45,"roar":86,"bounce":0,"assist":1,"cut":0,"lunardance":28,"stringshot":26,"thunderwave":87,"powergem":0,"fakeout":88,"copycat":89,"slackoff":28,"synthesis":28,"silverwind":0,"blazekick":4,"doubleedge":0,"torment":90,"flamethrower":4,"crabhammer":10,"machpunch":0,"waterspout":1,"hail":91,"hydrocannon":10,"outrage":0,"astonish":0,"naturalgift":92,"sweetscent":93,"sharpen":44,"aerialace":0,"mirrormove":1,"meditate":44,"defendorder":67,"futuresight":47,"fly":0,"acidarmor":7,"discharge":16,"teleport":94,"cosmicpower":67,"rockpolish":22,"return":0,"takedown":0,"barrier":7,"boneclub":0,"ingrain":5,"leechlife":0,"clamp":31,"gravity":95,"rage":0,"psychic":0,"focusblast":0,"calmmind":96,"meteormash":0,"powdersnow":0,"iceshard":0,"flash":83,"growth":17,"dracometeor":0,"psychoshift":97,"hpghost":0,"stunspore":66,"vinewhip":0,"bulletpunch":0,"protect":1,"skyuppercut":0,"confuseray":12,"icebeam":0,"doublekick":0,"poisonjab":0,"faintattack":0,"muddywater":10,"sandattack":83,"endeavor":0,"hpgrass":0,"wakeupslap":0,"softboiled":28,"icepunch":0,"raindance":98,"superpower":0,"luckychant":99,"explosion":52,"chatter":45,"megapunch":0,"hyperfang":0,"irontail":0,"destinybond":1,"firefang":4,"absorb":0,"grassknot":0,"weatherball":30,"feint":0,"strength":0,"hprock":0,"hypnosis":35,"willowisp":100,"hiddenpower":30,"fissure":101,"roost":28,"surf":31,"earthpower":23,"curse":102,"sleeppowder":35,"waterball":10,"dig":23,"megadrain":0,"toxic":20,"dragonrage":0,"powertrick":103,"meanlook":2,"transform":1,"metalburst":24,"bellydrum":104,"superfang":0,"judgment":30,"feintattack":0,"smellingsalt":0};
  function basicScore(state,move,foe,eff,targetIndex){
    const k=nameKey(move.name),family=BASIC_FAMILIES[k];
    if(family==null)return legacyBasicScore(state,move,foe,eff,targetIndex);
    let score=0,reason='',pmf=null;const notes=[];
    const a=nameKey(state.ability),fa=nameKey(foe.ability),mold=a==='moldbreaker',types=foe.types||[],selfTypes=state.types||[];
    const st=s=>Number(state.stages?.[s]||0),ft=s=>Number(foe.stages?.[s]||0),u=pct(state.hp,state.maxHp);
    const need=(v,name)=>{if(v==null)notes.push('Basic: '+move.name+' needs '+name);return v;};
    const mark=(n,why)=>{if(!reason){score=n;reason=why;}};
    const yes=(v,label)=>need(v,label)===true;
    const any=(s,list)=>list.includes(s),blockedStats=any(fa,['clearbody','whitesmoke']);
    const sleeping=/slp|sleep/.test(nameKey(foe.status)),selfSleeping=/slp|sleep/.test(nameKey(state.aiStatus));
    const reserves=foe.hasReserves??(state.noTargetReserves==null?null:!state.noTargetReserves);
    const noItem=x=>['','none','noitem'].includes(nameKey(x));
    const blocked=()=>status(need(foe.status,'target status'))||yes(foe.safeguard,'target Safeguard');
    const sound=()=>{if(fa==='soundproof'&&!mold)mark(-10,'Soundproof');};
    const cap=(stat)=>{if(st(stat)>=6||a==='simple'&&st(stat)>=3)mark(-10,'stat at effective cap');};
    const multi=(x,y)=>{if(a==='simple'&&(st(x)>=3||st(y)>=3)||st(x)>=6)mark(-10,'first boosted stat capped');else if(st(y)>=6)mark(-8,'second boosted stat capped');};
    const opposite=()=>{const x=need(state.gender,'user gender'),y=need(foe.gender,'target gender');return x&&y&&nameKey(x)!==nameKey(y)&&!['genderless','n'].includes(nameKey(x))&&!['genderless','n'].includes(nameKey(y));};
    const immune=RULES[k]?.basicImmunity;
    // Immunity checks only occur in the effect families whose scripts invoke them.
    if(immune){
      if(eff===0)mark(-10,'type immunity');
      if(!reason&&!mold){
        const electric=[16].includes(family),water=[10,60].includes(family),fire=family===4;
        const changing=[30,92].includes(family);
        if(electric&&any(fa,['voltabsorb','motordrive'])||water&&any(fa,['waterabsorb','dryskin'])||fire&&fa==='flashfire'||family===31&&fa==='waterabsorb'||[23,101].includes(family)&&fa==='levitate'||changing&&((move.type==='Electric'&&any(fa,['voltabsorb','motordrive']))||(move.type==='Water'&&fa==='waterabsorb')||(move.type==='Fire'&&fa==='flashfire')))mark(-12,'absorption / Levitate');
        if(fa==='wonderguard'&&![2,4].includes(eff))mark(-12,'Wonder Guard');
      }
    }
    if(reason)return {score,reason,notes};
    switch(family){
      case 0:case 1:case 4:case 10:case 16:case 23:case 30:case 31:case 60:break;
      case 2:if(yes(foe.trapped,'target trapped'))mark(-10,'escape prevented');break;
      case 3:if(!any(a,['flowergift','leafguard','solarpower'])&&fa==='hydration'&&status(foe.status))mark(-10,'opponent Hydration');else if(state.weather==='Sun')mark(-8,'already sunny');break;
      case 5:if(yes(state.ingrainActive,'user Ingrain'))mark(-10,'already rooted');break;
      case 6:if(yes(state.ownSafeguard,'own Safeguard'))mark(-8,'Safeguard active');break;
      case 7:cap('def');break;
      case 8:case 86:if(family===86)sound();if(need(reserves,'target reserves')===false)mark(-10,'no target reserves');if(fa==='suctioncups'&&!mold)mark(-10,'Suction Cups');break;
      case 9:if(yes(state.magnetRiseActive,'user Magnet Rise')||a==='levitate'||selfTypes.includes('Flying'))mark(-10,'already airborne');break;
      case 11:if(st('def')>=ft('def')&&st('spd')>=ft('spd'))mark(-10,'no defense stages to gain');break;
      case 12:case 70:if(family===70)sound();if(yes(foe.confused,'target confusion'))mark(-5,'already confused');else if(fa==='owntempo'||yes(foe.safeguard,'target Safeguard'))mark(-10,'confusion blocked');break;
      case 13:if(yes(foe.stealthRockActive??state.stealthRockActive,'target Stealth Rock')||need(reserves,'target reserves')===false)mark(-10,'hazard ineffective');break;
      case 14:if(need(state.usedAllOtherMoves,'Last Resort history')===false)mark(-10,'other moves unused');break;
      case 15:if(yes(foe.lockOn,'target Lock-On')||a==='noguard'||fa==='noguard')mark(-10,'Lock-On redundant');break;
      case 17:cap('spa');break;
      case 18:if(st('atk')>=ft('atk')&&st('spa')>=ft('spa'))mark(-10,'no attack stages to gain');break;
      case 19:if(yes(foe.encored,'target Encore'))mark(-8,'Encore active');break;
      case 20:if(types.some(t=>['Steel','Poison'].includes(t))||any(fa,['immunity','magicguard','poisonheal'])||fa==='leafguard'&&state.weather==='Sun'||fa==='hydration'&&state.weather==='Rain'||blocked())mark(-10,'poison blocked');break;
      case 21:case 101:if(fa==='sturdy'&&!mold||Number(foe.level)>Number(state.level))mark(-10,'OHKO blocked');break;
      case 22:if(yes(state.trickRoom,'Trick Room'))mark(-10,'Trick Room active');cap('spe');break;
      case 24:if(fa==='stall')mark(-10,'target Stall');else if(a!=='stall'&&need(foe.userSlower,'relative Speed')===false)mark(-10,'user faster');break;
      case 25:if(yes(state.trickRoom,'Trick Room')||yes(state.tailwindActive,'Tailwind'))mark(-10,'Speed field already unsuitable');break;
      case 26:case 40:if(family===40)sound();if(yes(state.trickRoom,'Trick Room')||ft('spe')<=-6||fa==='speedboost'&&foe.abilityKnown===true||blockedStats)mark(-10,'Speed reduction blocked');break;
      case 27:case 53:if(family===53)sound();if(ft('atk')<=-6||fa==='hypercutter'||blockedStats)mark(-10,'Attack reduction blocked');break;
      case 28:if(state.hp===state.maxHp)mark(-8,'full HP');break;
      case 29:if(yes(state.reflectActive,'own Reflect'))mark(-8,'Reflect active');break;
      case 32:case 77:if(family===77)sound();if(ft('def')<=-6||blockedStats)mark(-10,'Defense reduction blocked');break;
      case 33:if(yes(foe.miracleEye,'target Miracle Eye'))mark(-10,'Miracle Eye active');break;
      case 34:if(yes(foe.embargo,'target Embargo'))mark(-10,'Embargo active');else if(foe.recyclableItem&&!noItem(foe.recyclableItem)&&state.frontierBattle)mark(-10,'Frontier Embargo');break;
      case 35:case 57:if(family===57)sound();if(blocked()||any(fa,['insomnia','vitalspirit']))mark(-10,'sleep blocked');break;
      case 36:if(yes(foe.perishSong,'target Perish Song'))mark(-10,'Perish Song active');break;
      case 37:sound();if(!selfSleeping)mark(-8,'user awake');break;
      case 38:if(!Object.values(state.stages||{}).some(v=>v<0)&&!Object.values(foe.stages||{}).some(v=>v>0))mark(-10,'Haze has no useful reset');break;
      case 39:if(any(fa,['truant','insomnia','vitalspirit','multitype'])||sleeping&&foe.knowsSleepTalkSnore===false)mark(-10,'Worry Seed ineffective');else if(sleeping)need(foe.knowsSleepTalkSnore,'opponent Sleep Talk / Snore');break;
      case 41:if(yes(foe.infatuated,'target infatuation')||fa==='oblivious'||opposite()===false)mark(-10,'attraction blocked');break;
      case 42:if(blockedStats&&!mold||ft('atk')<=-6)mark(-10,'Attack drop blocked');else if(ft('def')<=-6)mark(-8,'Defense drop blocked');break;
      case 43:case 62:{const field=family===43?'spikesLayers':'toxicSpikesLayers';if(Number(foe[field]??state[field])>=(family===43?3:2)||need(reserves,'target reserves')===false)mark(-10,'hazards full / no reserves');break;}
      case 44:cap('atk');break;
      case 45:sound();break;
      case 46:if(!/brn|burn|par|psn|poison|tox/.test(nameKey(state.aiStatus)))mark(-10,'no removable status');break;
      case 47:if(yes(state.futureSightPending,'own delayed attack')||yes(foe.futureSightPending,'target delayed attack'))mark(-12,'delayed attack pending');break;
      case 48:multi('atk','def');break;
      case 49:if(yes(foe.disabled,'target Disable'))mark(-8,'Disable active');break;
      case 50:if(Object.values(state.stages||{}).some(v=>v>=6||a==='simple'&&v>=3))mark(-10,'stat capped');break;
      case 51:if(yes(foe.gastroAcid,'target Gastro Acid')||any(fa,['multitype','truant','slowstart','stench','runaway','pickup','honeygather']))mark(-10,'Gastro Acid ineffective');break;
      case 52:if(fa==='damp'&&!mold)mark(-10,'Damp');else if(need(state.partyHasReserve,'AI reserves')===false){if(need(reserves,'target reserves')===true)mark(-10,'only opponent has reserves');else if(reserves===false)mark(-1,'last battlers');}break;
      case 54:if(yes(state.aquaRingActive,'own Aqua Ring'))mark(-10,'Aqua Ring active');break;
      case 55:cap('spd');break;
      case 56:if(state.weather==='Sandstorm')mark(-8,'Sandstorm active');break;
      case 58:if(yes(foe.foresight,'target Foresight / Odor Sleuth'))mark(-10,'identified');break;
      case 59:if(a==='noguard'||fa==='noguard')mark(-10,'No Guard');cap('evasion');break;
      case 61:if(yes(state.substituteActive,'own Substitute'))mark(-8,'Substitute active');else if(u<26)mark(-10,'insufficient HP');break;
      case 63:if(state.recyclableItem!=null&&noItem(state.recyclableItem))mark(-10,'no recyclable item');else need(state.recyclableItem,'recyclable item');break;
      case 64:if(yes(state.mistActive,'own Mist'))mark(-8,'Mist active');break;
      case 65:if(need(state.partyHasReserve,'AI reserves')===false)mark(-10,'no reserve to pass to');break;
      case 66:case 87:
        if(eff===0)mark(-10,'type immunity');
        else if(any(fa,['limber','magicguard']))mark(-10,'paralysis blocked');
        else if(family===87&&any(fa,['voltabsorb','motordrive'])&&!mold)mark(-12,'Electric absorption');else if(blocked())mark(-10,'paralysis blocked');break;
      case 67:multi('def','spd');break;
      case 68:if(yes(state.lightScreenActive,'own Light Screen'))mark(-8,'Light Screen active');break;
      case 69:if(ft('evasion')<=-6&&!foe.lightScreenActive&&!foe.reflectActive&&state.weather!=='Fog'&&(reserves===false||!(foe.stealthRockActive||foe.spikesLayers>0||foe.toxicSpikesLayers>0)))mark(-10,'Defog ineffective');break;
      case 71:if(fa==='stickyhold'||foe.item!=null&&noItem(foe.item))mark(-10,'item cannot be removed');else need(foe.item,'target item');break;
      case 72:if(yes(state.focusEnergyActive,'own Focus Energy'))mark(-10,'Focus Energy active');break;
      case 73:{
        const item=nameKey(state.item);if(noItem(state.item)){mark(-10,'no item to Fling');break;}
        const targetProtected=foe.safeguard||status(foe.status),selfProtected=state.ownSafeguard||status(state.aiStatus);
        if(['poisonbarb','toxicorb'].includes(item)){
          const targetBlocked=a==='poisonheal'||targetProtected||types.some(t=>['Poison','Steel'].includes(t))||any(fa,['immunity','poisonheal','magicguard']);
          if(targetBlocked)mark(selfProtected||selfTypes.some(t=>['Poison','Steel'].includes(t))||any(a,['klutz','immunity','poisonheal','magicguard','guts'])?-5:3,'Fling poison item');
        }else if(item==='flameorb'){
          if(targetProtected||types.includes('Fire')||any(fa,['magicguard','waterveil']))mark(selfProtected||selfTypes.includes('Fire')||any(a,['klutz','magicguard','waterveil','guts'])?-5:3,'Fling Flame Orb');
        }else if(item==='lightball'&&(targetProtected||fa==='limber'))mark(-5,'Fling paralysis blocked');break;
      }
      case 74:if(state.format!=='Doubles')mark(-10,'requires doubles');break;
      case 75:if(!selfSleeping)mark(-8,'user awake');break;
      case 76:if(yes(foe.seeded,'target Leech Seed')||types.includes('Grass')||fa==='magicguard')mark(-10,'Leech Seed blocked');break;
      case 78:if(yes(state.imprisonActive,'own Imprison')||yes(foe.imprisonActive,'opponent Imprison'))mark(-10,'Imprison active');break;
      case 79:if(ft('spd')<=-6||blockedStats)mark(-10,'Sp. Def reduction blocked');break;
      case 80:if(!sleeping)mark(-8,'target awake');else if(eff===0)mark(-10,'type immunity');break;
      case 81:if(yes(state.camouflageActive,'Camouflage'))mark(-10,'Camouflage active');break;
      case 82:if(foe.speedTie){pmf=new Map([[0,.5],[-10,.5]]);reason='speed tie';}else if(need(foe.userSlower,'relative Speed')===false)mark(-10,'user faster');break;
      case 83:case 93:if(ft(family===83?'accuracy':'evasion')<=-6||a==='noguard'||any(fa,['noguard','keeneye'])||blockedStats)mark(-10,'accuracy / evasion drop blocked');break;
      case 84:if(!mold&&any(fa,['oblivious','clearbody','whitesmoke'])||opposite()===false||ft('spa')<=-6)mark(-10,'Captivate blocked');break;
      case 85:if(yes(state.trickRoom,'Trick Room'))mark(-10,'Trick Room');multi('atk','spe');break;
      case 88:if(need(state.firstTurnOut,'first turn out')===false)mark(-10,'not first turn out');break;
      case 89:if(yes(state.firstTurn,'first battle turn'))mark(-10,'no previous move');break;
      case 90:if(yes(foe.tormented,'target Torment'))mark(-10,'Torment active');break;
      case 91:if(state.weather==='Hail'||fa==='icebody'&&a!=='icebody')mark(-8,'Hail active / helps opponent');break;
      case 92:if(!/berry$/.test(nameKey(state.item)))mark(-10,'no Berry');break;
      case 94:mark(-10,'Teleport');break;
      case 95:if(yes(state.gravity??state.gravityActive,'Gravity'))mark(-10,'Gravity active');break;
      case 96:multi('spa','spd');break;
      case 97:
        if(!status(state.aiStatus)||blocked())mark(-10,'no transferable status');
        else if(/psn|poison|tox/.test(nameKey(state.aiStatus))&&(a==='poisonheal'||types.some(t=>['Poison','Steel'].includes(t))||any(fa,['immunity','poisonheal','magicguard'])))mark(-10,'poison blocked');
        else if(/brn|burn/.test(nameKey(state.aiStatus))&&(types.includes('Fire')||any(fa,['waterveil','magicguard'])))mark(-10,'burn blocked');
        else if(/par/.test(nameKey(state.aiStatus))&&fa==='limber')mark(-10,'paralysis blocked');break;
      case 98:if(any(a,['swiftswim','hydration'])){if(state.weather==='Rain')mark(-8,'Rain active');}else if(fa==='hydration'&&status(foe.status)||state.weather==='Rain')mark(-8,'Rain helps opponent / active');break;
      case 99:if(yes(state.luckyChantActive,'Lucky Chant'))mark(-10,'Lucky Chant active');break;
      case 100:if(any(fa,['waterveil','magicguard'])||types.includes('Fire')||blocked())mark(-10,'burn blocked');break;
      case 102:if(selfTypes.includes('Ghost')){if(yes(foe.cursed,'target Curse')||fa==='magicguard')mark(-10,'Ghost Curse ineffective');}else multi('atk','def');break;
      case 103:if(yes(state.powerTrickActive,'Power Trick'))mark(-10,'Power Trick active');break;
      case 104:if(u<51)mark(-10,'Belly Drum HP too low');cap('atk');break;
      default:notes.push('Basic family '+family+' unavailable');
    }
    return {score,reason,notes,pmf};
  }

  // The Expert flag is evaluated separately from Basic.  Rules are grouped by
  // their Gen 4 move EFFECT (not merely by the move's category).  The script
  // below intentionally retains a warning for rare unsupported effect paths.
  const EXPERT_DESIRABLE_ABILITIES=new Set(('Speed Boost,Battle Armor,Sand Veil,Static,Flash Fire,Wonder Guard,Effect Spore,Swift Swim,Huge Power,Rain Dish,Cute Charm,Shed Skin,Marvel Scale,Pure Power,Chlorophyll,Shield Dust,Adaptability,Magic Guard,Mold Breaker,Super Luck,Unaware,Tinted Lens,Filter,Solid Rock,Reckless').split(',').map(nameKey));
  const EXPERT_DISRUPTIVE_ITEMS=new Set(('Choice Band,Choice Specs,Choice Scarf,Iron Ball,Lagging Tail,Sticky Barb,Power Weight,Power Bracer,Power Belt,Power Lens,Power Band,Power Anklet').split(',').map(nameKey));
  const EXPERT_BAD_TRADE=new Set([...EXPERT_DISRUPTIVE_ITEMS,...'Macho Brace,Toxic Orb,Flame Orb,Black Sludge'.split(',').map(nameKey)]);
  const EXPERT_FLAVOR_BERRIES=new Set('Figy Berry,Wiki Berry,Mago Berry,Aguav Berry,Iapapa Berry'.split(',').map(nameKey));
  const EXPERT_FLING_STATUS_ITEMS=new Set("King's Rock,Razor Fang,Poison Barb,Toxic Orb,Flame Orb,Light Ball".split(',').map(nameKey));
  const EXPERT_COPY_ENCOURAGED=new Set(('Sleep Powder,Lovely Kiss,Spore,Hypnosis,Sing,Grass Whistle,Shadow Punch,Sand Attack,Smoke Screen,Toxic,Guillotine,Horn Drill,Fissure,Sheer Cold,Cross Chop,Aeroblast,Confuse Ray,Sweet Kiss,Screech,Cotton Spore,Scary Face,Fake Tears,Metal Sound,Thunder Wave,Glare,Poison Powder,Shadow Ball,Dynamic Punch,Hyper Beam,Extreme Speed,Thief,Covet,Attract,Swagger,Torment,Flatter,Trick,Superpower,Skill Swap,Psycho Shift,Power Swap,Guard Swap,Sucker Punch,Heart Swap,Switcheroo,Captivate,Dark Void').split(',').map(nameKey));
  const EXPERT_ALWAYS_HIT_LAST=new Set('Aerial Ace,Swift,Shock Wave,Magical Leaf,Shadow Punch,Feint Attack,Magnet Bomb,Aura Sphere'.split(',').map(nameKey));
  const EXPERT_GROUPS=Object.fromEntries(Object.entries({
    sleep:'Hypnosis,GrassWhistle,Sing,Lovely Kiss,Sleep Powder,Spore,Dark Void,Yawn',
    poison:'Toxic,Poison Gas,PoisonPowder',
    paralysis:'Thunder Wave,Stun Spore,Glare',
    confusion:'Confuse Ray,Supersonic,Sweet Kiss,Teeter Dance,Swagger,Flatter',
    draining:'Absorb,Mega Drain,Giga Drain,Leech Life,Drain Punch,Dream Eater',
    attackBoost:'Howl,Sharpen,Swords Dance,Meditate,Nasty Plot,Tail Glow,Growth',
    defenseBoost:'Harden,Withdraw,Defense Curl,Barrier,Iron Defense,Acid Armor,Amnesia,Bulk Up,Calm Mind,Cosmic Power,Defend Order,Charge',
    speedBoost:'Agility,Rock Polish',
    evasionBoost:'Double Team,Minimize',
    attackDrop:'Growl,Charm,FeatherDance',
    defenseDrop:'Leer,Tail Whip,Screech,Metal Sound,Fake Tears',
    speedDrop:'Scary Face,String Shot,Cotton Spore',
    accuracyDrop:'Sand-Attack,Flash,Kinesis,SmokeScreen,Mud-Slap',
    evasionDrop:'Sweet Scent',
    neverMiss:'Aerial Ace,Swift,Shock Wave,Magical Leaf,Shadow Punch,Feint Attack,Magnet Bomb,Aura Sphere',
    switch:'Roar,Whirlwind',
    recovery:'Recover,Roost,Softboiled,Slack Off,Milk Drink,Heal Order,Moonlight,Morning Sun,Synthesis,Swallow',
    charge:'Razor Wind,Skull Bash,Sky Attack,SolarBeam,Solar Beam,Solar Blade',
    invuln:'Fly,Dig,Dive,Bounce,Shadow Force',
    ohko:'Guillotine,Horn Drill,Fissure,Sheer Cold',
    binding:'Wrap,Bind,Clamp,Fire Spin,Whirlpool,Sand Tomb,Magma Storm',
    highCrit:'Slash,Night Slash,Psycho Cut,Air Cutter,Aeroblast,Razor Leaf,Leaf Blade,Stone Edge,Cross Poison,Cross Chop,Crabhammer,Shadow Claw,Spacial Rend',
    recoil:'Submission,Double-Edge,Take Down,Flare Blitz,Brave Bird,Volt Tackle,Wood Hammer,Head Smash',
    speedAttack:'Rock Tomb,Mud Shot,Icy Wind',
    recharge:'Hyper Beam,Giga Impact,Blast Burn,Frenzy Plant,Hydro Cannon,Roar of Time,Rock Wrecker',
    hazards:'Spikes,Toxic Spikes,Stealth Rock',
    protect:'Protect,Detect',
    revenge:'Avalanche,Revenge',
    selfSpADrop:'Overheat,Draco Meteor,Leaf Storm,Psycho Boost',
    basicNoEffect:'Tackle,Pound,Scratch,Quick Attack,ExtremeSpeed,Return,Frustration,Strength,Cut,Water Gun,Waterfall,Earthquake,Rock Slide,Iron Head,Body Slam,Thunderbolt,Flamethrower,Ice Beam,Earth Power,Dragon Claw,Dragon Pulse,Psychic,Shadow Ball,Dark Pulse,Energy Ball,Surf,Discharge,Lava Plume,Flash Cannon,Hydro Pump,Fire Blast,Crunch,Aerial Ace,Brick Break,Sludge Bomb,Poison Jab,Stone Edge,Tri Attack,Needle Arm,AncientPower,Silver Wind,Ominous Wind,Hidden Power,HP Grass,HP Ice,HP Electric,HP Fire',
  }).map(([key,list])=>[key,new Set(list.split(',').map(nameKey))]));
  function legacyExpertScore(state,move,foe,eff,targetIndex){
    const k=nameKey(move.name),has=(g)=>EXPERT_GROUPS[g]?.has(k),knows=(...names)=>state.moves?.some(m=>names.includes(nameKey(m.name)));
    if(RULES[k]?.expertNoop)return {pmf:delta(0),log:[],notes:[]};
    const a=state.ability||'', fa=foe.ability||'', fp=pct(foe.hp,foe.maxHp), sp=pct(state.hp,state.maxHp);
    const stages=state.stages||{}, fs=foe.stages||{}, slow=foe.userSlower;
    const st=(n)=>Number(stages[n]||0),ft=(n)=>Number(fs[n]||0);
    const foeStatus=String(foe.status||'').toLowerCase(),selfStatus=String(state.aiStatus||'').toLowerCase();
    const asleep=/sleep|slp/.test(foeStatus),selfAsleep=/sleep|slp/.test(selfStatus),poisoned=/tox|poison|psn|badly/.test(foeStatus);
    const hasResidual=poisoned||foe.cursed===true||foe.seeded===true||foe.perishSong===true||foe.infatuated===true||foe.yawning===true;
    const residualSelf=/tox/.test(selfStatus)||state.cursed===true||state.seeded===true||state.perishSong===true||state.infatuated===true||state.yawning===true;
    const last=foe.lastMoveCategory,hasDamage=state.moves?.some(m=>m.category==='Physical'||m.category==='Special');
    const notes=[],log=[];let pmf=delta(0);
    const add=(n,why)=>{pmf=convolve(pmf,delta(n));if(n)log.push(why+': '+(n>0?'+':'')+n);};
    const prob=(n,p,why)=>{pmf=convolve(pmf,chance(n,p));log.push(why+': '+(n>0?'+':'')+n+' ('+(p*100).toFixed(1)+'%)');};
    const branch=(options,why)=>{const d=new Map();for(const [n,p] of options)d.set(n,(d.get(n)||0)+p);pmf=convolve(pmf,d);log.push(why);};
    const missing=(what)=>notes.push('Expert: '+move.name+' requires '+what);
    const slower=()=>{if(slow==null)missing('relative Speed');return slow===true;};
    const resisted=()=>Number.isFinite(eff)&&eff<1;
    const first=state.firstTurnOut;
    const statusMove=move.category==='Status'||statusMoves.has(k);
    if(has('sleep')&&statusMove){if(knows('dreameater','nightmare'))prob(1,.5,'sleep attack synergy');}
    else if(has('poison')&&statusMove){if(sp<50||fp<=50)add(-1,'poison setup at low HP');}
    else if(has('paralysis')&&statusMove){
      if(slower())prob(3,P(236),'paralysis slows faster foe');
      if(sp<=70)add(-1,'paralysis at low user HP');
    }else if(has('confusion')&&statusMove){
      if(k==='swagger'&&knows('psychup')){if(ft('atk')>=-2)add(-5,'Swagger + Psych Up special branch');else add(state.firstTurn?5:3,'Swagger + Psych Up');}
      else{
        if(fp<=70)prob(-1,.5,'target HP <=70%');
        if(fp<=50)add(-1,'target HP <=50%');
        if(fp<=30)add(-1,'target HP <=30%');
        if(k==='flatter'||k==='swagger')prob(1,.5,'confusion move synergy');
      }
    }else if(has('draining')){
      if(resisted()) {if(k==='dreameater')add(-1,'resisted Dream Eater');else prob(-3,P(206),'resisted draining move');}
      else if(k==='dreameater'&&asleep)prob(3,P(205),'Dream Eater on sleeping target');
    }else if(k==='explosion'||k==='selfdestruct'||k==='memento'){
      if(ft('evasion')>=1)add(-1,'target evasion');
      if(ft('evasion')>=3)prob(-1,.5,'target evasion +3');
      if(sp>=80){if(slow===null)missing('relative Speed');else prob(slow?-1:-3,P(206),'explosion at high HP');}
      else if(sp>50)prob(-1,P(206),'explosion while healthy');
      else if(sp>30)prob(1,.5,'explosion at 31–50% HP');
      else prob(1,P(206),'explosion at <=30% HP');
    }else if(k==='curse'){
      // Verified against Platinum Kaizo moveCurse.html. At +4 Defense or
      // higher the entire Expert routine exits. Synergy's second +1 roll
      // ONLY happens if its 224/256 first roll succeeded.
      if((state.types||[]).includes('Ghost')){if(sp<81)add(-1,'Ghost Curse at low HP');}
      else if(st('def')<4){
        if(knows('gyroball','trickroom')){
          branch([[0,P(32)],[1,P(224)*.5],[2,P(224)*.5]],
            'Curse Gyro Ball/Trick Room: conditional follow-up roll');
        }else prob(1,.5,'Curse unassisted initial boost');
        if(st('def')<2)prob(1,.5,'Curse Defense below +2');
        if(st('def')<1)prob(1,.5,'Curse Defense below +1');
      }
    }else if(k==='dragondance'){
      if(slower())prob(1,.5,'Dragon Dance slower');
      if(sp<=50)prob(-1,P(186),'Dragon Dance low HP');
    }else if(has('attackBoost')||has('defenseBoost')){
      const stat=has('defenseBoost')?(k==='calmmind'||k==='cosmicpower'||k==='amnesia'||k==='charge'?'spd':'def'):(['nastyplot','tailglow','growth'].includes(k)?'spa':'atk');
      if(st(stat)>=3)prob(-1,P(156),'already boosted');
      if(sp===100)prob(2,.5,'full HP setup');
      if(has('attackBoost')){
        if(sp<=70){if(sp<40)add(-2,'low HP attacking setup');else prob(-2,P(216),'mid HP attacking setup');}
      }else{
        const reach=sp>=70?1-P(200):1;
        if(sp<40)prob(-2,reach,'defensive setup at low HP');
        else{
          const p=last==='Status'?P(196):last===(stat==='def'?'Physical':'Special')?P(150):1;
          if(last==null)missing('opponent last move category');
          else prob(-2,reach*p,'defensive setup vulnerability');
        }
      }
    }else if(has('speedBoost')){
      if(slow==null)missing('relative Speed');else if(slow)prob(3,P(186),'speed boost while slower');else add(-3,'speed boost while faster');
    }else if(has('evasionBoost')){
      if(sp>=90)prob(3,P(156),'healthy evasion setup');
      if(st('evasion')>=3)prob(-1,.5,'already boosted evasion');
      if(/tox|badly/.test(foeStatus))prob(3,sp>50?P(206):P(142),'evasion during toxic stall');
      if(foe.seeded===true)prob(3,P(186),'evasion during Leech Seed');
      if(foe.cursed===true)prob(3,P(186),'evasion during Curse');
      if(state.ingrainActive===true||state.aquaRingActive===true)prob(2,.5,'evasion with passive healing');
      if(sp<=70&&st('evasion')!==0){if(sp<40||fp<40)add(-2,'late evasion setup');else prob(-2,P(186),'late evasion setup');}
    }else if(k==='captivate'){
      if(ft('spa')!==0){
        add(-1,'Captivate target Sp. Atk not neutral');
        if(sp<=90)add(-1,'Captivate user <=90% HP');
        if(ft('spa')<=-3)prob(-2,P(206),'Captivate target Sp. Atk already reduced');
      }
      if(fp<=70)add(-2,'Captivate versus low-HP target');
      if(last==null)missing('opponent previous move category');
      else if(last==='Physical')prob(-1,.75,'Captivate target used Physical move');
    }else if(has('accuracyDrop')){
      // This is a separate EXPERT script.  Previous releases accidentally
      // applied the generic defense-drop penalties to Sand-Attack/Flash.
      if(fp<=70&&sp<70)prob(-1,P(156),'accuracy drop late in battle');
      if(st('accuracy')<=-2)prob(-2,P(176),'user Accuracy already low (Gen 4 script)');
      if(/tox|badly/.test(foeStatus))prob(2,P(186),'accuracy drop + Toxic stall');
      if(foe.seeded===true)prob(2,P(186),'accuracy drop + Leech Seed');
      if(state.ingrainActive===true||state.aquaRingActive===true)prob(1,.5,'accuracy drop + passive healing');
      if(foe.cursed===true)prob(2,P(186),'accuracy drop + Ghost Curse');
      if(sp<=70&&st('accuracy')!==0){
        if(sp<40||fp<40)add(-2,'accuracy drop late-game penalty');
        else prob(-2,P(186),'accuracy drop late-game roll');
      }
    }else if(has('evasionDrop')){
      if(sp<70)prob(-2,P(206),'lower foe Evasion with low user HP');
      else if(ft('evasion')<=-3)prob(-2,P(206),'foe Evasion already low');
      if(fp<=70)add(-2,'target HP too low for evasion drop');
    }else if(has('attackDrop')||has('defenseDrop')||has('speedDrop')){
      const n=has('attackDrop')?'atk':has('defenseDrop')?(['metalsound','faketears'].includes(k)?'spd':'def'):'spe';
      if(has('speedDrop')){if(slow==null)missing('relative Speed');else if(slow)prob(2,P(186),'slow target');else add(-3,'already faster');}
      else if(has('attackDrop')){
        if(ft(n)!==0){add(-1,'attack already modified');if(sp<=90)add(-1,'user HP below 91%');if(ft(n)<=-3)prob(-2,P(206),'target Attack already low');}
        if(fp<=70)add(-2,'target low HP');
        if(last==null)missing('opponent previous move category');
        else if((n==='atk'&&last!=='Physical')||(n==='spa'&&last!=='Special'))prob(-2,.5,'unmatched opponent attack category');
      }else{
        if(sp<70)prob(-2,P(206),'lowering setup late');
        if(ft(n)<=-3)prob(-2,P(206),'target already lowered');
        if(fp<70)add(-2,'target HP low');
      }
    }else if(has('neverMiss')){
      const e=ft('evasion'),ac=st('accuracy');
      if(e>=5||ac<=-5)branch([[2,P(156)],[1,P(100)]],'guaranteed hit into extreme evasion');
      else if(e>=3||ac<=-3)add(1,'guaranteed hit into boosted evasion');
    }else if(k==='bide'){
      // Bide: the Expert routine only discourages using it after damage.
      if(sp<=90)add(-2,'Bide while below 91% HP');
    }else if(k==='thief'||k==='covet'){
      // The AI checks the *target item's held effect*, not raw damage.
      // Do not infer this from an arbitrary item name: the complete
      // encouraged hold-effect table is not included in the public guide.
      if(foe.itemEncouraged===true)prob(1,P(206),'Thief/Covet target holds encouraged item');
      else if(foe.itemEncouraged===false || ['none','noitem'].includes(nameKey(foe.item)))add(-2,'Thief/Covet target item not encouraged');
      else missing('whether target held item has an encouraged steal effect');
    }else if(has('revenge')){
      // Avalanche and Revenge use exactly one mutually exclusive branch.
      if(asleep||foe.confused===true||foe.infatuated===true)
        add(-2,'negative-priority revenge against incapacitated target');
      else branch([[-2,P(180)],[2,P(76)]], 'Avalanche/Revenge negative-priority risk');
    }else if(has('selfSpADrop')){
      if(resisted())add(-1,'self Sp. Atk drop attack resisted');
      if(slow===true&&sp<=80)add(-1,'self Sp. Atk drop while slower and weakened');
      else if(slow===false&&sp<=60)add(-1,'self Sp. Atk drop while faster and weakened');
      else if(slow==null)missing('relative Speed');
    }else if(k==='endeavor'){
      // Endeavor does not enter the AI's normal maximum-damage comparison.
      if(fp<70)add(-1,'Endeavor target below 70% HP');
      else if(slow===true)add(sp>50?-1:1,'Endeavor while slower');
      else if(slow===false)add(sp>40?-1:1,'Endeavor while faster');
      else missing('relative Speed');
    }else if(k==='vitalthrow'){
      if(slow===false&&sp<=60){if(sp<40)prob(-1,P(206),'Vital Throw at low HP');else prob(-1,P(61),'Vital Throw at mid HP');}
    }else if(k==='haze'){
      const bad=Object.values(stages).some(v=>v>=3)||Object.values(fs).some(v=>v<=-3);
      const good=Object.values(stages).some(v=>v<=-3)||Object.values(fs).some(v=>v>=3);
      if(bad)prob(-3,P(206),'Haze removes own boosts');
      if(good)prob(3,P(206),'Haze removes opposing boosts');
      else add(-1,'Haze no opposing boosts (separate terminal branch)');
    }else if(has('switch')){
      if(foe.turnsOut!=null&&foe.turnsOut>3)prob(2,.75,'foe present over 3 turns');else if(foe.turnsOut==null)missing('opponent turns on field');
      if(foe.stealthRockActive||foe.spikesLayers>0||foe.toxicSpikesLayers>0)prob(2,.5,'hazard phazing');
      if(['atk','def','spa','spd','evasion'].some(s=>ft(s)>=3))prob(2,.5,'phaze boosted target');
      else add(-3,'phaze without opponent boosts');
    }else if(has('recovery')){
      if(sp===100)add(-3,'recovery at full HP');
      else if(slow===false)add(-8,'recovery while faster');
      else if(slow===null)missing('relative Speed');
      else {
        const snatch=foe.knowsSnatch;
        if(sp>=70){const p=P(226);branch([[-3,p],[2,(1-p)*(snatch===true?P(144):P(236))],[0,(1-p)*(1-(snatch===true?P(144):P(236)))]],'recovery high HP then Snatch');}
        else prob(2,snatch===true?P(144):P(236),'recovery while slower');
        if(snatch==null)missing('whether opponent knows Snatch');
      }
      if(sp!==100&&slow===true&&['synthesis','morningsun','moonlight'].includes(k)&&['Hail','Rain','Sandstorm'].includes(state.weather))add(-2,'weather-reduced healing');
    }else if(k==='rest'){
      const heal=foe.knowsSnatch===true?P(198):P(246);
      if(foe.knowsSnatch==null)missing('whether opponent knows Snatch');
      if(slow===null)missing('relative Speed');
      else if(slow===false){
        if(sp===100)branch([[-8,P(156)],[3,(1-P(156))*heal],[0,(1-P(156))*(1-heal)]],'Rest at full HP while faster');
        else if(sp>50)add(-3,'Rest while healthy');
        else if(sp>=40)branch([[-3,P(186)],[3,(1-P(186))*heal],[0,(1-P(186))*(1-heal)]],'Rest at 40–50% HP');
        else prob(3,heal,'Rest when low HP');
      }else{
        if(sp>70)add(-3,'Rest while healthy and slower');
        else if(sp>=60)branch([[-3,P(206)],[3,(1-P(206))*heal],[0,(1-P(206))*(1-heal)]],'Rest at mid HP');
        else prob(3,heal,'Rest at low HP');
      }
    }else if(k==='toxic'||k==='leechseed'){
      if(hasDamage){if(sp<=50)prob(-3,P(206),'stall setup at low user HP');if(fp<=50)prob(-3,P(206),'stall setup at low foe HP');}
      if(knows('protect','detect'))prob(2,P(196),'Toxic/Seed + Protect synergy');
    }else if(k==='reflect'||k==='lightscreen'){
      if(sp<50)add(-2,'screen at low HP');
      if(sp>=90)prob(1,.5,'healthy screen');
      if(last===(k==='reflect'?'Physical':'Special'))prob(1,.75,'screen matches opponent last attack');
      else if(last==null)missing('opponent last move category');
    }else if(has('ohko')){prob(1,.25,'OHKO Expert bonus');}
    else if(has('charge')){
      if(resisted())add(-2,'charge move resisted');else{
        if((k==='solarbeam'||k==='solarblade')&&state.weather==='Sun')add(2,'sun skips charge');
        if(state.item==='Power Herb')add(2,'Power Herb');
        if(foe.knowsProtect===true)add(-2,'foe knows Protect');else if(foe.knowsProtect==null)missing('opponent knows Protect');
        if(sp<=38)add(-1,'low HP charge');
      }
    }else if(has('invuln')){
      if(state.item==='Power Herb')add(k==='shadowforce'?1:2,'Power Herb');
      if(k!=='shadowforce'&&foe.knowsProtect===true)add(-1,'foe knows Protect');
      if(resisted())add(1,'invulnerability timing vs resistance');
      if(poisoned||foe.cursed||foe.seeded)add(1,'residual stall');
      const immuneSand=(state.types||[]).some(x=>['Ground','Rock','Steel'].includes(x));
      const immuneHail=(state.types||[]).includes('Ice');
      if((state.weather==='Sandstorm'&&immuneSand)||(state.weather==='Hail'&&immuneHail))
        prob(1,P(176),'two-turn invulnerability while immune to weather');
      if(slow===false){
        if(!foe.lastMoveName)missing('target previous move name (always-hit test)');
        else if(!EXPERT_ALWAYS_HIT_LAST.has(nameKey(foe.lastMoveName)))
          prob(1,P(176),'invulnerability while moving first');
      }
    }else if(k==='fakeout'){add(2,'Fake Out Expert');}
    else if(k==='spitup'){if(state.stockpileCount>=2)prob(2,P(176),'Spit Up at >=2 stockpiles');}
    else if(k==='superfang'){if(fp<=50)add(-1,'Super Fang late');}
    else if(has('binding')){if(poisoned||foe.cursed||foe.perishSong||foe.infatuated)prob(1,.5,'binding with residual damage');}
    else if(has('highCrit')){if(eff>=2)prob(1,.5,'critical hit super effective');else if(eff===1)prob(1,.25,'critical hit neutral');}
    else if(has('recoil')){if(!resisted()&&['Rock Head','Magic Guard'].includes(a))add(1,'recoil protected by ability');}
    else if(has('speedAttack')){if(!resisted()){if(slow===null)missing('relative Speed');else if(slow)prob(2,P(186),'speed-lowering attack when slower');else add(-3,'speed-lowering attack while faster');}}
    else if(has('recharge')){if(resisted())add(-1,'recharge attack resisted');if(a==='Truant')prob(1,P(176),'Truant recharge overlap');if(slow===true&&sp>=60||slow===false&&sp>40)add(-1,'recharge risk');}
    else if(k==='disable'){if(slow===false){if(last==='Status')prob(-1,P(156),'Disable vs status');else if(last==='Physical'||last==='Special')add(1,'Disable vs damaging last move');else missing('opponent last move');}}
    else if(k==='encore'){
      if(foe.disabled===true)prob(3,P(226),'Encore on disabled target');
      if(slow===true)add(-2,'Encore while slower');
      else if(foe.encoreUsefulLastMove===true)prob(3,P(226),'Encore traps an encouraged effect');
      else if(foe.encoreUsefulLastMove===false)add(-2,'Encore traps an unhelpful effect');
      else missing('whether opponent last-used move has an encouraged Encore effect');
    }
    else if(k==='counter'||k==='mirrorcoat'){
      if(asleep||foe.confused===true||foe.infatuated===true)add(-1,'counter unpredictable foe');
      else{
        if(sp<=30)prob(-1,P(246),'counter at critical HP');
        if(sp<=50)prob(-1,P(156),'counter at low HP');
        if(knows('counter')&&knows('mirrorcoat'))prob(4,P(156),'both Counter and Mirror Coat known');
        if(last==null)missing('opponent last move category');
        else{
          if(foe.taunted===true)prob(1,P(156),'opponent Taunted');
          else if(foe.taunted==null)missing('opponent Taunt state');
          if(last==='Status'){
            if(foe.counterCorrespondingType===false)prob(4,P(125),'counter target type mismatch (Gen 4 quirk)');
            else if(foe.counterCorrespondingType==null)missing('Counter/Mirror Coat corresponding target type check');
          }else if(last!==(k==='counter'?'Physical':'Special'))add(-1,'counter to wrong damage class');
          else prob(1,P(156),'counter to matching damage class');
        }
      }
    }else if(k==='metalburst'){
      if(asleep||foe.confused===true||foe.infatuated===true||foe.knowsMetalBurstCounter===true){
        add(-1,'Metal Burst target incapacitated or knows countereffect');
      }else{
        if(foe.knowsMetalBurstCounter==null)missing('opponent knows Avalanche / Revenge / Focus Punch / Vital Throw');
        if(sp<=30)prob(-1,P(246),'Metal Burst at critical HP');
        if(sp<=50)prob(-1,P(156),'Metal Burst at low HP');
        if(sp>50)prob(1,.25,'Metal Burst healthy');
        if(last==null)missing('opponent previous move category');
        else if(last!=='Status'&&foe.taunted!==true)prob(1,P(156),'Metal Burst versus previous attack');
        if(foe.taunted===false)prob(1,P(156),'Metal Burst vs foe not Taunted');
        else if(foe.taunted==null)missing('whether target is Taunted');
      }
    }
    else if(k==='painsplit'){if(fp<80)add(-1,'Pain Split vs weakened foe');if(slow===true)add(sp>60?-1:1,'Pain Split slower');else if(sp>40)add(-1,'Pain Split faster');}
    else if(k==='nightmare'){add(2,'Nightmare Expert');}
    else if(k==='lockon'||k==='mindreader'){prob(2,.5,'Lock On accuracy');}
    else if(k==='sleeptalk'){add(selfAsleep?10:-5,'Sleep Talk');}
    else if(k==='destinybond'){add(-1,'Destiny Bond base');if(slow===false){if(sp<=70)prob(1,.5,'Destiny Bond low HP');if(sp<=50)prob(1,.5,'Destiny Bond very low HP');if(sp<=30)prob(2,P(156),'Destiny Bond critical HP');}}
    else if(k==='reversal'||k==='flail'){
      if(slow===true){if(sp>60)add(-1,'Flail too healthy');else if(sp<=40)prob(1,P(156),'Flail low HP');}
      else if(slow===false){if(sp>33)add(-1,'Flail too healthy');else if(sp<8)branch([[2,P(156)],[1,P(100)]],'Flail critical HP');else if(sp<=20)prob(1,P(156),'Flail at low HP');}
    }else if(k==='healbell'||k==='aromatherapy'){if(state.partyStatused===false)add(-5,'no friendly status');else if(state.partyStatused==null)missing('whether any ally is statused');}
    else if(k==='protect'||k==='detect'){
      if(foe.knowsFeint===true)prob(-2,.5,'foe knows Feint/Shadow Force');
      if(state.protectChain>=2)add(-2,'repeated Protect');
      else if(residualSelf&&state.lockedOn!==true)add(-2,'user has damaging residual effects');
      else if(foe.knowsRecovery===true&&state.lockedOn!==true)add(-2,'opponent can recover during Protect');
      else{
        if(hasResidual||state.format==='Doubles'||state.lockedOn===true)add(2,'Protect stall / Doubles');
        else prob(2,P(85),'Protect general utility');
        prob(-1,.5,'Protect general skepticism');
        if(state.usedProtectLastTurn===true){add(-1,'Protect used last turn');prob(-1,.5,'consecutive Protect');}
      }
      if(state.protectChain==null)missing('Protect chain length');
    }else if(k==='spikes'||k==='toxicspikes'||k==='stealthrock'){
      const phaze=knows('roar','whirlwind');
      if(phaze)branch([[0,.5],[1,.5*.25],[2,.5*.75]],'hazard with phazing');
      else branch([[0,.5],[1,.5]],'hazard first-use incentive');
    }else if(k==='substitute'){
      if(knows('focuspunch'))prob(1,P(160),'Substitute + Focus Punch');
      if(sp<=90){const n=sp>70?1:sp>50?2:3;for(let i=0;i<n;i++)prob(-1,P(156),'Substitute HP cost '+(i+1));}
      if(slow===false&&((last==='Status'&&status(foe.status))||foe.seeded===true))prob(1,P(156),'Substitute against status pressure');
    }else if(k==='bellydrum'){if(sp<90)add(-2,'Belly Drum at <90% HP');}
    else if(k==='aquaring'){if(sp>=30)prob(1,.5,'Aqua Ring HP support');}
    else if(k==='rain dance'.replace(/ /g,'')||k==='sunnyday'||k==='hail'){
      if(k==='hail'){if(sp<40)add(-1,'Hail user low HP');else{if(['Rain','Sun','Sandstorm'].includes(state.weather)){add(1,'replace weather');if(knows('blizzard'))add(2,'Hail + Blizzard versus existing weather');}if(a==='Ice Body')add(2,'Ice Body');}}
      else if(k==='raindance'&&slow===true&&a==='Swift Swim')add(1,'Rain Dance + Swift Swim');
      else{if(sp<40)add(-1,'weather at low HP');if(state.weather!==null&&state.weather!==(k==='raindance'?'Rain':'Sun')&&state.weather!=='None')add(1,'replace weather');if(k==='raindance'&&(a==='Rain Dish'||a==='Hydration'&&status(state.aiStatus)))add(1,'Rain benefits ability');if(k==='sunnyday'&&(a==='Flower Gift'||a==='Leaf Guard'&&status(state.aiStatus)))add(1,'Sun benefits ability');}
    }else if(k==='gravity'){if(fa==='Levitate'||(foe.types||[]).includes('Flying')||foe.magnetRiseActive===true)prob(1,.75,'Gravity grounds foe');if(sp>=60)prob(1,.375,'Gravity with healthy user');}
    else if(k==='tailwind'){
      if(slow===null)missing('relative Speed');
      else if(slow===false)branch([[0,.25],[-1,.75]],'Tailwind while faster');
      else if(sp<=30)branch([[0,.25],[-1,.75]],'Tailwind at critical HP');
      else if(sp>75)branch([[0,.25],[1,.75]],'Tailwind while healthy');
      else branch([[0,.25],[1,.75*.75],[0,.75*.25]],'Tailwind at middling HP');
    }else if(k==='trickroom'){
      if(state.format!=='Doubles') {
        if(sp<=30&&state.partyHasReserve===false){/* Expert has no further modifiers. */}
        else if(slow===false)add(-1,'Trick Room user faster');
        else if(slow===true)prob(3,.75,'Trick Room user slower');
        else missing('relative Speed');
        if(sp<=30&&state.partyHasReserve==null)missing('AI party reserves for Trick Room');
      }
    }else if(k==='brickbreak'){if(foe.reflectActive===true||foe.lightScreenActive===true)add(1,'Brick Break breaks screens');}
    else if(k==='blizzard'){if(resisted())prob(-3,P(206),'Blizzard resisted');if(state.weather==='Hail')add(1,'Blizzard in Hail');}
    else if(k==='focuspunch'){
      if(resisted())add(-1,'Focus Punch resisted');
      if(state.substituteActive===true)add(5,'Focus Punch behind Substitute');
      if(asleep)add(1,'Focus Punch versus asleep');
      if(foe.confused===true||foe.infatuated===true)prob(1,P(156),'Focus Punch versus disruption');
      if(first===false)prob(1,P(56),'Focus Punch after entry turn');
    }else if(k==='uturn'){
      if(resisted())add(-1,'U-turn resisted');
      else if((RULES[k]?.baton??(isStatusMove(move)||explosion?1:0))===0){/* no routine for this move */}
      else if(state.partyHasReserve===false)add(2,'U-turn last living Pokémon');
      else {
        if(state.partyHasReserve==null)missing('AI reserve Pokémon');
        const knownEff=(state.moves||[]).filter(m=>m.effectiveness?.[targetIndex]!=null);
        const hasSE=knownEff.some(m=>m.category!=='Status'&&Number(m.effectiveness[targetIndex])>=2);
        if(hasSE||state.hasSuperEffectiveMove===true)prob(-2,.75,'U-turn user has super-effective move');
        else if(state.hasSuperEffectiveMove==null && knownEff.length<(state.moves||[]).length)missing('whether user has super-effective move');
        if(state.benchOutdamagesUser===false){
          // 75% terminates with -2; only the other 25% proceeds.
          const continued=new Map([[0,1]]);
          let d=delta(0);
          const adjust=(n,p)=>{d=convolve(d,chance(n,p));};
          if(fp>70)adjust(1,.75);
          if(fp>30)adjust(1,.5);else adjust(1,.25);
          if(slow===false)d=convolve(d,delta(1));
          else if(slow===true)d=convolve(d,chance(1,.5));
          else missing('relative Speed');
          const mixed=new Map([[-2,.75]]);
          for(const [n,p] of d)mixed.set(n,(mixed.get(n)||0)+.25*p);
          pmf=convolve(pmf,mixed);
          log.push('U-turn bench damage check: -2 and terminate (75%), else continue');
        }else if(state.benchOutdamagesUser===true){
          if(fp>70)prob(1,.75,'U-turn target high HP');
          if(fp>30)prob(1,.5,'U-turn target mid HP');else prob(1,.25,'U-turn low foe HP');
          if(slow===false)add(1,'U-turn moves first');else if(slow===true)prob(1,.5,'U-turn moves second');
          else missing('relative Speed');
        }else missing('whether a reserve Pokémon deals more damage');
      }
    }else if(k==='futuresight'||k==='doomdesire'||k==='naturalgift'||k==='judgment'){
      // No Expert-specific routine in the Gen 4 source. Other flags still apply.
    }else if(k==='feint'){
      // If the foe does not know Protect, 75% of rolls terminate the Expert
      // routine immediately at +0. Preserve that gating probability.
      let follow=delta(0);
      const step=(n,p)=>{follow=convolve(follow,chance(n,p));};
      if(residualSelf)step(1,.5);
      else if(fp<100&&['Leftovers','Black Sludge'].includes(foe.item))step(1,.5);
      if(foe.protectChain===0)step(1,.5);
      else if(foe.protectChain===1)step(1,.25);
      else if(foe.protectChain>=2)follow=convolve(follow,delta(-2));
      else missing('opponent Protect chain');
      if(foe.knowsProtect===false){
        const mix=new Map([[0,.75]]);
        for(const [n,p] of follow)mix.set(n,(mix.get(n)||0)+.25*p);
        pmf=convolve(pmf,mix);
        log.push('Feint: foe lacks Protect; 75% terminate at +0');
      }else{
        if(foe.knowsProtect==null)missing('whether the opponent knows Protect');
        pmf=convolve(pmf,follow);
      }
    }else if(k==='powertrick'){
      if(sp>90)prob(1,.625,'Power Trick high HP');
      if(sp>60)prob(1,.5,'Power Trick mid HP');
      if(sp>30)prob(1,P(92),'Power Trick low HP');
    }else if(k==='gastroacid'){
      const p=.75;
      let choice=fp>70?delta(1):fp<=30?new Map([[-2,.5],[-3,.5]]):fp<=50?new Map([[-1,.5],[-2,.5]]):new Map([[0,.5],[-1,.5]]);
      const d=new Map([[0,1-p]]);
      for(const [n,q] of choice)d.set(n,(d.get(n)||0)+p*q);
      pmf=convolve(pmf,d);
    }else if(k==='luckychant'){
      if(sp<70)add(-1,'Lucky Chant user low HP');
      if(foe.knowsHighCritMove===true)add(1,'Lucky Chant vs critical-hit move');
      else if(foe.knowsHighCritMove===false)prob(1,.25,'Lucky Chant general');
      else missing('opponent knows high-critical-hit move');
    }else if(k==='wringout'||k==='crushgrip'){
      if(Number.isFinite(eff)&&eff<1)add(-1,'Wring Out resisted');
      if(fp<50)add(-1,'Wring Out weakened foe');
      if(fp===100){prob(1,P(231),'Wring Out full HP foe');
        if(slow===false)add(2,'Wring Out faster user');else if(slow===true)add(1,'Wring Out slower user');}
      else if(fp>85)prob(1,P(231),'Wring Out foe high HP');
    }else if(k==='acupressure'){
      if(sp<=50)add(-1,'Acupressure at low HP');
      if(sp>90)prob(1,.75,'Acupressure while healthy');else prob(1,.375,'Acupressure otherwise');
    }else if(k==='conversion'){
      if(sp<=90)add(-2,'Conversion after losing HP');
      if(state.firstTurn===false)prob(-2,P(200),'Conversion after first battle turn');
      else if(state.firstTurn==null)missing('first global turn');
    }else if(k==='psychup'){
      if(['atk','def','spa','spd','evasion'].some(n=>ft(n)>=3)){
        if(st('evasion')<=0)add(2,'Psych Up copies opponent setup to unboosted evasion');
        else if(['atk','def','spa','spd'].some(n=>st(n)<=0))add(1,'Psych Up copies higher boosts');
        else prob(-2,P(206),'Psych Up already boosted user');
      }else add(-2,'Psych Up lacks worthwhile target boosts');
    }else if(k==='foresight'||k==='odorsleuth'||k==='miracleeye'){
      if(k==='miracleeye'?(foe.types||[]).includes('Dark'):(state.types||[]).includes('Ghost'))
        prob(2,P(121),'Identify target typing (Gen 4 check)');
      if(ft('evasion')>=3)prob(2,P(176),'Identify boosted evasion');
      else add(-2,'Identify effect without target evasion');
    }else if(k==='endure'){
      if(sp<4)add(-1,'Endure at critical HP');
      if(sp<35)prob(1,P(186),'Endure at low HP');
    }else if(k==='batonpass'){
      const boosted=Math.max(-6,...Object.values(stages).filter(Number.isFinite));
      const threshold=slow===true?70:60;
      if(slow==null)missing('relative Speed');
      else if(boosted>=3){if(sp<=threshold)prob(2,P(176),'Baton Pass large boost at low HP');}
      else if(boosted===2){if(sp<=threshold)add(-2,'Baton Pass +2 stage check');}
      else add(-2,'Baton Pass without useful boosts');
    }else if(k==='healingwish'||k==='lunardance'){
      if(sp>=80&&slow===false)prob(-5,.25,'Sacrifice a healthy faster user');
      if(sp>50)prob(-1,P(206),'Sacrifice with substantial HP');
      // The guide specifies a 25% chance to perform the party-dependent block.
      // Do not invent the relative bench damage when it is unavailable.
      let aux=delta(1);
      const knownEff=(state.moves||[]).filter(m=>m.effectiveness?.[targetIndex]!=null);
      const hasSE=knownEff.some(m=>m.category!=='Status'&&Number(m.effectiveness[targetIndex])>=2);
      if(state.hasSuperEffectiveMove===false || (!hasSE&&knownEff.length===(state.moves||[]).length))
        aux=convolve(aux,chance(1,.25));
      else if(state.hasSuperEffectiveMove==null&&!hasSE)missing('whether user has super-effective attack');
      if(state.benchOutdamagesUser===true)aux=convolve(aux,chance(1,.5));
      else if(state.benchOutdamagesUser==null)missing('reserve Pokémon damage comparison');
      const mix=new Map([[0,.75]]);
      for(const [n,p] of aux)mix.set(n,(mix.get(n)||0)+.25*p);
      pmf=convolve(pmf,mix);
      if(sp<=30)prob(1,.5,'Sacrifice at low HP');
    }else if(k==='mirrormove'){
      const previous=nameKey(foe.lastMoveName||'');
      if(!previous)missing('target last-used move');
      else if(slow===false&&EXPERT_COPY_ENCOURAGED.has(previous))prob(2,.5,'Mirror Move copied useful attack');
      else if(!EXPERT_COPY_ENCOURAGED.has(previous))prob(-1,P(176),'Mirror Move copied ordinary attack');
    }else if(k==='rolesplay'||k==='roleplay'||k==='skillswap'){
      if(EXPERT_DESIRABLE_ABILITIES.has(nameKey(state.ability)))add(-1,'user would lose good ability');
      if(EXPERT_DESIRABLE_ABILITIES.has(nameKey(foe.ability)))prob(2,P(206),'opponent has desirable ability');
      if(!foe.ability)missing('target ability knowledge');
    }else if(k==='magiccoat'){
      if(fp<=30)prob(-1,P(156),'Magic Coat against weakened target');
      if(first===true)prob(1,P(106),'Magic Coat first turn');
      else if(first===false)prob(-1,P(226),'Magic Coat later turns');
      else missing('first turn out');
    }else if(k==='recycle'){
      const item=nameKey(state.recyclableItem);
      if(!item)missing('item recoverable by Recycle');
      else if(['chestoberry','lumberry','starfberry'].includes(item))prob(1,P(206),'Recycle valuable Berry');
      else add(-2,'Recycle unhelpful item');
    }else if(k==='trick'||k==='switcheroo'){
      const userItem=nameKey(state.item), targetItem=nameKey(foe.item);
      const badTrade=EXPERT_BAD_TRADE.has(targetItem),types=(foe.types||[]);
      if(!state.item)missing('user held item');
      else if(!foe.item)missing('opponent held item');
      else if(EXPERT_DISRUPTIVE_ITEMS.has(userItem))add(badTrade?-3:5,'Trick disruptive item');
      else if(['toxicorb','poisonbarb'].includes(userItem)){
        const avoid=status(foe.status)||foe.safeguard===true||types.some(t=>['Steel','Poison'].includes(t))||
          ['Immunity','Magic Guard','Poison Heal'].includes(foe.ability);
        const userBad=status(state.aiStatus)||state.safeguard===true||(state.types||[]).some(t=>['Steel','Poison'].includes(t))||
          ['Klutz','Immunity','Magic Guard','Poison Heal'].includes(state.ability);
        add(badTrade?-3:avoid?(userBad?-3:5):5,'Trick toxic item');
      }else if(userItem==='flameorb'){
        const avoid=status(foe.status)||foe.safeguard===true||types.includes('Fire')||['Water Veil','Magic Guard'].includes(foe.ability);
        const userBad=status(state.aiStatus)||state.safeguard===true||(state.types||[]).includes('Fire')||
          ['Klutz','Water Veil','Magic Guard'].includes(state.ability);
        add(badTrade?-3:avoid?(userBad?-3:5):5,'Trick flame orb');
      }else if(userItem==='blacksludge'){
        const avoid=types.includes('Poison')||foe.ability==='Magic Guard';
        const userBad=(state.types||[]).includes('Poison')||['Klutz','Magic Guard'].includes(state.ability);
        add(badTrade?-3:avoid?(userBad?-3:5):5,'Trick Black Sludge');
      }else if(EXPERT_FLAVOR_BERRIES.has(userItem)){
        if(badTrade||EXPERT_FLAVOR_BERRIES.has(targetItem))add(-3,'Trick poor flavor Berry trade');
        else prob(2,P(206),'Trick flavor Berry');
      }
    }else if(k==='fling'){
      if(resisted()&&!EXPERT_FLING_STATUS_ITEMS.has(nameKey(state.item)))add(-1,'Fling resisted');
      const power=Number(state.flingPower);
      if(state.flingPower==null||!Number.isFinite(power))missing('held item Fling power');
      else if(power<30)add(-2,'weak Fling item');
      else if(power>90){
        prob(1,.75,'high-power Fling');
        if(eff>=2)add(4,'high-power super-effective Fling');
        else prob(1,.5,'high-power Fling secondary bonus');
      }else if(power>60)prob(1,.75,'medium-power Fling');
      else prob(-1,.5,'low-power Fling');
    }else if(k==='snatch'){
      if(first===true)prob(2,P(106),'Snatch first turn');
      // The rest of the Snatch script has an 11.7% early exit.
      const active=1-P(30);
      let rest=delta(0);
      const restProb=(n,p)=>{rest=convolve(rest,chance(n,p));};
      if(slow===true){
        if(fp>25)restProb(-2,P(226));
        if(foe.knowsRecovery===true)restProb(2,P(106));
        else restProb(1,P(26));
        if(foe.knowsRecovery==null)missing('opponent knows recovery or Defense Curl');
      }else if(slow===false){
        if(sp<100)restProb(-2,P(226));
        if(fp<70)restProb(-2,P(226));else restProb(-2,P(173));
      }else missing('relative Speed');
      const dist=new Map([[0,1-active]]);
      for(const [n,p] of rest)dist.set(n,(dist.get(n)||0)+active*p);
      pmf=convolve(pmf,dist);
    }else if(k==='powerswap'||k==='guardswap'){
      const at=k==='powerswap'?'atk':'def',special=k==='powerswap'?'spa':'spd';
      const d=Math.max(0,ft(at)-st(at)),e=Math.max(0,ft(special)-st(special));
      if(st(at)>ft(at)||st(special)>ft(special)){/* Expert never rewards losing a boost */}
      else {
        let highest=0;
        if(k==='guardswap'){
          // Platinum Kaizo Guard Swap: test the sum of individually capped
          // positive stage differences in decreasing 8,6,4,2,1 order.
          const sum=Math.min(4,d)+Math.min(4,e);
          highest=sum>=8?5:sum>=6?4:sum>=4?3:sum>=2?2:sum>=1?1:0;
        }else{
          // Vanilla Power Swap: two stage differences are classified separately.
          const da=d>3?3:d>1?2:d>0?1:0;
          const ea=e>3?3:e>1?2:e>0?1:0;
          if(da===0)highest=ea;
          else if(ea===0)highest=da;
          else if(ea===1)highest=0; // Gen 4 script skips this unusual pair.
          else highest=Math.min(5,da+ea-1);
        }
        if(highest){
          const dist=new Map([[0,Math.pow(.5,highest)]]);
          for(let i=1;i<=highest;i++)dist.set(i,i===highest?.5:Math.pow(.5,highest-i+1));
          pmf=convolve(pmf,dist);
          log.push('Expert '+move.name+' positive stage differences');
        }
      }
    }else if(k==='heartswap'){
      // Stage-based Expert logic is independent of type resistance; Heart Swap
      // itself is a Status move. Test the opponent's relevant positive stages.
      const relevant=['atk','def','spa','spd','evasion'];
      const worthwhile=relevant.some(n=>ft(n)>=2)||foe.focusEnergyActive===true;
      if(!worthwhile)add(-2,'Heart Swap: opponent has no significant boosts');
      else if(['atk','def','spa','spd'].some(n=>st(n)<=0)||state.focusEnergyActive===false){
        add(1,'Heart Swap: user has an unboosted stat');
      }else if(st('evasion')<=0)add(2,'Heart Swap: unboosted evasion');
      else prob(-2,P(206),'Heart Swap: already-boosted user');
    }else if(k==='punishment'){
      if(!resisted()){
        const total=Object.values(fs).filter(x=>Number(x)>0).reduce((a,x)=>a+Number(x),0);
        if(total>6)branch([[4,.5],[3,.25],[2,.125],[1,.0625],[0,.0625]],'Punishment many boosts');
        else if(total===6)branch([[3,.5],[2,.25],[1,.125],[0,.125]],'Punishment six boosts');
        else if(total===5)branch([[2,.5],[1,.25],[0,.25]],'Punishment five boosts');
        else if(total>2)prob(1,.5,'Punishment boosts');
      }
    }else if(k==='worryseed'){
      if(foe.knowsRest===true)add(1,'Worry Seed targets Rest user');
      else if(foe.knowsRest==null)missing('whether foe knows Rest');
      if(sp>=50)prob(1,.5,'Worry Seed healthy user');
      prob(1,.75,'Worry Seed Expert');
    }else if(k==='healblock'){
      if(foe.knowsRecovery===true||foe.knowsDrain===true)prob(1,P(231),'Heal Block suppresses healing');
      else if(state.seeded===true||foe.ingrainActive===true||foe.aquaRingActive===true)
        prob(1,P(231),'Heal Block versus ongoing healing');
      else {if(foe.knowsRecovery==null)missing('whether foe knows recovery');prob(1,P(144),'Heal Block uncertain healing');}
    }else if(k==='defog'){
      const screens=foe.reflectActive===true||foe.lightScreenActive===true;
      const hazards=foe.stealthRockActive===true||foe.spikesLayers>0||foe.toxicSpikesLayers>0;
      if(screens){
        if(sp<30&&state.partyHasReserve===false){prob(-2,P(206),'Defog low HP final user');if(fp>70)add(-2,'Defog foe high HP');}
        add(1,'Defog clears screens');
        if(foe.hasReserves===true&&hazards)prob(-1,.5,'Defog removes useful opponent hazards');
      }else if(hazards)add(-2,'Defog removes hazards');
      if(sp>=70&&ft('evasion')>=-2&&fp<=70)add(-2,'Defog not useful');
      else{prob(-2,P(206),'Defog uncertain evasion reduction');if(fp<=70)add(-2,'Defog against low HP foe');}
      if(foe.reflectActive==null||foe.lightScreenActive==null||foe.hasReserves==null)
        missing('opponent screens/hazards/reserves for Defog');
    }else if(k==='mefirst'){
      if(slow===true)add(-2,'Me First while slower');
      if(state.outdamagesOpponent===true)prob(1,.875,'Me First higher user damage');
      else if(state.outdamagesOpponent==null)missing('damage of opponent last-used move');
      if(last==='Physical'||last==='Special')prob(1,.5,'Me First versus attacking move');
      else if(last==null)missing('opponent last-used move category');
      prob(1,.75,'Me First Expert');
    }else if(k==='copycat'){
      const prev=nameKey(foe.lastMoveName||'');
      const encouraged=EXPERT_COPY_ENCOURAGED.has(prev);
      if(!prev)missing('opponent last-used move');
      if(slow===true&&state.outdamagesOpponent===false&&!encouraged)prob(-1,P(176),'Copycat slower weaker user');
      if(slow===false){
        if(state.outdamagesOpponent===true)prob(2,.875,'Copycat faster stronger user');
        if(encouraged)prob(2,.5,'Copycat useful move');
      }
      if(state.outdamagesOpponent==null)missing('relative damage vs foe previous move');
    }else if(k==='pursuit'){
      if(first===true)prob(1,.5,'Pursuit on first turn out');
      else if(first===false&&(foe.types||[]).some(t=>['Ghost','Psychic'].includes(t)))
        prob(1,.5,'Pursuit versus Ghost/Psychic');
      else if(first==null)missing('whether user just entered');
      if(foe.knowsUTurn===true)prob(1,.5,'Pursuit versus U-turn');
      else if(foe.knowsUTurn==null)missing('whether foe knows U-turn');
    }else if(k==='facade'){
      // Documented Gen 4 bug: checks *opponent*, not the Facade user.
      if(/burn|brn|par|psn|poison|tox/.test(foeStatus))add(1,'Facade checks opponent status (Gen 4 bug)');
    }else if(k==='smellingsalt'){
      if(/par/.test(foeStatus))add(2,'Smelling Salt on paralyzed target');
    }else if(k==='wakeupslap'){
      if(resisted())add(-1,'Wake-Up Slap resisted');
      if(asleep)add(1,'Wake-Up Slap versus sleeping target');
    }else if(k==='waterspout'||k==='eruption'){
      if(resisted())add(-1,'HP-scaled attack resisted');
      // Deliberate Gen 4 AI bug: HP check is of the defender, not the user.
      if(slow===true&&fp<=70)add(-1,'HP-scaled attack versus weaker foe while slower');
      else if(slow===false&&fp<=50)add(-1,'HP-scaled attack versus weaker foe while faster');
      else if(slow==null)missing('relative Speed');
    }else if(k==='superpower'){
      if(resisted())add(-1,'Superpower resisted');
      if(st('atk')<=-1)add(-1,'Superpower user Attack already lowered');
      if(slow===true&&sp>=60)add(-1,'Superpower while slower and healthy');
      else if(slow===false&&sp>40)add(-1,'Superpower while faster and healthy');
      else if(slow==null)missing('relative Speed');
    }else if(k==='mud sport'.replace(/ /g,'')||k==='watersport'){
      if(sp<50)add(-1,'Sport move used at low HP');
      const targetType=k==='mudsport'?'Electric':'Fire';
      if((foe.types||[]).includes(targetType))add(1,'Sport weakens target typing');
    }else if(k==='hammerarm'){
      if(resisted())add(-1,'Hammer Arm resisted');
      if(slow===true)add(1,'Hammer Arm user already slower');
      else if(slow==null)missing('relative Speed');
    }else if(k==='brine'){
      if(resisted())add(-1,'Brine resisted');
      if(fp<=50)branch([[1,.5],[2,.5]],'Brine on <=50% HP foe');
    }else if(k==='closecombat'){
      if(resisted())add(-1,'Close Combat resisted');
      if(slow===true&&sp<=80)add(-1,'Close Combat slower at <=80% HP');
      else if(slow===false&&sp<=60)add(-1,'Close Combat faster at <=60% HP');
      else if(slow==null)missing('relative Speed');
    }else if(k==='payback'){
      if(resisted())add(-1,'Payback resisted');
      if(slow===true&&sp>=30)prob(1,.75,'Payback user moves second');
      else if(slow==null)missing('relative Speed');
    }else if(k==='assurance'){
      if(resisted())add(-1,'Assurance resisted');
      if(slow===true){
        if(a==='Rough Skin')prob(1,.5,'Assurance with Rough Skin');
        else if(['Jaboca Berry','Rowap Berry'].includes(state.item))prob(1,.5,'Assurance with reactive Berry');
        else prob(1,.25,'Assurance while slower');
      }else if(slow==null)missing('relative Speed');
    }else if(k==='embargo'){
      prob(1,.5,'Embargo');
    }else if(k==='psychoshift'){
      if(state.aiStatus==null)missing('AI current status');
      else if(!status(state.aiStatus))add(-10,'Psycho Shift user has no status');
      else if(fp>=30)prob(1,.5,'Psycho Shift against healthy foe');
    }else if(k==='trumpcard'){
      if(resisted())add(-1,'Trump Card resisted');
      const pp=Number(move.currentPP??state.trumpCardPP);
      if(!Number.isInteger(pp)||pp<1)missing('Trump Card remaining PP');
      else if(pp===1)add(3,'Trump Card last PP');
      else if(pp===2)branch([[2,P(156)],[1,P(100)]],'Trump Card 2 PP');
      else if(pp===3)prob(1,P(156),'Trump Card 3 PP');
      if(fa==='Pressure')prob(1,P(226),'Trump Card vs Pressure');
      if(ft('evasion')>=5||st('accuracy')<=-5)
        branch([[2,P(156)],[1,P(100)]],'Trump Card extreme evasion');
      else if(ft('evasion')>=3||st('accuracy')<=-3)
        prob(1,P(156),'Trump Card boosted evasion');
    }else if(k==='magnetrise'){
      if(sp>=50){
        if(foe.knowsGroundMove===true)add(1,'Magnet Rise vs Earthquake/Earth Power/Fissure');
        else if(foe.knowsGroundMove==null)missing('foe knows Earthquake/Earth Power/Fissure');
        if((foe.types||[]).includes('Ground'))add(1,'Magnet Rise vs Ground target');
        else prob(1,.5,'Magnet Rise general');
      }
    }else if(k==='lastresort'){
      if(resisted())add(-1,'Last Resort resisted');
      if(state.usedAllOtherMoves===true)add(1,'Last Resort enabled');
      else if(state.usedAllOtherMoves==null)missing('whether all other moves were used');
    }else if(k==='suckerpunch'){
      if(resisted())add(-1,'Sucker Punch resisted');
      prob(1,.75,'Sucker Punch Expert');
    }else if(k==='pluck'||k==='bugbite'){
      if(resisted())add(-1,'Berry-stealing move resisted');
      if(first===true)prob(1,.75,'Berry-stealing move first turn out');
      else if(first==null)missing('first turn on field');
      prob(1,.5,'Berry-stealing move extra bonus');
    }else if(k==='knockoff'){
      if(fp>=30&&first===false)prob(1,P(76),'Knock Off later turn');
      else if(first==null)missing('first turn on field');
    }else if(k==='imprison'){
      if(first===false)prob(2,P(156),'Imprison later turn');
      else if(first==null)missing('first turn on field');
    }else if(k==='refresh'){
      if(fp<50)add(-1,'Refresh versus weakened foe');
    }else if(has('basicNoEffect')){
      // Attacks without a special Expert effect have no Expert modifier.
    }else{
      // Unrecognized effects are NOT asserted to have 0 Expert bonus.
      notes.push('Expert: effect of '+move.name+' not verified');
    }
    return {pmf,log,notes};
  }

  const EXPERT_FAMILIES={"assurance":0,"aromatherapy":1,"spiderweb":2,"sunnyday":3,"skillswap":4,"sludge":5,"crushclaw":5,"leafstorm":5,"mefirst":6,"signalbeam":5,"rockwrecker":5,"aurasphere":7,"sonicboom":5,"twister":5,"ominouswind":5,"firepunch":5,"extremespeed":5,"magiccoat":8,"headbutt":5,"safeguard":5,"healbell":1,"withdraw":9,"whirlwind":10,"acid":5,"nightshade":5,"shadowball":5,"hpflying":5,"magnetrise":11,"megakick":5,"heartswap":12,"aquajet":5,"guardswap":13,"blastburn":14,"swagger":15,"eruption":14,"secretpower":5,"stealthrock":16,"lastresort":17,"stoneedge":18,"icefang":5,"lockon":19,"eggbomb":5,"spacialrend":18,"swallow":5,"wildcharge":14,"tailglow":20,"shadowclaw":5,"powerswap":21,"punishment":22,"drillpeck":18,"encore":23,"seismictoss":5,"poisonpowder":24,"horndrill":25,"agility":26,"smellingsalts":27,"mudshot":28,"dragonpulse":7,"bide":29,"rockthrow":5,"tailwind":30,"scaryface":31,"triplekick":5,"featherdance":32,"milkdrink":33,"poisontail":18,"tripleaxel":5,"aquacutter":18,"reflect":34,"heatwave":5,"flatter":35,"magicalleaf":7,"frustration":5,"uturn":36,"judgement":5,"vitalthrow":7,"wingattack":5,"hurricane":5,"shadowpunch":7,"brine":37,"roaroftime":38,"moonlight":39,"peck":5,"leer":40,"zapcannon":5,"pursuit":41,"miracleeye":42,"rollingkick":5,"crosschop":18,"embargo":43,"thundershock":5,"spore":44,"triattack":5,"perishsong":5,"snore":45,"extrasensory":5,"haze":46,"dragonrush":5,"worryseed":47,"iciclespear":5,"powerwhip":18,"rocktomb":28,"dynamicpunch":5,"crushgrip":5,"metalsound":31,"psychoboost":5,"earthquake":5,"crunch":5,"attract":5,"bravebird":48,"chargebeam":5,"tickle":5,"vicegrip":5,"thief":5,"petaldance":5,"brickbreak":49,"focuspunch":50,"closecombat":48,"hydropump":5,"avalanche":5,"spikes":16,"slam":5,"razorleaf":18,"hpdark":5,"rest":51,"howl":52,"poisongas":53,"overheat":14,"swordsdance":52,"confusion":5,"hpfire":5,"smog":5,"submission":5,"pound":5,"pinmissile":5,"sacredfire":5,"bugbuzz":5,"fireblast":5,"lick":5,"spite":5,"psybeam":5,"lavaplume":5,"rockblast":5,"thunderpunch":5,"gust":5,"refresh":54,"gyroball":5,"bodyslam":5,"twineedle":5,"rocksmash":5,"stomp":5,"mistball":5,"razorwind":55,"seedflare":5,"hyperbeam":14,"falseswipe":5,"doomdesire":5,"wish":5,"bulkup":9,"disable":56,"dizzypunch":5,"hailball":5,"rockslide":5,"acupressure":57,"magnetbomb":7,"aurorabeam":7,"firespin":5,"leafblade":18,"ironhead":5,"beatup":5,"darkpulse":5,"doublehit":5,"mysticalfire":5,"poisonsting":5,"bulldoze":5,"shadowsneak":5,"shadowforce":58,"ember":5,"darkvoid":44,"reversal":59,"thrash":14,"poisonfang":5,"teeterdance":60,"furycutter":5,"bite":5,"recover":33,"trumpcard":61,"followme":5,"mindreader":19,"hypervoice":5,"gastroacid":62,"skyattack":14,"watergun":5,"furyattack":5,"gunkshot":5,"psychup":63,"memento":64,"growl":32,"aquaring":65,"irondefense":9,"flail":59,"seedbomb":5,"mirrorcoat":66,"amnesia":67,"swift":7,"hpground":5,"wrap":5,"sandstorm":5,"scald":5,"thunderbolt":5,"accelerock":5,"sing":44,"foresight":68,"thunder":5,"selfdestruct":64,"doubleteam":69,"whirlpool":5,"headsmash":14,"tackle":5,"pluck":70,"sheercold":71,"psychocut":18,"harden":9,"hpwater":5,"vacuumwave":5,"icywind":28,"morningsun":39,"faketears":31,"substitute":72,"toxicspikes":16,"gigaimpact":14,"waterpulse":5,"recycle":73,"charm":32,"metronome":5,"gigadrain":12,"dragonbreath":5,"sweetkiss":60,"mist":5,"slash":18,"needlearm":5,"attackorder":5,"conversion2":5,"fireball":5,"hammerarm":74,"doubleslap":5,"octazooka":5,"bonemerang":5,"batonpass":75,"aquatail":5,"glare":76,"bubblebeam":5,"flareblitz":14,"endure":77,"flashcannon":5,"shockwave":7,"hpelectric":5,"iceball":71,"aeroblast":5,"stockpile":67,"magmastorm":5,"present":5,"mudbomb":5,"quickattack":5,"lightscreen":78,"drainpunch":12,"defog":79,"jumpkick":5,"supersonic":60,"bonerush":5,"mimic":5,"frenzyplant":14,"lovelykiss":44,"volttackle":14,"bugbite":70,"knockoff":80,"mudslap":5,"healorder":33,"waterfall":5,"payback":81,"hppsychic":5,"sandtomb":5,"energyball":5,"detect":82,"dive":5,"focusenergy":5,"nastyplot":20,"hpfighting":5,"furyswipes":5,"dragonclaw":18,"lowkick":5,"ancientpower":5,"sketch":5,"tailwhip":40,"airslash":5,"fling":83,"solarbeam":5,"helpinghand":5,"sleeptalk":85,"grasswhistle":44,"nightslash":18,"leechseed":53,"zenheadbutt":5,"cottonspore":31,"hpice":5,"screech":40,"block":2,"rockball":5,"imprison":86,"crosspoison":18,"karatechop":18,"yawn":44,"payday":5,"drillrun":18,"suckerpunch":5,"constrict":5,"kinesis":87,"metalclaw":5,"odorsleuth":68,"counter":88,"mirrorshot":5,"painsplit":45,"dreameater":89,"wringout":90,"grudge":5,"revenge":81,"hijumpkick":5,"blizzard":71,"bubble":5,"minimize":69,"camouflage":5,"megahorn":18,"trickroom":91,"sludgebomb":5,"naturepower":5,"xscissor":18,"guillotine":25,"charge":5,"thunderfang":5,"facade":92,"lusterpurge":5,"roleplay":4,"woodhammer":14,"smokescreen":93,"captivate":94,"forcepalm":5,"bulletseed":5,"dragondance":95,"steelwing":5,"aircutter":18,"rockclimb":5,"flamewheel":5,"uproar":5,"roar":10,"bounce":5,"assist":5,"cut":5,"lunardance":33,"stringshot":31,"thunderwave":76,"powergem":5,"fakeout":96,"copycat":97,"slackoff":33,"synthesis":39,"silverwind":5,"blazekick":18,"doubleedge":14,"torment":5,"flamethrower":5,"crabhammer":18,"machpunch":5,"waterspout":98,"hail":99,"hydrocannon":14,"outrage":14,"astonish":5,"naturalgift":5,"sweetscent":100,"sharpen":52,"aerialace":7,"mirrormove":101,"meditate":52,"defendorder":67,"futuresight":5,"fly":102,"acidarmor":9,"discharge":5,"teleport":5,"cosmicpower":67,"rockpolish":26,"return":5,"takedown":48,"barrier":9,"boneclub":5,"ingrain":5,"leechlife":12,"clamp":5,"gravity":103,"rage":41,"psychic":5,"focusblast":5,"calmmind":67,"meteormash":5,"powdersnow":5,"iceshard":5,"flash":93,"growth":104,"dracometeor":14,"psychoshift":105,"hpghost":5,"stunspore":76,"vinewhip":5,"bulletpunch":5,"protect":82,"skyuppercut":5,"confuseray":60,"icebeam":5,"doublekick":5,"poisonjab":5,"faintattack":7,"muddywater":5,"sandattack":93,"endeavor":106,"hpgrass":5,"wakeupslap":107,"softboiled":33,"icepunch":5,"raindance":108,"superpower":14,"luckychant":109,"explosion":64,"chatter":5,"megapunch":5,"hyperfang":5,"irontail":5,"destinybond":110,"firefang":5,"absorb":12,"grassknot":5,"weatherball":5,"feint":111,"strength":5,"hprock":5,"hypnosis":44,"willowisp":5,"hiddenpower":5,"fissure":25,"roost":33,"surf":5,"earthpower":5,"curse":112,"sleeppowder":44,"waterball":5,"dig":5,"megadrain":12,"toxic":53,"dragonrage":5,"powertrick":113,"meanlook":2,"transform":5,"metalburst":29,"bellydrum":114,"superfang":115,"judgment":5,"feintattack":7,"smellingsalt":27};
  function expertScore(state,move,foe,eff,targetIndex){
    const k=nameKey(move.name),family=EXPERT_FAMILIES[k];
    if(family==null)return legacyExpertScore(state,move,foe,eff,targetIndex);
    const notes=[],log=[];let pmf=delta(0);
    const add=(n)=>{pmf=convolve(pmf,delta(n));if(n)log.push(move.name+' Expert: '+n);};
    const prob=(n,p)=>{pmf=convolve(pmf,chance(n,p));log.push(move.name+' Expert: '+n+' at '+(p*100).toFixed(2)+'%');};
    const dist=(entries)=>{const d=new Map();for(const [n,p]of entries)d.set(n,(d.get(n)||0)+p);pmf=convolve(pmf,d);log.push(move.name+' Expert: conditional branches');};
    const gate=(reach,fn)=>{const saved=pmf;pmf=delta(0);fn();const sub=pmf;pmf=saved;const d=new Map([[0,1-reach]]);for(const [n,p]of sub)d.set(n,(d.get(n)||0)+reach*p);pmf=convolve(pmf,d);};
    const missing=s=>notes.push('Expert: '+move.name+' needs '+s);
    const known=(v,label)=>{if(v==null)missing(label);return v;};
    const u=pct(state.hp,state.maxHp),h=pct(foe.hp,foe.maxHp),a=nameKey(state.ability),fa=nameKey(foe.ability);
    const st=s=>Number(state.stages?.[s]||0),ft=s=>Number(foe.stages?.[s]||0);
    const slow=known(foe.userSlower,'relative Speed');
    const last=foe.lastMoveCategory,previous=nameKey(foe.lastMoveName),first=state.firstTurnOut;
    const knows=(...names)=>(state.moves||[]).some(m=>names.includes(nameKey(m.name)));
    const restricted=[0,.25,.5].includes(eff),superEffective=eff===2||eff===4;
    const statusKey=nameKey(foe.status),selfStatus=nameKey(state.aiStatus);
    const asleep=/sleep|slp/.test(statusKey),toxic=/badly|tox/.test(statusKey);
    const stats=['atk','def','spa','spd','evasion'];
    const residual=m=>/badly|tox/.test(nameKey(m.aiStatus||m.status))||m.infatuated||m.cursed||m.seeded||m.yawning||m.perishSong;
    const copyGood=EXPERT_COPY_ENCOURAGED.has(previous);
    function accuracy(){if(st('accuracy')<=-5||ft('evasion')>=5)add(1);if(st('accuracy')<=-3||ft('evasion')>=3)prob(1,P(156));}
    function confusion(bonus){if(bonus)prob(1,.5);if(h<=70){prob(-1,.5);if(h<51)add(-1);if(h<31)add(-1);}}
    function recovery(weather){
      if(weather&&['Rain','Sandstorm','Hail'].includes(state.weather))add(-2);
      if(state.hp===state.maxHp){add(-3);return;}
      if(slow===false){add(-8);return;}if(slow==null)return;
      const p=foe.knowsSnatch===true?2301/4096:P(236);known(foe.knowsSnatch,'whether foe knows Snatch');
      if(u>69)dist([[-3,P(226)],[2,P(30)*p],[0,P(30)*(1-p)]]);else prob(2,p);
    }
    function offenseBoost(stat,mid){
      if(st(stat)>=3)prob(-1,P(156));
      if(state.hp===state.maxHp&&st(stat)<3)prob(2,.5);
      if(u>39&&u<71)prob(-2,mid);else if(u<40)add(-2);
    }
    function defenseBoost(stat){
      if(st(stat)>=3)prob(-1,P(156));
      if(state.hp===state.maxHp&&st(stat)<3)prob(2,.5);
      const reach=u>69?P(56):1;
      if(u<40)prob(-2,reach);
      else if(last==='Status'||last==='None')prob(-2,reach*P(196));
      else if(last===(stat==='def'?'Special':'Physical'))prob(-2,reach);
      else if(last==='Physical'||last==='Special')prob(-2,reach*2401/4096);
      else missing('opponent last move category');
    }
    function swap(which){
      const [x,y]=which,dx=ft(x)-st(x),dy=ft(y)-st(y);
      if(dx<0||dy<0||dx>0&&dy===1)return;
      const sum=Math.min(4,dx)+Math.min(4,dy);let reach=1;const out=[];
      for(const [threshold,points]of [[8,5],[6,4],[4,3],[2,2],[1,1]])if(sum>=threshold){out.push([points,reach*.5]);reach*=.5;}
      out.push([0,reach]);dist(out);
    }
    function counter(special){
      if(asleep||foe.confused||foe.infatuated){add(-1);return;}
      if(u<31)prob(-1,P(246));if(u<51)prob(-1,P(156));
      if(knows(special?'counter':'mirrorcoat')){prob(4,P(156));return;}
      if(foe.taunted===true)prob(1,P(156));else known(foe.taunted,'whether foe is Taunted');
      if(last==='Physical'||last==='Special'){if(last===(special?'Physical':'Special'))add(-1);else prob(1,P(156));return;}
      if(last==null){missing('opponent last move category');return;}
      const types=special?['Fire','Water','Grass','Electric','Psychic','Ice','Dragon','Dark']:['Normal','Fighting','Flying','Poison','Ground','Rock','Bug','Ghost','Steel'];
      if(!(foe.types||[]).some(t=>types.includes(t)))prob(4,4017/8192);
    }
    function invulnerable(shadow){
      if(!shadow){if(state.item==='Power Herb'){add(2);return;}if(foe.knowsProtect===true){add(-1);return;}known(foe.knowsProtect,'opponent Protect knowledge');}
      if(restricted){add(1);return;}
      if(shadow&&state.item==='Power Herb'){add(1);return;}
      if(toxic||foe.cursed||foe.seeded){prob(1,P(176));return;}
      if(state.weather==='Hail'&&state.types?.includes('Ice')||state.weather==='Sandstorm'&&state.types?.some(t=>['Rock','Ground','Steel'].includes(t))){prob(1,P(176));return;}
      if(slow===true||['lockon','mindreader'].includes(previous))return;
      if(slow===false)prob(1,P(176));
    }
    switch(family){
      case 0:if(restricted)add(-1);else if(slow===true)prob(1,a==='roughskin'?.5:.25);break;
      case 1:if(!status(state.aiStatus)&&known(state.partyStatused,'party status')===false)add(-5);break;
      case 2:if(toxic||foe.infatuated||foe.cursed||foe.perishSong)prob(1,.5);break;
      case 3:if(u<40)add(-1);else if(['Rain','Hail','Sandstorm'].includes(state.weather)||a==='flowergift'||a==='leafguard'&&status(state.aiStatus))add(1);break;
      case 4:if(EXPERT_DESIRABLE_ABILITIES.has(a))add(-1);else if(EXPERT_DESIRABLE_ABILITIES.has(fa))prob(2,P(206));else add(-1);break;
      case 5:break;
      case 6:
        if(slow===true)add(-2);
        else if(slow===false){
          if(known(state.outdamagesOpponent,'last-move damage comparison')===true)prob(1,P(224));
          if(last==='Status')prob(1,.75);
          else if(last!=null)gate(.5,()=>{add(1);prob(1,.75);});else missing('last move category');
        }break;
      case 7:accuracy();break;
      case 8:if(u<31)prob(-1,P(156));if(known(first,'first turn out')===true)prob(1,P(106));else if(first===false)prob(-1,P(226));break;
      case 9:defenseBoost('def');break;
      case 10:
        if(known(foe.turnsOut,'opponent turns out')>3){prob(2,.75);prob(2,.5);}
        else if(foe.stealthRockActive||foe.spikesLayers>0||foe.toxicSpikesLayers>0)prob(2,.5);
        else if(stats.some(s=>ft(s)>=3))prob(2,.5);else add(-3);break;
      case 11:if(u>=50){if(known(foe.knowsGroundMove,'opponent Ground move knowledge')===true)add(1);if(foe.types?.includes('Ground'))prob(1,.5);}break;
      case 12:if(restricted)prob(-3,P(206));break;
      case 13:swap(['def','spd']);break;
      case 14:if(!restricted&&['rockhead','magicguard'].includes(a))add(1);break;
      case 15:if(knows('psychup')){if(ft('atk')<=-3)add(state.firstTurn===true?5:3);else add(-5);}else confusion(true);break;
      case 16:gate(.5,()=>{add(1);if(knows('whirlwind','roar'))prob(1,.75);});break;
      case 17:if(restricted)add(-1);else if(known(state.usedAllOtherMoves,'Last Resort move history')===true)add(1);break;
      case 18:if(!restricted)prob(1,superEffective?.5:.25);break;
      case 19:prob(2,.5);break;
      case 20:offenseBoost('spa',P(216));break;
      case 21:swap(['atk','spa']);break;
      case 22:if(!restricted){const sum=stats.concat('spe','accuracy').reduce((n,s)=>n+Math.max(0,ft(s)),0);for(const [n,p]of [[7,4],[6,3],[5,2],[3,1]])if(sum>=n)prob(p,.5);}break;
      case 23:if(foe.disabled)prob(3,P(226));else if(slow===true)add(-2);else if(slow===false){if(known(foe.encoreUsefulLastMove,'Encore effect of last move')===true)prob(3,P(226));else if(foe.encoreUsefulLastMove===false)add(-2);}break;
      case 24:if(u<50||h<51)add(-1);break;
      case 25:prob(1,.25);break;
      case 26:if(slow===false)add(-3);else if(slow===true)prob(3,P(186));break;
      case 27:if(/par/.test(statusKey))add(1);break;
      case 28:if(restricted)break; // fall through to speed-drop routine
      case 31:if(slow===false)add(-3);else if(slow===true)prob(2,P(186));break;
      case 29:
        if(asleep||foe.infatuated||foe.confused||foe.knowsMetalBurstCounter){add(-1);break;}
        known(foe.knowsMetalBurstCounter,'opponent counter-effect move knowledge');
        if(u<31)prob(-1,P(246));if(u<51)prob(-1,P(156));prob(1,.25);
        if(foe.taunted){if(['Physical','Special'].includes(last))prob(1,P(156));prob(1,P(156));}else known(foe.taunted,'opponent Taunt');break;
      case 30:gate(.75,()=>{if(slow===false||u<31)add(-1);else if(slow===true)prob(1,u>75?1:.75);});break;
      case 32:if(ft('atk')!==0){add(-1);if(u<91)add(-1);}if(ft('atk')<=-3)prob(-2,P(206));if(h<71)add(-2);if(last==='Special')prob(-2,.5);else known(last,'last move category');break;
      case 33:recovery(false);break;
      case 34:case 78:if(u<50)add(-2);else{if(u>89)prob(1,.5);if(last===(family===34?'Physical':'Special'))prob(1,.75);else known(last,'last move category');}break;
      case 35:confusion(true);break;
      case 36:
        if(restricted){add(-1);break;}if(known(state.partyHasReserve,'AI reserves')!==true)break;
        if(known(state.hasSuperEffectiveMove,'super-effective move knowledge')===true)prob(-2,.75);
        if(known(state.benchOutdamagesUser,'reserve move damage comparison')===false){prob(-2,.75);break;}
        if(state.benchOutdamagesUser===true){if(u>70)prob(1,.75);prob(1,u>30?.5:.25);if(slow===false)add(1);else if(slow===true)prob(1,.5);}break;
      case 37:if(restricted)add(-1);else if(h<51){add(1);prob(1,.5);}break;
      case 38:if(restricted)add(-1);else if(a==='truant')prob(1,P(176));else if(slow===true&&u>59||slow===false&&u>40)add(-1);break;
      case 39:recovery(true);break;
      case 40:case 87:case 100:{const stat=family===40?'def':family===87?'spd':'evasion';if(u<70||ft(stat)<=-3)prob(-2,P(206));if(h<71)add(-2);break;}
      case 41:if(first===true||foe.types?.some(t=>['Ghost','Psychic'].includes(t)))prob(1,.5);else known(first,'first turn out');if(known(foe.knowsUTurn,'opponent U-turn knowledge')===true)prob(1,.5);break;
      case 42:case 68:if(family===42?foe.types?.includes('Dark'):state.types?.includes('Ghost'))prob(2,P(121));else if(ft('evasion')>=3)prob(2,P(176));else add(-2);break;
      case 43:prob(1,.5);break;
      case 44:if(knows('nightmare','dreameater'))prob(1,.5);break;
      case 45:if(h<80)add(-1);else if(slow===false)add(u>40?-1:1);else if(slow===true)add(u>60?-1:1);break;
      case 46:
        if(stats.some(s=>st(s)>=3||ft(s)<=-3))prob(-3,P(206));
        if(stats.some(s=>st(s)<=-3||ft(s)>=3))prob(3,P(50));else prob(-1,P(206));break;
      case 47:if(known(foe.knowsRest,'opponent Rest knowledge')===true)add(1);if(h>49)prob(1,.5);prob(1,.75);break;
      case 48:if(restricted||st('atk')<=-1||slow===true&&u>59||slow===false&&u>40)add(-1);break;
      case 49:if(foe.reflectActive||foe.lightScreenActive)add(1);break;
      case 50:if(restricted)add(-1);else if(state.substituteActive)add(5);else if(asleep)add(1);else if(foe.infatuated||foe.confused)prob(1,P(156));else if(first===true)prob(1,P(56));else known(first,'first turn out');break;
      case 51:{
        let reach=1;
        if(slow===false){if(state.hp===state.maxHp){add(-8);break;}if(u>50){add(-3);break;}if(u>39)reach=P(70);}
        else if(slow===true){if(u>70){add(-3);break;}if(u>59)reach=P(50);}else break;
        const p=foe.knowsSnatch===true?12669/16384:P(246);known(foe.knowsSnatch,'opponent Snatch knowledge');
        dist([[-3,1-reach],[3,reach*p],[0,reach*(1-p)]]);break;
      }
      case 52:offenseBoost('atk',P(216));break;
      case 53:if(state.moves.some(m=>m.category!=='Status')){if(u<51)prob(-3,P(206));if(h<51)prob(-3,P(206));}if(knows('protect','detect'))prob(2,P(196));break;
      case 54:if(h<50)add(-1);break;
      case 55:case 84:if(restricted)add(-2);else if(state.item==='Power Herb'||family===84&&state.weather==='Sun')add(2);else if(foe.knowsProtect)add(-2);else{known(foe.knowsProtect,'opponent Protect knowledge');if(u<39)add(-1);}break;
      case 56:if(slow===false){if(last==='None'||last==='Status')prob(-1,P(156));else if(last!=null)add(1);else missing('last move category');}break;
      case 57:if(u<51)add(-1);else prob(1,u>90?.75:P(96));break;
      case 58:invulnerable(true);break;
      case 59:if(slow===false){if(u>33)add(-1);else if(u<=20){if(u<8)add(1);prob(1,P(156));}}else if(slow===true){if(u>60)add(-1);else if(u<=40)prob(1,P(156));}break;
      case 60:confusion(false);break;
      case 61:{const pp=move.currentPP??state.trumpCardPP;if(pp==null){missing('Trump Card PP');break;}if(restricted){add(-1);break;}if(pp>=4){if(fa==='pressure')prob(1,P(226));accuracy();}else if(pp===1)add(3);else if(pp===2){add(1);prob(1,P(156));}else if(pp===3)prob(1,P(156));break;}
      case 62:gate(.75,()=>{add(1);if(h<71)prob(-1,.5);if(h<51)add(-1);if(h<31)add(-1);});break;
      case 63:if(stats.some(s=>ft(s)>=3)){if(['atk','def','spa','spd'].some(s=>st(s)<=0))add(1);else if(st('evasion')<=0)add(2);else prob(-2,P(206));}else add(-2);break;
      case 64:if(ft('evasion')>=1)add(-1);if(ft('evasion')>=3)prob(-1,.5);if(u<80||slow===true){if(u>50)prob(-1,P(206));else {prob(1,.5);if(u<31)prob(1,P(206));}}else if(slow===false)prob(-3,P(206));break;
      case 65:if(u>29)prob(1,.5);break;
      case 66:counter(true);break;
      case 67:defenseBoost('spd');break;
      case 69:
        if(u>89)prob(3,P(156));if(st('evasion')>=3)prob(-1,.5);
        if(toxic)prob(3,u>50?P(206):1133/2048);if(foe.seeded)prob(3,P(186));if(state.ingrainActive||state.aquaRingActive)prob(2,.5);if(foe.cursed)prob(3,P(186));
        if(u<=70&&st('evasion')!==0){if(u<40||h<40)add(-2);else prob(-2,P(186));}break;
      case 70:if(restricted)add(-1);else{if(first===true)prob(1,.75);else known(first,'first turn out');prob(1,.5);}break;
      case 71:if(restricted)prob(-3,P(206));else if(state.weather==='Hail')add(1);break;
      case 72:
        if(knows('focuspunch'))prob(1,P(160));for(const threshold of [91,71,51])if(u<threshold)prob(-1,P(156));
        if(slow===false){if(directStatus.has(previous)&&!status(foe.status)||['supersonic','confuseray','sweetkiss'].includes(previous)&&!foe.confused||previous==='leechseed'&&!foe.seeded)prob(1,P(156));}break;
      case 73:if(['chestoberry','lumberry','starfberry'].includes(nameKey(state.recyclableItem)))prob(1,P(206));else if(state.recyclableItem!=null)add(-2);else missing('recyclable item');break;
      case 74:if(restricted)add(-1);else if(slow===true)add(1);break;
      case 75:{const max=Math.max(...stats.map(st));if(max>=3){if(!(slow===false&&u>60||slow===true&&u>70)&&slow!=null)prob(2,P(176));}else if(max>=2){if(slow===false&&u>60||slow===true&&u>=70)add(-2);}else add(-2);break;}
      case 76:if(slow===true)prob(3,P(236));else if(slow===false&&u<71)add(-1);break;
      case 77:if(u<4||u>=35)add(-1);else prob(1,P(186));break;
      case 79:{const screens=foe.lightScreenActive||foe.reflectActive,hazards=foe.spikesLayers>0||foe.toxicSpikesLayers>0||foe.stealthRockActive;
        if(screens){if(u>30)add(1);if(state.partyHasReserve===false)break;}
        if(hazards){prob(-1,.5);if(!screens)add(-2);}if(u<70||ft('evasion')<=-3)prob(-2,P(206));if(h<71)add(-2);break;}
      case 80:if(h>=30&&first===false)prob(1,P(76));else if(h>=30)known(first,'first turn out');break;
      case 81:if(restricted)add(-1);else if(slow===true&&u>29)prob(1,.75);break;
      case 82:
        if(known(foe.knowsFeint,'opponent Feint/Shadow Force knowledge'))prob(-2,.5);
        if(Number(state.protectChain)>=2){add(-2);break;}
        if(residual(state)||foe.knowsRecovery){if(!state.lockedOn)add(-2);break;}
        if(residual(foe)||state.format==='Doubles'||state.lockedOn)add(2);else prob(2,P(85));prob(-1,.5);
        if(Number(state.protectChain)===1){add(-1);prob(-1,.5);}break;
      case 83:{
        if(restricted){if(!EXPERT_FLING_STATUS_ITEMS.has(nameKey(state.item)))add(-1);break;}
        const power=Number(state.flingPower);if(!Number.isFinite(power)){missing('Fling item power');break;}
        if(power===10)add(-2);
        else if([100,130].includes(power)){if(superEffective)add(4);else prob(1,.5);prob(1,.75);}
        else if([70,80,90].includes(power))prob(1,.75);else prob(-1,.5);break;
      }
      case 85:add(/slp|sleep/.test(selfStatus)?10:-5);break;
      case 86:if(first===false)prob(2,P(156));else known(first,'first turn out');break;
      case 88:counter(false);break;
      case 89:if(restricted)add(-1);else if(asleep)prob(3,P(205));break;
      case 90:if(restricted)add(-1);else {if(h<51)add(1);prob(1,.5);}break;
      case 91:if(state.format!=='Doubles'&&!(u<31&&state.partyHasReserve===false)){if(slow===true)prob(3,.75);else if(slow===false)add(-1);}break;
      case 92:if(/brn|burn|par|psn|poison|tox/.test(statusKey))add(1);break;
      case 93:
        if(u<70||h<71)prob(-1,P(156));if(st('accuracy')<=-2)prob(-2,P(176));if(toxic)prob(2,P(186));if(foe.seeded)prob(2,P(186));if(state.ingrainActive||state.aquaRingActive)prob(1,.5);if(foe.cursed)prob(2,P(186));
        if(u<=70&&ft('accuracy')!==0){if(u<40||h<40)add(-2);else prob(-2,P(186));}break;
      case 94:if(ft('spa')!==0)add(-1);if(u<91)add(-1);if(ft('spa')<=-3)prob(-2,P(206));if(h<71)add(-2);if(last==='Physical'||last==='None')prob(-1,.75);else known(last,'last move category');break;
      case 95:if(slow===true)prob(1,.5);else if(slow===false&&u<51)prob(-1,P(186));break;
      case 96:add(2);break;
      case 97:if(slow===false){if(known(state.outdamagesOpponent,'last-move damage comparison')===true)prob(2,P(224));else if(copyGood)prob(2,.5);else if(state.outdamagesOpponent===false)prob(-1,P(176));}break;
      case 98:if(restricted||slow===true&&h<=70||slow===false&&h<=50)add(-1);break;
      case 99:if(u<40)add(-1);else {if(['Rain','Sun','Sandstorm'].includes(state.weather))add(1);if(knows('blizzard'))add(2);if(a==='icebody')add(2);}break;
      case 101:if(slow===false&&copyGood)prob(2,.5);else if(!copyGood)prob(-1,P(176));break;
      case 102:invulnerable(false);break;
      case 103:if(foe.types?.includes('Flying')||fa==='levitate'||foe.magnetRise)prob(1,.75);else if(u>59)prob(1,P(96));break;
      case 104:offenseBoost('spa',P(186));break;
      case 105:if(!status(state.aiStatus))add(-10);else if(h>29)prob(1,.5);break;
      case 106:if(h<70||slow===false&&u>40||slow===true&&u>50)add(-1);else if(slow!=null)add(1);break;
      case 107:if(restricted)add(-1);else if(asleep)add(1);break;
      case 108:if(slow===true&&a==='swiftswim')add(1);else if(u<40)add(-1);else if(['Sun','Hail','Sandstorm'].includes(state.weather)||a==='raindish'||a==='hydration'&&status(state.aiStatus))add(1);break;
      case 109:if(u<70)add(-1);else if(known(foe.knowsHighCritMove,'opponent high-crit move knowledge')===true)add(1);else if(foe.knowsHighCritMove===false)prob(1,.25);break;
      case 110:if(slow===true||u>70)add(-1);else if(slow===false){prob(-1,.5);if(u<51)prob(1,.5);if(u<31)prob(2,P(156));}break;
      case 111:gate(foe.knowsProtect===false?.25:1,()=>{if(residual(state)||foe.hp!==foe.maxHp||['Leftovers','Black Sludge'].includes(foe.item))prob(1,.5);const chain=known(foe.protectChain,'opponent protection count');if(chain===0)prob(1,.5);else if(chain===1)prob(1,.25);else if(chain>=2)add(-2);});break;
      case 112:
        if(state.types?.includes('Ghost')){if(u<81)add(-1);break;}
        if(st('def')>=4)break;
        if(knows('trickroom','gyroball'))dist([[0,P(32)],[1,P(224)*.5],[2,P(224)*.5]]);else prob(1,.5);
        if(st('def')<2){prob(1,.5);if(st('def')<1)prob(1,.5);}break;
      case 113:if(u>90)prob(1,P(160));else if(u>60)prob(1,.5);else if(u>30)prob(1,P(92));else add(-2);break;
      case 114:if(u<90)add(-2);break;
      case 115:if(h<51)add(-1);break;
      default:notes.push('Expert family '+family+' unavailable');
    }
    // Speed is only an omission when a family actually tests it.
    const speedFamilies=new Set([0,6,26,28,30,31,33,36,38,39,45,48,51,56,58,59,66,72,74,75,76,81,88,91,95,97,98,101,102,106,108,110]);
    return {pmf,log,notes:notes.filter(n=>!n.endsWith('relative Speed')||speedFamilies.has(family))};
  }

  function isStatusMove(move){return move.category==='Status'||statusMoves.has(nameKey(move.name));}
  function riskyEligible(move){if(RULES[nameKey(move.name)])return RULES[nameKey(move.name)].risky;return sleepMoves.has(nameKey(move.name))||riskyMoves.has(nameKey(move.name))||(move.category!=='Status'&&move.highCrit===true);}
  function prioEligible(move){if(RULES[nameKey(move.name)])return RULES[nameKey(move.name)].prio;return isStatusMove(move)||noDamageCompare.has(nameKey(move.name));}
  function setupEligible(move){
    const k=nameKey(move.name);if(RULES[k])return RULES[k].setup;
    // Platinum Kaizo moveCurse.html explicitly lists NO Setup First Turn rule.
    if(k==='curse')return false;
    return boosting.has(k)||BASIC_SETS.lowering.has(k)||
      (isStatusMove(move)&&(sleepMoves.has(k)||directStatus.has(k)||BASIC_SETS.confusion.has(k)||BASIC_SETS.attraction.has(k)))||setupFlagExtra.has(k);
  }
  function harassmentEligible(move){
    const k=nameKey(move.name);if(RULES[k])return RULES[k].harass;
    // Only the status-lowering effect families in the Gen 4 routine count;
    // damaging attacks which happen to lower stats are not automatically eligible.
    const oneStageDrops=new Set(('Growl,Tail Whip,Leer,Sand-Attack,Smokescreen,Flash,Kinesis,Mud-Slap,Sweet Scent').split(',').map(nameKey));
    const twoStageDrops=new Set(('Charm,FeatherDance,Screech,Fake Tears,Metal Sound,Scary Face,Cotton Spore').split(',').map(nameKey));
    return harassMoves.has(k)||harassExtra.has(k)||oneStageDrops.has(k)||twoStageDrops.has(k)||
      (isStatusMove(move)&&(sleepMoves.has(k)||BASIC_SETS.poison.has(k)||
      BASIC_SETS.paralysis.has(k)||BASIC_SETS.burn.has(k)||
      BASIC_SETS.attraction.has(k)||BASIC_SETS.confusion.has(k)));
  }
  // Every successful Check HP -2 instruction TERMINATES the Check HP script.
  // Thus a first success prevents later checks from applying to the same move.
  function checkHpDistribution(state, move, foe){
    const rule=RULES[nameKey(move.name)];
    if(!rule)return 0;
    const values={user:pct(state.hp,state.maxHp),target:pct(foe.hp,foe.maxHp)};
    const n=rule.hp.filter(([who,tests])=>tests.every(([op,value])=>op==='under'?values[who]<value:values[who]>value)).length;
    return 1-Math.pow(1-P(206),n);
  }
  function allyScore(state,move,ally){
    const rule=RULES[nameKey(move.name)]||{},kind=rule.ally??0;
    const log=[],omissions=[];let pmf=delta(100);
    const add=(n)=>{pmf=convolve(pmf,delta(n));log.push('Partner: '+(n>0?'+':'')+n);};
    const prob=(n,p)=>{pmf=convolve(pmf,chance(n,p));log.push('Partner: '+n+' at '+(100*p).toFixed(2)+'%');};
    const a=nameKey(ally.ability),ua=nameKey(state.ability),types=ally.types||[],h=pct(ally.hp,ally.maxHp);
    const knows=(names)=>(ally.moves||[]).some(m=>names.includes(nameKey(m.name||m)));
    const once=()=>{
      function absorb(){if(ally.hp===ally.maxHp)add(-10);else if(h<=90)prob(3,h>75?.25:h>50?.5:.75);}
      switch(kind){
        case 1:
          if(['truant','slowstart'].includes(a))add(10);
          else if(ua==='levitate'&&a!=='levitate'&&types.includes('Electric'))add(types.length===1?2:-29);
          else if(['compoundeyes','noguard'].includes(ua)&&knows(['fireblast','thunder','crosschop','hydropump','dynamicpunch','blizzard','zapcannon','megahorn','focusblast','gunkshot','magmastorm','powerwhip','seedflare','headsmash']))add(3);
          else add(-30);break;
        case 2:if(a==='flashfire'&&ally.flashFireActivated!==true)add(3);else add(-30);break;
        case 3:if(['waterabsorb','dryskin'].includes(a))absorb();else add(-30);break;
        case 4:if(['lumberry','persimberry'].includes(nameKey(ally.item)))add(Number(ally.stages?.atk||0)>=2?0:3);else add(-30);break;
        case 5:case 10:
          if(kind===10&&types.includes('Ground'))add(-30);
          else if(a==='motordrive'&&Number(ally.stages?.spe||0)!==6)prob(3,P(96));
          else if(a==='voltabsorb')absorb();else add(-30);break;
        case 6:if(a==='poisonheal'&&!status(ally.status)&&h<92)add(5);else add(-30);break;
        case 7:{
          const boosts=['atk','def','spa','spd','spe','accuracy','evasion'].map(k=>Number(ally.stages?.[k]||0));
          if(a!=='simple'&&boosts.includes(6))add(-30);
          else if(a==='simple'&&boosts.some(v=>v>=3))add(-10);
          else if(h<51)add(-1);else if(h>90)prob(2,P(176));else prob(1,P(88));break;
        }
        case 8:if(ally.gastroAcid)add(-30);else if(['truant','slowstart'].includes(a))add(5);break;
        case 9:
          if(h===0)add(-30);
          else if(h>50||ally.movesBeforeBothFoes===true){
            // 1/4 reaches -1; after that fails, the independent 3/4 test reaches +2.
            pmf=convolve(pmf,new Map([[-1,.25],[2,.75*.75],[0,.75*.25]]));log.push('Partner Helping Hand: nested random tests');
          }else if(ally.movesBeforeBothFoes==null)omissions.push('Helping Hand needs partner speed versus both foes');break;
        case 11:
          if(a==='flashfire'&&ally.flashFireActivated!==true)add(3);
          else if(a==='guts'&&!status(ally.status)&&!types.includes('Fire')&&!['flameorb','toxicorb'].includes(nameKey(ally.item))&&h>80)add(5);
          else add(-30);break;
        default:add(-30);
      }
    };
    // Basic, Eval Att, Expert and the other flag entries terminate immediately on allies.
    // Check HP deliberately dispatches to the partner routine a second time.
    if(state.flags?.doubles)once();
    if(state.flags?.checkHP)once();
    return {pmf,log,omissions};
  }
  function doublesScore(state,move,foe,eff,targetIndex){
    const kind=RULES[nameKey(move.name)]?.double??(move.category==='Status'?1:0);
    const ally=state.ally||{ability:state.allyAbility,types:state.allyTypes,moves:state.allyMoves,hp:state.allyAlive===false?0:null,maxHp:null,magnetRise:state.allyMagnetRise};
    const opponents=state.targets.filter(t=>!t.isAlly);
    const other=state.targets.find((t,i)=>i!==targetIndex&&!t.isAlly)||{};
    const log=[],omissions=[];let pmf=delta(0);
    const add=(n,why)=>{pmf=convolve(pmf,delta(n));if(n)log.push('Doubles: '+why+': '+n);};
    const prob=(n,p,why)=>{pmf=convolve(pmf,chance(n,p));log.push('Doubles: '+why+': '+n+' at '+(p*100).toFixed(2)+'%');};
    const ua=nameKey(state.ability),aa=nameKey(ally.ability),oa=nameKey(other.ability),fa=nameKey(foe.ability);
    const knows=(mon,names)=>(mon.moves||[]).some(m=>names.includes(nameKey(m.name||m)));
    const h=Number.isFinite(ally.hp)&&ally.maxHp>0?pct(ally.hp,ally.maxHp):null;
    const u=pct(state.hp,state.maxHp),d=Number(move.damage?.[targetIndex]||0);
    const basicKinds=[0,5,6,7,8,9,10,11,18,21];
    if(basicKinds.includes(kind)||kind===4){
      if(kind!==4&&d<foe.hp&&(h!=null?h>0:state.allyAlive!==false)&&[.5,.25].includes(eff))prob(eff===.5?-1:-2,P(192),'resisted');
      const allyDamage=state.allyMoveDamages?.[targetIndex];
      if(!allyDamage&&ally.moves?.some(m=>m.category!=='Status'))omissions.push('Doubles damage ranking needs partner damage; compares user moves only');
      const max=Math.max(0,...state.moves.map(m=>Number(m.damage?.[targetIndex]||0)),...(allyDamage||[]));
      const best=d>=max; // Zero is still tied for highest in the script.
      const second=kind===4?0:eff===4?P(192):eff===2?P(156):0;
      const p=(best?.5:0)+(best?.5:1)*second;
      if(p)prob(1,p,'highest damage / effectiveness');
    }
    const redirection=(ability,electric)=>{
      // Opponent abilities require confirmed knowledge for this particular check.
      if(oa===ability&&other.abilityKnown===true)add(electric&&other.types?.includes('Ground')?-9:-1,'opposing redirection');
      else if(oa===ability&&other.abilityKnown==null)omissions.push('Redirection needs confirmed opponent partner ability');
      if(aa===ability)add(-10,'partner redirects attack');
    };
    switch(kind){
      case 0:if(knows(ally,['helpinghand']))add(1,'partner knows Helping Hand');break;
      case 2:
        for(const [mon,isUser]of [[state,true],[ally,false]]){
          const a=nameKey(mon.ability),hp=isUser?u:h,st=isUser?state.aiStatus:mon.status;
          if(a==='leafguard'&&!status(st)&&hp>29)add(2,'Sun / Leaf Guard');
          if(a==='flowergift')add(2,'Sun / Flower Gift');if(a==='dryskin')add(-2,'Sun / Dry Skin');
          if(a==='solarpower'){if(hp>49)add(1,'Sun / Solar Power');prob(-2,.5,'Solar Power risk');}
        }break;
      case 3:if(['truant','slowstart','stall','klutz'].includes(ua))add(5,'give away bad ability');else if(['shadowtag','purepower','hugepower','solidrock','filter','flowergift'].includes(fa))add(2,'copy useful ability');break;
      case 5:case 7:if(ua==='flashfire'&&state.flashFireActivated)add(1,'active Flash Fire');break;
      case 6:case 16:redirection('stormdrain',false);break;
      case 8:case 15:redirection('lightningrod',true);break;
      case 9:
        if(ally.types?.includes('Flying')||aa==='levitate'||ally.magnetRise)add(2,'Ground immune partner');
        else if(ally.types?.some(t=>['Fire','Electric','Poison','Rock'].includes(t)))add(-10,'Ground vulnerable partner');else add(-3,'Ground hits partner');break;
      case 10:
        if(ua==='flashfire'&&state.flashFireActivated)add(1,'active Flash Fire');
        add(aa==='dryskin'?-3:aa==='flashfire'?3:ally.types?.some(t=>['Grass','Steel','Ice','Bug'].includes(t))?-10:-3,'Lava Plume partner');break;
      case 11:
        if(knows(ally,['futuresight','doomdesire'])&&h!==0){
          if(state.userSlowerThanAlly===true)add(-3,'delayed move after partner');
          else if(state.speedTieWithAlly===true)prob(-3,.25,'partner speed tie');
          else if(state.userSlowerThanAlly==null)omissions.push('Future Sight needs speed comparison with partner');
        }break;
      case 12:
        if(h==null){omissions.push('Follow Me needs partner HP');break;}
        if(u<31)prob(-5,.75,'Follow Me low HP');
        else {const col=h>90?0:h>50?1:h>30?2:3;const row=u>90?0:u>50?1:2;prob([[-1,1,2,3],[-2,-1,1,2],[-2,-2,1,2]][row][col],.75,'Follow Me HP table');}break;
      case 13:
        if(ua==='sandveil'||state.types?.includes('Rock'))add(2,'Sandstorm helps user');
        if(aa==='sandveil'||ally.types?.includes('Rock'))add(2,'Sandstorm helps partner');break;
      case 14:{
        if(h===0||opponents.some(t=>pct(t.hp,t.maxHp)===0)){add(-30,'Trick Room fainted battler');break;}
        const us=opponents.map(t=>t.userSlower),as=opponents.map(t=>t.allySlower);
        if([...us,...as].some(v=>v==null)){omissions.push('Trick Room needs all four speed comparisons');break;}
        if([...us,...as].every(v=>v===false))add(-30,'both allies faster');
        else if([...us,...as].every(v=>v===true))prob(5,.75,'both allies slower');else add(-5,'mixed speed order');break;
      }
      case 17:
        if(['icebody','snowcloak'].includes(ua)||knows(state,['blizzard']))add(2,'Hail helps user');
        if(['icebody','snowcloak'].includes(aa)||knows(ally,['blizzard']))add(2,'Hail helps partner');break;
      case 18:add(['voltabsorb','motordrive'].includes(aa)?3:ally.types?.some(t=>['Water','Flying'].includes(t))?-10:ally.types?.includes('Ground')?3:-3,'Discharge partner');break;
      case 19:{
        if(state.gravity)break;
        const airborne=m=>m.types?.includes('Flying')||nameKey(m.ability)==='levitate'||m.magnetRise;
        if(airborne(state))add(-5,'Gravity grounds user');if(airborne(ally))add(-5,'Gravity grounds partner');
        for(const mon of [foe,other])if(mon.types?.includes('Flying')||mon.magnetRise||(nameKey(mon.ability)==='levitate'&&mon.abilityKnown===true))prob(3,.75,'Gravity grounds foe');break;
      }
      case 20:
        if(ua==='dryskin'||(ua==='hydration'&&status(state.aiStatus)))add(2,'Rain helps user');
        if(aa==='dryskin'||(aa==='hydration'&&status(ally.status)))add(2,'Rain helps partner');break;
      case 21:add(['dryskin','waterabsorb'].includes(aa)?3:ally.types?.some(t=>['Ground','Fire'].includes(t))?-10:-3,'Surf partner');break;
    }
    return {pmf,log,omissions};
  }

  function runScore(state, move, targetIndex) {
    const flags = state.flags || {};
    const targets = state.targets || [];
    const foe = targets[targetIndex] || {};
    if(foe.isAlly)return allyScore(state,move,foe);
    if(foe.speedTie&&foe.userSlower==null){
      const outcomes=[true,false].map(userSlower=>runScore({...state,targets:targets.map((t,i)=>i===targetIndex?{...t,userSlower,speedTie:false}:t)},move,targetIndex));
      const pmf=new Map();for(const out of outcomes)for(const [n,p]of out.pmf)pmf.set(n,(pmf.get(n)||0)+p/2);
      return {pmf,log:['Speed tie: 50/50 AI order estimate',...new Set(outcomes.flatMap(x=>x.log))],omissions:[...new Set(outcomes.flatMap(x=>x.omissions))]};
    }
    const k = nameKey(move.name);
    const atk = move.category !== 'Status' && !statusMoves.has(k);
    const eff = Number(move.effectiveness?.[targetIndex]);
    const damage = noDamageCompare.has(k) ? 0 : Number(move.damage?.[targetIndex]);
    const hp = Number(foe.hp||1);
    const selfpct = pct(state.hp, state.maxHp), foepct = pct(foe.hp,foe.maxHp);
    const stages = state.stages || {};
    const stage = key => Number(stages[key]||0);
    const log = [];
    const omissions = [];
    let pmf = delta(100);
    function add(n, why) { pmf = convolve(pmf,delta(n)); if(n)log.push(why+': '+(n>0?'+':'')+n); }
    function prob(n,p,why) { pmf=convolve(pmf,chance(n,p));log.push(why+': '+(n>0?'+':'')+n+' at '+(p*100).toFixed(2)+'%'); }
    function branch(options, why) {
      const dist = new Map();
      for(const [points,p] of options) dist.set(points,(dist.get(points)||0)+p);
      pmf=convolve(pmf,dist);log.push(why);
    }
    const isGhost = (state.types||[]).some(t=>String(t).toLowerCase()==='ghost');
    const simple = state.ability==='Simple';
    // Basic: one effect-based evaluation, never stack independent penalties
    // within the same flag (except explicit multi-step routines).
    if (flags.basic) {
      const base=basicScore(state,move,foe,eff,targetIndex);
      if(base.pmf){pmf=convolve(pmf,base.pmf);log.push('Basic: '+base.reason);}else if(base.score)add(base.score,'Basic: '+base.reason);
      omissions.push(...base.notes);
    }
    // EVALUATE ATTACK: Non-standard damage moves require dedicated routines.
    if(flags.evalAtt) {
      const kind=RULES[k]?.eval??(atk&&!noDamageCompare.has(k)?'attack':'status');
      const maxDamage=Math.max(0,...state.moves.filter(m=>m.category!=='Status'&&!noDamageCompare.has(nameKey(m.name))).map(m=>Number(m.damage?.[targetIndex]||0)));
      const ko=kind!=='status'&&kind!=='risky'&&Number.isFinite(damage)&&damage>=hp&&hp>0&&eff>0;
      if(ko){if(kind==='conditional')prob(4,P(85),'Eval Att: conditional KO');else add(kind==='priority'?6:4,'Eval Att: KO');}
      else if(kind!=='status'&&kind!=='risky'&&Number.isFinite(damage)&&damage<maxDamage)add(-1,'Eval Att: lower damage; terminate flag');
      else {
        if(kind==='risky')prob(-2,P(205),'Eval Att: risky effect');
        if(eff===4)prob(2,P(176),'Eval Att: 4x effectiveness');
      }
    }
    // EXPERT: Effect-specific scoring distributions, independent of Basic.
    if(flags.expert){
      const ex=expertScore(state,move,foe,eff,targetIndex);
      pmf=convolve(pmf,ex.pmf);
      log.push(...ex.log.map(x=>'Expert: '+x));
      omissions.push(...ex.notes);
    }
    if(flags.doubles && (state.format==='Doubles'||targets.length>1)){
      const ds=doublesScore(state,move,foe,eff,targetIndex);pmf=convolve(pmf,ds.pmf);
      log.push(...ds.log);omissions.push(...ds.omissions);
    }
    // Setup First Turn: only the *first turn of the whole battle*, not each switch-in.
    if(flags.setupFirstTurn){
      if(state.firstTurn===true && setupEligible(move))prob(2,P(176),'Setup First Turn');
      else if(state.firstTurn==null&&setupEligible(move))omissions.push('Setup First Turn needs the battle-turn value');
    }
    if(flags.risky && riskyEligible(move))prob(2,P(128),'Risky');
    // Prio Damage / Prioritize Extremes explicitly includes *every Status*
    // move and excluded-damage effects, not a short hard-coded move whitelist.
    if(flags.prioDamage && prioEligible(move))prob(2,P(156),'Prio Damage');
    if(flags.batonPass){
      // Platinum Kaizo exposes special Baton Pass routines even on Explosion;
      // ordinary damaging moves have no effect under this flag.
      const explosion=k==='explosion'||k==='selfdestruct';
      if((RULES[k]?.baton??(isStatusMove(move)||explosion?1:0))===0){/* no routine for this move */}
      else if(state.partyHasReserve===false){/* no bonus */}
      else if(state.partyHasReserve==null)omissions.push('Baton Pass needs AI reserves');
      else if(explosion||isStatusMove(move)){
        const hasBP=state.moves.some(m=>nameKey(m.name)==='batonpass');
        const setup=RULES[k]?.baton===2||['swordsdance','dragondance','calmmind','nastyplot','tailglow','aquaring'].includes(k);
        const pReach=hasBP||k==='batonpass'?1:1-((setup||['protect','detect'].includes(k))?P(81):P(79));
        if(state.firstTurn==null)omissions.push('Baton Pass needs first battle turn');
        let inner;
        if(setup){
          inner=delta(state.firstTurn===true?5:selfpct>=60?1:-10);
        }else if(k==='protect'||k==='detect'){
          const prev=nameKey(state.lastMoveName||state.previousMove||'');
          if(!prev)omissions.push('Baton Pass Protect/Detect requires previous AI move');
          inner=delta(['protect','detect'].includes(prev)?-2:2);
        }else if(k==='batonpass'){
          const atk=Number(state.stages?.atk||0),spa=Number(state.stages?.spa||0);
          const v=Math.max(atk,spa);
          inner=delta(state.firstTurn===true?-2:v>=3?3:v>=2?2:v>=1?1:0);
        }else{
          // Explicit Kaizo per-move pages for Curse, Hypnosis, Hail and Explosion
          // use this +8/+3 branch and a terminal HP fallback.
          const points=state.firstTurn===true?8:3;
          inner=new Map([[points,P(237)],[selfpct<60?-10:1,1-P(237)]]);
        }
        const adjusted=new Map([[0,1-pReach]]);
        for(const [score,probability] of inner)
          adjusted.set(score,(adjusted.get(score)||0)+pReach*probability);
        pmf=convolve(pmf,adjusted);
        log.push('Baton Pass: setup or pass-specific branch');
      }
    }
    if(flags.checkHP){
      const p=checkHpDistribution(state,move,foe);
      if(p)prob(-2,p,'Check HP: first successful check terminates');
    }
    if(flags.harassment && harassmentEligible(move))prob(2,P(128),'Harassment');
    if(flags.weather && ['hail','raindance','sunnyday','sandstorm'].includes(k)){
      // The generic Gen 4 summary says +5, but PK moveHail.html documents +1.
      // Only Hail is verified to that granularity; do not assert the others.
      const corresponding={hail:'Hail',raindance:'Rain',sunnyday:'Sun',sandstorm:'Sandstorm'}[k];
      if(state.firstTurn===true && state.weather!==corresponding){
        add(1,'Weather: first-turn weather setup (PK)');
      }else if(state.firstTurn==null)omissions.push('Weather flag needs the first battle turn');
    }
    return {pmf,log,omissions};
  }
  function targetOutcomes(pmfs) {
    // Joint distribution of winning move i and maximum score s for a single target.
    const outcomes = [];
    for(let i=0;i<pmfs.length;i++) {
      for(const [s, p] of pmfs[i]) {
        let coefficients=[1]; // polynomial in x; same-score move adds factor x
        for(let j=0;j<pmfs.length;j++)if(i!==j) {
          const less=[...pmfs[j]].filter(([n])=>n<s).reduce((a,[,v])=>a+v,0);
          const equal=pmfs[j].get(s)||0;
          const next=Array(coefficients.length+1).fill(0);
          coefficients.forEach((c,k)=>{next[k]+=c*less;next[k+1]+=c*equal;});
          coefficients=next;
        }
        const probability=p*coefficients.reduce((sum,c,k)=>sum+c/(k+1),0);
        if(probability>1e-14)outcomes.push({move:i,score:s,probability});
      }
    }
    return outcomes;
  }
  function calculate(state) {
    if(!Number.isFinite(state.hp)||!Number.isFinite(state.maxHp)||state.maxHp<=0||
       !(state.targets||[]).every(t=>Number.isFinite(t.hp)&&Number.isFinite(t.maxHp)&&t.maxHp>0))
      throw new Error('Current and maximum HP must be available for both the AI Pokémon and each opponent.');
    // Ignore empty move slots. A three-move Pokemon must not give its fourth,
    // unavailable slot a chance to win a random 100-point score tie.
    const playable=(state.moves||[]).map((m,i)=>({m,i})).filter(({m})=>
      m && m.name && !['(nomove)','nomove','none','loading','loading...','—','-'].includes(nameKey(m.name)));
    if(playable.length < (state.moves||[]).length){
      if(!playable.length) throw new Error('No usable move slots were supplied');
      const result=calculate({...state,moves:playable.map(({m})=>m)});
      const pos=new Map(playable.map(({i},j)=>[i,j]));
      const targetCount=result.choice[0].targets.length;
      return {...result,
        choice:state.moves.map((_,i)=>pos.has(i)?result.choice[pos.get(i)]:{total:0,targets:Array(targetCount).fill(0)}),
        explanations:result.explanations.map(ex=>state.moves.map((_,i)=>pos.has(i)?ex[pos.get(i)]:['Empty move slot'])),
      };
    }
    if(!state.targets.some(t=>!t.isAlly&&t.hp>0))throw new Error('Supply a living opponent');
    if(!state.moves.some(m=>m.usable!==false&&m.currentPP!==0))throw new Error('No selectable moves (Struggle/switch decision is outside this preview)');
    if(state.ally&&state.ally.hp>0&&!state.targets.some(t=>t.isAlly)&&(state.flags?.doubles||state.flags?.checkHP)){
      state={...state,targets:[...state.targets,{...state.ally,isAlly:true,name:state.ally.name||'AI partner'}]};
    }
    const targetCount=state.targets.length;
    if(![1,2,3].includes(targetCount))throw new Error('Supply up to two opponents and one AI partner');
    // Missing/ambiguous damage or type information is NOT interpreted as zero
    // or neutral effectiveness: that would fabricate a meaningful AI decision.
    for(const m of state.moves)for(let t=0;t<targetCount;t++){
      if(state.targets[t].isAlly||state.targets[t].hp<=0)continue;
      const k=nameKey(m.name),attacking=m.category!=='Status'&&!statusMoves.has(k);
      if(attacking&&m.category!=='Physical'&&m.category!=='Special')throw new Error('Move category unavailable for '+m.name);
      if(attacking&&(m.effectiveness?.[t]==null||!Number.isFinite(Number(m.effectiveness[t]))))throw new Error('Move effectiveness unavailable for '+m.name);
      if(attacking&&!noDamageCompare.has(k)&&(m.damage?.[t]==null||!Number.isFinite(Number(m.damage[t]))))throw new Error('AI damage unavailable for '+m.name+' vs target '+(t+1));
      if(k==='curse'&&(!Array.isArray(state.types)||!state.types.length))throw new Error('AI typing unavailable for Curse');
    }
    const perTarget=[];const explanations=[];const omissions=new Set();
    for(let t=0;t<targetCount;t++) {
      if(state.targets[t].hp<=0){perTarget[t]=[];explanations[t]=state.moves.map(()=>['Fainted target']);continue;}
      const target=state.targets[t];let scenarios=[{state,probability:1}];
      if(!target.isAlly&&target.abilityKnown!==true&&target.possibleAbilities?.length>1){
        scenarios=target.possibleAbilities.map(ability=>({state:{...state,targets:state.targets.map((x,i)=>i===t?{...x,ability}:x)},probability:1/target.possibleAbilities.length}));
      }
      for(let i=0;i<state.moves.length;i++){
        const options=state.moves[i].damageDistributions?.[t];if(!options?.length||target.isAlly)continue;
        if(scenarios.length*options.length>1024){omissions.add('AI damage mixture too large; later random damage uses its mean');continue;}
        scenarios=scenarios.flatMap(sc=>options.map(([damage,p])=>({probability:sc.probability*p,state:{...sc.state,moves:sc.state.moves.map((m,j)=>j===i?{...m,damage:m.damage.map((d,k)=>k===t?damage:d)}:m)}})));
        omissions.add('Random AI damage: one draw is reused across comparisons within each scenario (approximation)');
      }
      const combined=new Map();explanations[t]=state.moves.map(()=>[]);
      for(const scenario of scenarios){
        const computed=scenario.state.moves.map(move=>move.usable===false||move.currentPP===0?{pmf:delta(-10000),log:['Move cannot be selected'],omissions:[]}:runScore(scenario.state,move,t));
        computed.forEach((c,i)=>{c.omissions.forEach(x=>omissions.add(x));explanations[t][i].push(...c.log);});
        for(const o of targetOutcomes(computed.map(x=>x.pmf))){const score=target.isAlly&&o.score<100?-1:o.score,key=o.move+','+score;
          const entry=combined.get(key)||{move:o.move,score,probability:0};entry.probability+=o.probability*scenario.probability;combined.set(key,entry);}
      }
      explanations[t]=explanations[t].map(xs=>[...new Set(xs)]);perTarget[t]=[...combined.values()];
    }
    const choice=state.moves.map(()=>({total:0,targets:Array(targetCount).fill(0)}));
    for(let t=0;t<targetCount;t++)for(const outcome of perTarget[t]) {
      // First choose uniformly among moves tied on each target, then among tied targets.
      let coefficients=[1];
      for(let j=0;j<targetCount;j++)if(j!==t){
        const outcomes=perTarget[j];
        const less=outcomes.length?outcomes.filter(o=>o.score<outcome.score).reduce((a,b)=>a+b.probability,0):1;
        const equal=outcomes.filter(o=>o.score===outcome.score).reduce((a,b)=>a+b.probability,0);
        const next=Array(coefficients.length+1).fill(0);
        coefficients.forEach((v,k)=>{next[k]+=v*less;next[k+1]+=v*equal;});coefficients=next;
      }
      const p=outcome.probability*coefficients.reduce((a,v,k)=>a+v/(k+1),0);
      choice[outcome.move].total+=p;
      choice[outcome.move].targets[t]+=p;
    }
    return {choice,explanations,omissions:[...omissions],perTarget,targetNames:state.targets.map(t=>t.name||(t.isAlly?'AI partner':'Opponent')),targetIsAlly:state.targets.map(t=>!!t.isAlly),mode:state.format==='Doubles'||targetCount>1?'Doubles':'Singles'};
  }
  return {calculate, runScore, basicScore, expertScore, doublesScore, allyScore, checkHpDistribution, targetOutcomes, chance, convolve, pct, nameKey, rules:RULES};
});

/* Adapter for hzla's Dynamic Calc DOM (p1 = player, p2 = enemy).
 * Never silently invent battle inputs: use null for unavailable state.
 * Gen 4 type effectiveness is calculated from the move-type and species-type selectors.
 */
(function (root, factory) {
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  root.PKAICalcAdapter=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const TYPES=['Normal','Fire','Water','Electric','Grass','Ice','Fighting','Poison','Ground','Flying','Psychic','Bug','Rock','Ghost','Dragon','Dark','Steel'];
  const normalize=s=>String(s??'').trim();
  const typeName=s=>TYPES.find(t=>t.toLowerCase()===normalize(s).toLowerCase())||null;
  const number=s=>{const t=normalize(s).replace(/,/g,'');return /^[-+]?\d+(?:\.\d+)?$/.test(t)&&Number.isFinite(+t)?+t:null;};
  const val=e=>e&&('value' in e)?e.value:e?.textContent;
  const pick=(doc,selectors)=>{for(const s of selectors){const e=doc.querySelector(s);if(e)return e;}return null;};
  const select=(doc,selectors)=>{const e=pick(doc,selectors);return e?normalize(val(e)):null;};
  const numeric=(doc,selectors)=>{for(const s of selectors){const e=doc.querySelector(s);const n=number(val(e));if(n!==null)return n;}return null;};
  function sideId(side,index=1){const part=String(side);const sideCode=part.startsWith('R')?'p2':'p1';const slot=/^[RL](\d+)$/.exec(part);const n=slot?Number(slot[1]):index;return sideCode+(n===1?'':`-${n}`);}
  function fromSide(doc,side,index=1){
    const root=sideId(side,index), suffix=side+index;
    // In Dynamic Calc, .hp .total is the computed maximum HP stat, and
    // .hp-cntrl .max-hp is the displayed denominator next to Current HP.
    const max=numeric(doc,[`#${root} .hp-cntrl .max-hp`, `#${root} .max-hp`, `#${root} .hp .total`, `#maxHp${suffix}`,`#maxHP${suffix}`]);
    const cur=numeric(doc,[`#${root} .hp-cntrl .current-hp`, `#currentHp${suffix}`,`#currentHP${suffix}`]);
    const percent=numeric(doc,[`#${root} .hp-cntrl .percent-hp`,`#percentHp${suffix}`]);
    const hp=cur!==null?cur:percent!==null&&max!==null?Math.round(max*percent/100):null;
    return {hp:hp!==null&&max!==null&&hp>=0&&hp<=max?hp:null,maxHp:max!==null&&max>0?max:null,exact:cur!==null};
  }
  function readTypes(doc,side,index=1){
    const root=sideId(side,index),t=[];
    for(let i=1;i<=2;i++){
      const type=typeName(select(doc,[`#${root} select.type${i}`,`#${root} .type${i}`,`#type${i}${side}${index}`,`#type${i}${side}`]));
      if(type&&!t.includes(type))t.push(type);
    }
    return t;
  }
  function readAbility(doc,side,index=1){const root=sideId(side,index);return select(doc,[`#${root} select.ability`,`#${root} .ability select`,`#ability${side}${index}`,`#ability${side}`]);}
  function readStatus(doc,side,index=1){const root=sideId(side,index);return select(doc,[`#${root} select.status`,`#status${side}${index}`,`#status${side}`]);}
  function readItem(doc,side,index=1){const root=sideId(side,index);return select(doc,[`#${root} select.item`,`#item${side}${index}`,`#item${side}`]);}
  function readBoosts(doc,side,index=1){
    const root=sideId(side,index),stages={};
    const keys={atk:['at','atk'],def:['df','def'],spa:['sa','spa'],spd:['sd','spd'],spe:['sp','spe'],accuracy:['ac','accuracy'],evasion:['ev','evasion']};
    for(const [k,classes]of Object.entries(keys)){
      const sels=[];
      for(const c of classes)sels.push(`#${root} .${c} select`, `#${root} .${c} .boost`, `#${root} select.${c}`,`#${root} .${c}.boost`);
      sels.push(`#${k}Boost${side}${index}`,`#${k}Boost${side}`);
      const n=numeric(doc,sels);
      if(n!==null&&Number.isInteger(n)&&n>=-6&&n<=6)stages[k]=n;
    }
    return stages;
  }
  function readSpeed(doc,side,index=1){
    const root=sideId(side,index);
    return numeric(doc,[`#${root} .sp .total`,`#${root} .spe .total`,`#${root} .speed .total`,`#speed${side}${index}`]);
  }
  function readFormat(doc){
    const e=pick(doc,['input[name="format"]:checked','input[name="game-type"]:checked','select[name="format"]','#format','#game-type','#gameType']);
    const type=normalize(val(e)).toLowerCase();
    if(['single','singles','1v1'].includes(type))return 'Singles';
    if(['double','doubles','2v2'].includes(type))return 'Doubles';
    const dbl=doc.querySelector('input#doubles, input[name="doubles"]');
    if(dbl&&typeof dbl.checked==='boolean')return dbl.checked?'Doubles':'Singles';
    return null;
  }
  function readWeather(doc){const radio=doc.querySelector('input[name="weather"]:checked');
    const e=radio||doc.querySelector('#weather,select[name="weather"]');
    if(!e)return null;
    const x=normalize(val(e));const map={'':'None','Sun':'Sun','Sunshine':'Sun','Harsh Sunshine':'Sun','Rain':'Rain','Rain Dance':'Rain','Hail':'Hail','Sand':'Sandstorm','Sandstorm':'Sandstorm'};
    return Object.hasOwn(map,x)?map[x]:null;
  }
  function readTrickRoom(doc){const e=doc.querySelector('#trickRoom, #trick-room, #trickroom');return e&&typeof e.checked==='boolean'?e.checked:null;}
  function moveRow(doc,index,side='R'){
    const root=sideId(side),n=index+1;
    return pick(doc,[`#${root} .move${n}`,`#${root}info .move${n}`]);
  }
  // Physical/special tables used only when the calc doesn't expose its move metadata.
  // An unrecognized move is left unknown, not silently classed as Physical.
  const STATUS=new Set(('Acupressure,Aqua Ring,Barrier,Block,Camouflage,Captivate,Copycat,Cosmic Power,Cotton Spore,Guard Swap,Gravity,Healing Wish,Heart Swap,Lock On,Lunar Dance,Miracle Eye,Mud Sport,Power Swap,Power Trick,Psycho Shift,Stockpile,Swallow,Tickle,Water Sport,Acid Armor,Agility,Amnesia,Aqua Ring,Attract,Baton Pass,Belly Drum,Block,Bulk Up,Calm Mind,Charm,Confuse Ray,Cosmic Power,Curse,Defend Order,Defog,Destiny Bond,Detect,Disable,Double Team,Dragon Dance,Embargo,Encore,Endure,FeatherDance,Flash,Focus Energy,Follow Me,Glare,Growth,Hail,Harden,Haze,Heal Bell,Helping Hand,Howl,Hypnosis,Imprison,Ingrain,Iron Defense,Leech Seed,Light Screen,Lock-On,Lovely Kiss,Lucky Chant,Magic Coat,Magnet Rise,Mean Look,Memento,Metal Sound,Milk Drink,Minimize,Mist,Moonlight,Morning Sun,Nasty Plot,Nightmare,Odor Sleuth,Pain Split,Perish Song,Poison Gas,PoisonPowder,Protect,Psych Up,Rain Dance,Recover,Reflect,Refresh,Rest,Roar,Rock Polish,Role Play,Roost,Safeguard,Sand-Attack,Sandstorm,Scary Face,Screech,Sharpen,Sing,Skill Swap,Sleep Powder,Sleep Talk,Slack Off,Smokescreen,Softboiled,Spikes,Spite,Spore,Stealth Rock,String Shot,Stun Spore,Substitute,Sunny Day,Supersonic,Swagger,Sweet Kiss,Sweet Scent,Swords Dance,Synthesis,Tail Glow,Tail Whip,Tailwind,Taunt,Teeter Dance,Thunder Wave,Tickle,Torment,Toxic,Toxic Spikes,Trick,Trick Room,Will-O-Wisp,Wish,Withdraw,Worry Seed,Yawn').split(',').map(x=>x.toLowerCase().replace(/[^a-z0-9]/g,'')));
  const SPECIAL=new Set(('Air Cutter,Air Slash,Aura Sphere,Aurora Beam,Blizzard,Bubble,BubbleBeam,Bug Buzz,Charge Beam,Dark Pulse,Discharge,Draco Meteor,Dragon Pulse,DragonBreath,Earth Power,Energy Ball,Extrasensory,Fire Blast,Fire Spin,Flamethrower,Flash Cannon,Focus Blast,Giga Drain,Grass Knot,Heat Wave,Hidden Power,Hydro Cannon,Hydro Pump,Hyper Beam,Ice Beam,Icy Wind,Lava Plume,Leaf Storm,Magical Leaf,Muddy Water,Ominous Wind,Overheat,Psychic,Psybeam,Shadow Ball,Shock Wave,Signal Beam,Sludge Bomb,Sludge Wave,SolarBeam,Spacial Rend,Surf,Swift,Thunder,Thunderbolt,Tri Attack,Twister,Vacuum Wave,Water Pulse,Water Spout,Weather Ball,Whirlpool,Zap Cannon').split(',').map(x=>x.toLowerCase().replace(/[^a-z0-9]/g,'')));
  const PHYSICAL=new Set(('Last Resort,Spit Up,Metal Burst,Natural Gift,Fling,Aerial Ace,Aqua Jet,Aqua Tail,Avalanche,Bite,Body Slam,Brick Break,Bug Bite,Bullet Punch,Close Combat,Counter,Crunch,Dig,Double-Edge,Dragon Claw,Dragon Rush,Earthquake,Explosion,ExtremeSpeed,Facade,Fake Out,Fire Fang,Fire Punch,Flare Blitz,Focus Punch,Giga Impact,Head Smash,Ice Fang,Ice Punch,Ice Shard,Iron Head,Iron Tail,Knock Off,Low Kick,Mach Punch,Mega Kick,Megahorn,Metal Claw,Night Slash,Outrage,Payback,Pluck,Poison Jab,Pursuit,Quick Attack,Razor Leaf,Return,Reversal,Rock Slide,Rock Tomb,Shadow Claw,Shadow Sneak,Stone Edge,Struggle,Substitute,Sucker Punch,Superpower,Tackle,Take Down,Thunder Fang,ThunderPunch,Trick Room,U-turn,Volt Tackle,Waterfall,Wood Hammer,X-Scissor,Zen Headbutt,Double Hit,Double Kick,Bonemerang,Twineedle,DoubleSlap,Fury Swipes,Fury Attack,Bullet Seed,Rock Blast,Icicle Spear,Pin Missile,Bone Rush,Arm Thrust,Comet Punch,Barrage,Spike Cannon,Tail Slap,Triple Kick,Triple Axel').split(',').map(x=>x.toLowerCase().replace(/[^a-z0-9]/g,'')));
  // Platinum Kaizo AI damage comparisons evaluate exactly ONE hit of a multistrike move.
  // Fixed-count and 2–5-hit moves can be inferred from the normal damage display,
  // albeit only approximately if the calc reports a rounded TOTAL.
  const HIT_COUNTS={
    doublehit:[2,2],doublekick:[2,2],bonemerang:[2,2],twineedle:[2,2],
    doubleslap:[2,5],furyswipes:[2,5],furyattack:[2,5],bulletseed:[2,5],
    rockblast:[2,5],iciclespear:[2,5],pinmissile:[2,5],bonerush:[2,5],
    armthrust:[2,5],cometpunch:[2,5],barrage:[2,5],spikecannon:[2,5],
    tailslap:[2,5],
    triplekick:[3,3],tripleaxel:[3,3]
  };
  // Mirror the engine's Kaizo-only excluded damage names here so the DOM
  // reader never attempts to invert an ordinary displayed damage percentage.
  const AI_ZERO_DAMAGE_MOVES=new Set(('Guillotine,Horn Drill,Counter,Fissure,Bide,Super Fang,Flail,Reversal,Present,Mirror Coat,Endeavor,Metal Burst,Fling,Trump Card,Punishment,Selfdestruct,Explosion,Dream Eater,Razor Wind,SolarBeam,Focus Punch,Close Combat,Brave Bird,Water Spout,Take Down,Head Smash').split(',').map(x=>x.toLowerCase().replace(/[^a-z0-9]/g,'')));
  const NONUNIFORM_HITS=new Set(['triplekick','tripleaxel']);
  function readHitInfo(name,raw){
    const k=key(name), hits=raw?.multihit ?? raw?.multiHit ?? raw?.hits ?? HIT_COUNTS[k];
    if(!hits)return null;
    const arr=Array.isArray(hits)?hits:[hits,hits];
    if(arr.length<2||arr.some(n=>!Number.isInteger(Number(n))||Number(n)<2||Number(n)>10))return null;
    return {min:Number(arr[0]),max:Number(arr[1]),nonuniform:NONUNIFORM_HITS.has(k)};
  }
  const PRIORITY={'quickattack':1,'machpunch':1,'bulletpunch':1,'aquajet':1,'iceshard':1,'shadowsneak':1,'suckerpunch':1,'extremespeed':1,'fakeout':1,'vacuumwave':1,'feint':2,'protect':3,'detect':3,'endure':3,'helpinghand':5,'followme':3,'roar':-6,'whirlwind':-6,'trickroom':-7,'counter':-5,'mirrorcoat':-5,'metalburst':0};
  const key=x=>normalize(x).toLowerCase().replace(/[^a-z0-9]/g,'');
  function moveMetadata(doc,index,side='R',globals={}){
    const row=moveRow(doc,index,side), n=index+1;
    const name=select(doc,[`#${sideId(side)} .move${n} select.move-selector`,`#move${side}${n}`]) || normalize(doc.querySelector(`#resultMove${side}${n}`)?.nextElementSibling?.textContent).replace(/\s*\(AI:\s*~?\d+(?:\.\d+)?%\)/g,'');
    const moveType=typeName(row?.querySelector('select.move-type')?.value)||null;
    const bp=number(row?.querySelector('input.move-bp')?.value);
    const k=key(name), raw=(globals.moves||globals.MOVES||globals.moveData||{})[name]||(globals.moves||globals.MOVES||globals.moveData||{})[k];
    const dataCategory=['Physical','Special','Status'].includes(raw?.category)?raw.category:null;
    const category=dataCategory||(STATUS.has(k)?'Status':SPECIAL.has(k)?'Special':PHYSICAL.has(k)?'Physical':
      bp>0?'Physical':null);
    const categoryInferred= !dataCategory && !STATUS.has(k) && !SPECIAL.has(k) && !PHYSICAL.has(k) && bp>0;
    const pri=Number.isInteger(raw?.priority)?raw.priority:PRIORITY[k]??0;
    const specialStatus=category==='Status';
    return {name,category,type:moveType||typeName(raw?.type),basePower:bp,priority:pri,isCrit:!!row?.querySelector('input.move-crit:checked'),target:raw?.target||null,usable:row?.getAttribute?.('data-move-usable')!=='false',highCrit:raw?.highCrit===true||Number(raw?.critRatio||raw?.critStage||0)>1,currentPP:number(row?.querySelector('input.move-pp,input.move-pp-current,[data-current-pp]')?.value),hitInfo:readHitInfo(name,raw),source:dataCategory?'native':categoryInferred?'inferred power':category?'reference':'unknown',isStatus:specialStatus};
  }
  // Gen 4 type chart: attack -> [super effective, resisted, immune].
  const CHART={
    Normal:[[],['Rock','Steel'],['Ghost']],
    Fire:[['Grass','Ice','Bug','Steel'],['Fire','Water','Rock','Dragon'],[]],
    Water:[['Fire','Ground','Rock'],['Water','Grass','Dragon'],[]],
    Electric:[['Water','Flying'],['Electric','Grass','Dragon'],['Ground']],
    Grass:[['Water','Ground','Rock'],['Fire','Grass','Poison','Flying','Bug','Dragon','Steel'],[]],
    Ice:[['Grass','Ground','Flying','Dragon'],['Fire','Water','Ice','Steel'],[]],
    Fighting:[['Normal','Ice','Rock','Dark','Steel'],['Poison','Flying','Psychic','Bug'],['Ghost']],
    Poison:[['Grass'],['Poison','Ground','Rock','Ghost'],['Steel']],
    Ground:[['Fire','Electric','Poison','Rock','Steel'],['Grass','Bug'],['Flying']],
    Flying:[['Grass','Fighting','Bug'],['Electric','Rock','Steel'],[]],
    Psychic:[['Fighting','Poison'],['Psychic','Steel'],['Dark']],
    Bug:[['Grass','Psychic','Dark'],['Fire','Fighting','Poison','Flying','Ghost','Steel'],[]],
    Rock:[['Fire','Ice','Flying','Bug'],['Fighting','Ground','Steel'],[]],
    Ghost:[['Psychic','Ghost'],['Dark','Steel'],['Normal']],
    Dragon:[['Dragon'],['Steel'],[]],
    Dark:[['Psychic','Ghost'],['Fighting','Dark','Steel'],[]],
    Steel:[['Ice','Rock'],['Fire','Water','Electric','Steel'],[]]
  };
  function typeEffectiveness(moveType,targetTypes){
    const type=typeName(moveType);
    if(!type||!Array.isArray(targetTypes)||!targetTypes.length||targetTypes.some(t=>!typeName(t)))return null;
    let multi=1;const [se,res,immune]=CHART[type];
    for(const t of new Set(targetTypes.map(typeName))){if(immune.includes(t))return 0;if(se.includes(t))multi*=2;else if(res.includes(t))multi/=2;}
    return multi;
  }
  // Calculate integers consistent with the calculator's *truncated* displayed max
  // percent; retain every compatible HP integer rather than inventing precision.
  function parseDamageDetail(text,maxHp){
    if(!Number.isInteger(maxHp)||maxHp<=0)return {damage:null,reason:'Missing target maximum HP'};
    const stripped=normalize(text).replace(/\s*\(AI(?: est)?:\s*~?\d+(?:\.\d+)?%\)/ig,'');
    const match=stripped.match(/(\d+(?:\.\d+)?)\s*%?\s*[-–—]\s*(\d+(?:\.\d+)?)\s*%/);
    if(!match)return {damage:null,reason:'No damage range in result'};
    const pct=Number(match[2]),decimals=(match[2].split('.')[1]||'').length,epsilon=10**(-decimals);
    // Dynamic Calc floors the percentage to the displayed precision.
    // Invert that operation before correcting display-only damage modifiers.
    const lower=Math.max(0,Math.ceil(pct*maxHp/100-2));
    const upper=Math.floor((pct+epsilon)*maxHp/100+2);
    const possible=[];
    for(let d=lower;d<=upper;d++){
      if(Math.floor(100*d/maxHp*10**decimals+1e-9)/10**decimals===pct)possible.push(d);
    }
    if(possible.length===1)return {damage:possible[0],reason:'Unique HP damage consistent with rounded displayed percentage',percentage:pct,exactDisplay:true};
    if(!possible.length)return {damage:null,reason:'Displayed percentage is inconsistent with the calculator’s truncated decimal display; native integer damage required',percentage:pct};
    const min=possible[0],max=possible[possible.length-1];
    // The displayed percentage is genuinely insufficient to uniquely recover
    // HP damage. Show an estimate, never disguise it as exact cartridge damage.
    return {damage:null,estimatedDamage:Math.round((min+max)/2),reason:`Ambiguous rounded damage (${min}–${max} HP)`,percentage:pct,range:[min,max],approximate:true};
  }
  function parseDamage(text,maxHp){return parseDamageDetail(text,maxHp).damage;}
  // Values below are read from the *calculator*, never from an extension form.
  // A missing field stays null; false and zero are not interchangeable with missing.
  const FLAG_KEYS=['basic','evalAtt','expert','setupFirstTurn','risky','prioDamage','batonPass','doubles','checkHP','weather','harassment'];
  const flagSynonyms={
    basic:['basic'],evalAtt:['evalatt','evaluateatks','evaluateatk','evaluateattack','evaluateattacks','evalattack','evalatks'],expert:['expert'],
    doubles:['doubles','tagstrategy','tag','doublesai'],setupFirstTurn:['setupfirstturn','firstturnsetup','status','setup'],
    risky:['risky'],prioDamage:['priodamage','prioritizedamage','damageprio','prioritizeextremes','damage'],
    batonPass:['batonpass'],checkHP:['checkhp'],weather:['weather'],harassment:['harassment','harass','harrassment']
  };
  const flatKey=s=>String(s??'').toLowerCase().replace(/[^a-z0-9]/g,'');
  function decodeFlags(source){
    if(source==null)return null;
    if(typeof source==='object'&&!Array.isArray(source)){
      for(const key of ['flags','aiFlags','ai_flags','aiBits','ai_bits'])if(source[key]!=null)return decodeFlags(source[key]);
      const object={};let matched=0;
      for(const [key,value]of Object.entries(source)){
        const flag=FLAG_KEYS.find(k=>flagSynonyms[k].includes(flatKey(key)));
        if(flag && (typeof value==='boolean'||value===0||value===1)){
          object[flag]=!!value;matched++;
        }
      }
      // Incomplete objects must not silently set unspecified flags to false.
      return matched===FLAG_KEYS.length?object:null;
    }
    if(Array.isArray(source)){
      const found=source.map(flatKey);
      if(!found.length)return null;
      return Object.fromEntries(FLAG_KEYS.map(k=>[k,flagSynonyms[k].some(n=>found.includes(n))]));
    }
    const s=String(source).trim();
    if(/^(?:0x[0-9a-f]+|\d+)$/i.test(s)){
      const mask=Number(s);
      if(!Number.isSafeInteger(mask)||mask<0||mask>=2**FLAG_KEYS.length)return null;
      return Object.fromEntries(FLAG_KEYS.map((k,i)=>[k,!!(mask&(1<<i))]));
    }
    if(s.startsWith('[')||s.startsWith('{')){try{return decodeFlags(JSON.parse(s));}catch{return null;}}
    if(!/^[\w ,;|/-]+$/.test(s))return null;
    const keys=s.split(/[;,|/]+/).map(flatKey).filter(Boolean);
    // Only an *explicit complete flag list* is safe to interpret as a mask.
    if(!keys.length||keys.some(k=>!FLAG_KEYS.some(f=>flagSynonyms[f].includes(k))))return null;
    return Object.fromEntries(FLAG_KEYS.map(k=>[k,flagSynonyms[k].some(n=>keys.includes(n))]));
  }
  // Trainer flags are saved with trainer data, not inferred from a Pokémon's
  // moves or the flags commonly used by other trainers. In particular, an
  // unannotated set is NOT evidence for Basic/Expert/Eval Att being enabled.
  const TRAINER_FLAG_PROPERTIES=[
    'aiFlags','ai_flags','aiflags','aiMask','ai_mask','aiBits','ai_bits',
    'trainerAiFlags','trainer_ai_flags','trainerAI','trainerAi','aiFlagsMask',
    'ai','AI','aiValue','ai_value','aiFlagValue'
  ];
  function flagsOnObject(entry){
    if(!entry || typeof entry!=='object')return null;
    // Never decode an arbitrary number or an unrelated `.flags` property as
    // trainer flags: it might be a UI flags field or a Pokémon's IV mask.
    for(const key of TRAINER_FLAG_PROPERTIES){
      if(entry[key]==null)continue;
      const flags=decodeFlags(entry[key]);
      if(flags)return flags;
    }
    // A complete, explicitly named object is also permitted.
    if(FLAG_KEYS.every(k=>Object.keys(entry).some(n=>flagSynonyms[k].includes(flatKey(n)))))
      return decodeFlags(entry);
    return null;
  }
  // The Dynamic Calc renders trainer AI flags as SMALL, VISIBLE BADGES
  // under the selected enemy set. Older readers only searched for data-ai-flags
  // attributes (which the live calc need not expose). Recover the COMPLETE
  // displayed set, not merely the first badge, so absent flags mean false.
  function parseVisibleFlagLabels(labels){
    const cleaned=(labels||[]).map(flatKey).filter(Boolean);
    const recognized=cleaned.map(label=>FLAG_KEYS.find(f=>flagSynonyms[f].includes(label))||null);
    if(recognized.some(x=>x===null)||!recognized.length)return null;
    return Object.fromEntries(FLAG_KEYS.map(f=>[f,recognized.includes(f)]));
  }
  // Visible flag pills can be rendered *beside* the enemy fieldset, not
  // necessarily within #p2. Collect exact-label leaves and choose the
  // nearest cohesive group to the selected enemy. Do not mistake unrelated
  // explanatory text or our own flag-assumption controls for trainer flags.
  function readVisibleFlagBadges(doc){
    const enemy=doc.querySelector('#p2 .set-selector')||doc.querySelector('#p2');
    const panel=doc.querySelector('#p2')?.closest('.panel')||doc.querySelector('.panel-right');
    const roots=[doc.querySelector('#p2'),panel,doc.querySelector('.trainer-ai-flags'),
      doc.querySelector('#ai-flags-container'),doc.querySelector('#aiFlags'),doc.body]
      .filter(Boolean);
    const targetRect=enemy?.getBoundingClientRect?.();
    const unique=new Set();
    const candidates=[];
    for(const root of roots){
      for(const el of root.querySelectorAll('span,div,button,label,li,small,b,strong,a,p')){
        if(unique.has(el))continue;
        unique.add(el);
        if(el.closest?.('#pkai-context,.pkai-inline-odds,template,[hidden]'))continue;
        if(el.getAttribute?.('aria-hidden')==='true')continue;
        // A badge may wrap its text in a smaller element; accept only the leaf.
        const raw=String(el.textContent||'').trim();
        const label=flatKey(raw);
        const flag=FLAG_KEYS.find(f=>flagSynonyms[f].includes(label));
        if(!flag)continue;
        if([...el.children||[]].some(ch=>flatKey(ch.textContent)===label))continue;
        if(el.getClientRects?.().length===0 && el.ownerDocument?.defaultView?.getComputedStyle &&
           el.ownerDocument.defaultView.getComputedStyle(el).display==='none')continue;
        candidates.push({el,flag});
      }
      // Avoid scanning the entire 2,000-element calculator after locating a
      // complete group close to the enemy panel.
      if(new Set(candidates.map(x=>x.flag)).size>=2 && root!==doc.body)break;
    }
    if(!candidates.length)return null;
    const buckets=new Map();
    for(const {el,flag} of candidates){
      let parent=el.parentElement;
      for(let depth=0;parent&&depth<7;depth++,parent=parent.parentElement){
        if(parent.closest?.('#pkai-context'))break;
        if(String(parent.textContent||'').length>900)break;
        let flags=buckets.get(parent);
        if(!flags){flags=new Set();buckets.set(parent,flags);}
        flags.add(flag);
      }
    }
    let best=null;
    for(const [container,found] of buckets){
      if(found.size<2)continue;
      const text=String(container.textContent||'').trim();
      const rect=container.getBoundingClientRect?.();
      const distance=targetRect&&rect ?
        Math.abs((rect.top+rect.bottom)/2-(targetRect.top+targetRect.bottom)/2):0;
      const locationBonus=doc.querySelector('#p2')?.contains(container)?800:
        (panel?.contains(container)?400:0);
      // A row of short pills beats a whole form, even if both contain keywords.
      const merit=found.size*2000+locationBonus-Math.min(2000,distance*2)-text.length;
      if(!best||merit>best.merit)best={flags:found,merit,container};
    }
    if(!best)return null;
    return {flags:Object.fromEntries(FLAG_KEYS.map(k=>[k,best.flags.has(k)])),
      source:'visible trainer AI badges adjacent to enemy set'};
  }

  function readTrainerFlags(doc,globals={}){
    // What the player currently sees takes precedence over stale global sets.
    const badges=readVisibleFlagBadges(doc);
    if(badges)return badges;
    const explicit=[
      '#p2[data-ai-flags]','#p2[data-ai-mask]',
      '#p2 [data-ai-flags]','#p2 [data-ai-mask]',
      '#p2 [data-trainer-ai-flags]',
      '.trainer-pok-list .selected[data-ai-flags]',
      '.trainer-pok-list .selected[data-ai-mask]',
      '#ai-container [data-ai-flags]',
      '[data-current-trainer-ai-flags]',
      '#ai-flags','#trainer-ai-flags','#trainer-ai-mask'
    ];
    for(const selector of explicit){
      const e=doc.querySelector(selector);if(!e)continue;
      for(const attr of ['data-ai-flags','data-ai-mask','data-trainer-ai-flags','data-current-trainer-ai-flags']){
        const f=decodeFlags(e.getAttribute?.(attr));
        if(f)return {flags:f,source:'selected trainer DOM '+selector+' '+attr};
      }
      // Only these expressly flagged nodes may store the value as text.
      if(['#ai-flags','#trainer-ai-flags','#trainer-ai-mask'].includes(selector)){
        const f=decodeFlags(val(e));if(f)return {flags:f,source:'selected trainer DOM '+selector};
      }
    }
    const selector=doc.querySelector('#p2 .set-selector');
    const selection=String(selector?.value||'').trim();
    const selectedOption=selector?.selectedOptions?.[0] ||
      doc.querySelector('#p2 .set-selector option:checked');
    for(const [element,label] of [[selectedOption,'selected set option'],
      [doc.querySelector('.trainer-pok-list .selected'),'selected trainer Pokémon']]){
      if(!element)continue;
      for(const attr of ['data-ai-flags','data-ai-mask','data-trainer-ai-flags']){
        const f=decodeFlags(element.getAttribute?.(attr));
        if(f)return {flags:f,source:label+' '+attr};
      }
      const f=flagsOnObject(element.dataset);
      if(f)return {flags:f,source:label+' dataset'};
    }
    // A calc with a trainer-AI integration may already expose the currently
    // selected trainer object. Use that first because it is unambiguous.
    const currentStores=['currentTrainer','CURRENT_TRAINER','selectedTrainer',
      'currentTrainerData','currentTrainerInfo','selectedTrainerData',
      'activeTrainer','activeTrainerData','trainerAIState'];
    for(const key of currentStores){
      const f=flagsOnObject(globals[key]);
      if(f)return {flags:f,source:'calculator current trainer '+key};
    }
    // Look in currently loaded team/set data for an EXACT set match, rather
    // than using a similarly named trainer or a global default mask.
    const names=[selection,String(selectedOption?.textContent||'').trim()]
      .filter(Boolean).map(x=>flatKey(x));
    const selectedId=[selector?.dataset?.trainerId,
      selectedOption?.dataset?.trainerId,
      doc.querySelector('.trainer-pok-list .selected')?.dataset?.trainerId]
      .filter(Boolean).map(String);
    const dataStores=['customSets','CUSTOM_SETS','SETDEX','SETDEX_BW','SETDEX_SM',
      'setdex','TRAINERS','trainers','trainerData','trainerSets','gameData',
      'calcData','sourceData','CALC_DATA','pkData'];
    const exactKey=k=>names.includes(flatKey(k)) || selectedId.includes(String(k));
    for(const storeName of dataStores){
      const store=globals[storeName];
      if(!store||typeof store!=='object')continue;
      // A trainer record directly keyed by ID/name.
      for(const [k,v] of Object.entries(store)){
        if(exactKey(k)){
          const f=flagsOnObject(v);
          if(f)return {flags:f,source:`calculator ${storeName}[${k}]`};
        }
      }
      // Typical Showdown data: species -> named trainer set -> mon data.
      // Read only matching set names, never a randomly selected Pokémon set.
      let examined=0;
      for(const group of Object.values(store)){
        if(!group||typeof group!=='object')continue;
        if(++examined>10000)break;
        for(const [k,v] of Object.entries(group)){
          if(!exactKey(k))continue;
          let f=flagsOnObject(v);
          if(!f && typeof v==='object')f=flagsOnObject(v.trainer);
          if(f)return {flags:f,source:`calculator ${storeName} selected set ${k}`};
        }
      }
    }
    return {flags:null,source:null};
  }

  function readBoolean(doc,selectors){
    for(const selector of selectors){
      const e=doc.querySelector(selector);if(!e)continue;
      if(typeof e.checked==='boolean' && (e.type==='checkbox'||e.type==='radio'))return e.checked;
      const attr=e.getAttribute?.('data-active')??e.getAttribute?.('data-no-reserves')??null;
      const v=flatKey(attr??val(e));
      if(['true','yes','on','active','1'].includes(v))return true;
      if(['false','no','off','inactive','0'].includes(v))return false;
    }
    return null;
  }
  function readTurn(doc){
    const n=numeric(doc,['#battle-turn','#battleTurn','#turn-number','#turnNumber','input[name="turn"]','[data-current-turn]']);
    if(n!=null && Number.isInteger(n)&&n>=1)return n;
    const e=doc.querySelector('[data-current-turn]');const v=number(e?.getAttribute?.('data-current-turn'));
    return v!=null&&Number.isInteger(v)&&v>=1?v:null;
  }
  function readFieldState(doc){
    const perSide=(code)=>({
      reflect:readBoolean(doc,[`#reflect${code}`,`#${code==='R'?'p2':'p1'} .reflect`,`input[name="reflect${code}"]`]),
      lightScreen:readBoolean(doc,[`#lightScreen${code}`,`#light-screen${code}`,`#${code==='R'?'p2':'p1'} .light-screen`]),
      tailwind:readBoolean(doc,[`#tailwind${code}`,`#tailwind-${code}`,`#${code==='R'?'p2':'p1'} .tailwind`]),
      safeguard:readBoolean(doc,[`#safeguard${code}`,`#${code==='R'?'p2':'p1'} .safeguard`]),
      stealthRock:readBoolean(doc,[`#sr${code}`,`#stealthRock${code}`,`#stealth-rock${code}`,`#${code==='R'?'p2':'p1'} .stealth-rock`]),
      spikes:numeric(doc,[`input[name="spikes${code}"]:checked`,`#spikes${code}`,`#${code==='R'?'p2':'p1'} .spikes-layers`]),
      toxicSpikes:numeric(doc,[`#toxicSpikes${code}`,`#${code==='R'?'p2':'p1'} .toxic-spikes-layers`])
    });
    return {turn:readTurn(doc),trickRoom:readTrickRoom(doc),weather:readWeather(doc),own:perSide('R'),foe:perSide('L')};
  }
  function readHistory(doc,side,index=1){
    const suffix=side+index,root=sideId(side,index);
    const lastCategory=select(doc,[`#lastMoveCategory${suffix}`,`#${root} .last-move-category`,`#${root} [data-last-move-category]`]);
    const rawCategory=lastCategory||doc.querySelector(`#${root} [data-last-move-category]`)?.getAttribute?.('data-last-move-category');
    const category=['Physical','Special','Status','None'].includes(rawCategory)?rawCategory:null;
    const firstTurnOut=readBoolean(doc,[`#firstTurnOut${suffix}`,`#${root} [data-first-turn-out]`]);
    return {lastMoveCategory:category,firstTurnOut};
  }
  // When the calculator exposes integer damage in a tooltip/attribute,
  // use it. Do NOT reconstruct integer HP damage from a rounded percentage.
  function rawDamageFromText(s){
    const text=String(s??'').replace(/\s+/g,' ');
    const patterns=[
      /(?:damage\s*:?\s*)(\d+)\s*[-–—]\s*(\d+)(?![\d.])/i,
      /(\d+)\s*[-–—]\s*(\d+)\s*\(\s*\d+(?:\.\d+)?\s*%\s*[-–—]/i,
      /(?:max\s*damage\s*:?\s*)(\d+)\b/i
    ];
    for(let i=0;i<patterns.length;i++){
      const m=text.match(patterns[i]);if(!m)continue;
      const n=Number(i===2?m[1]:m[2]);
      if(Number.isSafeInteger(n)&&n>=0)return n;
    }
    return null;
  }
  function readNativeDamage(doc,i,maxHp){
    const e=doc.getElementById?.('resultDamageR'+(i+1));
    if(!e)return {damage:null,reason:'Missing resultDamageR'+(i+1)};
    for(const attr of ['data-ai-max-damage','data-max-damage','data-maxdamage','data-damage-max']){
      const n=number(e.getAttribute?.(attr));
      if(n!=null&&Number.isInteger(n)&&n>=0)return {damage:n,reason:'Calculator '+attr,exactDisplay:true};
    }
    for(const source of [e.getAttribute?.('title'),e.getAttribute?.('data-original-title'),
      e.getAttribute?.('data-damage-range'),e.getAttribute?.('aria-label')]){
      const raw=rawDamageFromText(source);
      if(raw!=null)return {damage:raw,reason:'Native integer damage in calculator tooltip',exactDisplay:true};
    }
    const str=Array.from(e.childNodes||[]).filter(n=>n.nodeType===3).map(n=>n.textContent).join('')||e.textContent||'';
    const raw=rawDamageFromText(str);
    if(raw!=null)return {damage:raw,reason:'Native integer damage in damage display',exactDisplay:true};
    return parseDamageDetail(str,maxHp);
  }
  // Return the AI's ONE-STRIKE damage proxy, not the entire hit-count total.
  // The underlying game applies integer rounding per strike, so deriving a
  // one-hit value from a total is necessarily approximate. Native AI/per-hit
  // data attributes take precedence over this fallback.
  function readAIDamage(doc,index,maxHp,hitInfo){
    const e=doc.getElementById?.('resultDamageR'+(index+1));
    if(e)for(const attr of ['data-ai-one-hit-damage','data-ai-single-hit-damage','data-single-hit-max-damage','data-ai-max-damage']){
      const n=number(e.getAttribute?.(attr));
      if(n!==null&&Number.isInteger(n)&&n>=0)
        return {damage:n,reason:'Native AI one-strike damage from '+attr,approximate:false,perHit:!!hitInfo};
    }
    const ordinary=readNativeDamage(doc,index,maxHp);
    // If the native calculator explicitly labels its result as per-hit, do not
    // divide it again.  Older calculator versions usually display TOTAL damage.
    const mode=e?.getAttribute?.('data-hit-damage-mode') || '';
    const text=e?.textContent||'';
    if(hitInfo && (/^per[- ]?hit$/i.test(mode)||/\bper[- ]hit\b/i.test(text))){
      return {...ordinary,damage:ordinary.damage??ordinary.estimatedDamage??null,
        approximate:!!ordinary.approximate,perHit:true,reason:'Calculator explicitly reports damage per hit'};
    }
    if(!hitInfo)return {...ordinary,approximate:!!ordinary.approximate,perHit:false};
    const total=ordinary.damage??ordinary.estimatedDamage;
    if(total===null||total===undefined)return {...ordinary,perHit:true};
    // Displayed max total corresponds to max hit count. For Triple Kick and
    // Triple Axel the three hits have different base powers, so equal
    // division is incorrect; use 1/(1+2+3) only as a flagged estimate.
    const divisor=hitInfo.nonuniform?6:hitInfo.max;
    const perHit=Math.max(0,Math.round(total/divisor));
    return {damage:perHit,perHit:true,approximate:true,total,hitCount:hitInfo,
      reason:`Estimated ONE hit from ${total} total damage ÷ ${divisor} (${hitInfo.min}–${hitInfo.max} hits; rounded display)`,
      range:ordinary.range};
  }
  // Compute *effective* Speed from the two visible stat tables, rather than
  // comparing unmodified `.totalMod` labels.  In particular, paralysis,
  // stat stages, held items, field Tailwind and weather abilities can reverse
  // the ordering.  Unknown effects must remain unknown, not a guessed 'No'.
  function effectiveSpeed(doc,side){
    const base=readSpeed(doc,side);
    const stage=readBoosts(doc,side).spe;
    const rawStatus=readStatus(doc,side);
    const ability=flatKey(readAbility(doc,side));
    let item=flatKey(readItem(doc,side));
    const root=sideId(side);
    const toggle=doc.querySelector(`#${root} .itemToggle`);
    if(toggle && !toggle.checked)item='';
    const weather=readWeather(doc);
    const tailwind=readBoolean(doc,[`#tailwind${side.charAt(0)}`]);
    if(base==null || !Number.isFinite(base) || stage==null || rawStatus==null || tailwind==null)
      return {value:null,reason:'Base Speed, stat boosts, status, or Tailwind missing'};
    if(!Number.isInteger(stage)||Math.abs(stage)>6)
      return {value:null,reason:'Speed stat stage invalid'};
    // These abilities have time-dependent activation not captured by the
    // normal stat sheet; requesting history is safer than inventing an order.
    if(['unburden','slowstart'].includes(ability))
      return {value:null,reason:ability+' activation needs battle history'};
    if(['swiftswim','chlorophyll'].includes(ability) && weather==null)
      return {value:null,reason:'Weather not exposed for Speed ability'};
    if(item==='quickpowder' || item==='metalpowder')
      return {value:null,reason:'Species-dependent item effect needs verification'};
    const boosted = Math.floor(base * (stage>=0?(2+stage)/2:2/(2-stage)));
    let result=boosted;
    const status=flatKey(rawStatus);
    const hasStatus=!['','healthy','none','nostatus','confused'].includes(status);
    if(status==='paralyzed' && ability!=='quickfeet')result=Math.floor(result/4);
    if(ability==='quickfeet' && hasStatus)result=Math.floor(result*1.5);
    if(ability==='swiftswim' && weather==='Rain')result*=2;
    if(ability==='chlorophyll' && weather==='Sun')result*=2;
    if(item==='choicescarf')result=Math.floor(result*1.5);
    if(['ironball','machobrace','powerweight','powerbracer','powerbelt',
        'powerlens','powerband','poweranklet'].includes(item))result=Math.floor(result/2);
    if(tailwind)result*=2;
    // Lagging Tail / Full Incense affect action order instead of Speed.  The
    // Expert script may test turn order, so don't misrepresent those as a
    // standard stat-only comparison.
    if(['laggingtail','fullincense'].includes(item))
      return {value:null,reason:'Item changes move order independently of Speed'};
    return {value:Math.max(1,result),reason:'Speed stat, stages, status, held item, ability, weather and Tailwind'};
  }
  function readAttackOrder(doc,side='R',target='L'){
    const ai=effectiveSpeed(doc,side),foe=effectiveSpeed(doc,target);
    if(ai.value==null||foe.value==null)
      return {userSlower:null,source:null,reason:[ai.reason,foe.reason].filter(Boolean).join('; ')};
    return {speedTie:ai.value===foe.value,userSlower:ai.value===foe.value?null:ai.value<foe.value,source:'effective Speed from calculator',
      aiSpeed:ai.value,foeSpeed:foe.value,reason:ai.value===foe.value?'Speed tie: action order is random':null};
  }
  // This is the effectiveness value tested by AI scripts. The damage routine
  // uses the same modifiers without the four-value STAB-normalization quirk.
  function aiEffectiveness(state,move,foe,forDamage=false){
    let type=state.ability==='Normalize'?'Normal':move.type;
    const types=(foe.types||[]).filter(t=>!(t==='Flying'&&(foe.roost)));
    let effect=typeEffectiveness(type,types.length?types:['Normal']);
    if(effect==null)return null;
    if(effect===0&&((state.ability==='Scrappy'||foe.foresight)&&['Normal','Fighting'].includes(type)&&types.includes('Ghost')))
      effect=typeEffectiveness(type,types.filter(t=>t!=='Ghost').length?types.filter(t=>t!=='Ghost'):['Normal']);
    if(effect===0&&foe.miracleEye&&type==='Psychic'&&types.includes('Dark'))effect=typeEffectiveness(type,types.filter(t=>t!=='Dark').length?types.filter(t=>t!=='Dark'):['Normal']);
    if(type==='Ground'&&(state.gravity||foe.ingrain||foe.item==='Iron Ball'))effect=typeEffectiveness(type,types.filter(t=>t!=='Flying').length?types.filter(t=>t!=='Flying'):['Normal']);
    if(type==='Ground'&&!state.gravity&&!foe.ingrain&&foe.item!=='Iron Ball'&&(foe.magnetRise||(foe.ability==='Levitate'&&state.ability!=='Mold Breaker'&&!foe.gastroAcid)))effect=0;
    const damaging=move.category!=='Status';
    if(damaging&&foe.ability==='Wonder Guard'&&state.ability!=='Mold Breaker'&&!foe.gastroAcid&&effect<=1)effect=0;
    let result=effect*((state.types||[]).includes(type)?state.ability==='Adaptability'?2:1.5:1);
    if(damaging){
      if(effect>1&&['Filter','Solid Rock'].includes(foe.ability)&&state.ability!=='Mold Breaker'&&!foe.gastroAcid)result*=.75;
      if(effect>1&&state.item==='Expert Belt')result*=1.2;
      if(effect>0&&effect<1&&state.ability==='Tinted Lens')result*=2;
    }
    if(!forDamage){const map=new Map([[.375,.25],[.75,.5],[3,2],[6,4]]);result=map.get(result)??result;}
    return result;
  }
  const RESIST_BERRIES={Normal:'Chilan Berry',Fire:'Occa Berry',Water:'Passho Berry',Electric:'Wacan Berry',Grass:'Rindo Berry',Ice:'Yache Berry',Fighting:'Chople Berry',Poison:'Kebia Berry',Ground:'Shuca Berry',Flying:'Coba Berry',Psychic:'Payapa Berry',Bug:'Tanga Berry',Rock:'Charti Berry',Ghost:'Kasib Berry',Dragon:'Haban Berry',Dark:'Colbur Berry',Steel:'Babiri Berry'};
  function approximateDamage(detail,state,move,foe){
    if(detail.exactAI||/^Native AI one-strike/.test(detail.reason||'')||/Kaizo excludes/.test(detail.reason||''))return detail;
    let d=detail.damage??detail.estimatedDamage;
    if(!Number.isFinite(d))return {...detail,damage:null};
    const corrections=[];let divisor=1,multiplier=1;
    const k=key(move.name),item=state.item,ability=state.ability;
    if(item==='Life Orb'){divisor*=1.3;corrections.push('remove Life Orb ×1.3');}
    if(item==='Metronome'){
      if(Number.isFinite(move.metronomeCount)){divisor*=1+Math.min(move.metronomeCount,10)*.1;corrections.push('remove Metronome boost');}
      else corrections.push('Metronome count unknown; assumes no consecutive-use boost');
    }
    if(move.isCrit){divisor*=ability==='Sniper'?3:2;corrections.push('remove critical-hit multiplier');}
    const effect=typeEffectiveness(move.type,foe.types);
    if(RESIST_BERRIES[move.type]===foe.item&&(effect>1||move.type==='Normal')){divisor*=.5;corrections.push('remove resistance Berry');}
    if(ability==='Reckless'&&['submission','doubleedge','flareblitz','volttackle','woodhammer','jumpkick','hijumpkick'].includes(k)){divisor*=1.2;corrections.push('remove Reckless boost');}
    if(k==='facade'&&/brn|par|psn|tox|burn|paraly|poison/i.test(state.aiStatus||'')){divisor*=2;corrections.push('remove Facade status boost');}
    if(k==='brine'&&foe.hp<=foe.maxHp/2){divisor*=2;corrections.push('remove Brine low-HP boost');}
    if(['wakeupslap','smellingsalt','smellingsalts'].includes(k)&&/slp|sleep|par|paraly/i.test(foe.status||'')){divisor*=2;corrections.push('remove status-conditioned power boost');}
    if(k==='return'&&Number(move.basePower)>0&&move.basePower!==102){multiplier*=102/move.basePower;corrections.push('AI Return uses 102 BP');}
    if(k==='weatherball'&&['Sun','Rain','Hail','Sandstorm'].includes(state.weather)){divisor*=2;corrections.push('Weather Ball weather BP ignored; type correction requires native calculator');}
    if(foe.protected)corrections.push('Protect display may conceal raw damage');
    const n=Math.max(0,Math.round(d*multiplier/divisor));
    const radius=(detail.range?Math.max(1,detail.range[1]-detail.range[0]):0)+(corrections.length?2*corrections.length:0);
    return {...detail,damage:n,estimatedDamage:n,approximate:true,range:[Math.max(0,n-radius),n+radius],
      reason:[detail.reason,'maximum displayed roll; AI ignores random damage variance',...corrections,'inverted display rounding may differ by a few HP'].filter(Boolean).join('; ')};
  }
  function possibleAbilities(globals,mon,native){
    const name=String(mon.name||native?.name||'').split(' (')[0];const data=globals.pokedex?.[name]||native?.species;
    const values=Object.values(data?.abilities||{}).flat().filter(x=>typeof x==='string');return [...new Set([...values,mon.ability].filter(x=>x&&!['none',''].includes(key(x))))];
  }
  function captureNative(doc,globals,side='L'){
    try{
      if(typeof globals.createPokemon!=='function'||!globals.$||!globals.calc?.calculate)return null;
      return globals.createPokemon(globals.$('#'+sideId(side)));
    }catch{return null;}
  }
  function nativeAIDamage(globals,state,move,foe,attacker,defender,field,index,powerOverride){
    try{
      if(!attacker?.clone||!defender?.clone||!globals.calc?.calculate||!field)return null;
      const a=attacker.clone(),d=defender.clone(),m=a.moves[index]?.clone?.();if(!m)return null;
      if(key(move.name)==='bulldoze'&&powerOverride==null){const outcomes=[[10,.05],[30,.1],[50,.2],[70,.3],[90,.2],[110,.1],[150,.05]].map(([bp,p])=>[nativeAIDamage(globals,state,move,foe,attacker,defender,field,index,bp)?.damage,p]);
        if(outcomes.every(([d])=>Number.isFinite(d)))return {damage:Math.round(outcomes.reduce((n,[d,p])=>n+d*p,0)),distribution:outcomes,approximate:true,reason:'Kaizo Bulldoze uses Magnitude power distribution; one shared draw per comparison scenario'};
      }
      if(AI_ZERO_DAMAGE_MOVES.has(key(move.name)))return {damage:0,approximate:false,exactAI:true,reason:'Kaizo damage-excluded move'};
      const k=key(move.name);
      if(['seismictoss','nightshade','dragonrage','sonicboom'].includes(k)){
        const immune=typeEffectiveness(move.type,foe.types)===0;
        return {damage:immune?0:k==='dragonrage'?40:k==='sonicboom'?20:a.level,exactAI:true,approximate:false,reason:'AI fixed damage with type-immunity check'};
      }
      if(k==='tripleaxel'||k==='psywave')return {damage:Math.floor(a.level),distribution:Array.from({length:11},(_,i)=>[Math.floor(a.level*(i+5)/10),1/11]),approximate:true,reason:'AI Psywave effect: marginalizes 11 level-based outcomes (50–150%); reuses one draw per comparison scenario'};
      m.isCrit=false;m.hits=1;m.timesUsed=1;m.timesUsedWithMetronome=0;
      if(['Life Orb','Metronome'].includes(a.item))a.item='';
      if(a.ability==='Reckless'&&m.recoil)a.ability='';
      if((m.type==='Water'&&['Water Absorb','Dry Skin'].includes(d.ability))||(m.type==='Fire'&&d.ability==='Flash Fire')||(m.type==='Electric'&&['Volt Absorb','Motor Drive'].includes(d.ability))||d.ability==='Soundproof')d.ability='';
      // These conditional power multipliers occur in battle but are absent from AI damage.
      if(['facade','brine','wakeupslap','smellingsalt','smellingsalts','stomp','rollout','iceball','furycutter'].includes(k)){
        m.name='PK AI base power';m.bp=Number(move.basePower)||m.bp;
      }
      if(k==='return'){m.name='PK AI Return';m.bp=102;}
      if(k==='bulldoze'){m.name='PK AI Magnitude';m.bp=powerOverride??70;}
      if(k==='weatherball'){m.name='PK AI Weather Ball';m.type='Normal';m.bp=Number(move.basePower)||50;}
      if(k==='futuresight'||k==='doomdesire')m.name='PK AI delayed attack';
      a.originalCurHP=state.hp;d.originalCurHP=foe.hp;
      const f=field.clone?.()||field;
      if(f.defenderSide){f.defenderSide.isProtected=false;f.defenderSide.isSwitching=false;}
      const result=globals.calc.calculate(globals.gen||4,a,d,m,f);
      const desc=result.rawDesc||result.desc||{};
      const base=desc.g4Phase2BaseDamage;
      if(Number.isFinite(base)){
        const effectiveness=aiEffectiveness(state,{...move,type:k==='weatherball'?'Normal':move.type},foe,true);
        if(effectiveness==null)return null;
        return {damage:effectiveness===0?0:Math.max(1,Math.floor(base*effectiveness)),approximate:true,exactAI:false,
          reason:'Native Gen 4 base damage × AI effectiveness; no crit, Life Orb, Metronome, resistance Berry, variance or extra strikes; calculator mechanics may differ from ROM'};
      }
      // Native engine can still provide one strike without lossy hit-total division.
      const values=Array.isArray(result.damage)?result.damage.flat(Infinity):[result.damage];
      const max=Math.max(...values.filter(Number.isFinite));if(!Number.isFinite(max))return null;
      return approximateDamage({damage:max,reason:'Native calculator single-strike maximum'}, {...state,item:a.item}, {...move,hitInfo:null,isCrit:false},foe);
    }catch{return null;}
  }

  function readBattle(doc,globals={}){
    const issues=[];const note=(field,detail)=>{issues.push({field,detail});};
    const format=readFormat(doc);
    if(!format)note('Format','No Singles/Doubles selector found');
    const ai=fromSide(doc,'R');const opponent=fromSide(doc,'L');
    const aiTypes=readTypes(doc,'R'),playerTypes=readTypes(doc,'L');
    const field=readFieldState(doc),history=readHistory(doc,'R');
    const trainer=readTrainerFlags(doc,globals);
    if(!trainer.flags)note('Trainer AI flags','No mask in selected trainer data or calculator DOM');
    if(ai.hp==null||ai.maxHp==null)note('AI HP','Current/maximum HP not found');
    if(opponent.hp==null||opponent.maxHp==null)note('Opponent HP','Current/maximum HP not found');
    if(!aiTypes.length||!playerTypes.length)note('Pokémon types','Types not found for both Pokémon');
    const doubles=format==='Doubles';
    const ally=doubles&&doc.querySelector('#p2-2')?{
      ...fromSide(doc,'R',2),types:readTypes(doc,'R',2),ability:readAbility(doc,'R',2),
      moves:Array.from({length:4},(_,i)=>moveMetadata(doc,i,'R2',globals))
    }:null;
    const second=doubles&&doc.querySelector('#p1-2')?{
      ...fromSide(doc,'L',2),types:readTypes(doc,'L',2),ability:readAbility(doc,'L',2),
      status:readStatus(doc,'L',2),item:readItem(doc,'L',2),level:numeric(doc,['#p1-2 .level','#levelL2']),gender:select(doc,['#p1-2 select.gender','#genderL2']),name:select(doc,['#p1-2 .set-selector','#p1-2 .species'])
    }:null;
    if(doubles && (!(second?.hp!=null&&second?.maxHp!=null&&second?.types?.length)||!ally?.types?.length))
      note('Doubles board','Calculator does not expose all four active Pokémon');
    const targets=[{...opponent,types:playerTypes,ability:readAbility(doc,'L'),
      status:readStatus(doc,'L'),item:readItem(doc,'L'),level:numeric(doc,['#p1 .level','#p1 input.level','#levelL1']),gender:select(doc,['#p1 select.gender','#genderL1']),stages:readBoosts(doc,'L'),name:select(doc,['#p1 .set-selector','#p1 .species'])||'Opponent A',
      lastMoveCategory:readHistory(doc,'L').lastMoveCategory,safeguard:field.foe.safeguard,reflectActive:field.foe.reflect,lightScreenActive:field.foe.lightScreen,stealthRockActive:field.foe.stealthRock,spikesLayers:field.foe.spikes,toxicSpikesLayers:field.foe.toxicSpikes,
      userSlower:readAttackOrder(doc,'R','L').userSlower}];
    if(doubles&&second)targets.push({...(second||{}),name:second?.name||'Opponent B',
      stages:readBoosts(doc,'L',2),lastMoveCategory:readHistory(doc,'L',2).lastMoveCategory,
      userSlower:readAttackOrder(doc,'R','L2').userSlower});
    const moves=Array.from({length:4},(_,i)=>{
      const meta=moveMetadata(doc,i,'R',globals);
      const move={...meta,damage:[],effectiveness:[],damageNotes:[]};
      if(!meta.name||['none','nomove','loading','loading...'].includes(flatKey(meta.name)))return {name:'(No Move)',category:'Status',type:null,damage:[],effectiveness:[],priority:0};
      for(let t=0;t<targets.length;t++){
        const target=targets[t];
        move.effectiveness[t]=meta.type&&target.types?.length?typeEffectiveness(meta.type,target.types):null;
        if(meta.category==='Status'){move.damage[t]=0;continue;}
        if(AI_ZERO_DAMAGE_MOVES.has(flatKey(meta.name))){
          move.damage[t]=0;
          move.damageNotes[t]={damage:0,approximate:false,
            reason:'Platinum Kaizo excludes this move from AI damage comparisons'};
          continue;
        }
        if(t===0){
          const d=readAIDamage(doc,i,target.maxHp,meta.hitInfo);
          move.damage[t]=d.damage??d.estimatedDamage??null;
          move.damageNotes[t]=d;
          if(d.damage===null || d.approximate)note(`${meta.name} damage`,d.reason);
        }else{
          // No second-target damage in the standard two-panel calculator.
          move.damage[t]=null;
          note(`${meta.name} vs opponent B`,'No separate calculator result for target B');
        }
      }
      if(!meta.category)note(meta.name,'Move category unavailable');
      if(!meta.type)note(meta.name,'Move type unavailable');
      return move;
    });
    const state={
      format:format||null,flags:trainer.flags,
      hp:ai.hp,maxHp:ai.maxHp,types:aiTypes,ability:readAbility(doc,'R'),item:readItem(doc,'R'),
      level:numeric(doc,['#p2 .level','#p2 input.level','#levelR1']),
      gender:select(doc,['#p2 select.gender','#genderR1']),
      aiStatus:readStatus(doc,'R'),stages:readBoosts(doc,'R'),
      firstTurn:field.turn==null?null:field.turn===1,firstTurnOut:history.firstTurnOut,
      weather:field.weather,trickRoom:field.trickRoom,gravity:readBoolean(doc,['#gravity']),
      stealthRockActive:field.foe.stealthRock,spikesLayers:field.foe.spikes,toxicSpikesLayers:field.foe.toxicSpikes,
      lightScreenActive:field.own.lightScreen,reflectActive:field.own.reflect,tailwindActive:field.own.tailwind,ownSafeguard:field.own.safeguard,
      allyAlive:ally?ally.hp!=null&&ally.hp>0:null,allyTypes:ally?.types||null,
      allyAbility:ally?.ability||null,allyMoves:ally?.moves||null,
      allyMagnetRise:doubles?readBoolean(doc,['#magnetRiseR2','#p2-2 .magnet-rise']):null,
      noTargetReserves:readBoolean(doc,['#noTargetReservesL','#p1 [data-no-reserves]']),
      partyHasReserve:readBoolean(doc,['#p2 [data-party-has-reserve]','#ai-party-has-reserve']),
      targets,moves
    };
    return {state,issues,source:trainer.source};
  }

  return {possibleAbilities,aiEffectiveness,approximateDamage,captureNative,nativeAIDamage,TYPES,fromSide,readTypes,readAbility,readStatus,readItem,readBoosts,readSpeed,readFormat,readWeather,readTrickRoom,moveMetadata,typeEffectiveness,parseDamage,parseDamageDetail,numeric:number,decodeFlags,parseVisibleFlagLabels,readVisibleFlagBadges,readTrainerFlags,rawDamageFromText,readBoolean,readFieldState,readHistory,readAttackOrder,effectiveSpeed,readNativeDamage,readAIDamage,readHitInfo,readBattle};
});

/* Optional battle context that a static damage calculator cannot always know.
 * Only expose controls if selected moves or enabled AI flags may use them.
 * Explicit unknown is different from false; no guesses are supplied.
 */
(function(root, factory) {
  const api=factory();
  if(typeof module==='object' && module.exports) module.exports=api;
  root.PKAIContext=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const norm=x=>String(x||'').toLowerCase().replace(/[^a-z0-9]/g,'');
  const matches=(moves,names)=>moves.some(m=>names.includes(norm(m.name)));
  const FLAG_NAMES={
    basic:'Basic',evalAtt:'Evaluate Attack',expert:'Expert',doubles:'Tag Strategy (Doubles)',
    setupFirstTurn:'Setup First Turn',risky:'Risky',prioDamage:'Prio Damage',
    batonPass:'Baton Pass',checkHP:'Check HP',weather:'Weather',harassment:'Harassment'
  };
  const FLAGS=Object.keys(FLAG_NAMES);
  const descriptors={
    firstTurn:{label:'This is turn 1 of the battle',detail:'Setup First Turn, Weather, and Baton Pass checks'},
    firstTurnOut:{label:'AI Pokémon is on its first turn out',detail:'Fake Out and Pluck checks'},
    trickRoom:{label:'Trick Room is active',detail:'Dragon Dance, Agility and Tailwind'},
    partyHasReserve:{label:'AI trainer has a reserve Pokémon',detail:'Explosion and Baton Pass'},
    noTargetReserves:{label:'Player has NO reserve Pokémon',detail:'Explosion and entry hazards'},
    stealthRockActive:{label:'Stealth Rock is already on the player’s side',detail:'Stealth Rock scoring'},
    reflectActive:{label:'Reflect is already on the AI side',detail:'Reflect scoring'},
    lightScreenActive:{label:'Light Screen is already on the AI side',detail:'Light Screen scoring'},
    tailwindActive:{label:'Tailwind is already active for the AI side',detail:'Tailwind scoring'},
    substituteActive:{label:'AI Pokémon already has a Substitute',detail:'Substitute scoring'},
    flashFireActivated:{label:'AI Pokémon’s Flash Fire is activated',detail:'Doubles Lava Plume synergy'},
    allyMagnetRise:{label:'AI partner has Magnet Rise active',detail:'Doubles Earthquake friendly-fire check'},
    allyAlive:{label:'AI partner is still active',detail:'Doubles move scoring'},
    spikesLayers:{label:'Spikes layers on player’s side',options:['0','1','2','3'],detail:'Spikes scoring'},
    toxicSpikesLayers:{label:'Toxic Spikes layers on player’s side',options:['0','1','2'],detail:'Toxic Spikes scoring'},
    weather:{label:'Current weather',options:['None','Sun','Rain','Sandstorm','Hail'],detail:'Weather-move scoring'},
    userSlower:{label:'AI Pokémon is slower than this opponent',detail:'Speed-dependent Expert scoring'},
    safeguard:{label:'Opponent is protected by Safeguard',detail:'Status-move prevention'},
    cursed:{label:'Opponent already has Ghost Curse'},
    confused:{label:'Opponent is confused'},
    infatuated:{label:'Opponent is infatuated'},
    seeded:{label:'Opponent is Leech Seeded'},
    trapped:{label:'Opponent is trapped'},
    encored:{label:'Opponent is under Encore'},
    disabled:{label:'Opponent is under Disable'},
    taunted:{label:'Opponent is Taunted'},
    knowsMetalBurstCounter:{label:'Opponent knows Avalanche, Revenge, Focus Punch or Vital Throw'},
    encoreUsefulLastMove:{label:'Opponent’s last move has an encouraged Encore effect'},
    counterCorrespondingType:{label:'Opponent type matches Counter/Mirror Coat type check'},
    lockOn:{label:'Opponent has Lock On'},
    nightmare:{label:'Opponent has Nightmare'},
    knowsSnatch:{label:'Opponent knows Snatch'},
    knowsProtect:{label:'Opponent knows Protect'},
    knowsFeint:{label:'Opponent knows Feint or Shadow Force'},
    knowsRecovery:{label:'Opponent knows recovery or Defense Curl'},
    turnsOut:{label:'Turns opponent has been on field',options:['0','1','2','3','4','5']},
    perishSong:{label:'Opponent is under Perish Song'},
    yawning:{label:'Opponent is affected by Yawn'},
    lastMoveCategory:{label:'Opponent’s previous move category',options:['None','Physical','Special','Status'],detail:'Expert scoring'},
    protectChain:{label:'AI consecutive Protect count',options:['0','1','2','3']},
    usedProtectLastTurn:{label:'AI used Protect last turn'},
    partyStatused:{label:'Any AI party Pokémon is statused'},
    lockedOn:{label:'Opponent locked on to AI Pokémon'},
    stockpileCount:{label:'AI Stockpile count',options:['0','1','2','3']},
    usedAllOtherMoves:{label:'All other moves were used (Last Resort)'},
    focusEnergyActive:{label:'AI has Focus Energy'},
    ingrainActive:{label:'AI has Ingrain'},
    aquaRingActive:{label:'AI has Aqua Ring'},
    magnetRiseActive:{label:'AI has Magnet Rise'},
    ownSafeguard:{label:'AI has Safeguard'},
    gravityActive:{label:'Gravity active'},
    futureSightPending:{label:'Future Sight is pending'},
    benchNeedsHealing:{label:'AI reserves need healing'},
    benchNeedsPP:{label:'AI reserves need PP restored'},
    gender:{label:'AI gender',options:['Male','Female','Genderless']},
    foeGender:{label:'Target gender',options:['Male','Female','Genderless']},
    benchOutdamagesUser:{label:'Reserve can deal more damage than current AI Pokémon'},
    outdamagesOpponent:{label:'AI Pokémon would outdamage target’s last move'},
    hasSuperEffectiveMove:{label:'AI knows another super-effective move'},
    recyclableItem:{label:'Item recoverable with Recycle',text:true},
    flingPower:{label:'Fling base power of AI held item',options:['10','30','40','50','60','70','80','90','100','130']},
    lastMoveName:{label:'Target’s last-used move',text:true},
    lastAIMoveName:{label:'AI Pokémon’s last-used move',text:true},
    knowsRest:{label:'Target knows Rest'},
    knowsUTurn:{label:'Target knows U-turn'},
    knowsGroundMove:{label:'Target knows Earthquake, Earth Power or Fissure'},
    trumpCardPP:{label:'Trump Card remaining PP',options:['1','2','3','4','5']},
    knowsDrain:{label:'Target knows draining move'},
    itemEncouraged:{label:'Target item has an encouraged Thief/Covet hold effect',detail:'Expert: Thief and Covet'},
    benchNeeded:{label:'AI reserve Pokémon needs healing'},
    abilityKnown:{label:'AI has confirmed this opponent’s ability'},
    knowsSleepTalkSnore:{label:'Opponent knows Sleep Talk or Snore'},
    knowsHighCritMove:{label:'Opponent knows a high critical-hit move'},
    foresight:{label:'Opponent identified by Foresight / Odor Sleuth'},
    gastroAcid:{label:'Opponent under Gastro Acid'},
    miracleEye:{label:'Opponent under Miracle Eye'},
    tormented:{label:'Opponent under Torment'},
    magnetRise:{label:'Opponent has Magnet Rise'},
    mistActive:{label:'AI side has Mist'},
    imprisonActive:{label:'Imprison active'},
    camouflageActive:{label:'AI has Camouflage'},
    powerTrickActive:{label:'AI has Power Trick'},
    luckyChantActive:{label:'AI side has Lucky Chant'},

  };
  const CONTEXT_NEEDS={"assurance":[],"aromatherapy":["state.firstTurn","state.partyHasReserve"],"spiderweb":["state.firstTurn","state.partyHasReserve","target.infatuated","target.cursed","target.perishSong"],"sunnyday":["state.firstTurn","state.partyHasReserve"],"skillswap":["state.firstTurn","state.partyHasReserve"],"sludge":[],"crushclaw":[],"leafstorm":[],"mefirst":["state.firstTurn","state.partyHasReserve","target.lastMoveName"],"signalbeam":[],"rockwrecker":[],"aurasphere":[],"sonicboom":[],"twister":["state.firstTurn"],"ominouswind":[],"firepunch":[],"extremespeed":[],"magiccoat":["state.firstTurn","state.firstTurnOut","state.partyHasReserve","state.ingrainActive"],"headbutt":[],"safeguard":["state.firstTurn","state.partyHasReserve"],"healbell":["state.firstTurn","state.partyHasReserve"],"withdraw":["state.firstTurn","state.partyHasReserve","target.lastMoveName"],"whirlwind":["state.firstTurn","state.partyHasReserve","state.noTargetReserves"],"acid":[],"nightshade":[],"shadowball":[],"hpflying":[],"magnetrise":["state.firstTurn","state.partyHasReserve"],"megakick":[],"heartswap":["target.abilityKnown"],"aquajet":["target.abilityKnown"],"guardswap":["state.firstTurn","state.partyHasReserve"],"blastburn":[],"swagger":["state.firstTurn","state.partyHasReserve","target.confused"],"eruption":[],"secretpower":[],"stealthrock":["state.firstTurn","state.partyHasReserve","state.noTargetReserves"],"lastresort":[],"stoneedge":[],"icefang":[],"lockon":["state.firstTurn","state.partyHasReserve"],"eggbomb":[],"spacialrend":[],"swallow":["state.firstTurn"],"wildcharge":["target.abilityKnown"],"tailglow":["state.firstTurn","state.partyHasReserve"],"shadowclaw":[],"powerswap":["state.firstTurn","state.partyHasReserve"],"punishment":["state.firstTurn","state.partyHasReserve"],"drillpeck":[],"encore":["state.firstTurn","state.partyHasReserve","target.lastMoveName"],"seismictoss":[],"poisonpowder":["state.firstTurn","state.partyHasReserve"],"horndrill":["state.firstTurn","state.partyHasReserve"],"agility":["state.firstTurn","state.partyHasReserve"],"smellingsalts":[],"mudshot":[],"dragonpulse":[],"bide":["state.firstTurn","state.partyHasReserve","target.confused","target.infatuated","target.taunted","target.knowsMetalBurstCounter","target.lastMoveName"],"rockthrow":[],"tailwind":["state.firstTurn","state.partyHasReserve"],"scaryface":["state.firstTurn","state.partyHasReserve","target.abilityKnown"],"triplekick":[],"featherdance":["state.firstTurn","state.partyHasReserve","target.lastMoveName"],"milkdrink":["state.firstTurn","state.partyHasReserve"],"poisontail":[],"tripleaxel":[],"aquacutter":[],"reflect":["state.firstTurn","state.partyHasReserve","target.lastMoveName"],"heatwave":[],"flatter":["state.firstTurn","state.partyHasReserve","target.confused"],"magicalleaf":[],"frustration":[],"uturn":["state.partyHasReserve"],"judgement":[],"vitalthrow":[],"wingattack":[],"hurricane":[],"shadowpunch":[],"brine":["target.abilityKnown"],"roaroftime":[],"moonlight":["state.firstTurn","state.partyHasReserve"],"peck":[],"leer":["state.firstTurn","state.partyHasReserve"],"zapcannon":["target.abilityKnown"],"pursuit":["state.firstTurnOut"],"miracleeye":["state.firstTurn","state.partyHasReserve","target.miracleEye"],"rollingkick":[],"crosschop":[],"embargo":["state.firstTurn","state.partyHasReserve"],"thundershock":["target.abilityKnown"],"spore":["state.firstTurn","state.partyHasReserve"],"triattack":[],"perishsong":["state.firstTurn","state.partyHasReserve","target.perishSong"],"snore":[],"extrasensory":[],"haze":["state.firstTurn","state.partyHasReserve"],"dragonrush":[],"worryseed":["state.firstTurn","state.partyHasReserve","target.knowsSleepTalkSnore"],"iciclespear":[],"powerwhip":[],"rocktomb":[],"dynamicpunch":[],"crushgrip":["state.firstTurn"],"metalsound":["state.firstTurn","state.partyHasReserve","target.abilityKnown"],"psychoboost":[],"earthquake":[],"crunch":[],"attract":["state.firstTurn","state.partyHasReserve","target.infatuated"],"bravebird":["state.firstTurn","state.partyHasReserve"],"chargebeam":["target.abilityKnown"],"tickle":["state.firstTurn","state.partyHasReserve"],"vicegrip":["state.firstTurn"],"thief":[],"petaldance":[],"brickbreak":[],"focuspunch":["state.firstTurn","state.firstTurnOut","state.partyHasReserve","state.substituteActive","target.confused","target.infatuated"],"closecombat":["state.firstTurn","state.partyHasReserve"],"hydropump":["target.abilityKnown"],"avalanche":[],"spikes":["state.firstTurn","state.partyHasReserve","state.noTargetReserves"],"slam":[],"razorleaf":[],"hpdark":[],"rest":["state.firstTurn","state.partyHasReserve"],"howl":["state.firstTurn","state.partyHasReserve"],"poisongas":["state.firstTurn","state.partyHasReserve"],"overheat":[],"swordsdance":["state.firstTurn","state.partyHasReserve"],"confusion":[],"hpfire":[],"smog":[],"submission":["state.firstTurn"],"pound":[],"pinmissile":[],"sacredfire":[],"bugbuzz":[],"fireblast":[],"lick":[],"spite":["state.firstTurn","state.partyHasReserve"],"psybeam":[],"lavaplume":[],"rockblast":[],"thunderpunch":["target.abilityKnown"],"gust":[],"refresh":["state.firstTurn","state.partyHasReserve"],"gyroball":[],"bodyslam":[],"twineedle":[],"rocksmash":[],"stomp":[],"mistball":[],"razorwind":["state.firstTurn","state.partyHasReserve"],"seedflare":["state.firstTurn"],"hyperbeam":[],"falseswipe":[],"doomdesire":[],"wish":["state.firstTurn","state.partyHasReserve"],"bulkup":["state.firstTurn","state.partyHasReserve","target.lastMoveName"],"disable":["state.firstTurn","state.partyHasReserve","target.lastMoveName"],"dizzypunch":[],"hailball":[],"rockslide":[],"acupressure":["state.firstTurn","state.partyHasReserve"],"magnetbomb":[],"aurorabeam":[],"firespin":["state.firstTurn"],"leafblade":[],"ironhead":[],"beatup":[],"darkpulse":[],"doublehit":[],"mysticalfire":[],"poisonsting":[],"bulldoze":[],"shadowsneak":[],"shadowforce":["target.cursed","target.seeded","target.lastMoveName"],"ember":[],"darkvoid":["state.firstTurn","state.partyHasReserve"],"reversal":["state.firstTurn","state.partyHasReserve"],"thrash":[],"poisonfang":[],"teeterdance":["state.firstTurn","state.partyHasReserve","target.confused"],"furycutter":[],"bite":[],"recover":["state.firstTurn","state.partyHasReserve"],"trumpcard":["state.firstTurn","state.partyHasReserve"],"followme":["state.firstTurn","state.partyHasReserve"],"mindreader":["state.firstTurn","state.partyHasReserve"],"hypervoice":[],"gastroacid":["state.firstTurn","state.partyHasReserve","target.gastroAcid"],"skyattack":[],"watergun":["target.abilityKnown"],"furyattack":[],"gunkshot":[],"psychup":["state.firstTurn","state.partyHasReserve"],"memento":["state.firstTurn","state.partyHasReserve","state.noTargetReserves"],"growl":["state.firstTurn","state.partyHasReserve","target.lastMoveName"],"aquaring":["state.firstTurn","state.partyHasReserve","state.aquaRingActive"],"irondefense":["state.firstTurn","state.partyHasReserve","target.lastMoveName"],"flail":["state.firstTurn","state.partyHasReserve"],"seedbomb":[],"mirrorcoat":["state.firstTurn","state.partyHasReserve","target.confused","target.infatuated","target.taunted","target.lastMoveName"],"amnesia":["state.firstTurn","state.partyHasReserve","target.lastMoveName"],"swift":[],"hpground":[],"wrap":["state.firstTurn"],"sandstorm":["state.firstTurn","state.partyHasReserve"],"scald":["target.abilityKnown"],"thunderbolt":["target.abilityKnown"],"accelerock":[],"sing":["state.firstTurn","state.partyHasReserve"],"foresight":["state.firstTurn","state.partyHasReserve","target.foresight"],"thunder":["target.abilityKnown"],"selfdestruct":["state.firstTurn","state.partyHasReserve","state.noTargetReserves"],"doubleteam":["state.firstTurn","state.partyHasReserve","state.ingrainActive","state.aquaRingActive","target.cursed","target.seeded"],"whirlpool":["state.firstTurn","target.abilityKnown"],"headsmash":["state.firstTurn","state.partyHasReserve"],"tackle":[],"pluck":["state.firstTurnOut"],"sheercold":[],"psychocut":[],"harden":["state.firstTurn","state.partyHasReserve","target.lastMoveName"],"hpwater":["target.abilityKnown"],"vacuumwave":[],"icywind":[],"morningsun":["state.firstTurn","state.partyHasReserve"],"faketears":["state.firstTurn","state.partyHasReserve","target.abilityKnown"],"substitute":["state.firstTurn","state.partyHasReserve","state.substituteActive","target.confused","target.seeded","target.lastMoveName"],"toxicspikes":["state.firstTurn","state.partyHasReserve","state.noTargetReserves"],"gigaimpact":[],"waterpulse":["target.abilityKnown"],"recycle":["state.firstTurn","state.partyHasReserve","state.recyclableItem"],"charm":["state.firstTurn","state.partyHasReserve","target.lastMoveName"],"metronome":["state.firstTurn","state.partyHasReserve"],"gigadrain":[],"dragonbreath":[],"sweetkiss":["state.firstTurn","state.partyHasReserve","target.confused"],"mist":["state.firstTurn","state.partyHasReserve","state.mistActive"],"slash":[],"needlearm":[],"attackorder":[],"conversion2":["state.firstTurn","state.partyHasReserve"],"fireball":[],"hammerarm":[],"doubleslap":[],"octazooka":["target.abilityKnown"],"bonemerang":[],"batonpass":["state.firstTurn","state.partyHasReserve"],"aquatail":["target.abilityKnown"],"glare":["state.firstTurn","state.partyHasReserve"],"bubblebeam":["target.abilityKnown"],"flareblitz":[],"endure":["state.firstTurn","state.partyHasReserve"],"flashcannon":[],"shockwave":["target.abilityKnown"],"hpelectric":["target.abilityKnown"],"iceball":[],"aeroblast":[],"stockpile":["state.firstTurn","state.partyHasReserve","target.lastMoveName"],"magmastorm":["state.firstTurn"],"present":["state.firstTurn","state.partyHasReserve"],"mudbomb":[],"quickattack":[],"lightscreen":["state.firstTurn","state.partyHasReserve","target.lastMoveName"],"drainpunch":[],"defog":["state.firstTurn","state.partyHasReserve","state.noTargetReserves"],"jumpkick":[],"supersonic":["state.firstTurn","state.partyHasReserve","target.confused"],"bonerush":[],"mimic":["state.firstTurn","state.partyHasReserve"],"frenzyplant":[],"lovelykiss":["state.firstTurn","state.partyHasReserve"],"volttackle":["target.abilityKnown"],"bugbite":["state.firstTurnOut"],"knockoff":["state.firstTurnOut"],"mudslap":[],"healorder":["state.firstTurn","state.partyHasReserve"],"waterfall":[],"payback":[],"hppsychic":[],"sandtomb":["state.firstTurn"],"energyball":[],"detect":["state.partyHasReserve","state.lockedOn","target.infatuated","target.cursed","target.seeded","target.perishSong","target.yawning"],"dive":["target.abilityKnown"],"focusenergy":["state.firstTurn","state.partyHasReserve","state.focusEnergyActive"],"nastyplot":["state.firstTurn","state.partyHasReserve"],"hpfighting":[],"furyswipes":[],"dragonclaw":[],"lowkick":[],"ancientpower":[],"sketch":["state.firstTurn","state.partyHasReserve"],"tailwhip":["state.firstTurn","state.partyHasReserve"],"airslash":[],"fling":["state.firstTurn","state.partyHasReserve"],"solarbeam":[],"helpinghand":["state.firstTurn","state.partyHasReserve"],"sleeptalk":["state.firstTurn","state.partyHasReserve"],"grasswhistle":["state.firstTurn","state.partyHasReserve"],"nightslash":[],"leechseed":["state.firstTurn","state.partyHasReserve","target.seeded"],"zenheadbutt":[],"cottonspore":["state.firstTurn","state.partyHasReserve","target.abilityKnown"],"hpice":[],"screech":["state.firstTurn","state.partyHasReserve"],"block":["state.firstTurn","state.partyHasReserve","target.infatuated","target.cursed","target.perishSong"],"rockball":[],"imprison":["state.firstTurn","state.firstTurnOut","state.partyHasReserve","state.imprisonActive","target.imprisonActive"],"crosspoison":[],"karatechop":[],"yawn":["state.firstTurn","state.partyHasReserve"],"payday":[],"drillrun":[],"suckerpunch":[],"constrict":[],"kinesis":["state.firstTurn","state.partyHasReserve"],"metalclaw":[],"odorsleuth":["state.firstTurn","state.partyHasReserve","target.foresight"],"counter":["state.firstTurn","state.partyHasReserve","target.confused","target.infatuated","target.taunted","target.lastMoveName"],"mirrorshot":[],"painsplit":["state.firstTurn","state.partyHasReserve"],"dreameater":["state.firstTurn","state.partyHasReserve"],"wringout":[],"grudge":["state.firstTurn","state.partyHasReserve"],"revenge":[],"hijumpkick":[],"blizzard":[],"bubble":["target.abilityKnown"],"minimize":["state.firstTurn","state.partyHasReserve","state.ingrainActive","state.aquaRingActive","target.cursed","target.seeded"],"camouflage":["state.firstTurn","state.partyHasReserve","state.camouflageActive"],"megahorn":[],"trickroom":["state.firstTurn","state.partyHasReserve"],"sludgebomb":[],"naturepower":["state.firstTurn","state.partyHasReserve"],"xscissor":[],"guillotine":["state.firstTurn","state.partyHasReserve"],"charge":["state.firstTurn","state.partyHasReserve"],"thunderfang":["target.abilityKnown"],"facade":[],"lusterpurge":[],"roleplay":["state.firstTurn","state.partyHasReserve"],"woodhammer":[],"smokescreen":["state.firstTurn","state.partyHasReserve","state.ingrainActive","state.aquaRingActive","target.cursed","target.seeded"],"captivate":["state.firstTurn","state.partyHasReserve","target.lastMoveName"],"forcepalm":[],"bulletseed":[],"dragondance":["state.firstTurn","state.partyHasReserve"],"steelwing":[],"aircutter":[],"rockclimb":[],"flamewheel":[],"uproar":[],"roar":["state.firstTurn","state.partyHasReserve","state.noTargetReserves"],"bounce":[],"assist":["state.firstTurn","state.partyHasReserve"],"cut":[],"lunardance":["state.firstTurn","state.partyHasReserve"],"stringshot":["state.firstTurn","state.partyHasReserve","target.abilityKnown"],"thunderwave":["state.firstTurn","state.partyHasReserve","target.abilityKnown"],"powergem":[],"fakeout":["state.firstTurnOut"],"copycat":["state.firstTurn","state.partyHasReserve","target.lastMoveName"],"slackoff":["state.firstTurn","state.partyHasReserve"],"synthesis":["state.firstTurn","state.partyHasReserve"],"silverwind":[],"blazekick":[],"doubleedge":[],"torment":["state.firstTurn","state.partyHasReserve","target.tormented"],"flamethrower":[],"crabhammer":[],"machpunch":[],"waterspout":["state.firstTurn","state.partyHasReserve","target.abilityKnown"],"hail":["state.firstTurn","state.partyHasReserve"],"hydrocannon":[],"outrage":[],"astonish":[],"naturalgift":[],"sweetscent":["state.firstTurn","state.partyHasReserve"],"sharpen":["state.firstTurn","state.partyHasReserve"],"aerialace":[],"mirrormove":["state.firstTurn","state.partyHasReserve","target.lastMoveName"],"meditate":["state.firstTurn","state.partyHasReserve"],"defendorder":["state.firstTurn","state.partyHasReserve","target.lastMoveName"],"futuresight":[],"fly":["target.cursed","target.seeded","target.lastMoveName"],"acidarmor":["state.firstTurn","state.partyHasReserve","target.lastMoveName"],"discharge":[],"teleport":["state.firstTurn","state.partyHasReserve"],"cosmicpower":["state.firstTurn","state.partyHasReserve","target.lastMoveName"],"rockpolish":["state.firstTurn","state.partyHasReserve"],"return":[],"takedown":["state.firstTurn","state.partyHasReserve"],"barrier":["state.firstTurn","state.partyHasReserve","target.lastMoveName"],"boneclub":[],"ingrain":["state.firstTurn","state.partyHasReserve","state.ingrainActive"],"leechlife":[],"clamp":["state.firstTurn","target.abilityKnown"],"gravity":["state.firstTurn","state.partyHasReserve","target.magnetRise"],"rage":["state.firstTurnOut"],"psychic":[],"focusblast":[],"calmmind":["state.firstTurn","state.partyHasReserve","target.lastMoveName"],"meteormash":[],"powdersnow":[],"iceshard":[],"flash":["state.firstTurn","state.partyHasReserve","state.ingrainActive","state.aquaRingActive","target.cursed","target.seeded"],"growth":["state.firstTurn","state.partyHasReserve"],"dracometeor":[],"psychoshift":["state.firstTurn","state.partyHasReserve"],"hpghost":[],"stunspore":["state.firstTurn","state.partyHasReserve"],"vinewhip":[],"bulletpunch":[],"protect":["state.partyHasReserve","state.lockedOn","target.infatuated","target.cursed","target.seeded","target.perishSong","target.yawning"],"skyuppercut":[],"confuseray":["state.firstTurn","state.partyHasReserve","target.confused"],"icebeam":[],"doublekick":[],"poisonjab":[],"faintattack":[],"muddywater":["target.abilityKnown"],"sandattack":["state.firstTurn","state.partyHasReserve","state.ingrainActive","state.aquaRingActive","target.cursed","target.seeded"],"endeavor":["state.firstTurn","state.partyHasReserve"],"hpgrass":[],"wakeupslap":[],"softboiled":["state.firstTurn","state.partyHasReserve"],"icepunch":[],"raindance":["state.firstTurn","state.partyHasReserve"],"superpower":[],"luckychant":["state.firstTurn","state.partyHasReserve","state.luckyChantActive"],"explosion":["state.firstTurn","state.partyHasReserve","state.noTargetReserves"],"chatter":[],"megapunch":[],"hyperfang":[],"irontail":[],"destinybond":["state.firstTurn","state.partyHasReserve"],"firefang":[],"absorb":[],"grassknot":[],"weatherball":[],"feint":[],"strength":[],"hprock":[],"hypnosis":["state.firstTurn","state.partyHasReserve"],"willowisp":["state.firstTurn","state.partyHasReserve"],"hiddenpower":[],"fissure":["state.firstTurn","state.partyHasReserve"],"roost":["state.firstTurn","state.partyHasReserve"],"surf":[],"earthpower":[],"curse":["state.firstTurn","state.partyHasReserve","target.cursed"],"sleeppowder":["state.firstTurn","state.partyHasReserve"],"waterball":["target.abilityKnown"],"dig":[],"megadrain":[],"toxic":["state.firstTurn","state.partyHasReserve"],"dragonrage":[],"powertrick":["state.firstTurn","state.partyHasReserve","state.powerTrickActive"],"meanlook":["state.firstTurn","state.partyHasReserve","target.infatuated","target.cursed","target.perishSong"],"transform":["state.firstTurn","state.partyHasReserve"],"metalburst":["state.firstTurn","state.partyHasReserve","target.confused","target.infatuated","target.taunted","target.knowsMetalBurstCounter","target.lastMoveName"],"bellydrum":["state.firstTurn","state.partyHasReserve"],"superfang":["state.firstTurn","state.partyHasReserve"]};
  function descriptorsFor(state) {
    const moves=(state.moves||[]).filter(m=>m?.name && norm(m.name)!=='nomove');
    const has=names=>matches(moves,names);
    const enabled=name=>state.flags==null || !!state.flags[name];
    const list=[];
    const push=(field,group='General',t=null)=>{
      const value=t===null?state[field]:state.targets?.[t]?.[field==='foeGender'?'gender':field];
      // Calculator state takes precedence over user-provided history overrides.
      if(value!==undefined && value!==null && value!=='')return;
      const def=descriptors[field];if(!def)return;
      list.push({id:t===null?'state.'+field:'target.'+t+'.'+field,field,group,targetIndex:t,...def});
    };
    if(enabled('setupFirstTurn')||enabled('batonPass')||enabled('weather'))push('firstTurn','Turn history');
    if(enabled('batonPass')&&has(['protect','detect']))push('lastAIMoveName','Turn history');
    if(enabled('batonPass')&&moves.some(m=>globalThis.PKAI?.rules?.[norm(m.name)]?.baton>0))push('partyHasReserve','Party information');
    if(enabled('setupFirstTurn')||enabled('batonPass')||enabled('weather')){
      if(has(['curse','dragondance','calmmind','swordsdance','nast yplot'.replace(' ',''),
        'agility','rockpolish','reflect','lightscreen','hail','explosion','selfdestruct',
        'bellydrum','growth','trickroom']))push('firstTurn','Turn history');
    }
    if(has(['pluck','bugbite','fakeout','focuspunch','rage','magiccoat']) || enabled('expert')&&has(['pursuit','knockoff','imprison']))push('firstTurnOut','Turn history');
    if(has(['dragondance','agility','rockpolish','tailwind']) && enabled('basic'))push('trickRoom','Field conditions');
    if(has(['explosion','selfdestruct','trickroom']) || enabled('batonPass') && has(['curse','dragondance','calmmind']))
      push('partyHasReserve','Party information');
    if(has(['explosion','selfdestruct','stealthrock','spikes','toxicspikes']))push('noTargetReserves','Party information');
    if(has(['stealthrock']))push('stealthRockActive','Field conditions');
    if(has(['spikes']))push('spikesLayers','Field conditions');
    if(has(['toxicspikes']))push('toxicSpikesLayers','Field conditions');
    if(has(['reflect']))push('reflectActive','Field conditions');
    if(has(['lightscreen']))push('lightScreenActive','Field conditions');
    if(has(['tailwind']))push('tailwindActive','Field conditions');
    if(has(['substitute']))push('substituteActive','Field conditions');
    if(enabled('expert')&&has(['protect','detect'])){
      push('protectChain','Turn history');push('usedProtectLastTurn','Turn history');push('lockedOn','Turn history');
    }
    if(enabled('expert')&&has(['healbell','aromatherapy']))push('partyStatused','Party information');

    if(has(['stockpile','swallow','spitup']))push('stockpileCount','Battle history');
    if(enabled('expert')&&has(['uturn','healingwish','lunardance'])){push('benchOutdamagesUser','Party information');push('hasSuperEffectiveMove','Party information');}
    if(enabled('expert')&&has(['mefirst','copycat']))push('outdamagesOpponent','Battle history');
    if(enabled('expert')&&has(['recycle']))push('recyclableItem','Items');
    if(enabled('expert')&&has(['fling']))push('flingPower','Items');
    if(enabled('expert')&&has(['trumpcard']))push('trumpCardPP','Move history');
    if(has(['lastresort']))push('usedAllOtherMoves','Battle history');
    if(has(['focusenergy']))push('focusEnergyActive','AI effects');
    if(has(['ingrain']))push('ingrainActive','AI effects');
    if(has(['aquaring']))push('aquaRingActive','AI effects');
    if(has(['magnetrise']))push('magnetRiseActive','AI effects');
    if(has(['safeguard']))push('ownSafeguard','AI effects');
    if(has(['gravity']))push('gravityActive','Field conditions');
    if(has(['futuresight','doomdesire']))push('futureSightPending','Field conditions');
    if(has(['healingwish','lunardance'])){push('partyHasReserve','Party information');push('benchNeedsHealing','Party information');}
    if(has(['lunardance']))push('benchNeedsPP','Party information');
    if(has(['attract','captivate']))push('gender','AI effects');
    if(has(['hail','raindance','sunnyday','sandstorm']) && enabled('expert'))push('weather','Field conditions');
    if(state.format==='Doubles'){
      if(has(['earthquake']))push('allyMagnetRise','Doubles ally');
      if(has(['lavaplume']))push('flashFireActivated','Doubles ally');
      if(has(['earthquake','discharge','surf','lavaplume','rockslide','blizzard']))push('allyAlive','Doubles ally');
    }
    for(let t=0;t<(state.targets?.length||0);t++){
      const group=state.targets.length>1?`Opponent ${t+1}`:'Opponent history';
      if(enabled('expert')&&has(['mirrormove','copycat','fly','dig','dive','bounce','shadowforce']))push('lastMoveName',group,t);
      if(enabled('expert')&&has(['metalburst'])){push('taunted',group,t);push('knowsMetalBurstCounter',group,t);}
      if(enabled('expert')&&has(['counter','mirrorcoat'])){push('taunted',group,t);push('counterCorrespondingType',group,t);}
      if(enabled('expert')&&has(['encore']))push('encoreUsefulLastMove',group,t);
      if(enabled('expert')&&has(['worryseed']))push('knowsRest',group,t);
      if(enabled('expert')&&has(['pursuit']))push('knowsUTurn',group,t);
      if(enabled('expert')&&has(['magnetrise']))push('knowsGroundMove',group,t);
      if(enabled('expert')&&has(['thief','covet']))push('itemEncouraged',group,t);
      if(enabled('expert')&&has(['healblock'])){push('knowsRecovery',group,t);push('knowsDrain',group,t);}
      if(enabled('expert') && has(['reflect','lightscreen','calmmind','bulkup','amnesia','harden','growl','charm','encore','disable','swagger','counter','mirrorcoat','captivate','faketears','metalsound','metalburst']))
        push('lastMoveCategory',group,t);
      if(enabled('expert') && has(['recover','roost','softboiled','slackoff','milkdrink','healorder','rest','synthesis','moonlight','morningsun']))push('knowsSnatch',group,t);
      if(enabled('expert') && has(['protect','detect','solarbeam','skyattack','razorwind','skullbash','fly','dig','dive','bounce','shadowforce']))push('knowsProtect',group,t);
      if(enabled('expert') && has(['protect','detect'])){push('knowsFeint',group,t);push('knowsRecovery',group,t);}
      if(enabled('expert') && has(['feint'])){push('knowsProtect',group,t);push('protectChain',group,t);}
      if(enabled('expert') && has(['roar','whirlwind']))push('turnsOut',group,t);
      if(enabled('expert') && has(['protect','detect','doubleteam','minimize','leechseed','toxic','sandattack','flash','kinesis','smokescreen','muds lap'.replace(' ','')])){
        push('seeded',group,t);push('perishSong',group,t);push('yawning',group,t);
      }
      if(enabled('expert') && has(['dragondance','agility','rockpolish','tailwind','recover','roost','softboiled','slackoff','milkdrink','healorder','explosion','selfdestruct','rest','waterspout','eruption','superpower','hammerarm','closecombat','payback','assurance','thunderwave','stunspore','glare','scaryface','stringshot','cottonspore','trickroom','encore','counter','mirrorcoat','protect','detect','haze','payback','reversal','flail','brine','razorwind','skyattack','solarbeam','wakeupslap','focuspunch','uturn','mirrormove','copycat','mefirst','endeavor','overheat','dracometeor','leafstorm','psychoboost','painsplit','vital throw'.replace(' ','')]))
        push('userSlower',group,t);
      if(has(['hypnosis','spore','sleeppowder','yawn','toxic','thunderwave','willowisp','glare','stunspore']))push('safeguard',group,t);
      if(has(['curse']) && (state.types||[]).includes('Ghost'))push('cursed',group,t);
      if(has(['confuseray','supersonic','sweetkiss','teeterdance','swagger','flatter']))push('confused',group,t);
      if(has(['attract']))push('infatuated',group,t);
      if(has(['leechseed']))push('seeded',group,t);
      if(has(['meanlook','block','spiderweb']))push('trapped',group,t);
      if(has(['encore']))push('encored',group,t);
      if(has(['disable']))push('disabled',group,t);
      if(has(['nightmare']))push('nightmare',group,t);
      if(has(['lockon','mindreader']))push('lockOn',group,t);
      if(has(['attract','captivate']))push('foeGender',group,t);
      if(has(['futuresight','doomdesire']))push('futureSightPending',group,t);
    }
    for(const m of moves)for(const path of CONTEXT_NEEDS[norm(m.name)]||[]){const [side,field]=path.split('.');if(side==='state')push(field,'Battle history');else for(let t=0;t<state.targets.length;t++)push(field,'Opponent '+(t+1),t);}
    if(enabled('basic')||enabled('expert')||state.format==='Doubles')for(let t=0;t<state.targets.length;t++)push('abilityKnown','Opponent '+(t+1),t);
    return [...new Map(list.map(x=>[x.id,x])).values()];
  }
  function apply(state,overrides={}){
    // Never mutate the parsed calculator snapshot; keep context inputs separate.
    const copy={...state,ally:state.ally?{...state.ally}:null,targets:(state.targets||[]).map(t=>({...t}))};
    for(const [path,value] of Object.entries(overrides)){
      if(value===null||value===undefined||value==='')continue;
      const match=path.match(/^target\.(\d+)\.([a-zA-Z]+)$/);
      if(match){const i=Number(match[1]),field=match[2];
        if(copy.targets[i] && copy.targets[i][field==='foeGender'?'gender':field]==null)copy.targets[i][field==='foeGender'?'gender':field]=value;
      }else if(path.startsWith('state.')){
        const field=path.slice('state.'.length);
        if(copy[field]==null)copy[field]=value;
      }
    }
    // The AI checks both conditions in different routines; they describe the
    // same underlying opponent reserve state.
    if(copy.lastAIMoveName!=null)copy.lastMoveName=copy.lastAIMoveName;
    if(copy.noTargetReserves!=null)
      for(const t of copy.targets)if(t.hasReserves==null)t.hasReserves=!copy.noTargetReserves;
    return copy;
  }
  return {FLAG_NAMES,FLAGS,descriptorsFor,apply,norm};
});

/* Read native calculator fields, then ask only for battle history not stored by
 * a static damage calculator. All controls live IN the page; no floating AI %.
 */
(function(){
  'use strict';
  if(typeof document==='undefined')return;
  const doc=document;
  if(!doc.body||!globalThis.PKAI||!globalThis.PKAICalcAdapter||!globalThis.PKAIContext)return;
  if(doc.getElementById('pkai-context')?.dataset?.pkaiVersion==='1.13.0')return;
  // Replace a stale panel from the previous release, if both scripts were loaded.
  doc.getElementById('pkai-context')?.remove();
  const adapter=globalThis.PKAICalcAdapter,engine=globalThis.PKAI,context=globalThis.PKAIContext;
  const create=(tag,text,cls)=>{
    const n=doc.createElement(tag);if(cls)n.className=cls;
    if(text!=null)n.textContent=String(text);return n;
  };
  const css=create('style');css.textContent=`
    /* Older v0.6/v0.7 scripts injected legacy HP independently.
       Make sure it stays invisible even if another cached script recreates it. */
    .pkai-hp-tools,[data-pkai-hp-tools],.pkai-hp-range,#pkai-launcher,#pkai-dialog{display:none!important}
    .pkai-inline-odds{color:#087e90!important;font-weight:700!important;white-space:nowrap!important;
      font:inherit!important;margin:0 5px!important;display:inline-block!important;float:none!important;
      width:auto!important;max-width:none!important;overflow:visible!important;visibility:visible!important;opacity:1!important;vertical-align:baseline!important}
    .pkai-inline-odds[data-pkai-placement="fallback"]{font-size:11px!important}
    #pkai-context{margin:12px 0;padding:12px 14px;border:1px solid #9ba9b9;border-radius:9px;
      background:var(--pkai-bg,transparent);font:12px/1.45 system-ui,Arial,sans-serif;color:inherit;max-width:100%;box-sizing:border-box}
    #pkai-context .pkai-header{display:flex;gap:8px;align-items:center;justify-content:space-between;font-weight:700;font-size:13px;margin-bottom:4px}
    #pkai-context .pkai-help{opacity:.78;font-size:11px;margin:4px 0 9px}
    #pkai-context .pkai-fields{display:flex;flex-wrap:wrap;gap:7px 14px;align-items:center}
    #pkai-context fieldset{border:1px solid #b7c0cb;border-radius:6px;min-width:180px;max-width:100%;margin:5px 0;padding:6px 8px 8px}
    #pkai-context legend{font-weight:650;padding:0 4px}
    #pkai-context .pkai-line{display:flex;align-items:center;gap:6px;min-height:24px;flex-wrap:wrap}
    #pkai-context .pkai-line label{cursor:pointer;display:flex;align-items:center;gap:6px}
    #pkai-context input[type="checkbox"]{appearance:auto!important;display:inline-block!important;
      position:static!important;opacity:1!important;visibility:visible!important;
      width:16px!important;height:16px!important;flex:none;accent-color:#14869c;cursor:pointer}
    #pkai-context select{max-width:190px;font:inherit;border:1px solid #a1afc2;border-radius:4px;padding:2px;background:Canvas;color:CanvasText}
    #pkai-context .pkai-unknown{font-size:10px;opacity:.72}
    #pkai-context .pkai-reset{font:inherit;font-size:11px;border:0;background:transparent;color:inherit;opacity:.7;cursor:pointer;padding:2px}
    #pkai-context .pkai-reset:disabled{opacity:.25;cursor:default}
    #pkai-context .pkai-warning{font-size:11px;color:#956010;overflow-wrap:anywhere}
    #pkai-context .pkai-flag-list{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:5px 10px}
    #pkai-context details{margin-top:5px}
    #pkai-context summary{cursor:pointer}
    #pkai-context ul{margin:5px 0 0;padding-left:18px}
    #pkai-context .pkai-approx{font-size:11px;margin-top:7px;opacity:.75}
  `;doc.head.appendChild(css);
  // Remove stale floating UI from an older script version if it is present.
  doc.getElementById('pkai-launcher')?.remove();doc.getElementById('pkai-dialog')?.remove();
  function removeLegacyControls(){
    doc.querySelectorAll('.pkai-hp-tools,[data-pkai-hp-tools],.pkai-hp-range').forEach(el=>el.remove());
    doc.getElementById('pkai-launcher')?.remove();
    doc.getElementById('pkai-dialog')?.remove();
  }
  removeLegacyControls();
  const holders=['resultDamageR1','resultDamageR2','resultDamageR3','resultDamageR4'];
  const key=x=>engine.nameKey(x);
  const overridesBySelection=new Map();
  const manualFlagsBySelection=new Map();
  // A *clearly labeled hypothetical preview* when the calculator does not
  // contain trainer AI metadata. It is never presented as the actual flag mask.
  const ASSUMED_FLAGS={basic:true,evalAtt:true,expert:true,doubles:false,
    setupFirstTurn:false,risky:false,prioDamage:false,batonPass:false,
    checkHP:false,weather:false,harassment:false};
  const flagPreviewDisabled=new Set();
  function assumedFlags(format){return {...ASSUMED_FLAGS,doubles:format==='Doubles'};}
  let latest=null,refreshing=false,scheduleTimer=null,selectedKey='';
  function selectedSet(root){
    const el=doc.querySelector(root+' .set-selector')||doc.querySelector(root+' .species');
    return String(el?.value||el?.selectedOptions?.[0]?.textContent||'');
  }
  function flagsKey(){
    const t=doc.querySelector('.trainer-pok-list .selected');
    const trainer=t?.dataset?.trainerId||doc.querySelector('#trainer')?.value||'';
    return JSON.stringify([String(trainer),selectedSet('#p2')]);
  }
  function selectionKey(){
    // Last-used moves belong to a particular matchup. Trainer AI flags do NOT;
    // they remain set when the player switches its active Pokémon.
    if(adapter.readFormat(doc)==='Doubles'){const saved=board();return JSON.stringify([flagsKey(),saved.a?.mon.name,saved.b?.mon.name,saved.ally?.mon.name]);}
    return JSON.stringify([flagsKey(),selectedSet('#p1')]);
  }
  function findDamageAnchor(i){
    const native=doc.getElementById(holders[i]);
    if(native)return {anchor:native,mode:'damage'};
    const radio=doc.getElementById('resultMoveR'+(i+1));
    const row=radio?.parentElement||doc.querySelectorAll('.results-right > div')[i]||null;
    if(row){
      const damage=[...row.querySelectorAll('span,[data-damage],.damage,.result-damage')]
        .find(el=>!el.classList?.contains('pkai-inline-odds')&&
          (el.id?.toLowerCase().includes('damage')||el.classList?.contains('damage')||
          /(?:%|damage)/i.test(el.textContent||'')));
      if(damage)return {anchor:damage,mode:'alternative damage'};
      const label=radio?row.querySelector('label[for="resultMoveR'+(i+1)+'"]'):row.querySelector('label');
      if(label)return {anchor:label,mode:'move label'};
    }
    const input=doc.querySelector('#p2 .move'+(i+1)+' select.move-selector');
    return input?{anchor:input,mode:'move editor'}:{anchor:null,mode:'not found'};
  }
  function locateInline(){return Array.from({length:4},(_,i)=>({move:i+1,mode:findDamageAnchor(i).mode}));}
  function contextHost(){
    const result=doc.querySelector('.results-right')||doc.querySelector('.move-result-subgroup')||doc.querySelector('.move-result-group');
    return result?.parentElement||doc.querySelector('#p2')||doc.body;
  }
  const panel=create('section',null);panel.id='pkai-context';panel.dataset.pkaiVersion='1.13.0';panel.setAttribute('aria-label','AI scoring context');
  contextHost().appendChild(panel);
  function attachPanel(){
    const host=contextHost();if(panel.parentNode!==host)host.appendChild(panel);
  }
  const boards=new Map();
  const unavailableMoves=new Map();
  const nativeCache=new Map();
  let approximationEnabled=true;
  function board(){const id=flagsKey();if(!boards.has(id))boards.set(id,{a:null,b:null,ally:null});return boards.get(id);}
  function nativeFingerprint(side){
    return JSON.stringify([...doc.querySelectorAll('#'+(side==='R'?'p2':'p1')+' input, #'+(side==='R'?'p2':'p1')+' select')].map(e=>[e.id,e.className,e.value,e.checked]));
  }
  function currentNative(side){
    const id=side+nativeFingerprint(side);
    if(!nativeCache.has(id)){
      nativeCache.set(id,adapter.captureNative(doc,globalThis,side));
      if(nativeCache.size>24)nativeCache.delete(nativeCache.keys().next().value);
    }
    return nativeCache.get(id);
  }
  function scoringField(){
    try{const f=globalThis.createField?.();if(!f)return null;return f.swap?.()||f;}catch{return null;}
  }
  function captureBoard(slot){
    const snapshot=adapter.readBattle(doc,globalThis),state=snapshot.state,target=state.targets[0];
    if(!Number.isFinite(target?.hp)||!Number.isFinite(target?.maxHp)||!target.types?.length)return;
    const moves=Array.from({length:4},(_,i)=>adapter.moveMetadata(doc,i,'L',globalThis));
    const saved={mon:{...target,moves,speed:adapter.effectiveSpeed(doc,'L').value},native:currentNative('L'),
      damages:state.moves.map(m=>m.damageNotes?.[0]||{damage:m.damage?.[0]}),aiFingerprint:nativeFingerprint('R')};
    saved.mon.possibleAbilities=adapter.possibleAbilities(globalThis,saved.mon,saved.native);
    board()[slot]=saved;refreshView();
  }
  function renderBoard(state){
    if(state.format!=='Doubles')return;
    const fs=create('fieldset');fs.appendChild(create('legend','Doubles: two opponents + AI partner'));
    fs.appendChild(create('div','Keep the AI Pokémon in the right panel. Select each other Pokémon in the left panel, then save it below. Saved slots stay in this session. To update a set, select it again and save that slot.','pkai-help'));
    const saved=board();
    for(const [slot,label] of [['a','Opponent A'],['b','Opponent B'],['ally','AI partner']]){
      const row=create('div',null,'pkai-line');const save=create('button','Save left Pokémon as '+label);save.type='button';save.id='pkai-save-'+slot;
      save.addEventListener('click',()=>captureBoard(slot));row.appendChild(save);
      const record=saved[slot];row.appendChild(create('span',record?record.mon.name:'Not saved'));
      if(record){
        const hp=create('input');hp.type='number';hp.min='0';hp.max=String(record.mon.maxHp);hp.value=String(record.mon.hp);hp.style.width='68px';hp.setAttribute('aria-label',label+' current HP');
        hp.addEventListener('change',()=>{const n=Number(hp.value);if(Number.isInteger(n)&&n>=0&&n<=record.mon.maxHp){record.mon.hp=n;refreshView();}});
        row.append(create('span','HP'),hp,create('span','/ '+record.mon.maxHp));
        const clear=create('button','Clear');clear.type='button';clear.addEventListener('click',()=>{saved[slot]=null;refreshView();});row.appendChild(clear);
      }
      fs.appendChild(row);
    }
    panel.appendChild(fs);
  }
  function applyBoardAndDamage(original){
    const state={...original,moves:original.moves.map(m=>({...m,damage:[...m.damage],effectiveness:[...m.effectiveness],damageNotes:[...(m.damageNotes||[])]})),targets:original.targets.map(t=>({...t}))};
    const notes=[],blockers=[];const saved=board(),isDouble=state.format==='Doubles';
    let records=[null];
    if(isDouble){
      if(!saved.a||!saved.b)blockers.push('Save both Opponent A and Opponent B using the left Pokémon selector');
      if(!saved.ally)blockers.push('Save the AI partner (set its HP to 0 if fainted)');
      records=[saved.a,saved.b];
      state.targets=records.map((r,i)=>r?{...r.mon}:original.targets[i]||{hp:null,maxHp:null,types:[],name:'Opponent '+(i?'B':'A')});
      state.ally=saved.ally?{...saved.ally.mon}:null;
      state.allyAlive=state.ally?state.ally.hp>0:null;
      state.allyTypes=state.ally?.types;state.allyAbility=state.ally?.ability;state.allyMoves=state.ally?.moves;
      state.allyMagnetRise=state.ally?.magnetRise;
    }
    const attacker=currentNative('R'),field=scoringField(),speed=adapter.effectiveSpeed(doc,'R').value;
    state.speed=speed;
    if(state.ally&&Number.isFinite(speed)&&Number.isFinite(state.ally.speed)){
      state.userSlowerThanAlly=speed<state.ally.speed;state.speedTieWithAlly=speed===state.ally.speed;
    }
    const currentDefender=!isDouble?currentNative('L'):null;
    const fp=nativeFingerprint('R');
    for(let t=0;t<state.targets.length;t++){
      const foe=state.targets[t],record=records[t];
      foe.possibleAbilities=record?.mon.possibleAbilities||adapter.possibleAbilities(globalThis,foe,currentDefender);
      if(isDouble)for(const key of ['safeguard','reflectActive','lightScreenActive','stealthRockActive','spikesLayers','toxicSpikesLayers'])if(original.targets[0]?.[key]!=null)foe[key]=original.targets[0][key];
      if(!foe.maxHp)continue;
      const foeSpeed=record?record.mon.speed:adapter.effectiveSpeed(doc,'L').value;
      if(Number.isFinite(speed)&&Number.isFinite(foeSpeed)){
        foe.userSlower=speed===foeSpeed?null:speed<foeSpeed;foe.speedTie=speed===foeSpeed;
      }
      if(state.ally&&Number.isFinite(state.ally.speed)&&Number.isFinite(foeSpeed))foe.allySlower=state.ally.speed===foeSpeed?null:state.ally.speed<foeSpeed;
      for(let i=0;i<state.moves.length;i++){
        const m=state.moves[i];
        m.effectiveness[t]=adapter.aiEffectiveness(state,m,foe);
        if(m.category==='Status'){m.damage[t]=0;continue;}
        const native=adapter.nativeAIDamage(globalThis,state,m,foe,attacker,record?.native||currentDefender,field,i);
        let detail=native;
        if(!detail){
          const raw=record?.damages?.[i]||(!isDouble?original.moves[i].damageNotes?.[0]:null);
          if(record&&record.aiFingerprint!==fp){m.damage[t]=null;notes.push('AI set changed; re-save '+(t?'Opponent B':'Opponent A')+' to refresh its damage');continue;}
          detail=raw?adapter.approximateDamage(raw,state,m,foe):null;
        }
        if(detail){m.damage[t]=detail.damage??detail.estimatedDamage??null;m.damageNotes[t]=detail;if(detail.distribution){if(!m.damageDistributions)m.damageDistributions=[];m.damageDistributions[t]=detail.distribution;}}
        else m.damage[t]=null;
      }
    }
    if(state.ally){
      state.ally.movesBeforeBothFoes=state.targets.every(t=>t.allySlower===false)?true:state.targets.some(t=>t.allySlower===true)?false:null;
      const nativeAlly=saved.ally?.native;
      state.allyMoveDamages=state.targets.map((foe,t)=>(state.ally.moves||[]).map((m,i)=>{
        if(m.category==='Status')return 0;
        const allyState={...state,...state.ally,aiStatus:state.ally.status};
        return adapter.nativeAIDamage(globalThis,allyState,m,foe,nativeAlly,records[t]?.native,field,i)?.damage??null;
      }));
      if(state.allyMoveDamages.some(ds=>ds.some(d=>d==null))){
        notes.push('Partner damage could not be recomputed; highest-damage checks use available values');
        state.allyMoveDamages=state.allyMoveDamages.map(ds=>ds.filter(d=>d!=null));
      }
    }
    return {state,notes:[...new Set(notes)],blockers};
  }
  function renderMoveAvailability(state){
    const details=create('details');details.appendChild(create('summary','Move availability (PP, Taunt, Encore, Choice lock)'));
    const disabled=unavailableMoves.get(selectedKey)||new Set();
    for(let i=0;i<state.moves.length;i++){
      const m=state.moves[i];if(!m.name||key(m.name)==='nomove')continue;
      const row=create('label',null,'pkai-line'),input=create('input');input.type='checkbox';input.checked=!disabled.has(i)&&m.currentPP!==0;input.disabled=m.currentPP===0;
      input.addEventListener('change',()=>{if(input.checked)disabled.delete(i);else disabled.add(i);unavailableMoves.set(selectedKey,disabled);refreshView();});
      row.append(input,doc.createTextNode(m.name+' can be selected'));details.appendChild(row);
    }
    panel.appendChild(details);
  }
  function renderApproximation(state){
    const fs=create('fieldset');fs.appendChild(create('legend','Approximation'));
    const row=create('label',null,'pkai-line'),toggle=create('input');toggle.type='checkbox';toggle.id='pkai-approximation';toggle.checked=approximationEnabled;
    toggle.addEventListener('change',()=>{approximationEnabled=toggle.checked;refreshView();});
    row.append(toggle,doc.createTextNode('Estimate missing history using neutral battle conditions'));fs.appendChild(row);
    fs.appendChild(create('div','Missing yes/no conditions use No, missing stat stages use 0, and unknown turn history assumes a later turn. Your inputs replace these assumptions. Damage uses one strike without random variance; native calculations are preferred, otherwise displayed damage is corrected and rounding is approximate. Unconfirmed abilities use the available species abilities with equal weight. Bulldoze and Triple Axel include their AI damage-effect distributions when native damage is available.','pkai-help'));
    const details=create('details');details.appendChild(create('summary','AI damage used for scoring'));
    for(const m of state.moves||[])for(let t=0;t<(state.targets||[]).length;t++){
      if(m.category==='Status')continue;
      const note=m.damageNotes?.[t];details.appendChild(create('div',m.name+' → '+(state.targets[t].name||'Opponent '+(t+1))+': '+(m.damage?.[t]??'unavailable')+' HP. '+(note?.reason||''),'pkai-help'));
    }
    fs.appendChild(details);panel.appendChild(fs);
  }
  function approximateContext(state,specs,store){
    if(!approximationEnabled)return {state,assumptions:[]};
    const defaults={},assumptions=[];
    for(const spec of specs){
      if(inputValue(store,spec.id)!=null||spec.text)continue;
      if(spec.field==='userSlower'&&state.targets?.[spec.targetIndex]?.speedTie)continue;
      let v=false;
      if(spec.options){v=spec.options.find(x=>['0','None','Healthy','No status'].includes(String(x)));if(v==null)continue;v=/^\d+$/.test(v)?Number(v):v;}
      defaults[spec.id]=v;assumptions.push(spec.label+': '+String(v));
    }
    const next=context.apply(state,defaults);
    for(const field of ['firstTurn','firstTurnOut'])if(next[field]==null){next[field]=false;assumptions.push(field+': later turn');}
    for(const field of ['trickRoom','gravity','tailwindActive','reflectActive','lightScreenActive'])if(next[field]==null){next[field]=false;assumptions.push(field+': inactive');}
    if(next.gravityActive!=null)next.gravity=next.gravityActive;
    if(next.ally&&next.allyMagnetRise!=null)next.ally.magnetRise=next.allyMagnetRise;
    for(const target of next.targets)if(target.abilityKnown!==true&&target.ability){assumptions.push(target.name+': '+(target.possibleAbilities?.length>1?'unconfirmed ability guessed uniformly from '+target.possibleAbilities.join(' / '):'displayed ability used; other possible abilities unavailable'));}
    for(const mon of [next,...next.targets]){const stages=mon.stages||{};const missing=['atk','def','spa','spd','spe','accuracy','evasion'].filter(k=>stages[k]==null);if(missing.length)assumptions.push((mon.name||'AI')+': '+missing.join(', ')+' stages assumed 0');}
    return {state:next,assumptions};
  }
  function renderTargetOdds(result,state){
    if(!result||result.mode!=='Doubles')return;
    const table=create('table');table.style.cssText='width:100%;border-collapse:collapse;margin-top:8px;text-align:right';
    const head=create('tr');head.appendChild(create('th','Move'));
    for(let i=0;i<result.targetNames.length;i++){const th=create('th',result.targetIsAlly[i]?'AI partner':'Opponent '+(i?'B':'A'));th.title=result.targetNames[i];head.appendChild(th);}head.appendChild(create('th','Total'));table.appendChild(head);
    for(let i=0;i<result.choice.length;i++){
      const row=create('tr');row.appendChild(create('td',state.moves[i].name));
      for(const p of [...result.choice[i].targets,result.choice[i].total]){const cell=create('td',(p*100).toFixed(1)+'%');cell.style.padding='4px';row.appendChild(cell);}table.appendChild(row);
    }
    const wrapper=create('div');wrapper.style.overflowX='auto';wrapper.appendChild(table);panel.appendChild(wrapper);panel.appendChild(create('div','Columns show the AI’s scoring target. Self moves act on the user; spread moves hit every eligible battler. The AI first breaks move ties within each target, then target ties.','pkai-help'));
  }

  function inputValue(overrides,id){return Object.prototype.hasOwnProperty.call(overrides,id)?overrides[id]:null;}
  function renderControl(spec,store){
    const row=create('div',null,'pkai-line');row.title=spec.detail||'';
    const id='pkai-field-'+spec.id.replace(/[^a-z0-9]+/gi,'-');
    const value=inputValue(store,spec.id);
    if(spec.options){
      const label=create('label',spec.label);label.htmlFor=id;row.appendChild(label);
      const select=create('select');select.id=id;select.setAttribute('aria-label',spec.label);
      const none=create('option','Choose…');none.value='';select.appendChild(none);
      for(const choice of spec.options){const opt=create('option',choice);opt.value=choice;select.appendChild(opt);}
      select.value=value==null?'':String(value);
      select.addEventListener('change',()=>{if(select.value==='')delete store[spec.id];
        else store[spec.id]=/^\d+$/.test(select.value)?Number(select.value):select.value;refreshView();});
      row.appendChild(select);
    }else if(spec.text){
      const label=create('label',spec.label);label.htmlFor=id;row.appendChild(label);
      const input=create('input');input.type='text';input.id=id;input.value=value==null?'':String(value);
      input.placeholder='Unknown';input.setAttribute('aria-label',spec.label);
      input.style.cssText='max-width:170px;min-width:70px;font:inherit;padding:3px;';
      input.addEventListener('change',()=>{if(!input.value.trim())delete store[spec.id];
        else store[spec.id]=input.value.trim();refreshView();});
      row.appendChild(input);
    }else{
      const input=create('input');input.type='checkbox';input.id=id;
      // Do not display an indeterminate (minus) checkbox: it looked like a
      // collapse control, and the prior implementation removed it on click.
      // Unknown is visually marked, while the checkbox stays present after
      // both Yes and No answers.  Click once for Yes, again for No; reset ?.
      input.checked=value===true;
      input.addEventListener('change',()=>{store[spec.id]=input.checked;refreshView();});
      const label=create('label');label.htmlFor=id;label.append(input,doc.createTextNode(spec.label));row.appendChild(label);
      if(value===null)row.appendChild(create('small','Not set — click to choose Yes','pkai-unknown'));
      else row.appendChild(create('small',value===true?'Yes':'No','pkai-unknown'));
      const reset=create('button','↺','pkai-reset');reset.type='button';reset.title='Reset to unknown';
      reset.setAttribute('aria-label','Reset '+spec.label+' to unknown');
      reset.disabled=value===null;
      reset.addEventListener('click',()=>{delete store[spec.id];refreshView();});row.appendChild(reset);
    }
    return row;
  }
  function renderFlags(existingFlags,format){
    if(existingFlags)return null;
    const fs=create('fieldset');fs.appendChild(create('legend','Trainer flags: preview assumptions'));
    fs.appendChild(create('p',
      'The selected trainer’s exact AI flags were NOT found in this calculator. These are hypothetical move odds, not the trainer’s verified odds. Select the correct flags below if you know them.',
      'pkai-warning'));
    const key=flagsKey(), disabled=flagPreviewDisabled.has(key);
    const controls=create('div',null,'pkai-fields');
    const preview=create('label');
    const checkbox=create('input');checkbox.type='checkbox';checkbox.checked=!disabled;
    checkbox.addEventListener('change',()=>{
      if(checkbox.checked)flagPreviewDisabled.delete(key);else flagPreviewDisabled.add(key);
      refreshView();
    });
    preview.append(checkbox,doc.createTextNode('Show conditional odds using selected assumptions'));
    controls.appendChild(preview);
    const preset=create('button','Reset to Basic + Evaluate Attack + Expert'+(format==='Doubles'?' + Tag Strategy':''),'pkai-reset');
    preset.type='button';preset.addEventListener('click',()=>{
      manualFlagsBySelection.set(key,assumedFlags(format));flagPreviewDisabled.delete(key);refreshView();
    });controls.appendChild(preset);fs.appendChild(controls);
    const chosen=manualFlagsBySelection.get(key)||assumedFlags(format);
    const list=create('div',null,'pkai-flag-list');
    for(const [flag,label] of Object.entries(context.FLAG_NAMES)){
      const row=create('div',null,'pkai-line');const input=create('input');input.type='checkbox';
      input.checked=flag==='doubles'&&format==='Doubles'||!!chosen[flag];input.id='pkai-flag-'+flag;
      if(flag==='doubles'&&format==='Doubles'){input.disabled=true;input.title='Automatically active in doubles battles';}
      const caption=create('label');caption.htmlFor=input.id;caption.append(input,doc.createTextNode(label));row.appendChild(caption);
      input.addEventListener('change',()=>{
        manualFlagsBySelection.set(key,{...chosen,[flag]:input.checked});
        flagPreviewDisabled.delete(key);refreshView();
      });list.appendChild(row);
    }
    fs.appendChild(list);
    return fs;
  }
  function renderPanel(snapshot,applicable,missing,blockers,result,notes){
    panel.replaceChildren();
    const header=create('div',null,'pkai-header');header.appendChild(create('span','AI context'));
    if(snapshot.flagsSource!=='native')header.appendChild(create('span','Assumed flags'));
    panel.appendChild(header);

    const speed=adapter.readAttackOrder(doc,'R','L');
    if(Number.isFinite(speed.aiSpeed)&&Number.isFinite(speed.foeSpeed)){
      panel.appendChild(create('div',
        `Speed: AI ${speed.aiSpeed} / yours ${speed.foeSpeed} — `+
        (speed.aiSpeed<speed.foeSpeed?'AI slower':speed.aiSpeed>speed.foeSpeed?'AI faster':'Speed tie')+
        '','pkai-help'));
    }
    renderBoard(snapshot.state);renderMoveAvailability(latest?.scoringState||snapshot.state);renderApproximation(latest?.scoringState||snapshot.state);renderTargetOdds(result,latest?.scoringState||snapshot.state);
    const flags=renderFlags(snapshot.flagsSource==='native'?snapshot.state.flags:null,snapshot.state.format);if(flags)panel.appendChild(flags);
    if(applicable.length){
      const groups=new Map();for(const spec of applicable){
        if(!groups.has(spec.group))groups.set(spec.group,[]);
        groups.get(spec.group).push(spec);
      }
      let store=overridesBySelection.get(selectedKey);
      if(!store){store={};overridesBySelection.set(selectedKey,store);}
      for(const [group,specs] of groups){
        const fs=create('fieldset');fs.appendChild(create('legend',group));
        const rows=create('div',null,'pkai-fields');for(const spec of specs)rows.appendChild(renderControl(spec,store));
        fs.appendChild(rows);panel.appendChild(fs);
      }
    }
    if(result){const trace=create('details');trace.appendChild(create('summary','Move scoring rules applied'));for(let t=0;t<result.explanations.length;t++)for(let i=0;i<result.explanations[t].length;i++){const logs=result.explanations[t][i];if(logs.length){trace.appendChild(create('strong',(latest?.scoringState?.moves[i]?.name||'Move')+' → '+(result.targetNames?.[t]||'Opponent')));for(const line of logs)trace.appendChild(create('div',line,'pkai-help'));}}panel.appendChild(trace);}
    if(!applicable.length && snapshot.state.flags)panel.appendChild(create('div','No extra inputs.','pkai-help'));
    if(blockers.length)panel.appendChild(create('div','AI odds unavailable: '+blockers[0],'pkai-warning'));
    if(notes.length)panel.appendChild(create('div','Estimated odds: '+notes[0],'pkai-warning'));
    if((missing.length||result?.omissions?.length||snapshot.issues?.length||blockers.length)){
      const details=create('details');const summary=create('summary','Scoring diagnostics');details.appendChild(summary);
      const ul=create('ul');
      const all=[...blockers,...missing,...(result?.omissions||[]),...(snapshot.issues||[]).map(x=>x.field+': '+x.detail)];
      for(const item of [...new Set(all)].slice(0,24))ul.appendChild(create('li',item));
      details.appendChild(ul);panel.appendChild(details);
    }
    panel.appendChild(create('div','~ conditional estimate. All 11 flags are available; unresolved or unsupported rules appear in diagnostics.','pkai-approx'));
    if(latest?.assumptions?.length){const d=create('details');d.appendChild(create('summary','Assumptions used ('+latest.assumptions.length+')'));for(const a of latest.assumptions)d.appendChild(create('div',a,'pkai-help'));panel.appendChild(d);}
  }
  function paintInline(snapshot,result,blockers,notes){
    for(let i=0;i<4;i++){
      const {anchor,mode}=findDamageAnchor(i);
      let span=doc.getElementById('pkai-odds-R'+(i+1));
      doc.querySelectorAll('#'+holders[i]+' > .pkai-inline-odds').forEach(x=>x.remove());
      if(!anchor){span?.remove();continue;}
      if(!span){span=create('span','','pkai-inline-odds');span.id='pkai-odds-R'+(i+1);}
      if(anchor.nextElementSibling!==span)anchor.insertAdjacentElement('afterend',span);
      span.dataset.pkaiPlacement=mode==='damage'?'damage':'fallback';
      const move=snapshot?.state?.moves?.[i];
      if(!move || ['nomove','loading'].includes(key(move.name))){span.textContent='';continue;}
      const score=result?.choice?.[i]?.total;
      span.textContent=Number.isFinite(score)?` (AI est: ~${(score*100).toFixed(1)}%)`:' (AI: —)';
      span.title=Number.isFinite(score)?'Conditional estimated move-selection chance. '+notes.join(' '):
        'Cannot calculate: '+(blockers[0]||'missing battle data')+'. See AI scoring context below the moves.';
    }
  }
  // Require actual or explicitly approximated damage; missing attacks are never assigned zero.
  function prepareScoringState(state){
    const warnings=[];
    const b=[];
    const moves=(state.moves||[]).map(m=>{
      if(!m||!m.name||['nomove','loading'].includes(key(m.name)))return m;
      let next={...m,damage:[...(m.damage||[])],effectiveness:[...(m.effectiveness||[])]};
      if(!['Physical','Special','Status'].includes(next.category)){
        warnings.push('Unrecognized move category for '+m.name+': treated as '+
          (Number(m.basePower)>0?'an attack':'a status move')+'.');
        next.category=Number(m.basePower)>0?'Physical':'Status';
      }else if(next.source==='inferred power'){
        warnings.push('Move category for '+m.name+' inferred from displayed base power.');
      }
      if(next.category!=='Status')for(let i=0;i<(state.targets||[]).length;i++){
        if(!Number.isFinite(Number(next.effectiveness[i]))||next.effectiveness[i]==null){
          warnings.push(m.name+' type-effectiveness unavailable vs opponent '+(i+1)+'; assuming neutral.');
          next.effectiveness[i]=1;
        }
        if(next.damage[i]==null||!Number.isFinite(Number(next.damage[i]))){
          b.push(m.name+' AI damage unavailable vs opponent '+(i+1)+'; select and re-save that opponent');
        }
      }
      return next;
    });
    if(!state.flags)b.push('Trainer AI flags not found');
    if(!Number.isFinite(state.hp)||!Number.isFinite(state.maxHp)||state.maxHp<=0||
       (state.targets||[]).some(t=>!Number.isFinite(t.hp)||!Number.isFinite(t.maxHp)||t.maxHp<=0))
      b.push('Current/max HP not readable from the calculator');
    if(state.format==='Doubles' && state.allyAlive!==false && ![1,2].includes(state.allyTypes?.length))
      b.push('Doubles ally types unavailable in calculator');
    const attacks=moves.filter(m=>m?.name&&m.category!=='Status'&&
      !['nomove','loading'].includes(key(m.name)));
    if(attacks.length && attacks.every(m=>(state.moves.find(x=>x.name===m.name)?.damage||[])
      .every(d=>d==null||!Number.isFinite(Number(d)))) &&
      attacks.some(m=>!['explosion','selfdestruct'].includes(key(m.name))))
      b.push('All attacking move damage results are unavailable; wait for calculator to finish loading');
    if(!moves.some(m=>m?.name&&!['nomove','loading'].includes(key(m.name))))
      b.push('No Pokémon 2 moves found yet');
    return {state:{...state,moves},blockers:b,warnings:[...new Set(warnings)]};
  }
  function hardBlockers(state){return prepareScoringState(state).blockers;}

  function refreshView(){
    if(refreshing)return;refreshing=true;
    try{
      removeLegacyControls();attachPanel();
      selectedKey=selectionKey();
      const snapshot=adapter.readBattle(doc,globalThis);
      const store=overridesBySelection.get(selectedKey)||{};
      const boarded=applyBoardAndDamage(snapshot.state);
      const original=boarded.state;
      snapshot.state=original;
      snapshot.issues=snapshot.issues.filter(x=>!['Doubles board'].includes(x.field)&&!x.detail.includes('No separate calculator result')); 
      // Controls are keyed to the current matchup, not carried across foes.
      let state=context.apply(original,store);
      const notes=[...boarded.notes];
      if(!state.format){state={...state,format:'Singles'};notes.push('Battle format not exposed; treating it as Singles.');}
      const flagsSource=state.flags?'native':'conditional-preview';
      if(!state.flags && !flagPreviewDisabled.has(flagsKey())){
        state={...state,flags:manualFlagsBySelection.get(flagsKey())||assumedFlags(state.format)};
        notes.push('CONDITIONAL PREVIEW: trainer AI flag mask was not found. The current checkboxes are assumptions, not detected trainer data.');
      }
      // IMPORTANT: derive which controls exist from the unmodified calculator
      // snapshot, not from the user's overrides.  Otherwise the instant a user
      // checks an Unknown box, it ceases to be "missing" and disappears.
      if(state.format==='Doubles'&&state.flags&&!state.flags.doubles){state={...state,flags:{...state.flags,doubles:true}};notes.push('Tag Strategy is automatically active in a doubles battle');}
      // Retain the chosen flag mask so only relevant controls are displayed.
      const applicable=context.descriptorsFor({...original,flags:state.flags,format:state.format});
      const unresolved=applicable.filter(x=>inputValue(store,x.id)==null);
      if(unresolved.length)notes.push(unresolved.length+' history/field conditions remain unknown.');
      const approximation=approximateContext(state,applicable,store);state=approximation.state;
      const unavailable=unavailableMoves.get(selectedKey);if(unavailable)state={...state,moves:state.moves.map((m,i)=>({...m,usable:m.usable!==false&&!unavailable.has(i)}))};
      const prepared=prepareScoringState(state);
      const blockers=[...boarded.blockers,...prepared.blockers];
      if(!approximationEnabled&&unresolved.length)blockers.push('Set the missing conditions or enable the approximation');
      if(prepared.warnings.length)notes.push('CONDITIONAL SCORING: '+prepared.warnings.join(' '));
      let result=null;
      if(!blockers.length){try{result=engine.calculate(prepared.state);}catch(e){blockers.push(e.message||String(e));}}
      const missing=unresolved.map(x=>x.label+' (not provided by calculator)');
      latest={snapshot:{...snapshot,state,flagsSource},missing,blockers,result,notes,controls:applicable,
        scoringState:prepared.state,readingWarnings:prepared.warnings,assumptions:approximation.assumptions};
      paintInline(latest.snapshot,result,blockers,notes);
      renderPanel({...snapshot,state:original,flagsSource},applicable,missing,blockers,result,notes);
    }catch(e){
      const error='AI reader error: '+(e?.message||e);
      latest={error};
      paintInline(null,null,[error],[]);
      panel.replaceChildren(create('strong',error,'pkai-warning'));
    }finally{refreshing=false;}
  }
  const isOwn=node=>node?.closest?.('#pkai-context,.pkai-inline-odds');
  function queue(){if(scheduleTimer!==null)return;scheduleTimer=setTimeout(()=>{scheduleTimer=null;refreshView();},140);}
  const observer=new MutationObserver(changes=>{
    for(const m of changes){
      const node=m.target.nodeType===3?m.target.parentElement:m.target;
      if(isOwn(node))continue;
      // Old userscripts may reinsert a legacy HP control after our initial cleanup.
      if(node?.matches?.('.pkai-hp-tools,[data-pkai-hp-tools],.pkai-hp-range') ||
         [...m.addedNodes].some(n=>n.nodeType===1 && (n.matches?.('.pkai-hp-tools,[data-pkai-hp-tools],.pkai-hp-range') || n.querySelector?.('.pkai-hp-tools,[data-pkai-hp-tools],.pkai-hp-range')))){
        removeLegacyControls();
      }
      const changed=[...m.addedNodes,...m.removedNodes];
      if(changed.length&&changed.every(n=>n.nodeType===1 &&
        (n.matches?.('.pkai-inline-odds,#pkai-context')||n.closest?.('#pkai-context'))))continue;
      const changedResult=changed.some(n=>n.nodeType===1&&
        (n.matches?.('[id^="resultDamageR"],.results-right,.move-result-group')||n.querySelector?.('[id^="resultDamageR"]')));
      if(changedResult||node?.closest?.('#p1,#p2,#p1-2,#p2-2,.move-result-group,.field-info,#field,#ai-container')){queue();break;}
    }
  });
  observer.observe(doc.body,{subtree:true,childList:true,characterData:true});
  doc.addEventListener('input',e=>{if(!isOwn(e.target))queue();},true);
  doc.addEventListener('change',e=>{if(!isOwn(e.target))queue();},true);
  globalThis.PKAIInline={version:'1.13.0',refresh:refreshView,snapshot:()=>latest?.snapshot?.state,
    result:()=>latest?.result,scoringState:()=>latest?.scoringState,assumptions:()=>latest?.assumptions||[],
    locations:locateInline,diagnostics:()=>latest?.error?[latest.error]:[...(latest?.blockers||[]),...(latest?.missing||[]),...(latest?.notes||[])],
    controls:()=>latest?.controls||[],
    flagSource:()=>latest?.snapshot?.flagsSource,
    blockers:()=>latest?.blockers||[],
    readingWarnings:()=>latest?.readingWarnings||[],
    flagRead:()=>adapter.readTrainerFlags(doc,globalThis)};
  refreshView();
})();

