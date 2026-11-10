// ==UserScript==
// @name         Platinum Kaizo AI Odds � Inline Damage Results
// @namespace    https://github.com/hzla/Dynamic-Calc-Decomps
// @version      0.7.0
// @description  Fixed inline odds mounting beside damage results; auto-read state and Quick HP.
// @match        https://hzla.github.io/Dynamic-Calc-Decomps/*
// @match        https://hzla.github.io/Dynamic-Calc/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

/* Platinum Kaizo AI score distribution prototype.
 * The distribution math and per-target selection rules are exact for the modeled rules.
 * Unmodeled move-specific rules and calculator-vs-AI damage differences are reported.
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
  const prioVerified = new Set(['Curse','Dragon Dance','Calm Mind','Light Screen','Hypnosis','Agility','Aqua Ring','Hail'].map(nameKey));
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
      if(atk && (immuneByType||abilityImmune)) add(-10,'Basic: type or ability immunity');
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
      } else if(atk) omissions.push('Eval Att special-case damage move '+move.name);
      else if(eff===4) prob(2,P(176),'Eval Att: 4x status-type quirk');
    }
    // EXPERT: Exact rules for the listed move pages only.
    if(flags.expert) {
      if(k==='curse') {
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
      if(atk) {
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
      if(group(k,['Hypnosis','Spore','Sleep Powder','Yawn','Confuse Ray','Swagger','Counter','Mirror Coat','Metal Burst','Fissure','Guillotine','Horn Drill','Sheer Cold','Sucker Punch','Focus Punch','Destiny Bond','Belly Drum'])) prob(2,.5,'Risky');
      else if(!genericAttack.has(k) && !boosting.has(k))omissions.push('Risky move eligibility unverified: '+move.name);
    }
    if(flags.prioDamage) {
      if(prioVerified.has(k))prob(2,P(156),'Prio Damage');
      else if(!genericAttack.has(k)) omissions.push('Prio Damage unverified: '+move.name);
    }
    if(flags.batonPass && batonVerified.has(k) && state.partyHasReserve!==false) {
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
    if(flags.checkHP) {
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
  const PHYSICAL=new Set(('Aerial Ace,Aqua Jet,Aqua Tail,Avalanche,Bite,Body Slam,Brick Break,Bug Bite,Bullet Punch,Close Combat,Counter,Crunch,Dig,Double-Edge,Dragon Claw,Dragon Rush,Earthquake,Explosion,ExtremeSpeed,Facade,Fake Out,Fire Fang,Fire Punch,Flare Blitz,Focus Punch,Giga Impact,Head Smash,Ice Fang,Ice Punch,Ice Shard,Iron Head,Iron Tail,Knock Off,Low Kick,Mach Punch,Mega Kick,Megahorn,Metal Claw,Night Slash,Outrage,Payback,Pluck,Poison Jab,Pursuit,Quick Attack,Razor Leaf,Return,Reversal,Rock Slide,Rock Tomb,Shadow Claw,Shadow Sneak,Stone Edge,Struggle,Substitute,Sucker Punch,Superpower,Tackle,Take Down,Thunder Fang,ThunderPunch,Trick Room,U-turn,Volt Tackle,Waterfall,Wood Hammer,X-Scissor,Zen Headbutt').split(',').map(x=>x.toLowerCase().replace(/[^a-z0-9]/g,'')));
  const PRIORITY={'quickattack':1,'machpunch':1,'bulletpunch':1,'aquajet':1,'iceshard':1,'shadowsneak':1,'suckerpunch':1,'extremespeed':1,'fakeout':1,'vacuumwave':1,'feint':2,'protect':3,'detect':3,'endure':3,'helpinghand':5,'followme':3,'roar':-6,'whirlwind':-6,'trickroom':-7,'counter':-5,'mirrorcoat':-5,'metalburst':0};
  const key=x=>normalize(x).toLowerCase().replace(/[^a-z0-9]/g,'');
  function moveMetadata(doc,index,side='R',globals={}){
    const row=moveRow(doc,index,side), n=index+1;
    const name=select(doc,[`#${sideId(side)} .move${n} select.move-selector`,`#move${side}${n}`]) || normalize(doc.querySelector(`#resultMove${side}${n}`)?.nextElementSibling?.textContent).replace(/\s*\(AI:\s*~?\d+(?:\.\d+)?%\)/g,'');
    const moveType=typeName(row?.querySelector('select.move-type')?.value)||null;
    const bp=number(row?.querySelector('input.move-bp')?.value);
    const k=key(name), raw=(globals.moves||globals.MOVES||globals.moveData||{})[name]||(globals.moves||globals.MOVES||globals.moveData||{})[k];
    const dataCategory=['Physical','Special','Status'].includes(raw?.category)?raw.category:null;
    const category=dataCategory||(STATUS.has(k)?'Status':SPECIAL.has(k)?'Special':PHYSICAL.has(k)?'Physical':null);
    const pri=Number.isInteger(raw?.priority)?raw.priority:PRIORITY[k]??0;
    const specialStatus=category==='Status';
    return {name,category,type:moveType||typeName(raw?.type),basePower:bp,priority:pri,source:dataCategory?'native':category?'reference':'unknown',isStatus:specialStatus};
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
    const stripped=normalize(text).replace(/\s*\(AI:\s*~?\d+(?:\.\d+)?%\)/ig,'');
    const match=stripped.match(/(\d+(?:\.\d+)?)\s*%?\s*[-–—]\s*(\d+(?:\.\d+)?)\s*%/);
    if(!match)return {damage:null,reason:'No damage range in result'};
    const pct=Number(match[2]),decimals=(match[2].split('.')[1]||'').length,epsilon=0.5*10**(-decimals);
    const lower=Math.max(0,Math.ceil((pct-epsilon)*maxHp/100-1e-9));
    const upper=Math.floor((pct+epsilon)*maxHp/100+1e-9);
    if(lower===upper)return {damage:lower,reason:'Inferred unique max HP damage from rounded display',percentage:pct,exactDisplay:true};
    return {damage:null,reason:`Ambiguous rounded damage (${lower}–${upper} HP)`,percentage:pct,range:[lower,upper]};
  }
  function parseDamage(text,maxHp){return parseDamageDetail(text,maxHp).damage;}
  // Values below are read from the *calculator*, never from an extension form.
  // A missing field stays null; false and zero are not interchangeable with missing.
  const FLAG_KEYS=['basic','evalAtt','expert','doubles','setupFirstTurn','risky','prioDamage','batonPass','checkHP','weather','harassment'];
  const flagSynonyms={
    basic:['basic'],evalAtt:['evalatt','evaluateattack','evalattack'],expert:['expert'],
    doubles:['doubles','tagstrategy','tag'],setupFirstTurn:['setupfirstturn','firstturnsetup'],
    risky:['risky'],prioDamage:['priodamage','prioritizedamage','damageprio','prioritizeextremes'],
    batonPass:['batonpass'],checkHP:['checkhp'],weather:['weather'],harassment:['harassment','harass']
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
    if(/^\d+$/.test(s)){
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
  function readTrainerFlags(doc,globals={}){
    const nodes=['#p2 [data-ai-flags]','#p2 [data-ai-mask]','.trainer-pok-list .selected[data-ai-flags]',
      '#ai-container [data-ai-flags]','[data-trainer-ai-flags]','#ai-flags','#trainer-ai-flags'];
    for(const selector of nodes){
      const e=doc.querySelector(selector);if(!e)continue;
      for(const v of [e.getAttribute?.('data-ai-flags'),e.getAttribute?.('data-ai-mask'),e.getAttribute?.('data-trainer-ai-flags'),val(e)]){
        const f=decodeFlags(v);if(f)return {flags:f,source:'calc DOM '+selector};
      }
    }
    const raw=doc.querySelector('#p2 .set-selector')?.value?.trim();
    const stores=['SETDEX','SETDEX_BW','setdex','TRAINERS','trainers','trainerData','trainerSets','SETDEX_SM'];
    for(const key of stores){
      const data=globals[key];if(!data || typeof data!=='object')continue;
      const candidates=[];
      if(raw && Object.hasOwn(data,raw))candidates.push(data[raw]);
      // Many Showdown calc data sets store species -> named set, not named set -> species.
      const species=select(doc,['#p2 .set-selector','#p2 .species']);
      if(species&&data[species]){
        candidates.push(data[species]);
        if(raw&&data[species]?.[raw])candidates.push(data[species][raw]);
      }
      for(const c of candidates){const f=decodeFlags(c);if(f)return {flags:f,source:'calc data '+key};}
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
  function readNativeDamage(doc,i,maxHp){
    const e=doc.getElementById?.('resultDamageR'+(i+1));
    if(!e)return {damage:null,reason:'Missing resultDamageR'+(i+1)};
    for(const attr of ['data-ai-max-damage','data-max-damage','data-maxdamage','data-damage-max']){
      const n=number(e.getAttribute?.(attr));
      if(n!=null&&Number.isInteger(n)&&n>=0)return {damage:n,reason:'Calculator '+attr,exactDisplay:true};
    }
    const str=Array.from(e.childNodes||[]).filter(n=>n.nodeType===3).map(n=>n.textContent).join('')||e.textContent||'';
    return parseDamageDetail(str,maxHp);
  }
  function readAttackOrder(doc,side='R',target='L'){
    const a=readSpeed(doc,side),b=readSpeed(doc,target);
    // The .totalMod field in Showdown calcs is the post-modifier stat. If not
    // present, we have no reliable basis for speed order with boosts/status/weather.
    const aMod=numeric(doc,[`#${sideId(side)} .sp .totalMod`,`#${sideId(side)} .spe .totalMod`]);
    const bMod=numeric(doc,[`#${sideId(target)} .sp .totalMod`,`#${sideId(target)} .spe .totalMod`]);
    if(aMod!=null&&bMod!=null&&aMod!==bMod)return {userSlower:aMod<bMod,source:'modified speed totals'};
    if(a!=null&&b!=null){
      const stagesA=readBoosts(doc,side),stagesB=readBoosts(doc,target);
      const sa=readStatus(doc,side),sb=readStatus(doc,target);
      const abilities=[readAbility(doc,side),readAbility(doc,target)];
      const items=[readItem(doc,side),readItem(doc,target)];
      const weather=readWeather(doc);
      if(abilities.some(x=>['Swift Swim','Chlorophyll','Quick Feet','Slow Start','Unburden'].includes(x))||
        items.includes('Choice Scarf') || weather && weather!=='None')return {userSlower:null,source:null};
      if(!sa||!sb)return {userSlower:null,source:null};
      const calc=(speed,stage,status)=>{
        const s=Number(stage.spe||0), factor=s>=0?(2+s)/2:2/(2-s);
        return Math.floor(speed*factor)*(status==='Paralyzed'?0.25:1);
      };
      const x=calc(a,stagesA,sa),y=calc(b,stagesB,sb);
      return {userSlower:x===y?null:x<y,source:x===y?null:'calc speed and visible modifiers'};
    }
    return {userSlower:null,source:null};
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
      status:readStatus(doc,'L'),name:select(doc,['#p1 .set-selector','#p1 .species'])||'Opponent A',
      lastMoveCategory:readHistory(doc,'L').lastMoveCategory,safeguard:field.foe.safeguard,
      userSlower:readAttackOrder(doc,'R','L').userSlower}];
    if(doubles)targets.push({...(second||{}),name:second?.name||'Opponent B',
      lastMoveCategory:readHistory(doc,'L',2).lastMoveCategory,
      userSlower:readAttackOrder(doc,'R','L2').userSlower});
    const moves=Array.from({length:4},(_,i)=>{
      const meta=moveMetadata(doc,i,'R',globals);
      const move={...meta,damage:[],effectiveness:[]};
      if(!meta.name||['none','nomove','loading','loading...'].includes(flatKey(meta.name)))return {name:'(No Move)',category:'Status',type:null,damage:[],effectiveness:[],priority:0};
      for(let t=0;t<targets.length;t++){
        const target=targets[t];
        move.effectiveness[t]=meta.type&&target.types?.length?typeEffectiveness(meta.type,target.types):null;
        if(meta.category==='Status'){move.damage[t]=0;continue;}
        if(t===0){
          const d=readNativeDamage(doc,i,target.maxHp);
          move.damage[t]=d.damage;if(d.damage===null)note(`${meta.name} damage`,d.reason);
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
      targets,moves
    };
    return {state,issues,source:trainer.source};
  }

  return {TYPES,fromSide,readTypes,readAbility,readStatus,readItem,readBoosts,readSpeed,readFormat,readWeather,readTrickRoom,moveMetadata,typeEffectiveness,parseDamage,parseDamageDetail,numeric:number,decodeFlags,readTrainerFlags,readBoolean,readFieldState,readHistory,readAttackOrder,readNativeDamage,readBattle};
});

/* Quick HP controls embedded into Dynamic Calc's existing Current HP rows.
 * The native .current-hp input remains the only source of truth: never keep
 * an independent HP override in the AI scorer or local storage.
 */
