'use strict';
// Reads RimWorld's Player.log and explains, in plain words, what went wrong with the mod made here.
// Pure function (no DOM, no disk): the UI hands it the log text plus a map of the mod's own def names.
// The rule table below is the place to teach it new error shapes: each rule has a test, a title, a plain explanation and a fix.
// Message shapes are taken from what RimWorld 1.4-1.6 prints; nothing here has seen a real log from this app yet, so unknown
// errors are kept (as "Other error") instead of being dropped.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.LogAnalyzer = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const FRAME = /^(Verse|UnityEngine|System|RimWorld|Steamworks|HarmonyLib|MonoMod)[\w.`+<>]*[:.][\w`<>\[\], ]*\(.*\)\s*$|^\s+at |^\(Filename:/;
  const FILEMARK = /^\(Filename:.*\)\s*$/;

  // ---- split the log into entries -------------------------------------------------------------------------------------
  function splitEntries(text) {
    const lines = String(text || '').replace(/\r\n?/g, '\n').split('\n');
    const out = [];
    let cur = [];
    const flush = () => {
      const msg = [],
        stack = [];
      let inStack = false;
      for (const l of cur) {
        if (!inStack && FRAME.test(l) && msg.length) inStack = true;
        (inStack ? stack : msg).push(l);
      }
      const m = msg.join('\n').trim();
      if (m) out.push({ message: m, stack: stack.join('\n').trim() });
      cur = [];
    };
    for (const l of lines) {
      if (FILEMARK.test(l)) {
        cur.push(l);
        flush();
      } else cur.push(l);
    }
    flush();
    return out;
  }

  // ---- closest known name (for "did you mean") --------------------------------------------------------------------------
  function lev(a, b) {
    if (a === b) return 0;
    const m = a.length,
      n = b.length;
    if (!m || !n) return Math.max(m, n);
    let prev = Array.from({ length: n + 1 }, (_, i) => i);
    for (let i = 1; i <= m; i++) {
      const cur = [i];
      for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = cur;
    }
    return prev[n];
  }
  function closest(name, known) {
    let best = null,
      bd = Infinity;
    const low = String(name).toLowerCase();
    for (const k of known || []) {
      const d = lev(low, String(k).toLowerCase());
      if (d < bd) {
        bd = d;
        best = k;
      }
    }
    return best && bd <= Math.max(2, Math.floor(String(name).length / 4)) ? best : null;
  }

  // ---- rules ------------------------------------------------------------------------------------------------------------
  // Each rule: id, test (regex on the message), build(match, ctx) -> { title, plain, fix, name?, tex? }; severity defaults to 'error'.
  const TYPE_NICE = {
    ThingDef: 'item, building or creature',
    RecipeDef: 'recipe',
    HediffDef: 'condition',
    ResearchProjectDef: 'research project',
    ThoughtDef: 'thought',
    TraitDef: 'trait',
    GeneDef: 'gene',
    AbilityDef: 'ability',
    SoundDef: 'sound',
    TerrainDef: 'floor',
    PawnKindDef: 'creature kind',
    IncidentDef: 'event',
    GameConditionDef: 'weather condition',
    DamageDef: 'damage type',
    BodyDef: 'body shape',
    BodyPartDef: 'body part',
    StatDef: 'stat',
    ThingCategoryDef: 'storage category',
    JobDef: 'job',
    EffecterDef: 'visual effect',
    ChemicalDef: 'drug chemical',
    NeedDef: 'need',
    BiomeDef: 'biome',
    WorkTypeDef: 'work type',
    ToolCapacityDef: 'attack kind',
    XenotypeDef: 'xenotype',
  };
  const nice = (t) => {
    const short = String(t || '').replace(/^.*\./, '');
    return TYPE_NICE[short] || short || 'thing';
  };
  const rules = [
    {
      id: 'xref',
      test: /Could not resolve cross[- ]reference(?: to)?[:\s]+(?:No\s+)?([\w.]+)\s+named\s+([\w\-]+)(?:[^\n]*?\bwanter=([^\n)]*))?/i,
      build(m, c) {
        const name = m[2],
          type = nice(m[1]);
        const maybe = closest(name, c.known);
        const where = m[3] ? ` It is used in: ${m[3].replace(/Verse\.|RimWorld\./g, '').trim()}.` : '';
        return {
          title: `Unknown ${type}: "${name}"`,
          plain: `Something in your mod refers to a ${type} called "${name}", but the game has no such thing.${where}`,
          fix: maybe
            ? `Did you mean "${maybe}"? If it comes from another mod, that mod must be enabled and loaded BEFORE yours. Otherwise fix the spelling in the field that uses it.`
            : `Check the spelling. If it comes from another mod, that mod must be enabled and loaded BEFORE yours (the mod list order matters).`,
          name,
        };
      },
    },
    {
      id: 'xmlfield',
      test: /XML error: <([\w\-.]+)[^>]*>[^\n]*?doesn't correspond to any field in type ([\w.]+)/i,
      build(m) {
        return {
          title: `Unknown field <${m[1]}> in a ${nice(m[2])}`,
          plain: `The game does not know the setting "${m[1]}" on a ${nice(m[2])}. The game ignores it, but the effect you wanted is missing.`,
          fix: `Usually a typo, or the setting exists only in another game version or expansion. If you wrote this in your own XML, remove it or check the spelling. If the builder wrote it, send this message to Claude.`,
          tagName: m[1],
        };
      },
    },
    {
      id: 'xmlclass',
      test: /Could not find (?:class|type)(?: named)? "?([\w.]+)"?(?: from node| while resolving)?/i,
      build(m) {
        return {
          title: `Unknown class "${m[1]}"`,
          plain: `The game cannot find the code class "${m[1]}". Classes come from the game itself or from a mod with code.`,
          fix: `If it belongs to an expansion (Biotech, Royalty, Ideology, Anomaly, Odyssey), enable it. If it comes from another mod, enable that mod above yours. Otherwise check the spelling.`,
          name: m[1],
        };
      },
    },
    {
      id: 'parent',
      test: /(?:Could not find parent|parent[^\n]{0,40}not found|Parent[^\n]{0,60}named ["']?([\w]+)["']?[^\n]{0,30}not found)[^\n]*/i,
      build(m) {
        const nm = (/["']([\w]+)["']/.exec(m[0]) || [])[1] || '';
        return {
          title: nm ? `Parent definition "${nm}" not found` : 'Parent definition not found',
          plain: `A thing in your mod is built on top of a base definition${nm ? ` called "${nm}"` : ''} that the game does not have.`,
          fix: `The base may need an expansion (Biotech, Royalty...) that is not enabled, or it comes from another mod loaded after yours.`,
          name: nm,
        };
      },
    },
    {
      id: 'duplicate',
      test: /(?:Duplicate|duplicate)\s+(?:def\s*name|defName|definition)[^\n]*?[:\s]+["']?([\w\-]+)["']?|(\w+) (?:already|is already) (?:defined|exists)/,
      build(m) {
        const nm = m[1] || m[2];
        return {
          title: `Two things share the name "${nm}"`,
          plain: `The ID "${nm}" is used twice, so one of the two overrides or breaks the other.`,
          fix: `Give your item another ID, or put a prefix in the mod settings. If the other one is from another mod, change yours.`,
          name: nm,
        };
      },
    },
    {
      id: 'tex',
      test: /(?:Could not load [\w.]*Texture2D at|Could not load texture|Failed to find any textures at|Texture not found|Could not find (?:a )?texture(?: at)?)\s*:?\s*"?([\w\/\-. ]+?)"?(?:\s+in any|\s+while|\s*$|\n|\.)/i,
      build(m) {
        const t = m[1].trim();
        return {
          title: `Picture not found: ${t}`,
          plain: `The game looks for a picture at "${t}" and finds nothing, so the item is drawn as a red error square or not at all.`,
          fix: `Check that the file exists in the mod's Textures folder with exactly this name (capital letters matter), and that a picture was chosen in the builder. Pictures with several directions need _south, _east and _north files.`,
          tex: t,
        };
      },
    },
    {
      id: 'patch',
      test: /Patch operation ([\w.]+) failed([\s\S]*?)(?:xpath:\s*([^\n]+))?/i,
      build(m, c, entry) {
        const xp = (/xpath:\s*([^\n]+)/i.exec(entry.message) || [])[1] || '';
        return {
          title: `A patch did not apply${xp ? `: ${xp.trim().slice(0, 90)}` : ''}`,
          plain: `A patch from your mod could not find what it was told to change (${m[1].replace(/^Verse\./, '')}).`,
          fix: `The thing it targets may not exist (another mod or expansion not enabled), or has no such field. In the Defs / Patches editor, check the thing's ID, or use "Only if this mod is loaded".`,
          xpath: xp.trim(),
        };
      },
    },
    {
      id: 'config',
      test: /Config error in ([\w\-]+):\s*([^\n]+)/,
      build(m) {
        const msg = m[2].trim();
        let fix = 'Read the message: it names the field that has a problem. Fix that field in the builder.';
        let plain = `The game found a problem in "${m[1]}": ${msg}`;
        if (/graphicData|texPath|graphicClass/i.test(msg)) fix = 'Check the picture of this item (chosen, and the right kind: single, several directions, or stack).';
        else if (/no stuff|stuffCategories|costList/i.test(msg)) fix = 'Check the ingredients and material fields of this item.';
        else if (/bodyPart|body part/i.test(msg)) fix = 'Check that the body part exists on the chosen body shape.';
        else if (/tool|capacities|linkedBodyPartsGroup/i.test(msg)) fix = 'Check the attacks: the body part named by each attack must exist on the body shape.';
        else if (/label/i.test(msg)) fix = 'Give it a name in the Basics section.';
        else if (/description/i.test(msg)) plain += ' (usually harmless)';
        return { title: `Problem in ${m[1]}`, plain, fix, name: m[1], severity: /description|label/i.test(msg) ? 'warning' : 'error' };
      },
    },
    {
      id: 'sound',
      test: /(?:Could not (?:find|resolve)|No) (?:sound(?:def)?|SoundDef)[^\n]*?["']?([\w]+)["']?/i,
      build(m) {
        return {
          title: `Unknown sound "${m[1]}"`,
          plain: `A sound called "${m[1]}" does not exist, so it plays nothing.`,
          fix: `Pick a sound from the list in the builder, or check that your own sound file was exported.`,
          name: m[1],
        };
      },
    },
    {
      id: 'exception',
      test: /(?:Exception in ([\w.:]+)|([\w.]*Exception)(?::| while| in))/,
      build(m, c, entry) {
        const first = entry.message.split('\n')[0].slice(0, 180);
        return {
          title: m[1] ? `Crash while handling ${String(m[1]).replace(/:$/, '')}` : `Crash inside the game code: ${m[2] || 'exception'}`,
          plain: `The game hit an error while running something: "${first}". It often means a value in the mod is missing or wrong (an empty field, a wrong ID).`,
          fix: `Look at which of your items is named in the details. If none is, another mod may be the cause: test your mod alone with only the game and its expansions.`,
        };
      },
    },
    {
      id: 'generic',
      test: /(?:^|\n)(?:Error|Exception|Config error|XML error|Could not|Failed to|Cannot|Unable to)[^\n]*/i,
      build(m) {
        const line = m[0].trim().slice(0, 200);
        return {
          title: 'Other error: ' + line.slice(0, 90),
          plain: `The game printed: "${line}". I do not have a plain explanation for this one yet.`,
          fix: `Copy it with the button below and send it to Claude together with the mod.`,
        };
      },
    },
  ];

  const esc = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // ---- analyze ----------------------------------------------------------------------------------------------------------
  // opts: { owners: {defName: {id,label,type}}, texOwners: {texturePathWithoutExtension: owner}, modNames: [string], knownIds: [string] }
  function analyze(text, opts) {
    opts = opts || {};
    const owners = opts.owners || {},
      texOwners = opts.texOwners || {},
      fileOwners = opts.fileOwners || {};
    const fileNames = Object.keys(fileOwners);
    const names = Object.keys(owners).filter((n) => n.length > 2);
    const mods = (opts.modNames || []).filter(Boolean);
    const ctx = { known: opts.knownIds || [] };
    const entries = splitEntries(text);
    const groups = new Map();
    const others = new Map();
    let mine = 0;
    const modTexts = mods.map((m) => m.toLowerCase());
    const lowText = String(text || '').toLowerCase();
    const modSeen = mods.length ? modTexts.some((m) => lowText.includes(m)) : null;
    for (const e of entries) {
      const full = e.message + (e.stack ? '\n' + e.stack : '');
      let rule = null,
        m = null;
      for (const r of rules) {
        m = r.test.exec(e.message);
        if (m) {
          rule = r;
          break;
        }
      }
      if (!rule) continue;
      const built = rule.build(m, ctx, e);
      // which item of this mod does the message belong to?
      let owner = null;
      if (built.name && owners[built.name]) owner = owners[built.name];
      if (!owner && built.tex) {
        const k = built.tex.replace(/\.png$/i, '').replace(/_(north|east|south|west)$/i, '');
        owner = texOwners[k] || texOwners[built.tex] || null;
      }
      if (!owner) {
        for (const n of names) {
          if (new RegExp('(?:^|[^A-Za-z0-9_])' + esc(n) + '(?:$|[^A-Za-z0-9_])').test(full)) {
            owner = owners[n];
            break;
          }
        }
      }
      if (!owner) {
        const fn = fileNames.find((n) => full.includes(n));
        if (fn) owner = fileOwners[fn];
      }
      const modMention = modTexts.some((t) => full.toLowerCase().includes(t));
      const key = rule.id + '|' + built.title;
      if (!owner && !modMention) {
        // probably another mod or the base game
        const o = others.get(key) || { title: built.title, count: 0 };
        o.count++;
        others.set(key, o);
        continue;
      }
      mine++;
      const g = groups.get(key) || {
        rule: rule.id,
        severity: built.severity || 'error',
        title: built.title,
        plain: built.plain,
        fix: built.fix,
        owner: owner || null,
        count: 0,
        raw: full.slice(0, 1500),
      };
      g.count++;
      groups.set(key, g);
    }
    const findings = [...groups.values()].sort((a, b) => (a.severity === b.severity ? b.count - a.count : a.severity === 'error' ? -1 : 1));
    return { findings, others: [...others.values()].sort((a, b) => b.count - a.count), stats: { entries: entries.length, mine, other: [...others.values()].reduce((s, o) => s + o.count, 0) }, modSeen };
  }

  // Plain text summary to paste to Claude.
  function toText(result, modName) {
    const L = [`Game log check for mod "${modName || '?'}"`, `${result.stats.entries} log entries, ${result.stats.mine} about this mod, ${result.stats.other} about other things.`];
    if (result.modSeen === false) L.push('The mod name was not found in the log (is it enabled?).');
    for (const f of result.findings) {
      L.push('', `[${f.severity}] ${f.title}${f.count > 1 ? ` (x${f.count})` : ''}${f.owner ? ` — item: ${f.owner.label || f.owner.id} (${f.owner.type})` : ''}`, f.plain, 'Raw: ' + f.raw.replace(/\n+/g, ' | ').slice(0, 500));
    }
    return L.join('\n');
  }

  return { analyze, splitEntries, toText, closest, rules };
});
