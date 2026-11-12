// ==UserScript==
// @name         Platinum Kaizo AI Odds — Inline Damage Results
// @namespace    https://github.com/hzla/Dynamic-Calc-Decomps
// @version      1.4.0
// @description  Inline AI preview with contextual inputs; hides legacy Quick HP controls.
// @match        https://hzla.github.io/Dynamic-Calc-Decomps/*
// @match        https://l-postrophe.github.io/Dynamic-Calc-Decomps/*
// @match        https://hzla.github.io/Dynamic-Calc/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

/* Platinum Kaizo AI score distribution prototype.
 * The distribution math and per-target selection rules are exact for the modeled rules.
 * Unmodeled move-specific rules and calculator-vs-AI damage differences are reported.
 * For missing damage, the panel marks conditional estimates (not game odds).
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
  const noDamageCompare = new Set(['Guillotine','Horn Drill','Counter','Fissure','Bide','Super Fang','Flail','Reversal','Present','Mirror Coat','Endeavor','Metal Burst','Fling','Trump Card','Punishment','Selfdestruct','Explosion','Dream Eater','Razor Wind','SolarBeam','Focus Punch','Close Combat','Brave Bird','Water Spout','Take Down','Head Smash'].map(nameKey));
  const modeledExpert = new Set(['Curse','Dragon Dance','Calm Mind','Light Screen','Reflect','Hypnosis'].map(nameKey));
  const modeledCheckHP = new Set(['Curse','Dragon Dance','Calm Mind','Light Screen','Reflect','Hypnosis'].map(nameKey));
  const modeledPrio = new Set(['Curse','Dragon Dance','Calm Mind','Light Screen','Reflect','Hypnosis'].map(nameKey));
  const firstTurnEligible = new Set(['Dragon Dance','Calm Mind','Light Screen','Reflect','Hypnosis','Agility','Rock Polish','Swords Dance','Nasty Plot','Bulk Up','Iron Defense','Amnesia','Yawn','Thunder Wave','Toxic'].map(nameKey));
  const genericAttack = new Set(['Thunderbolt','Flamethrower','Ice Beam','Earthquake','Rock Slide','Iron Head','Stone Edge','Waterfall','Shadow Ball','Dark Pulse','Psychic','Surf','Blizzard','Discharge','Lava Plume','Pluck','Tri Attack','Crunch','Dragon Claw','Dragon Pulse','Fire Blast','Hydro Pump','Energy Ball','Giga Drain','Aerial Ace','Brick Break','Air Slash','Bug Buzz','Heat Wave','Flash Cannon','Earth Power','Body Slam','Sludge Bomb','Poison Jab','Rock Tomb','Razor Leaf'].map(nameKey));
  const boosting = new Set(['Curse','Dragon Dance','Swords Dance','Nasty Plot','Calm Mind','Bulk Up','Agility','Rock Polish','Iron Defense','Amnesia','Acid Armor','Harden','Double Team','Cosmic Power','Growth','Tail Glow','Howl','Sharpen','Barrier','Defense Curl'].map(nameKey));
  const sleepMoves = new Set(['Hypnosis','Spore','Sleep Powder','GrassWhistle','Sing','Lovely Kiss','Dark Void','Yawn'].map(nameKey));
  const directStatus = new Set(['Hypnosis','Spore','Sleep Powder','GrassWhistle','Sing','Lovely Kiss','Dark Void','Yawn','Toxic','Thunder Wave','Will-O-Wisp','Stun Spore','PoisonPowder','Glare'].map(nameKey));
  const prioVerified = new Set(['Explosion','Selfdestruct','Curse','Dragon Dance','Calm Mind','Light Screen','Hypnosis','Agility','Aqua Ring','Hail'].map(nameKey));
  const batonVerified = new Set(['Curse','Dragon Dance','Calm Mind','Light Screen','Hypnosis','Agility','Aqua Ring','Hail'].map(nameKey));
  const statusVerifiedExpert = new Set(['Curse','Dragon Dance','Calm Mind','Light Screen','Reflect','Hypnosis','Agility','Rock Polish','Swords Dance','Nasty Plot','Stealth Rock','Tailwind','Pluck','Iron Head','Earthquake','Rock Slide','Yawn','Recover','Roost','Aqua Ring','Hail'].map(nameKey));
  const clamp = (n, lo, hi) => Math.max(lo,Math.min(hi,n));
  function pct(h,m) { return Math.floor(100 * Math.max(0, Number(h)||0) / Math.max(1,Number(m)||1)); }
  const status = x => !['healthy','none','no status','', '0'].includes(String(x??'Healthy').toLowerCase());
  function runScore(state, move, targetIndex) {
    const flags = state.flags || {};
    const targets = state.targets || [];
    const foe = targets[targetIndex] || {};
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
    // BASIC: scope deliberately restricted to well-documented checks.
    if(flags.basic) {
      const foeTypes=foe.types||[];
      const type=move.type;
      const immuneByType=eff===0;
      const abilityImmune=state.ability!=='Mold Breaker' && (
        (type==='Ground'&&foe.ability==='Levitate') ||
        (type==='Electric'&&['Volt Absorb','Motor Drive'].includes(foe.ability)) ||
        (type==='Water'&&foe.ability==='Water Absorb') ||
        (type==='Fire'&&foe.ability==='Flash Fire') ||
        (atk&&foe.ability==='Wonder Guard'&&eff<2)
      );
      if(k==='explosion'||k==='selfdestruct') {
        // Platinum Kaizo Explosion page: this effect is not scored by normal
        // highest-damage logic. Basic uses its own branch, which terminates.
        if(immuneByType) add(-10,'Basic: Explosion immune target');
        else if(foe.ability==='Wonder Guard' && state.ability!=='Mold Breaker' && eff!==2 && eff!==4)
          add(-12,'Basic: Explosion blocked by Wonder Guard');
        else if(foe.ability==='Damp' && state.ability!=='Mold Breaker')add(-10,'Basic: Damp stops Explosion');
        else if(state.partyHasReserve===true) { /* No Basic penalty */ }
        else if(state.partyHasReserve===false){
          if(foe.hasReserves===true) add(-10,'Basic: last AI mon, opponent has reserves');
          else if(foe.hasReserves===false) add(-1,'Basic: both sides on last mon');
          else omissions.push('Explosion Basic needs opponent reserve count');
        } else omissions.push('Explosion Basic needs AI reserve count');
      } else if(atk && (immuneByType||abilityImmune)) add(-10,'Basic: type or ability immunity');
      const blockedStatus=status(foe.status)||!!foe.safeguard;
      if(sleepMoves.has(k)&&(blockedStatus||['Insomnia','Vital Spirit'].includes(foe.ability)))
        add(-10,'Basic: sleep blocked');
      else if(group(k,['Toxic','Poison Gas','PoisonPowder'])&&(
        blockedStatus||foeTypes.some(t=>['Poison','Steel'].includes(t))||
        ['Immunity','Magic Guard','Poison Heal'].includes(foe.ability)||
        (foe.ability==='Hydration'&&state.weather==='Rain')||
        (foe.ability==='Leaf Guard'&&state.weather==='Sun')
      ))add(-10,'Basic: poison blocked');
      else if(group(k,['Thunder Wave','Stun Spore','Glare'])&&(
        blockedStatus||['Limber','Magic Guard'].includes(foe.ability)||
        (k==='thunderwave'&&(immuneByType||abilityImmune))
      ))add(-10,'Basic: paralysis blocked');
      else if(k==='willowisp'&&(
        blockedStatus||foeTypes.includes('Fire')||['Water Veil','Magic Guard'].includes(foe.ability)
      ))add(-10,'Basic: burn blocked');
      if (k==='curse') {
        if (isGhost) { if(foe.cursed || foe.ability==='Magic Guard') add(-10,'Basic: ghost Curse blocked'); }
        else if (simple && (stage('atk')>=3 || stage('def')>=3) || stage('atk')>=6) add(-10,'Basic: Curse attack cap');
        else if (stage('def')>=6) add(-8,'Basic: Curse defense cap');
      }
      if(k==='dragondance') {
        if(state.trickRoom || simple&&(stage('atk')>=3||stage('spe')>=3) || stage('atk')>=6) add(-10,'Basic: Dragon Dance blocked');
        else if(stage('spe')>=6) add(-8,'Basic: Speed cap');
      }
      if(k==='calmmind') {
        if(simple&&(stage('spa')>=3||stage('spd')>=3)||stage('spa')>=6) add(-10,'Basic: SpA cap');
        else if(stage('spd')>=6) add(-8,'Basic: SpD cap');
      }
      if(group(k,['Agility','Rock Polish']) && (state.trickRoom || stage('spe')>=6 || simple&&stage('spe')>=3)) add(-10,'Basic: Speed unavailable');
      if(k==='swordsdance' && (stage('atk')>=6 || simple&&stage('atk')>=3)) add(-10,'Basic: Attack cap');
      if(k==='nast yplot'.replace(' ','') && (stage('spa')>=6||simple&&stage('spa')>=3)) add(-10,'Basic: SpA cap');
      if(k==='hail' && (state.weather==='Hail'||foe.ability==='Ice Body'&&state.ability!=='Ice Body')) add(-8,'Basic: Hail already active or aids foe');
      if(k==='stealthrock' && (state.stealthRockActive||state.noTargetReserves)) add(-10,'Basic: hazards already active or no switches');
      if(k==='spikes' && (state.spikesLayers>=3||state.noTargetReserves)) add(-10,'Basic: maximum Spikes / no reserves');
      if(k==='toxicspikes' && (state.toxicSpikesLayers>=2||state.noTargetReserves)) add(-10,'Basic: maximum Toxic Spikes / no reserves');
      if(group(k,['Light Screen','Reflect']) && (k==='lightscreen'?state.lightScreenActive:state.reflectActive)) add(-8,'Basic: screen active');
      if(k==='tailwind' && (state.tailwindActive||state.trickRoom)) add(-10,'Basic: Tailwind unavailable');
      if(group(k,['Recover','Roost','Softboiled','Slack Off','Milk Drink','Heal Order','Moonlight','Morning Sun','Synthesis']) && selfpct===100) add(-8,'Basic: recovery at full HP');
      if(k==='substitute' && state.substituteActive) add(-8,'Basic: already has Substitute');
      if(k==='fakeout' && state.firstTurnOut===false) add(-10,'Basic: Fake Out after switch-in turn');
      if(group(k,['Howl','Sharpen']) && stage('atk')>=6) add(-10,'Basic: Attack already capped');
    }
    // EVALUATE ATTACK: Non-standard damage moves require dedicated routines.
    if(flags.evalAtt) {
      if(atk && !noDamageCompare.has(k)) {
        if(damage>=hp && hp>0 && eff>0) add(move.priority>=1?6:4,'Eval Att: KO');
        else {
          const maxDamage = Math.max(0,...state.moves.filter(m=>m.category!=='Status'&&!noDamageCompare.has(nameKey(m.name))).map(m=>Number(m.damage?.[targetIndex]||0)));
          if(damage<maxDamage) add(-1,'Eval Att: lower damage than another move');
          else if(eff>=4) prob(2,P(176),'Eval Att: 4x effectiveness');
        }
      } else if(atk && (k==='explosion'||k==='selfdestruct')) {
        // The damage-check routine returns zero for Explosion/Selfdestruct.
        // It receives its own probabilistic Eval Att penalty, never KO +4.
        prob(-2,P(205),'Eval Att: Explosion special-case penalty');
        if(eff===4)prob(2,P(176),'Eval Att: Explosion 4x effectiveness');
      } else if(atk) omissions.push('Eval Att special-case damage move '+move.name);
      else if(eff===4) prob(2,P(176),'Eval Att: 4x status-type quirk');
    }
    // EXPERT: Exact rules for the listed move pages only.
    if(flags.expert) {
      if(k==='explosion'||k==='selfdestruct') {
        const evasion=Number(foe.stages?.evasion||0);
        if(evasion>=1)add(-1,'Expert: opponent evasion boosted');
        if(evasion>=3)prob(-1,.5,'Expert: opponent evasion +3 or above');
        if(selfpct<80||foe.userSlower===true){
          if(selfpct>50)prob(-1,P(206),'Expert: Explosion at HP over 50%');
          else {
            prob(1,.5,'Expert: Explosion below 51% HP');
            if(selfpct<31)prob(1,P(206),'Expert: Explosion below 31% HP');
          }
        }else if(foe.userSlower===false || selfpct>=80){
          prob(-3,P(206),'Expert: early Explosion while healthy');
          if(foe.userSlower===null && selfpct>=80)
            omissions.push('Explosion Expert: unknown attack order can alter this rule');
        }
      } else if(k==='curse') {
        if(isGhost) { if(selfpct<81)add(-1,'Expert: ghost Curse low HP'); }
        else if(stage('def')<4) {
          if(state.moves.some(m=>group(m.name,['Gyro Ball','Trick Room']))) {
            // Second coin only runs if first coin succeeds: +0 12.5%, +1 43.75%, +2 43.75%.
            branch([[0,1-P(224)],[1,P(224)*0.5],[2,P(224)*0.5]],'Expert: Gyro Ball/Trick Room synergy');
          } else prob(1,.5,'Expert: Curse setup');
          if(stage('def')<2) prob(1,.5,'Expert: Defense below +2');
          if(stage('def')<1) prob(1,.5,'Expert: Defense below +1');
        }
      } else if(k==='dragondance') {
        if(foe.userSlower) prob(1,.5,'Expert: slower than target');
        else if(selfpct<51) prob(-1,P(186),'Expert: low HP');
      } else if(group(k,['Agility','Rock Polish'])) {
        if(!foe.userSlower)add(-3,'Expert: already faster');
        else prob(3,P(186),'Expert: slower than target');
      } else if(group(k,['Swords Dance','Nasty Plot'])) {
        const boosted=stage(k==='swordsdance'?'atk':'spa');
        if(boosted>=3)prob(-1,P(156),'Expert: attacking stat already boosted');
        if(selfpct===100)prob(2,.5,'Expert: full HP setup');
        else if(selfpct<40)add(-2,'Expert: user below 40% HP');
        else if(selfpct<=70)prob(-2,P(216),'Expert: user at 40–70% HP');
      } else if(k==='stealthrock') {
        if(state.moves.some(m=>group(m.name,['Roar','Whirlwind'])))prob(2,.5,'Expert: hazard + phazing synergy');
        else prob(1,.5,'Expert: Stealth Rock');
      } else if(k==='tailwind') {
        // Initial 25% early-termination gate in the Expert routine.
        if(!foe.userSlower)prob(-1,.75,'Expert: already faster (75% reach check)');
        else if(selfpct<=30)prob(-1,.75,'Expert: user HP low (75% reach check)');
        else if(selfpct>75)prob(1,.75,'Expert: healthy Tailwind');
        else prob(1,.75*.75,'Expert: middling HP Tailwind');
      } else if(k==='pluck') {
        if(state.firstTurnOut)prob(1,P(192),'Expert: first turn on the field');
        if(eff<1) add(-1,'Expert: resisted Pluck');
        else prob(1,.5,'Expert: Pluck benefit');
      } else if(group(k,['Recover','Roost','Softboiled','Slack Off','Milk Drink','Heal Order'])) {
        if(selfpct===100)add(-3,'Expert: already at full HP');
        else if(!foe.userSlower)add(-8,'Expert: faster than target');
        else if(selfpct>=70)prob(-3,P(226),'Expert: high HP recovery');
        else prob(2,P(236),'Expert: low HP recovery');
      } else if(k==='hail') {
        if(selfpct<40)add(-1,'Expert: Hail user low HP');
        else {
          if(['Rain','Sun','Sandstorm'].includes(state.weather))add(1,'Expert: replace weather');
          if(state.moves.some(m=>nameKey(m.name)==='blizzard'))add(2,'Expert: user knows Blizzard');
          if(state.ability==='Ice Body')add(2,'Expert: Ice Body');
        }
      } else if(k==='aquaring') {
        if(selfpct>29)prob(1,.5,'Expert: Aqua Ring at high HP');
      } else if(k==='hypnosis') {
        if(state.moves.some(m=>group(m.name,['Dream Eater','Nightmare']))) prob(1,.5,'Expert: sleep synergy');
      } else if(group(k,['Light Screen','Reflect'])) {
        if(selfpct<50)add(-2,'Expert: HP below 50%');
        else {
          if(selfpct>89)prob(1,.5,'Expert: healthy screen user');
          if(foe.lastMoveCategory===(k==='lightscreen'?'Special':'Physical')) prob(1,P(192),'Expert: opponent last move category');
        }
      } else if(k==='calmmind') {
        // Implement branches as a mixture because the early terminate condition gates downstream -2.
        if(stage('spd')>=3) prob(-1,P(156),'Expert: SpD already boosted');
        if(selfpct===100&&stage('spd')<3) prob(2,.5,'Expert: full-HP Calm Mind');
        const lowHpPenalty = selfpct<40 ? 1 :
          foe.lastMoveCategory==='None' ? P(196) :
          foe.lastMoveCategory==='Physical' ? 1 : 2401/4096;
        // 'Over 69% HP' has a 200/256 chance of terminating before the penalty.
        const activeProb = selfpct>69 ? 1-P(200) : 1;
        prob(-2,activeProb*lowHpPenalty,'Expert: Calm Mind vulnerability');
      } else if(!statusVerifiedExpert.has(k) && !genericAttack.has(k)) omissions.push('Expert for '+move.name+' not verified');
    }
    // DOUBLES vs opponent: only priority + effectiveness route; partner-specific EQ penalty.
    if(flags.doubles && targets.length===2) {
      if(atk && k!=='explosion' && k!=='selfdestruct') {
        if(damage<hp && state.allyAlive!==false && (eff===0.5||eff===0.25))
          prob(eff===0.5?-1:-2,P(192),'Doubles: resisted damage');
        const allyDamages=state.allyMoveDamages?.[targetIndex]||[];
        const other=Math.max(0,...state.moves.filter(m=>m.category!=='Status').map(m=>Number(m.damage?.[targetIndex]||0)),...allyDamages);
        const best = damage>=other && damage>0;
        if(best) {
          // If +1 failed, effectiveness branch may still apply.
          const p2=eff>=4?P(192):eff>=2?P(156):0;
          branch([[1,.5+.5*p2],[0,.5*(1-p2)]], 'Doubles: max damage or super-effective bonus');
        } else if(eff>=2) prob(1,eff>=4?P(192):P(156),'Doubles: super-effective move');
      }
      if(k==='hail') {
        if(['Ice Body','Snow Cloak'].includes(state.ability)||state.moves.some(m=>nameKey(m.name)==='blizzard'))add(2,'Doubles: Hail helps user');
        if(['Ice Body','Snow Cloak'].includes(state.allyAbility)||(state.allyMoves||[]).some(m=>nameKey(m)==='blizzard'))add(2,'Doubles: Hail helps ally');
      }
      if(atk && k!=='earthquake' && (state.allyMoves||[]).some(n=>nameKey(n)==='helpinghand')) add(1,'Doubles: ally knows Helping Hand');
      if(k==='earthquake') {
        const types = (state.allyTypes||[]).map(String);
        if(types.includes('Flying')||state.allyAbility==='Levitate'||state.allyMagnetRise) add(2,'Doubles: immune partner');
        else if(types.some(t=>['Fire','Electric','Poison','Rock'].includes(t))) add(-10,'Doubles: vulnerable partner');
        else add(-3,'Doubles: ordinary partner');
      }
      if(k==='discharge'){
        const types=(state.allyTypes||[]).map(String);
        if(['Volt Absorb','Motor Drive'].includes(state.allyAbility))add(3,'Doubles: ally absorbs electric move');
        else if(types.some(t=>['Water','Flying'].includes(t)))add(-10,'Doubles: electric move endangers ally');
        else if(types.includes('Ground'))add(3,'Doubles: ally immune to Electric');
        else add(-3,'Doubles: Discharge threatens ally');
      }
      if(k==='lavaplume'){
        const types=(state.allyTypes||[]).map(String);
        if(state.ability==='Flash Fire' && state.flashFireActivated)add(1,'Doubles: active Flash Fire');
        if(state.allyAbility==='Dry Skin')add(-3,'Doubles: Dry Skin ally');
        else if(state.allyAbility==='Flash Fire')add(3,'Doubles: Flash Fire ally');
        else if(types.some(t=>['Grass','Steel','Ice','Bug'].includes(t)))add(-10,'Doubles: vulnerable ally');
        else add(-3,'Doubles: Lava Plume threatens ally');
      }
      if(k==='surf') omissions.push('Surf partner check uses separately documented branches; not yet fully transcribed');
    }
    if(flags.setupFirstTurn&&state.firstTurn&&firstTurnEligible.has(k))prob(2,P(176),'Setup First Turn');
    if(flags.risky) {
      if(group(k,['Explosion','Selfdestruct','Hypnosis','Spore','Sleep Powder','Yawn','Confuse Ray','Swagger','Counter','Mirror Coat','Metal Burst','Fissure','Guillotine','Horn Drill','Sheer Cold','Sucker Punch','Focus Punch','Destiny Bond','Belly Drum'])) prob(2,.5,'Risky');
      else if(!genericAttack.has(k) && !boosting.has(k))omissions.push('Risky move eligibility unverified: '+move.name);
    }
    if(flags.prioDamage) {
      if(prioVerified.has(k))prob(2,P(156),'Prio Damage');
      else if(!genericAttack.has(k)) omissions.push('Prio Damage unverified: '+move.name);
    }
    if(flags.batonPass && (k==='explosion'||k==='selfdestruct')) {
      if(state.partyHasReserve===false){ /* no scoring */ }
      else if(state.partyHasReserve==null)omissions.push('Explosion Baton Pass needs AI reserve count');
      else {
        const hasBP=state.moves.some(m=>nameKey(m.name)==='batonpass');
        const reach=hasBP?1:1-P(79);
        const first=state.firstTurn===true;
        if(state.firstTurn==null)omissions.push('Explosion Baton Pass needs battle turn');
        if(first){
          const tail=selfpct<60?-10:1;
          branch([[0,1-reach],[8,reach*P(237)],[tail,reach*(1-P(237))]],
            'Baton Pass: Explosion first turn');
        } else {
          const tail=selfpct<60?-10:1;
          branch([[0,1-reach],[3+tail,reach*P(237)],[tail,reach*(1-P(237))]],
            'Baton Pass: Explosion later turn');
        }
      }
    } else if(flags.batonPass && batonVerified.has(k) && state.partyHasReserve!==false) {
      const hasBP=state.moves.some(m=>nameKey(m.name)==='batonpass');
      const go=hasBP?1:(k==='dragondance'?1-P(81):1-P(79));
      if(k==='dragondance'){
        branch([[0,1-go],[state.firstTurn?5:selfpct>59?1:-10,go]],'Baton Pass: Dragon Dance setup');
      }else{
        const main=state.firstTurn?8:3;
        const p=P(237);
        branch([[0,1-go],[main,go*p],[selfpct<60?-10:1,go*(1-p)]], 'Baton Pass: possible setup or HP penalty');
      }
    }else if(flags.batonPass&&!batonVerified.has(k)&&boosting.has(k))omissions.push('Baton Pass flag for '+move.name+' not verified');
    if(flags.checkHP && (k==='explosion'||k==='selfdestruct')) {
      const userHigh=selfpct>30, targetLow=foepct<31;
      // A successful first -2 check terminates this flag; subsequent checks
      // run only if it fails. Therefore the penalties do not stack.
      const p=userHigh?(targetLow?1-(1-P(206))**2:P(206)):(targetLow?P(206):0);
      if(p)prob(-2,p,'Check HP: Explosion suicide timing');
    } else if(flags.checkHP) {
      // Sequential checks: the second roll occurs ONLY if the first did not score -2.
      const userLow=group(k,['Dragon Dance','Agility','Rock Polish','Calm Mind','Swords Dance','Nasty Plot','Bulk Up']) && selfpct<70;
      const targetLow=group(k,['Dragon Dance','Agility','Rock Polish','Calm Mind','Swords Dance','Nasty Plot','Bulk Up']) && foepct<71;
      const screenLow=group(k,['Light Screen','Reflect'])&&selfpct<71;
      const screenTargetLow=group(k,['Light Screen','Reflect'])&&foepct<31;
      const statusLow=directStatus.has(k)&&foepct<31;
      if(userLow||targetLow||screenLow||screenTargetLow||statusLow){
        const checks=Number(userLow||screenLow||statusLow)+Number(targetLow||screenTargetLow);
        prob(-2,1-(1-P(206))**checks, 'Check HP: first successful check terminates');
      }else if(!group(k,['Curse','Earthquake','Rock Slide','Iron Head','Pluck','Stealth Rock'])&&!genericAttack.has(k))omissions.push('Check HP rule for '+move.name+' not fully verified');
    }
    if(flags.harassment && harassMoves.has(k)) prob(2,.5,'Harassment: disruption');
    if(flags.weather){
      if(k==='hail'&&state.firstTurn&&state.weather!=='Hail')add(1,'Weather: first turn Hail');
      else if(k!=='hail')omissions.push('Weather flag for '+move.name+' not implemented');
    }
    if(flags.setupFirstTurn&&state.firstTurn&&!firstTurnEligible.has(k) && !genericAttack.has(k)) omissions.push('Setup First Turn eligibility for '+move.name+' not verified');
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
    const targetCount=state.targets.length;
    if(![1,2].includes(targetCount)) throw new Error('Supply one or two opponent targets');
    // Missing/ambiguous damage or type information is NOT interpreted as zero
    // or neutral effectiveness: that would fabricate a meaningful AI decision.
    for(const m of state.moves)for(let t=0;t<targetCount;t++){
      const k=nameKey(m.name),attacking=m.category!=='Status'&&!statusMoves.has(k);
      if(attacking&&m.category!=='Physical'&&m.category!=='Special')throw new Error('Move category unavailable for '+m.name);
      if(attacking&&(m.effectiveness?.[t]==null||!Number.isFinite(Number(m.effectiveness[t]))))throw new Error('Move effectiveness unavailable for '+m.name);
      if(attacking&&!noDamageCompare.has(k)&&(m.damage?.[t]==null||!Number.isFinite(Number(m.damage[t]))))throw new Error('AI damage unavailable for '+m.name+' vs target '+(t+1));
      if(k==='curse'&&(!Array.isArray(state.types)||!state.types.length))throw new Error('AI typing unavailable for Curse');
    }
    const perTarget=[];const explanations=[];const omissions=new Set();
    for(let t=0;t<targetCount;t++) {
      const computed=state.moves.map(move=>runScore(state,move,t));
      computed.forEach(c=>c.omissions.forEach(x=>omissions.add(x)));
      explanations[t]=computed.map(x=>x.log);
      perTarget[t]=targetOutcomes(computed.map(x=>x.pmf));
    }
    const choice=state.moves.map(()=>({total:0,targets:Array(targetCount).fill(0)}));
    for(let t=0;t<targetCount;t++)for(const outcome of perTarget[t]) {
      const others=targetCount===2?perTarget[1-t]:[];
      const otherLT=targetCount===1?1:others.filter(o=>o.score<outcome.score).reduce((a,b)=>a+b.probability,0);
      const otherEQ=targetCount===1?0:others.filter(o=>o.score===outcome.score).reduce((a,b)=>a+b.probability,0);
      const p=outcome.probability*(otherLT+.5*otherEQ);
      choice[outcome.move].total+=p;
      choice[outcome.move].targets[t]+=p;
    }
    return {choice,explanations,omissions:[...omissions],perTarget,mode:targetCount===2?'Doubles':'Singles'};
  }
  return {calculate, runScore, targetOutcomes, chance, convolve, pct, nameKey};
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
  const STATUS=new Set(('Acid Armor,Agility,Amnesia,Aqua Ring,Attract,Baton Pass,Belly Drum,Block,Bulk Up,Calm Mind,Charm,Confuse Ray,Cosmic Power,Curse,Defend Order,Defog,Destiny Bond,Detect,Disable,Double Team,Dragon Dance,Embargo,Encore,Endure,FeatherDance,Flash,Focus Energy,Follow Me,Glare,Growth,Hail,Harden,Haze,Heal Bell,Helping Hand,Howl,Hypnosis,Imprison,Ingrain,Iron Defense,Leech Seed,Light Screen,Lock-On,Lovely Kiss,Lucky Chant,Magic Coat,Magnet Rise,Mean Look,Memento,Metal Sound,Milk Drink,Minimize,Mist,Moonlight,Morning Sun,Nasty Plot,Nightmare,Odor Sleuth,Pain Split,Perish Song,Poison Gas,PoisonPowder,Protect,Psych Up,Rain Dance,Recover,Reflect,Refresh,Rest,Roar,Rock Polish,Role Play,Roost,Safeguard,Sand-Attack,Sandstorm,Scary Face,Screech,Sharpen,Sing,Skill Swap,Sleep Powder,Sleep Talk,Slack Off,Smokescreen,Softboiled,Spikes,Spite,Spore,Stealth Rock,String Shot,Stun Spore,Substitute,Sunny Day,Supersonic,Swagger,Sweet Kiss,Sweet Scent,Swords Dance,Synthesis,Tail Glow,Tail Whip,Tailwind,Taunt,Teeter Dance,Thunder Wave,Tickle,Torment,Toxic,Toxic Spikes,Trick,Trick Room,Will-O-Wisp,Wish,Withdraw,Worry Seed,Yawn').split(',').map(x=>x.toLowerCase().replace(/[^a-z0-9]/g,'')));
  const SPECIAL=new Set(('Air Cutter,Air Slash,Aura Sphere,Aurora Beam,Blizzard,Bubble,BubbleBeam,Bug Buzz,Charge Beam,Dark Pulse,Discharge,Draco Meteor,Dragon Pulse,DragonBreath,Earth Power,Energy Ball,Extrasensory,Fire Blast,Fire Spin,Flamethrower,Flash Cannon,Focus Blast,Giga Drain,Grass Knot,Heat Wave,Hidden Power,Hydro Cannon,Hydro Pump,Hyper Beam,Ice Beam,Icy Wind,Lava Plume,Leaf Storm,Magical Leaf,Muddy Water,Ominous Wind,Overheat,Psychic,Psybeam,Shadow Ball,Shock Wave,Signal Beam,Sludge Bomb,Sludge Wave,SolarBeam,Spacial Rend,Surf,Swift,Thunder,Thunderbolt,Tri Attack,Twister,Vacuum Wave,Water Pulse,Water Spout,Weather Ball,Whirlpool,Zap Cannon').split(',').map(x=>x.toLowerCase().replace(/[^a-z0-9]/g,'')));
  const PHYSICAL=new Set(('Aerial Ace,Aqua Jet,Aqua Tail,Avalanche,Bite,Body Slam,Brick Break,Bug Bite,Bullet Punch,Close Combat,Counter,Crunch,Dig,Double-Edge,Dragon Claw,Dragon Rush,Earthquake,Explosion,ExtremeSpeed,Facade,Fake Out,Fire Fang,Fire Punch,Flare Blitz,Focus Punch,Giga Impact,Head Smash,Ice Fang,Ice Punch,Ice Shard,Iron Head,Iron Tail,Knock Off,Low Kick,Mach Punch,Mega Kick,Megahorn,Metal Claw,Night Slash,Outrage,Payback,Pluck,Poison Jab,Pursuit,Quick Attack,Razor Leaf,Return,Reversal,Rock Slide,Rock Tomb,Shadow Claw,Shadow Sneak,Stone Edge,Struggle,Substitute,Sucker Punch,Superpower,Tackle,Take Down,Thunder Fang,ThunderPunch,Trick Room,U-turn,Volt Tackle,Waterfall,Wood Hammer,X-Scissor,Zen Headbutt,Double Hit,Double Kick,Bonemerang,Twineedle,DoubleSlap,Fury Swipes,Fury Attack,Bullet Seed,Rock Blast,Icicle Spear,Pin Missile,Bone Rush,Arm Thrust,Comet Punch,Barrage,Spike Cannon,Tail Slap,Triple Kick,Triple Axel').split(',').map(x=>x.toLowerCase().replace(/[^a-z0-9]/g,'')));
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
    return {name,category,type:moveType||typeName(raw?.type),basePower:bp,priority:pri,hitInfo:readHitInfo(name,raw),source:dataCategory?'native':categoryInferred?'inferred power':category?'reference':'unknown',isStatus:specialStatus};
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
  // Calculate integers consistent with the calculator's *rounded* displayed max
  // percent; avoid rounding a percentage directly back to damage when ambiguous.
  function parseDamageDetail(text,maxHp){
    if(!Number.isInteger(maxHp)||maxHp<=0)return {damage:null,reason:'Missing target maximum HP'};
    const stripped=normalize(text).replace(/\s*\(AI(?: est)?:\s*~?\d+(?:\.\d+)?%\)/ig,'');
    const match=stripped.match(/(\d+(?:\.\d+)?)\s*%?\s*[-–—]\s*(\d+(?:\.\d+)?)\s*%/);
    if(!match)return {damage:null,reason:'No damage range in result'};
    const pct=Number(match[2]),decimals=(match[2].split('.')[1]||'').length,epsilon=0.5*10**(-decimals);
    // The display rounds a raw integer HP damage percentage; it does NOT
    // mean that the game rounds damage itself. Invert that rounding and keep
    // all integer candidates. At the 0.05% boundary, test the formatting
    // rather than accidentally including both sides of a half-up tie.
    const lower=Math.max(0,Math.ceil((pct-epsilon)*maxHp/100-2));
    const upper=Math.floor((pct+epsilon)*maxHp/100+2);
    const possible=[];
    for(let d=lower;d<=upper;d++){
      if(Number((100*d/maxHp).toFixed(decimals))===pct)possible.push(d);
    }
    if(possible.length===1)return {damage:possible[0],reason:'Unique HP damage consistent with rounded displayed percentage',percentage:pct,exactDisplay:true};
    if(!possible.length)return {damage:null,reason:'Displayed percentage is inconsistent with conventional decimal rounding; native integer damage required',percentage:pct};
    const min=possible[0],max=possible[possible.length-1];
    // The displayed percentage is genuinely insufficient to uniquely recover
    // HP damage. Show an estimate, never disguise it as exact cartridge damage.
    return {damage:null,estimatedDamage:Math.round((min+max)/2),reason:`Ambiguous rounded damage (${min}–${max} HP)`,percentage:pct,range:[min,max],approximate:true};
  }
  function parseDamage(text,maxHp){return parseDamageDetail(text,maxHp).damage;}
  // Values below are read from the *calculator*, never from an extension form.
  // A missing field stays null; false and zero are not interchangeable with missing.
  const FLAG_KEYS=['basic','evalAtt','expert','doubles','setupFirstTurn','risky','prioDamage','batonPass','checkHP','weather','harassment'];
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
      spikes:numeric(doc,[`#spikes${code}`,`#${code==='R'?'p2':'p1'} .spikes-layers`]),
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
    return {userSlower:ai.value<foe.value,source:'effective Speed from calculator',
      aiSpeed:ai.value,foeSpeed:foe.value,reason:ai.value===foe.value?'Speed tie':null};
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
    const ally=doubles?{
      ...fromSide(doc,'R',2),types:readTypes(doc,'R',2),ability:readAbility(doc,'R',2),
      moves:Array.from({length:4},(_,i)=>moveMetadata(doc,i,'R2',globals))
    }:null;
    const second=doubles?{
      ...fromSide(doc,'L',2),types:readTypes(doc,'L',2),ability:readAbility(doc,'L',2),
      status:readStatus(doc,'L',2),name:select(doc,['#p1-2 .set-selector','#p1-2 .species'])
    }:null;
    if(doubles && (!(second?.hp!=null&&second?.maxHp!=null&&second?.types?.length)||!ally?.types?.length))
      note('Doubles board','Calculator does not expose all four active Pokémon');
    const targets=[{...opponent,types:playerTypes,ability:readAbility(doc,'L'),
      status:readStatus(doc,'L'),stages:readBoosts(doc,'L'),name:select(doc,['#p1 .set-selector','#p1 .species'])||'Opponent A',
      lastMoveCategory:readHistory(doc,'L').lastMoveCategory,safeguard:field.foe.safeguard,
      userSlower:readAttackOrder(doc,'R','L').userSlower}];
    if(doubles)targets.push({...(second||{}),name:second?.name||'Opponent B',
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
        if(['explosion','selfdestruct'].includes(flatKey(meta.name))){
          // Explosion is not merely a high-damage hit in Gen 4 AI scoring.
          // The ordinary AI damage check returns 0 and is explicitly excluded
          // from comparisons. Use separate Explosion AI scoring routines.
          move.damage[t]=0;
          move.damageNotes[t]={damage:0,approximate:false,
            reason:'Explosion is excluded from the AI damage comparison; scored by special routines'};
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
      aiStatus:readStatus(doc,'R'),stages:readBoosts(doc,'R'),
      firstTurn:field.turn==null?null:field.turn===1,firstTurnOut:history.firstTurnOut,
      weather:field.weather,trickRoom:field.trickRoom,
      stealthRockActive:field.foe.stealthRock,spikesLayers:field.foe.spikes,toxicSpikesLayers:field.foe.toxicSpikes,
      lightScreenActive:field.own.lightScreen,reflectActive:field.own.reflect,tailwindActive:field.own.tailwind,
      allyAlive:ally?ally.hp!=null&&ally.hp>0:null,allyTypes:ally?.types||null,
      allyAbility:ally?.ability||null,allyMoves:ally?.moves||null,
      allyMagnetRise:doubles?readBoolean(doc,['#magnetRiseR2','#p2-2 .magnet-rise']):null,
      noTargetReserves:readBoolean(doc,['#noTargetReservesL','#p1 [data-no-reserves]']),
      partyHasReserve:readBoolean(doc,['#p2 [data-party-has-reserve]','#ai-party-has-reserve']),
      targets,moves
    };
    return {state,issues,source:trainer.source};
  }

  return {TYPES,fromSide,readTypes,readAbility,readStatus,readItem,readBoosts,readSpeed,readFormat,readWeather,readTrickRoom,moveMetadata,typeEffectiveness,parseDamage,parseDamageDetail,numeric:number,decodeFlags,parseVisibleFlagLabels,readVisibleFlagBadges,readTrainerFlags,rawDamageFromText,readBoolean,readFieldState,readHistory,readAttackOrder,effectiveSpeed,readNativeDamage,readAIDamage,readHitInfo,readBattle};
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
    lastMoveCategory:{label:'Opponent’s previous move category',options:['None','Physical','Special','Status'],detail:'Reflect, Light Screen, Calm Mind'},
    userSlower:{label:'AI Pokémon is slower than this opponent',detail:'Speed-dependent Expert scoring'},
    safeguard:{label:'Opponent is protected by Safeguard',detail:'Status-move prevention'},
    cursed:{label:'Opponent is already affected by Ghost Curse',detail:'Ghost-type Curse scoring'}
  };
  function descriptorsFor(state) {
    const moves=(state.moves||[]).filter(m=>m?.name && norm(m.name)!=='nomove');
    const has=names=>matches(moves,names);
    const enabled=name=>state.flags==null || !!state.flags[name];
    const list=[];
    const push=(field,group='General',t=null)=>{
      const value=t===null?state[field]:state.targets?.[t]?.[field];
      // Calculator state takes precedence over user-provided history overrides.
      if(value!==undefined && value!==null && value!=='')return;
      const def=descriptors[field];if(!def)return;
      list.push({id:t===null?'state.'+field:'target.'+t+'.'+field,field,group,targetIndex:t,...def});
    };
    if(enabled('setupFirstTurn')||enabled('batonPass')||enabled('weather')){
      if(has(['curse','dragondance','calmmind','swordsdance','nast yplot'.replace(' ',''),
        'agility','rockpolish','reflect','lightscreen','hail','explosion','selfdestruct',
        'bellydrum','growth','trickroom']))push('firstTurn','Turn history');
    }
    if(has(['pluck','fakeout']))push('firstTurnOut','Turn history');
    if(has(['dragondance','agility','rockpolish','tailwind']) && enabled('basic'))push('trickRoom','Field conditions');
    if(has(['explosion','selfdestruct']) || enabled('batonPass') && has(['curse','dragondance','calmmind']))
      push('partyHasReserve','Party information');
    if(has(['explosion','selfdestruct','stealthrock','spikes','toxicspikes']))push('noTargetReserves','Party information');
    if(has(['stealthrock']))push('stealthRockActive','Field conditions');
    if(has(['spikes']))push('spikesLayers','Field conditions');
    if(has(['toxicspikes']))push('toxicSpikesLayers','Field conditions');
    if(has(['reflect']))push('reflectActive','Field conditions');
    if(has(['lightscreen']))push('lightScreenActive','Field conditions');
    if(has(['tailwind']))push('tailwindActive','Field conditions');
    if(has(['substitute']))push('substituteActive','Field conditions');
    if(has(['hail','raindance','sunnyday','sandstorm']) && enabled('expert'))push('weather','Field conditions');
    if(state.format==='Doubles'){
      if(has(['earthquake']))push('allyMagnetRise','Doubles ally');
      if(has(['lavaplume']))push('flashFireActivated','Doubles ally');
      if(has(['earthquake','discharge','surf','lavaplume','rockslide','blizzard']))push('allyAlive','Doubles ally');
    }
    for(let t=0;t<(state.targets?.length||0);t++){
      const group=state.targets.length>1?`Opponent ${t+1}`:'Opponent history';
      if(enabled('expert') && has(['reflect','lightscreen','calmmind']))push('lastMoveCategory',group,t);
      if(enabled('expert') && has(['dragondance','agility','rockpolish','tailwind','recover','roost','softboiled','slackoff','milkdrink','healorder','explosion','selfdestruct']))
        push('userSlower',group,t);
      if(has(['hypnosis','spore','sleeppowder','yawn','toxic','thunderwave','willowisp','glare','stunspore']))push('safeguard',group,t);
      if(has(['curse']) && (state.types||[]).includes('Ghost'))push('cursed',group,t);
    }
    return list;
  }
  function apply(state,overrides={}){
    // Never mutate the parsed calculator snapshot; keep context inputs separate.
    const copy={...state,targets:(state.targets||[]).map(t=>({...t}))};
    for(const [path,value] of Object.entries(overrides)){
      if(value===null||value===undefined||value==='')continue;
      const match=path.match(/^target\.(\d+)\.([a-zA-Z]+)$/);
      if(match){const i=Number(match[1]),field=match[2];
        if(copy.targets[i] && copy.targets[i][field]==null)copy.targets[i][field]=value;
      }else if(path.startsWith('state.')){
        const field=path.slice('state.'.length);
        if(copy[field]==null)copy[field]=value;
      }
    }
    // The AI checks both conditions in different routines; they describe the
    // same underlying opponent reserve state.
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
  const doc=document;
  if(!doc.body||!globalThis.PKAI||!globalThis.PKAICalcAdapter||!globalThis.PKAIContext)return;
  if(doc.getElementById('pkai-context')?.dataset?.pkaiVersion==='1.4.0')return;
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
    return JSON.stringify([flagsKey(),selectedSet('#p1'),selectedSet('#p2-2'),selectedSet('#p1-2')]);
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
  const panel=create('section',null);panel.id='pkai-context';panel.dataset.pkaiVersion='1.4.0';panel.setAttribute('aria-label','AI scoring context');
  contextHost().appendChild(panel);
  function attachPanel(){
    const host=contextHost();if(panel.parentNode!==host)host.appendChild(panel);
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
      input.checked=!!chosen[flag];input.id='pkai-flag-'+flag;
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
    const header=create('div',null,'pkai-header');header.appendChild(create('span','AI scoring context'));
    header.appendChild(create('span',snapshot.flagsSource==='native'?'Flags: read from trainer':'Flags: assumed for preview'));
    panel.appendChild(header);
    panel.appendChild(create('div','Move odds appear beside enemy damage ranges. Checkboxes appear only for conditions the calculator cannot infer. Checked = Yes; unchecked = No; ↺ = reset to Unknown.','pkai-help'));
    const speed=adapter.readAttackOrder(doc,'R','L');
    if(Number.isFinite(speed.aiSpeed)&&Number.isFinite(speed.foeSpeed)){
      panel.appendChild(create('div',
        `Speed read automatically: AI ${speed.aiSpeed} / opponent ${speed.foeSpeed} — `+
        (speed.aiSpeed<speed.foeSpeed?'AI slower':speed.aiSpeed>speed.foeSpeed?'AI faster':'Speed tie')+
        '. Trick Room reverses move order but not these Speed values.','pkai-help'));
    }
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
    if(!applicable.length && snapshot.state.flags)panel.appendChild(create('div','No additional history inputs needed for the recognized scoring rules.','pkai-help'));
    if(blockers.length)panel.appendChild(create('div','AI odds unavailable: '+blockers[0],'pkai-warning'));
    if(notes.length)panel.appendChild(create('div','Estimated odds: '+notes[0],'pkai-warning'));
    if((missing.length||result?.omissions?.length||snapshot.issues?.length||blockers.length)){
      const details=create('details');const summary=create('summary','Scoring diagnostics');details.appendChild(summary);
      const ul=create('ul');
      const all=[...blockers,...missing,...(result?.omissions||[]),...(snapshot.issues||[]).map(x=>x.field+': '+x.detail)];
      for(const item of [...new Set(all)].slice(0,24))ul.appendChild(create('li',item));
      details.appendChild(ul);panel.appendChild(details);
    }
    panel.appendChild(create('div','~ = estimated odds. Some Platinum Kaizo scoring rules and AI damage quirks are not yet implemented.','pkai-approx'));
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
  // A single unfamiliar move must not make the other three disappear.
  // For incomplete slots, score a clearly labelled *conditional* scenario:
  // unknown move damage is treated as no KO, and unknown type as neutral.
  // Never return this scenario as cartridge-accurate odds.
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
          warnings.push(m.name+' AI damage unavailable vs opponent '+(i+1)+
            '; conditional scenario assumes it does not KO.');
          next.damage[i]=0;
        }
      }
      return next;
    });
    if(!state.flags)b.push('Trainer AI flags not found');
    if(!Number.isFinite(state.hp)||!Number.isFinite(state.maxHp)||state.maxHp<=0||
       (state.targets||[]).some(t=>!Number.isFinite(t.hp)||!Number.isFinite(t.maxHp)||t.maxHp<=0))
      b.push('Current/max HP not readable from the calculator');
    if(state.targets?.length===2 && ![1,2].includes(state.allyTypes?.length))
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
      const original=snapshot.state;
      // Controls are keyed to the current matchup, not carried across foes.
      let state=context.apply(original,store);
      const notes=[];
      if(!state.format){state={...state,format:'Singles'};notes.push('Battle format not exposed; treating it as Singles.');}
      const flagsSource=state.flags?'native':'conditional-preview';
      if(!state.flags && !flagPreviewDisabled.has(flagsKey())){
        state={...state,flags:manualFlagsBySelection.get(flagsKey())||assumedFlags(state.format)};
        notes.push('CONDITIONAL PREVIEW: trainer AI flag mask was not found. The current checkboxes are assumptions, not detected trainer data.');
      }
      // IMPORTANT: derive which controls exist from the unmodified calculator
      // snapshot, not from the user's overrides.  Otherwise the instant a user
      // checks an Unknown box, it ceases to be "missing" and disappears.
      // Retain the chosen flag mask so only relevant controls are displayed.
      const applicable=context.descriptorsFor({...original,flags:state.flags,format:state.format});
      const unresolved=applicable.filter(x=>inputValue(store,x.id)==null);
      if(unresolved.length)notes.push(unresolved.length+' history/field conditions remain unknown.');
      const prepared=prepareScoringState(state);
      const blockers=prepared.blockers;
      if(prepared.warnings.length)notes.push('CONDITIONAL SCORING: '+prepared.warnings.join(' '));
      let result=null;
      if(!blockers.length){try{result=engine.calculate(prepared.state);}catch(e){blockers.push(e.message||String(e));}}
      const missing=unresolved.map(x=>x.label+' (not provided by calculator)');
      latest={snapshot:{...snapshot,state,flagsSource},missing,blockers,result,notes,controls:applicable,
        scoringState:prepared.state,readingWarnings:prepared.warnings};
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
  globalThis.PKAIInline={version:'1.4.0',refresh:refreshView,snapshot:()=>latest?.snapshot?.state,
    locations:locateInline,diagnostics:()=>latest?.error?[latest.error]:[...(latest?.blockers||[]),...(latest?.missing||[]),...(latest?.notes||[])],
    controls:()=>latest?.controls||[],
    flagSource:()=>latest?.snapshot?.flagsSource,
    blockers:()=>latest?.blockers||[],
    readingWarnings:()=>latest?.readingWarnings||[],
    flagRead:()=>adapter.readTrainerFlags(doc,globalThis)};
  refreshView();
})();