(function (root, factory) {
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  root.PKAIHPControls=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const slots=[
    {id:'p1',side:'L',index:1,label:'Your Pokémon'},
    {id:'p2',side:'R',index:1,label:'Enemy Pokémon'},
    {id:'p1-2',side:'L',index:2,label:'Your second Pokémon'},
    {id:'p2-2',side:'R',index:2,label:'Enemy second Pokémon'}
  ];
  function findNativeInput(doc,slot){
    const root=doc.getElementById(slot.id);
    if(!root)return null;
    return root.querySelector('.hp-cntrl input.current-hp')||
      root.querySelector('.hp-cntrl #currentHp'+slot.side+slot.index)||
      root.querySelector('.hp-cntrl input[id^="currentHp"]');
  }
  function clampHP(value,maxHp){
    if(!Number.isInteger(maxHp)||maxHp<=0)return null;
    if(value===''||value==null||!Number.isFinite(Number(value)))return null;
    return Math.max(0,Math.min(maxHp,Math.round(Number(value))));
  }
  function writeNativeHP(input,value,maxHp,EventType=Event){
    const hp=clampHP(value,maxHp);
    if(!input||hp==null)return false;
    if(String(input.value)===String(hp))return true;
    input.value=String(hp);
    // Trigger the calculator's own HP -> percent -> damage update handlers.
    input.dispatchEvent(new EventType('input',{bubbles:true}));
    input.dispatchEvent(new EventType('change',{bubbles:true}));
    return true;
  }
  function create(doc,tag,className,text){
    const el=doc.createElement(tag);el.className=className;
    if(text!=null)el.textContent=String(text);
    return el;
  }
  function addHPControls(doc,adapter,onChange=()=>{}){
    const map=new Map();
    for(const slot of slots){
      const root=doc.getElementById(slot.id);
      const native=findNativeInput(doc,slot);
      const container=root?.querySelector('.hp-cntrl');
      if(!container||!native)continue; // No disconnected fallback HP field.
      let bar=container.querySelector('[data-pkai-hp-tools="'+slot.id+'"]');
      if(bar){map.set(slot.id,{slot,bar,native,sync:bar.pkaiSync});continue;}
      bar=create(doc,'div','pkai-hp-tools');bar.dataset.pkaiHpTools=slot.id;
      bar.setAttribute('role','group');bar.setAttribute('aria-label',slot.label+' HP quick adjustment');
      const head=create(doc,'label','pkai-hp-tools-label','Quick HP');
      const slider=create(doc,'input','pkai-hp-range');
      slider.type='range';slider.min='0';slider.step='1';slider.setAttribute('aria-label',slot.label+' current HP');
      head.appendChild(slider);bar.appendChild(head);
      const val=create(doc,'output','pkai-hp-value');bar.appendChild(val);
      const one=create(doc,'button','pkai-hp-button','1 HP');one.type='button';bar.appendChild(one);
      const full=create(doc,'button','pkai-hp-button','Full');full.type='button';bar.appendChild(full);
      function max(){return adapter.fromSide(doc,slot.side,slot.index).maxHp;}
      function commit(value){
        if(writeNativeHP(native,value,max())){sync();onChange();}
      }
      slider.addEventListener('input',()=>commit(slider.value));
      one.addEventListener('click',()=>commit(1));
      full.addEventListener('click',()=>commit(max()));
      // Existing calculator's number box remains editable; reflect its changes.
      native.addEventListener('input',sync);
      native.addEventListener('change',sync);
      function sync(){
        const hp=adapter.fromSide(doc,slot.side,slot.index);
        const good=hp.maxHp!=null&&hp.hp!=null;
        const maxValue=hp.maxHp||1;
        slider.max=String(maxValue);slider.disabled=!good;
        one.disabled=!good;full.disabled=!good;
        if(good){
          if(doc.activeElement!==slider)slider.value=String(hp.hp);
          val.textContent=hp.hp+' / '+hp.maxHp;
        }else{val.textContent='HP unavailable';}
      }
      // Put next to the native current-HP box, not in a separate AI panel.
      bar.pkaiSync=sync;
      container.appendChild(bar);
      map.set(slot.id,{slot,bar,native,sync});
      sync();
    }
    return {
      sync(){for(const {sync}of map.values())sync?.();},
      count:map.size
    };
  }
  return {slots,findNativeInput,clampHP,writeNativeHP,addHPControls};
});

/* AI odds integration with native calculator state.
 * HP quick-adjust controls write to the existing calculator Current HP inputs.
 * Other unavailable battle details still suppress odds.
 */
(function () {
  'use strict';
  const doc=document;
  if(!doc.body||!globalThis.PKAI||!globalThis.PKAICalcAdapter||doc.getElementById('pkai-launcher'))return;
  const adapter=globalThis.PKAICalcAdapter, engine=globalThis.PKAI, hpControls=globalThis.PKAIHPControls;
  const create=(tag,text,cls)=>{
    const n=doc.createElement(tag);if(cls)n.className=cls;
    if(text!=null)n.textContent=String(text);return n;
  };
  const style=create('style');style.textContent=`
    #pkai-launcher{position:fixed;bottom:15px;right:15px;z-index:2147483600;border:1px solid #75b6f3;
      background:#164778;color:#fff;border-radius:22px;font:700 14px system-ui;padding:10px 16px;cursor:pointer}
    #pkai-dialog{display:none;position:fixed;right:12px;top:12px;max-width:min(530px,calc(100vw - 24px));
      max-height:calc(100vh - 24px);overflow:auto;z-index:2147483601;background:#162237;border:1px solid #668bb6;
      box-shadow:0 16px 55px #0009;border-radius:12px;padding:16px;color:#edf4ff;font:13px/1.5 system-ui}
    #pkai-dialog h2{font-size:18px;margin:0 0 10px}#pkai-dialog h3{font-size:14px;margin:17px 0 5px}
    #pkai-dialog button{padding:5px 9px;background:#25578e;color:white;border:1px solid #779bc0;border-radius:6px;cursor:pointer}
    #pkai-dialog table{border-collapse:collapse;width:100%}#pkai-dialog td,#pkai-dialog th{padding:5px;text-align:left;border-bottom:1px solid #34465f}
    #pkai-dialog .bad{color:#ffd09b}#pkai-dialog .muted{color:#bdcae0}#pkai-dialog code{color:#b6e1ff}
    .pkai-hp-tools{display:flex;align-items:center;flex-wrap:wrap;gap:7px;padding:5px 0 0;
      font:12px/1.4 system-ui,sans-serif;clear:both}
    .pkai-hp-tools-label{display:flex;align-items:center;gap:7px;font-weight:600!important}
    .pkai-hp-range{width:120px!important;max-width:30vw;cursor:pointer;accent-color:#2786b4}
    .pkai-hp-value{font-variant-numeric:tabular-nums;min-width:70px}
    .pkai-hp-button{font:inherit!important;padding:3px 7px!important;border-radius:5px!important;
      border:1px solid #7195b2!important;background:transparent!important;color:inherit!important;cursor:pointer}
    .pkai-hp-button:disabled{opacity:0.45;cursor:default}
    .pkai-inline-odds{color:#087e90!important;font-weight:700!important;white-space:nowrap!important;
      font:inherit!important;margin:0 5px!important;display:inline-block!important;
      float:none!important;width:auto!important;max-width:none!important;overflow:visible!important;
      visibility:visible!important;opacity:1!important;vertical-align:baseline!important}
    .pkai-inline-odds[data-pkai-placement="fallback"]{font-size:11px!important}
  `;doc.head.appendChild(style);
  const launcher=create('button','AI %');launcher.id='pkai-launcher';launcher.type='button';doc.body.appendChild(launcher);
  const dialog=create('div');dialog.id='pkai-dialog';dialog.setAttribute('role','dialog');dialog.setAttribute('aria-label','AI move odds, auto-read');doc.body.appendChild(dialog);
  const header=create('div');header.style.display='flex';header.style.justifyContent='space-between';header.style.gap='12px';
  header.appendChild(create('h2','Platinum Kaizo · AI odds'));
  const close=create('button','Close');close.type='button';header.appendChild(close);dialog.appendChild(header);
  const subtitle=create('p','Edit Current HP in either Pokémon panel, or use its Quick HP slider / 1 HP / Full buttons. AI odds read the same native HP values.','muted');dialog.appendChild(subtitle);
  const refresh=create('button','Read calculator again');refresh.type='button';dialog.appendChild(refresh);
  const report=create('div');dialog.appendChild(report);
  const holders=['resultDamageR1','resultDamageR2','resultDamageR3','resultDamageR4'];
  // Attach odds as a SIBLING, not as a child of the native damage value. The
  // calculator regularly replaces span.textContent, which deletes descendants.
  // Keeping the badge outside the native damage span also prevents clipping by
  // fixed-width damage styles and prevents our text from affecting damage parsing.
  function findDamageAnchor(i){
    const id=holders[i];
    const native=doc.getElementById(id);
    if(native)return {anchor:native,mode:'damage'};
    const radio=doc.getElementById('resultMoveR'+(i+1));
    const row=radio?.parentElement||doc.querySelectorAll('.results-right > div')[i]||null;
    if(row){
      const damage=[...row.querySelectorAll('span,[data-damage],.damage,.result-damage')]
        .find(el=>!el.classList?.contains('pkai-inline-odds') &&
          (el.id?.toLowerCase().includes('damage')||el.classList?.contains('damage')||
           /(?:%|damage)/i.test(el.textContent||'')));
      if(damage)return {anchor:damage,mode:'alternative damage'};
      const label=radio?row.querySelector('label[for="resultMoveR'+(i+1)+'"]'):row.querySelector('label');
      if(label)return {anchor:label,mode:'move label'};
    }
    // Last resort: the editor row exists but the results panel isn't in DOM.
    const input=doc.querySelector('#p2 .move'+(i+1)+' select.move-selector');
    return input?{anchor:input,mode:'move editor'}:{anchor:null,mode:'not found'};
  }
  function locateInline(){
    const locations=[];
    for(let i=0;i<4;i++)locations.push({move:i+1,mode:findDamageAnchor(i).mode});
    return locations;
  }
  const key=x=>engine.nameKey(x);
  function needs(state,issues){
    const missing=[];
    const add=(detail)=>{if(!missing.includes(detail))missing.push(detail);};
    if(!state.flags)add('Trainer AI flags are not present in the calculator’s selected trainer data.');
    if(!state.format)add('Battle format is not exposed by the calculator.');
    if(state.hp==null||state.maxHp==null||state.targets[0]?.hp==null||state.targets[0]?.maxHp==null)add('Current and maximum HP for both Pokémon.');
    if(!state.types?.length||state.targets.some(t=>!t.types?.length))add('Pokémon type selections.');
    if(state.targets[0]?.status==null && state.moves.some(m=>
      ['yawn','hypnosis','spore','sleeppowder','toxic','thunderwave','willowisp','curse'].includes(key(m.name))))
      add('Opponent’s current status (needed for status-move scoring).');
    if(state.moves.some(m=>['curse','dragondance','swordsdance','nastyplot','calmmind','bulkup','agility'].includes(key(m.name)))){
      const needed=new Set();
      for(const m of state.moves){const n=key(m.name);
        if(['curse','dragondance','swordsdance','bulkup'].includes(n))needed.add('atk');
        if(['curse','bulkup'].includes(n))needed.add('def');
        if(['dragondance','agility'].includes(n))needed.add('spe');
        if(['calmmind','nastyplot'].includes(n))needed.add('spa');
        if(n==='calmmind')needed.add('spd');
      }
      for(const n of needed)if(state.stages[n]==null)add(`AI ${n.toUpperCase()} stat stage.`);
    }
    if(state.moves.some(m=>m.category!=='Status')&&state.item==null)
      add('AI held item (some items alter AI-versus-calc damage).');
    if(state.moves.some(m=>m.category!=='Status')&&state.targets[0]?.ability==null)
      add('Opponent ability (needed for immunity and AI knowledge checks).');
    if(['Life Orb','Metronome','Expert Belt'].includes(state.item))
      add(`${state.item}: ordinary damage results cannot be used as the AI's internal max damage.`);
    if(['Filter','Solid Rock'].includes(state.targets[0]?.ability)||['Tinted Lens','Reckless'].includes(state.ability))
      add('Ability changes AI damage calculation compared with normal calculator.');
    if(doc.querySelector('#p2 .move-crit:checked'))
      add('Forced critical hit: the displayed damage does not represent the AI damage check.');
    if(state.format==='Doubles' && (state.targets[1]?.hp==null||!state.allyTypes?.length))add('Both active opponents and the AI ally (four-Pokémon battle state).');
    for(const m of state.moves){
      if(!m.name||key(m.name)==='nomove'||key(m.name)==='loading')continue;
      if(!m.category)add(`Category of ${m.name}.`);
      if(!m.type)add(`Type of ${m.name}.`);
      if(m.category!=='Status')for(let i=0;i<state.targets.length;i++){
        if(m.damage?.[i]==null && !['closecombat','bravebird','focuspunch','headsmash','takedown','explosion','selfdestruct'].includes(key(m.name)))
          add(`AI damage proxy for ${m.name} against target ${i+1}.`);
        if(m.effectiveness?.[i]==null)add(`Type effectiveness for ${m.name} against target ${i+1}.`);
      }
    }
    const knownFlags=state.flags||{};
    if(knownFlags.expert){
      if(state.moves.some(m=>['dragondance','agility','rockpolish','tailwind','recover','roost','softboiled','slackoff','milkdrink','healorder'].includes(key(m.name))) &&
         state.targets.some(t=>t.userSlower==null))add('Actual attack order/speed against the opponent (including battle modifiers).');
      if(state.moves.some(m=>['reflect','lightscreen','calmmind'].includes(key(m.name))) &&
         state.targets.some(t=>t.lastMoveCategory==null))add('Opponent last-used move category (not kept in ordinary damage calc state).');
    }
    if((knownFlags.setupFirstTurn||knownFlags.weather||knownFlags.batonPass)&&state.firstTurn==null)
      add('Current battle turn for First Turn, Weather or Baton Pass scoring.');
    if(knownFlags.basic){
      if(state.moves.some(m=>['stealthrock','spikes','toxicspikes'].includes(key(m.name))) &&state.stealthRockActive==null)
        add('Stealth Rock / hazard state on the player’s side.');
      if(state.moves.some(m=>['stealthrock','spikes','toxicspikes'].includes(key(m.name))) &&state.noTargetReserves==null)
        add('Whether the opponent has reserve Pokémon (needed for hazard scoring).');
      if(state.moves.some(m=>['tailwind','reflect','lightscreen'].includes(key(m.name))) &&
        state.moves.some(m=>key(m.name)==='tailwind' ? state.tailwindActive==null:
          key(m.name)==='reflect' ? state.reflectActive==null:state.lightScreenActive==null))
        add('Screen or Tailwind state on the AI’s side.');
      if(state.moves.some(m=>['dragondance','agility','rockpolish','tailwind'].includes(key(m.name)))&&state.trickRoom==null)
        add('Whether Trick Room is active.');
    }
    if(knownFlags.expert&&state.moves.some(m=>key(m.name)==='pluck')&&state.firstTurnOut==null)
      add('Whether the AI Pokémon is on its first turn on the field (Pluck Expert).');
    if(knownFlags.doubles&&state.format==='Doubles'){
      if(state.allyAbility==null)add('Ally ability for Tag Strategy.');
      if(state.allyAlive==null)add('Whether the AI ally is alive.');
    }
    if(knownFlags.expert&&state.moves.some(m=>['hail','raindance','sunnyday','sandstorm'].includes(key(m.name)))&&!state.weather)
      add('Current weather.');
    // Missing information about AI memory and move locks cannot be inferred from a
    // static damage calculator. It does not become "false" by being absent.
    return missing;
  }
  const fmt=x=>x==null?'not exposed':typeof x==='object'?JSON.stringify(x):String(x);
  function title(text){return create('h3',text);}
  function paintReport(snapshot,missing,result){
    const {state,issues,source}=snapshot;
    report.replaceChildren();
    const status=create('p',missing.length?'Incomplete battle state; odds withheld.':
      'Modeled move-selection odds shown (approximate; not cartridge-verified).',missing.length?'bad':'muted');
    report.appendChild(status);
    if(missing.length){report.appendChild(title('Missing from the calculator'));
      const ul=create('ul');missing.forEach(s=>ul.appendChild(create('li',s)));report.appendChild(ul);
    }
    report.appendChild(title('Read automatically'));
    const table=create('table');
    for(const [k,v]of [
      ['Battle format',state.format],['Trainer AI flags',source||'not exposed'],
      ['AI HP',`${fmt(state.hp)} / ${fmt(state.maxHp)}`],['AI typing',state.types?.join('/')||'not exposed'],
      ['AI ability',state.ability],['AI status',state.aiStatus],['AI stages',state.stages],
      ['Opponent HP',`${fmt(state.targets[0]?.hp)} / ${fmt(state.targets[0]?.maxHp)}`],
      ['Opponent typing',state.targets[0]?.types?.join('/')],['Trick Room',state.trickRoom],
      ['Weather',state.weather],['Battle turn 1',state.firstTurn]
    ]){const tr=create('tr');tr.appendChild(create('td',k));tr.appendChild(create('td',fmt(v)));table.appendChild(tr);}report.appendChild(table);
    report.appendChild(title('Move scoring'));
    const movesTable=create('table');
    for(let i=0;i<state.moves.length;i++){
      const m=state.moves[i];const tr=create('tr');tr.appendChild(create('td',m.name||'(empty)'));
      tr.appendChild(create('td',m.category||'?'));
      tr.appendChild(create('td',m.damage?.[0]==null?'no reliable HP damage':String(m.damage[0])+' HP'));
      tr.appendChild(create('td',result?`${(result.choice[i].total*100).toFixed(2)}%`:'—'));
      movesTable.appendChild(tr);
    }report.appendChild(movesTable);
    if(result){
      report.appendChild(create('p','~ indicates a modeled estimate. This is not a claim of exact Platinum Kaizo AI behavior.','muted'));
      if(result.omissions.length){report.appendChild(title('Unimplemented rule branches'));
        const ul=create('ul');result.omissions.slice(0,20).forEach(s=>ul.appendChild(create('li',s)));report.appendChild(ul);
      }
    }
    const notable=issues.filter(issue=>!missing.some(m=>m.includes(issue.field))).slice(0,12);
    if(notable.length){report.appendChild(title('Other diagnostics'));const ul=create('ul');notable.forEach(x=>ul.appendChild(create('li',x.field+': '+x.detail)));report.appendChild(ul);}
  }
  function paintInline(snapshot,missing,result){
    for(let i=0;i<4;i++){
      const {anchor,mode}=findDamageAnchor(i);
      let span=doc.getElementById('pkai-odds-R'+(i+1));
      // Remove badges inserted INSIDE the damage span by older versions.
      doc.querySelectorAll('#'+holders[i]+' > .pkai-inline-odds').forEach(x=>x.remove());
      if(!anchor){if(span)span.remove();continue;}
      if(!span){span=create('span','','pkai-inline-odds');span.id='pkai-odds-R'+(i+1);}
      // Keep label directly after the native damage element. Reattach if the
      // calculator replaced its entire result row.
      if(anchor.nextElementSibling!==span)anchor.insertAdjacentElement('afterend',span);
      span.dataset.pkaiPlacement=mode==='damage'?'damage':'fallback';
      const move=snapshot?.state?.moves?.[i];
      if(move && ['nomove','loading'].includes(key(move.name))){span.textContent='';continue;}
      const score=result?.choice?.[i]?.total;
      span.textContent=Number.isFinite(score)?` (AI: ~${(score*100).toFixed(1)}%)`:' (AI: —)';
      const reason=missing?.[0]||'required battle state or scoring rules are unavailable';
      span.title=Number.isFinite(score)?'Modeled move-selection probability (approximate, not cartridge-verified)'
        :`AI probability unavailable: ${reason}. Click AI % for details.`;
    }
  }

  let latest=null,refreshing=false;
  let hpUI=null;
  function refreshView(){
    if(refreshing)return;refreshing=true;
    if(hpControls){
      // The calculator can render Pokémon panels after the userscript starts.
      hpUI=hpControls.addHPControls(doc,adapter,queue);
      hpUI.sync();
    }
    try{
      const snapshot=adapter.readBattle(doc,globalThis),s=snapshot.state;
      const missing=needs(s,snapshot.issues);
      let result=null;
      if(!missing.length){
        try{result=engine.calculate(s);}catch(e){missing.push(e.message||String(e));}
      }
      latest={snapshot,missing,result};paintInline(snapshot,missing,result);paintReport(snapshot,missing,result);
      report.appendChild(title('Inline display locations'));
      const locations=create('p',locateInline().map(x=>'Move '+x.move+': '+x.mode).join(' · '),'muted');report.appendChild(locations);
    }catch(e){
      const text=`AI data reader error: ${e?.message||e}`;
      latest={error:text};report.replaceChildren(create('p',text,'bad'));
      paintInline(null,[text],null);
    }finally{refreshing=false;}
  }
  const toggle=()=>{dialog.style.display=dialog.style.display==='block'?'none':'block';if(dialog.style.display==='block')refreshView();};
  launcher.addEventListener('click',toggle);close.addEventListener('click',()=>{dialog.style.display='none';});
  refresh.addEventListener('click',refreshView);
  let pending=null;
  const queue=()=>{if(pending!=null)return;pending=setTimeout(()=>{pending=null;refreshView();},130);};
  const isOwn=target=>target?.closest?.('#pkai-dialog,#pkai-launcher,.pkai-inline-odds,.pkai-hp-tools');
  const observer=new MutationObserver(changes=>{
    for(const m of changes){
      const node=m.target.nodeType===3?m.target.parentElement:m.target;
      if(isOwn(node))continue;
      const resultContainerChanged=[...m.addedNodes,...m.removedNodes].some(n=>n.nodeType===1 &&
        (n.matches?.('.move-result-group,.results-right,[id^="resultDamageR"]') ||
         n.querySelector?.('[id^="resultDamageR"],.results-right')));
      if(resultContainerChanged || node?.closest?.('#p1,#p2,#p1-2,#p2-2,.move-result-group,.field-info,#field, #ai-container')){
        const changed=[...m.addedNodes,...m.removedNodes];
        if(changed.length&&changed.every(x=>x.nodeType===1&&x.classList?.contains('pkai-inline-odds')))continue;
        queue();return;
      }
    }
  });
  observer.observe(doc.body,{subtree:true,childList:true,characterData:true,attributes:false});
  doc.addEventListener('input',e=>{if(!isOwn(e.target))queue();},true);
  doc.addEventListener('change',e=>{if(!isOwn(e.target))queue();},true);
  globalThis.PKAIInline={version:'0.7.0',refresh:refreshView,snapshot:()=>latest?.snapshot?.state,
    locations:locateInline,diagnostics:()=>latest?.missing||[latest?.error],
    hide:()=>{dialog.style.display='none';}};
  refreshView();
})();

