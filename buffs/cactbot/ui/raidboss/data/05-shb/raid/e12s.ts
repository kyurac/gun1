import Conditions from '../../../../../resources/conditions';
import NetRegexes from '../../../../../resources/netregexes';
import { UnreachableCode } from '../../../../../resources/not_reached';
import Outputs from '../../../../../resources/outputs';
import { callOverlayHandler } from '../../../../../resources/overlay_plugin_api';
import { Responses } from '../../../../../resources/responses';
import ZoneId from '../../../../../resources/zone_id';
import { RaidbossData } from '../../../../../types/data';
import { NetMatches } from '../../../../../types/net_matches';
import { LocaleText, Output, TriggerSet } from '../../../../../types/trigger';

export interface Data extends RaidbossData {
  isDoorBoss?: boolean;
  decOffset?: number;
  tethers?: string[];
  stockedTethers?: string[];
  castCount?: number;
  junctionSuffix?: string;
  junctionCount?: number;
  formlessTargets?: string[];
  weightTargets?: string[];
  seenFirstBombs?: boolean;
  statueTetherNumber?: number;
  statueIds?: number[];
  statueDir?: string;
  statueLaserCount?: number;
  phase?: string;
  debuffs?: { [name: string]: number };
  intermediateDebuffs?: string[];
  safeZone?: string;
  doubleAero?: string[];
  seenInitialSpread?: boolean;
  seenInitialStacks?: boolean;
  eyes?: string[];
  sorrows?: { [name: string]: number };
  smallLions?: NetMatches['AddedCombatant'][];
}

// TODO: double apoc clockwise vs counterclockwise call would be nice

// Each tether ID corresponds to a primal:
// 008C -- Shiva
// 008D -- Titan
// 008E -- Leviathan
// 008F -- Ifrit
// 0090 -- Ramuh
// 0091 -- Garuda
// We can collect + store these for later use on Stock/Release.
const shivaTetherId = '008C';
const titanTetherId = '008D';
const tetherIds = ['008E', '008F', '0090', '0091'];

const getTetherString = (tethers: string[] | undefined, output: Output) => {
  // All tethers in E12S are double tethers, plus an optional junction (not in the tether list).
  const sorted = tethers?.sort();

  const [first, second] = sorted ?? [];
  if (!first || !second)
    return;

  const comboStr = first + second;
  if (comboStr in primalOutputStrings)
    return output[comboStr]!();

  return output.combined!({
    safespot1: output[first]!(),
    safespot2: output[second]!(),
  });
};

// TODO: also on the pre-statue cast, call south for any levi mechanics, west for any ifrit.
const primalOutputStrings = {
  // Tethers.
  '008E': Outputs.middle,
  '008F': Outputs.sides,
  '0090': Outputs.out,
  '0091': {
    en: 'Intercards',
    de: 'Interkardinale Himmelsrichtungen',
    fr: 'Intercardinal',
    ja: '??????',
    cn: '??????',
    ko: '??????',
  },
  // Tether combos.
  '008E008F': {
    en: 'Under + Sides',
    de: 'Runter + Seiten',
    fr: 'En dessous + c??t??s',
    ja: '????????? + ??????',
    cn: '???????????????',
    ko: '?????? ?????? + ??????',
  },
  '008E0090': {
    en: 'North/South + Out',
    de: 'Norden/S??den + Raus',
    fr: 'Nord/Sud + Ext??rieur',
    ja: '???/??? + ??????',
    cn: '????????????',
    ko: '???/??? + ??????',
  },
  '008E0091': {
    en: 'Under + Intercards',
    de: 'Runter + Interkardinale Himmerlsrichtungen',
    fr: 'En dessous + Intercardinal',
    ja: '????????? + ??????',
    cn: '???????????????',
    ko: '?????? ?????? + ??????',
  },
  // Text output.
  'combined': {
    en: '${safespot1} + ${safespot2}',
    de: '${safespot1} + ${safespot2}',
    fr: '${safespot1} + ${safespot2}',
    ja: '${safespot1} + ${safespot2}',
    cn: '${safespot1} + ${safespot2}',
    ko: '${safespot1} + ${safespot2}',
  },
  'stock': {
    en: 'Stock: ${text}',
    de: 'Sammeln: ${text}',
    fr: 'Stocker : ${text}',
    ja: '????????????: ${text}',
    cn: '??????: ${text}',
    ko: '??????: ${text}',
  },
  'junctionSuffix': {
    en: '${text} (${junction})',
    de: '${text} (${junction})',
    fr: '${text} (${junction})',
    ja: '${text} (${junction})',
    cn: '${text} (${junction})',
    ko: '${text} (${junction})',
  },
  // Junctions.
  'spread': {
    // Shiva spread.
    en: 'spread',
    de: 'verteilen',
    fr: 'dispersion',
    ja: '??????',
    cn: '??????',
    ko: '??????',
  },
  'stacks': {
    // Titan healer stacks.
    en: 'stacks',
    de: 'sammeln',
    fr: 'packages',
    ja: '???????????????',
    cn: '????????????',
    ko: '?????? ??????',
  },
  'stack': {
    // Obliterate whole group laser stack.
    // This is deliberately "stack" singular (vs Titan "stacks").
    en: 'group stack',
    de: 'In Gruppen sammeln',
    fr: 'package en groupe',
    ja: '?????????',
    cn: '??????',
    ko: '??????',
  },
};

// Due to changes introduced in patch 5.2, overhead markers now have a random offset
// added to their ID. This offset currently appears to be set per instance, so
// we can determine what it is from the first overhead marker we see.
// The first 1B marker in the encounter is the formless tankbuster, ID 004F.
const firstHeadmarker = parseInt('00DA', 16);
const getHeadmarkerId = (data: Data, matches: NetMatches['HeadMarker']) => {
  // If we naively just check !data.decOffset and leave it, it breaks if the first marker is 00DA.
  // (This makes the offset 0, and !0 is true.)
  if (typeof data.decOffset === 'undefined')
    data.decOffset = parseInt(matches.id, 16) - firstHeadmarker;
  // The leading zeroes are stripped when converting back to string, so we re-add them here.
  // Fortunately, we don't have to worry about whether or not this is robust,
  // since we know all the IDs that will be present in the encounter.
  return (parseInt(matches.id, 16) - data.decOffset).toString(16).toUpperCase().padStart(4, '0');
};

// These keys map effect ids to `intermediateRelativityOutputStrings` keys.
const effectIdToOutputStringKey: { [effectId: string]: string } = {
  '690': 'flare',
  '996': 'stack',
  '998': 'shadoweye',
  '99C': 'eruption',
  '99E': 'blizzard',
  '99F': 'aero',
};

// These are currently used for both the informative x > y > z callout,
// but also the individual alerts.  These are kept short and snappy.
const intermediateRelativityOutputStringsRaw = {
  flare: {
    en: 'Flare',
    de: 'Flare',
    fr: 'Brasier',
    ja: '?????????',
    cn: '??????',
    ko: '?????????',
  },
  stack: {
    en: 'Stack',
    de: 'Sammeln',
    fr: 'Packez-vous',
    ja: '?????????',
    cn: '??????',
    ko: '??????',
  },
  shadoweye: {
    en: 'Gaze',
    de: 'Blick',
    fr: 'Regard',
    ja: '??????????????????',
    cn: '?????????',
    ko: '??????',
  },
  eruption: Outputs.spread,
  blizzard: {
    en: 'Ice',
    de: 'Eis',
    fr: 'Glace',
    ja: '????????????',
    cn: '??????',
    ko: '????????????',
  },
  aero: {
    en: 'Aero',
    de: 'Wind',
    fr: 'Vent',
    ja: '????????????',
    cn: '??????',
    ko: '????????????',
  },
};
type InterStrings = { [id in keyof typeof intermediateRelativityOutputStringsRaw]: LocaleText };
const intermediateRelativityOutputStrings: InterStrings = intermediateRelativityOutputStringsRaw;

// Returns integer value of x, y in matches based on cardinal or intercardinal
const matchedPositionToDir = (matches: NetMatches['AddedCombatant']) => {
  // Positions are moved downward 75
  const y = parseFloat(matches.y) + 75;
  const x = parseFloat(matches.x);

  // In Basic Relativity, hourglass positions are the 8 cardinals + numerical
  // slop on a radius=20 circle.
  // N = (0, -95), E = (20, -75), S = (0, -55), W = (-20, -75)
  // NE = (14, -89), SE = (14, -61), SW = (-14, -61), NW = (-14, -89)
  //
  // In Advanced Relativity, hourglass positions are the 3 northern positions and
  // three southern positions, plus numerical slop on a radius=10 circle
  // NW = (-10, -80), N = (0, -86), NE = (10, -80)
  // SW = (-10, -69), S = (0, -64), SE = (10, -69)
  //
  // Starting with northwest to favor sorting between north and south for
  // Advanced Relativity party splits.
  // Map NW = 0, N = 1, ..., W = 7

  return (Math.round(5 - 4 * Math.atan2(x, y) / Math.PI) % 8);
};

// Convert dir to Output
const dirToOutput = (dir: number, output: Output) => {
  const dirs: { [dir: number]: string } = {
    0: output.northwest!(),
    1: output.north!(),
    2: output.northeast!(),
    3: output.east!(),
    4: output.southeast!(),
    5: output.south!(),
    6: output.southwest!(),
    7: output.west!(),
  };
  return dirs[dir];
};

const triggerSet: TriggerSet<Data> = {
  zoneId: ZoneId.EdensPromiseEternitySavage,
  timelineFile: 'e12s.txt',
  triggers: [
    {
      // Headmarkers are randomized, so use a generic headMarker regex with no criteria.
      id: 'E12S Promise Formless Judgment You',
      type: 'HeadMarker',
      netRegex: NetRegexes.headMarker({}),
      condition: (data) => data.isDoorBoss,
      response: (data, matches, output) => {
        // cactbot-builtin-response
        output.responseOutputStrings = {
          formlessBusterAndSwap: {
            en: 'Tank Buster + Swap',
            de: 'Tankbuster + Wechsel',
            fr: 'Tank buster + Swap',
            ja: '????????????????????? + ????????????',
            cn: '?????? + ???T',
            ko: '?????? + ??????',
          },
          formlessBusterOnYOU: Outputs.tankBusterOnYou,
        };

        const id = getHeadmarkerId(data, matches);

        // Track tankbuster targets, regardless if this is on you or not.
        // Use this to make more intelligent calls when the cast starts.
        if (id === '00DA') {
          data.formlessTargets ??= [];
          data.formlessTargets.push(matches.target);
        }

        // From here on out, any response is for the current player.
        if (matches.target !== data.me)
          return;

        // Formless double tankbuster mechanic.
        if (id === '00DA') {
          if (data.role === 'tank')
            return { alertText: output.formlessBusterAndSwap!() };
          // Not that you personally can do anything about it, but maybe this
          // is your cue to yell on voice comms for cover.
          return { alarmText: output.formlessBusterOnYOU!() };
        }
      },
    },
    {
      // Headmarkers are randomized, so use a generic headMarker regex with no criteria.
      id: 'E12S Promise Junction Titan Bombs',
      type: 'HeadMarker',
      netRegex: NetRegexes.headMarker({}),
      condition: (data) => data.isDoorBoss,
      response: (data, matches, output) => {
        // cactbot-builtin-response
        output.responseOutputStrings = {
          // The first round has only one blue.
          titanBlueSingular: {
            en: 'Blue Weight',
            de: 'Blau - Gewicht',
            fr: 'Poids bleu',
            ja: '????????????',
            cn: '????????????',
            ko: '??????',
          },
          // The second and two rounds of bombs have a partner.
          // The third is technically fixed by role with a standard party (one dps, one !dps),
          // but call out your partner anyway in case you've got 8 blus or something.
          titanBlueWithPartner: {
            en: 'Blue (with ${player})',
            de: 'Blau (mit ${player})',
            fr: 'Bleu (avec ${player})',
            ja: '???????????? (${player}???)',
            cn: '???????????? (???${player})',
            ko: '?????? (?????? ?????????: ${player})',
          },
          titanOrangeStack: {
            en: 'Orange Stack',
            de: 'Orange - versammeln',
            fr: 'Orange, package',
            ja: '???????????????',
            cn: '????????????',
            ko: '??????: ??????',
          },
          titanYellowSpread: {
            en: 'Yellow Spread',
            de: 'Gelb - Verteilen',
            fr: 'Jaune, dispersion',
            ja: '????????????',
            cn: '????????????',
            ko: '??????: ??????',
          },
        };

        const id = getHeadmarkerId(data, matches);

        if (id === '00BB') {
          data.weightTargets ??= [];
          data.weightTargets.push(matches.target);

          // Handle double blue titan on 2nd and 3rd iterations.
          if (data.seenFirstBombs && data.weightTargets.length === 2) {
            if (data.weightTargets.includes(data.me)) {
              const partner = data.weightTargets[data.weightTargets[0] === data.me ? 1 : 0];
              return {
                alarmText: output.titanBlueWithPartner!({ player: data.ShortName(partner) }),
              };
            }
          }
        }

        // From here on out, any response is for the current player.
        if (matches.target !== data.me)
          return;

        // Titan Mechanics (double blue handled above)
        if (id === '00BB' && !data.seenFirstBombs)
          return { alarmText: output.titanBlueSingular!() };
        if (id === '00B9')
          return { alertText: output.titanYellowSpread!() };
        if (id === '00BA')
          return { infoText: output.titanOrangeStack!() };
      },
    },
    {
      // Headmarkers are randomized, so use a generic headMarker regex with no criteria.
      id: 'E12S Promise Chiseled Sculpture',
      type: 'HeadMarker',
      netRegex: NetRegexes.headMarker({}),
      condition: (data, matches) => data.isDoorBoss && matches.target === data.me,
      run: (data, matches) => {
        const id = getHeadmarkerId(data, matches);

        // Statue laser mechanic.
        const firstLaserMarker = '0091';
        const lastLaserMarker = '0098';
        if (id >= firstLaserMarker && id <= lastLaserMarker) {
          // ids are sequential: #1 square, #2 square, #3 square, #4 square, #1 triangle etc
          const decOffset = parseInt(id, 16) - parseInt(firstLaserMarker, 16);
          data.statueTetherNumber = (decOffset % 4) + 1;
        }
      },
    },
    {
      id: 'E12S Promise Chiseled Sculpture Collector',
      type: 'AddedCombatant',
      netRegex: NetRegexes.addedCombatantFull({ npcNameId: '9818' }),
      run: (data, matches) => {
        // Collect both sculptures up front, so when we find the tether on the
        // current player we can look up both of them immediately.
        data.statueIds ??= [];
        data.statueIds.push(parseInt(matches.id, 16));
      },
    },
    {
      id: 'E12S Promise Chiseled Sculpture Tether',
      type: 'Tether',
      // This always directly follows the 1B: headmarker line.
      netRegex: NetRegexes.tether({ target: 'Chiseled Sculpture', id: '0011' }),
      netRegexDe: NetRegexes.tether({ target: 'Abbild Eines Mannes', id: '0011' }),
      netRegexFr: NetRegexes.tether({ target: 'Cr??ation Masculine', id: '0011' }),
      netRegexJa: NetRegexes.tether({ target: '???????????????', id: '0011' }),
      netRegexCn: NetRegexes.tether({ target: '??????????????????', id: '0011' }),
      netRegexKo: NetRegexes.tether({ target: '????????? ??????', id: '0011' }),
      condition: (data, matches) => matches.source === data.me,
      durationSeconds: (data) => {
        // Handle laser #1 differently to not collide with the rapturous reach.
        if (data.statueTetherNumber === 0)
          return 3.5;
        if (data.statueTetherNumber)
          return data.statueTetherNumber * 3 + 4.5;
        return 8;
      },
      promise: async (data, matches) => {
        // Set an initial value here, just in case anything errors.
        data.statueDir = 'unknown';

        // Calculate distance to center to determine inner vs outer
        const statueData = await callOverlayHandler({
          call: 'getCombatants',
          ids: data.statueIds,
        });

        if (statueData === null) {
          console.error(`sculpture: null statueData`);
          return;
        }
        if (!statueData.combatants) {
          console.error(`sculpture: null combatants`);
          return;
        }
        if (statueData.combatants.length !== 2) {
          console.error(`sculpture: unexpected length: ${JSON.stringify(statueData)}`);
          return;
        }

        // Mark up statue objects with their distance to the center and
        // convert their decimal id to an 8 character hex id.
        type AnnotatedStatue = {
          dist: number;
          hexId: string;
        };
        const statues: AnnotatedStatue[] = [];
        for (const statue of statueData.combatants) {
          const centerX = 0;
          const centerY = -75;
          const x = statue.PosX - centerX;
          const y = statue.PosY - centerY;
          statues.push({
            dist: Math.hypot(x, y),
            hexId: `00000000${statue.ID?.toString(16) ?? ''}`.slice(-8).toUpperCase(),
          });
        }

        // Sort so that closest statue (inner) is first
        statues.sort((a, b) => a.dist - b.dist);

        if (statues[0]?.hexId === matches.targetId)
          data.statueDir = 'inner';
        else if (statues[1]?.hexId === matches.targetId)
          data.statueDir = 'outer';
        else
          console.error(`sculpture: missing ${matches.targetId}, ${JSON.stringify(statues)}`);
      },
      infoText: (data, _matches, output) => {
        const numMap: { [num: number]: string } = {
          1: output.laser1!(),
          2: output.laser2!(),
          3: output.laser3!(),
          4: output.laser4!(),
        };
        const numStr = numMap[data.statueTetherNumber ?? -1];

        if (!numStr) {
          console.error(`sculpture: invalid tether number: ${data.statueTetherNumber ?? '???'}`);
          return;
        }
        if (!data.statueDir) {
          console.error(`sculpture: missing statueDir`);
          return;
        }

        return output[data.statueDir]!({ num: numStr });
      },
      outputStrings: {
        laser1: Outputs.num1,
        laser2: Outputs.num2,
        laser3: Outputs.num3,
        laser4: Outputs.num4,
        inner: {
          en: '#${num} (Inner)',
          de: '#${num} (innen)',
          fr: '#${num} (Int??rieur)',
          ja: '#${num} (???)',
          cn: '#${num} (???)',
          ko: '#${num} (??????)',
        },
        outer: {
          en: '#${num} (Outer)',
          de: '#${num} (au??en)',
          fr: '#${num} (Ext??rieur)',
          ja: '#${num} (???)',
          cn: '#${num} (???)',
          ko: '#${num} (?????????)',
        },
        unknown: {
          en: '#${num} (???)',
          de: '#${num} (???)',
          fr: '#${num} (???)',
          ja: '#${num} (???)',
          cn: '#${num} (???)',
          ko: '#${num} (???)',
        },
      },
    },
    {
      id: 'E12S Promise Palm Of Temperance SE',
      type: 'StartsUsing',
      netRegex: NetRegexes.startsUsing({ source: 'Guardian Of Eden', id: '58B4', capture: false }),
      netRegexDe: NetRegexes.startsUsing({ source: 'W??chter Von Eden', id: '58B4', capture: false }),
      netRegexFr: NetRegexes.startsUsing({ source: 'Gardien D\'??den', id: '58B4', capture: false }),
      netRegexJa: NetRegexes.startsUsing({ source: '???????????????????????????????????????', id: '58B4', capture: false }),
      netRegexCn: NetRegexes.startsUsing({ source: '????????????', id: '58B4', capture: false }),
      netRegexKo: NetRegexes.startsUsing({ source: '????????? ?????????', id: '58B4', capture: false }),
      durationSeconds: 10,
      infoText: (_data, _matches, output) => output.knockback!(),
      outputStrings: {
        knockback: {
          en: 'SE Knockback',
          de: 'SO R??cksto??',
          fr: 'SE Pouss??e',
          ja: '????????????????????????',
          cn: '????????????????????????',
          ko: '?????????(5???)?????? ??????',
        },
      },
    },
    {
      id: 'E12S Promise Palm Of Temperance SW',
      type: 'StartsUsing',
      netRegex: NetRegexes.startsUsing({ source: 'Guardian Of Eden', id: '58B5', capture: false }),
      netRegexDe: NetRegexes.startsUsing({ source: 'W??chter Von Eden', id: '58B5', capture: false }),
      netRegexFr: NetRegexes.startsUsing({ source: 'Gardien D\'??den', id: '58B5', capture: false }),
      netRegexJa: NetRegexes.startsUsing({ source: '???????????????????????????????????????', id: '58B5', capture: false }),
      netRegexCn: NetRegexes.startsUsing({ source: '????????????', id: '58B5', capture: false }),
      netRegexKo: NetRegexes.startsUsing({ source: '????????? ?????????', id: '58B5', capture: false }),
      durationSeconds: 10,
      infoText: (_data, _matches, output) => output.knockback!(),
      outputStrings: {
        knockback: {
          en: 'SW Knockback',
          de: 'SW R??cksto??',
          fr: 'SO Pouss??e',
          ja: '????????????????????????',
          cn: '????????????????????????',
          ko: '?????????(7???)?????? ??????',
        },
      },
    },
    {
      id: 'E12S Promise Statue 2nd/3rd/4th Laser',
      type: 'Ability',
      netRegex: NetRegexes.ability({ source: 'Chiseled Sculpture', id: '58B3', capture: false }),
      netRegexDe: NetRegexes.ability({ source: 'Abbild Eines Mannes', id: '58B3', capture: false }),
      netRegexFr: NetRegexes.ability({ source: 'Cr??ation Masculine', id: '58B3', capture: false }),
      netRegexJa: NetRegexes.ability({ source: '???????????????', id: '58B3', capture: false }),
      netRegexCn: NetRegexes.ability({ source: '??????????????????', id: '58B3', capture: false }),
      netRegexKo: NetRegexes.ability({ source: '????????? ??????', id: '58B3', capture: false }),

      condition: (data) => !data.statueLaserCount || data.statueLaserCount < 4,
      durationSeconds: 3,
      suppressSeconds: 1,
      response: (data, _matches, output) => {
        // cactbot-builtin-response
        output.responseOutputStrings = {
          laser1: Outputs.num1,
          laser2: Outputs.num2,
          laser3: Outputs.num3,
          laser4: Outputs.num4,
          baitInner: {
            en: 'Bait Inner #${num}',
            de: 'K??der innen #${num}',
            fr: 'Orientez vers l\'int??rieur #${num}',
            ja: '???????????? #${num}',
            cn: '???????????? #${num}',
            ko: '?????? ?????? #${num}',
          },
          baitOuter: {
            en: 'Bait Outer #${num}',
            de: 'K??der au??en #${num}',
            fr: 'Orientez vers l\'ext??rieur #${num}',
            ja: '???????????? #${num}',
            cn: '???????????? #${num}',
            ko: '?????? ?????? #${num}',
          },
          baitUnknown: {
            en: 'Bait #${num}',
            de: 'K??der #${num}',
            fr: 'Orientez #${num}',
            ja: '?????? #${num}',
            cn: '?????? #${num}',
            ko: '?????? #${num}',
          },
        };
        // Start one ahead, so that it calls out #2 after #1 has finished.
        data.statueLaserCount = (data.statueLaserCount ?? 1) + 1;

        const numMap: { [num: number]: string } = {
          1: output.laser1!(),
          2: output.laser2!(),
          3: output.laser3!(),
          4: output.laser4!(),
        };
        const numStr = numMap[data.statueLaserCount];

        // The lasers are VERY noisy and flashy, so don't print anything when not you.
        // This also helps prevent confusion with the knockback direction trigger.
        if (data.statueLaserCount !== data.statueTetherNumber)
          return;

        if (data.statueDir === 'inner')
          return { alertText: output.baitInner!({ num: numStr }) };
        else if (data.statueDir === 'outer')
          return { alertText: output.baitOuter!({ num: numStr }) };
        return { alertText: output.baitUnknown!({ num: numStr }) };
      },
      run: (data) => {
        if (data.statueLaserCount && data.statueLaserCount >= 4) {
          // Prevent future rapturous reach calls from thinking this is during lasers.
          delete data.statueTetherNumber;
          delete data.statueDir;
        }
      },
    },
    {
      id: 'E12S Promise Weight Cleanup',
      type: 'StartsUsing',
      netRegex: NetRegexes.startsUsing({ source: 'Eden\'s Promise', id: '58A5', capture: false }),
      netRegexDe: NetRegexes.startsUsing({ source: 'Edens Verhei??ung', id: '58A5', capture: false }),
      netRegexFr: NetRegexes.startsUsing({ source: 'Promesse D\'??den', id: '58A5', capture: false }),
      netRegexJa: NetRegexes.startsUsing({ source: '?????????????????????????????????', id: '58A5', capture: false }),
      netRegexCn: NetRegexes.startsUsing({ source: '????????????', id: '58A5', capture: false }),
      netRegexKo: NetRegexes.startsUsing({ source: '????????? ??????', id: '58A5', capture: false }),
      run: (data) => {
        delete data.weightTargets;
        data.seenFirstBombs = true;
      },
    },
    {
      id: 'E12S Promise Formless Judgment',
      type: 'StartsUsing',
      netRegex: NetRegexes.startsUsing({ source: 'Eden\'s Promise', id: '58A9', capture: false }),
      netRegexDe: NetRegexes.startsUsing({ source: 'Edens Verhei??ung', id: '58A9', capture: false }),
      netRegexFr: NetRegexes.startsUsing({ source: 'Promesse D\'??den', id: '58A9', capture: false }),
      netRegexJa: NetRegexes.startsUsing({ source: '?????????????????????????????????', id: '58A9', capture: false }),
      netRegexCn: NetRegexes.startsUsing({ source: '????????????', id: '58A9', capture: false }),
      netRegexKo: NetRegexes.startsUsing({ source: '????????? ??????', id: '58A9', capture: false }),
      response: (data, _matches, output) => {
        // cactbot-builtin-response
        output.responseOutputStrings = {
          formlessBusterAndSwap: {
            en: 'Tank Buster + Swap',
            de: 'Tankbuster + Wechsel',
            fr: 'Tank buster + Swap',
            ja: '????????????????????? + ????????????',
            cn: '???????????? + ???T',
            ko: '?????? + ??????',
          },
          tankBusters: Outputs.tankBusters,
        };

        // Already called out in the headmarker trigger.
        if (data.formlessTargets && data.formlessTargets.includes(data.me))
          return;

        // TODO: should this call out who to cover if you are a paladin?
        if (data.role === 'tank')
          return { alertText: output.formlessBusterAndSwap!() };

        if (data.role === 'healer')
          return { alertText: output.tankBusters!() };

        // Be less noisy if this is just for feint.
        return { infoText: output.tankBusters!() };
      },
      run: (data) => delete data.formlessTargets,
    },
    {
      id: 'E12S Promise Rapturous Reach Left',
      type: 'StartsUsing',
      netRegex: NetRegexes.startsUsing({ source: 'Eden\'s Promise', id: '58AD', capture: false }),
      netRegexDe: NetRegexes.startsUsing({ source: 'Edens Verhei??ung', id: '58AD', capture: false }),
      netRegexFr: NetRegexes.startsUsing({ source: 'Promesse D\'??den', id: '58AD', capture: false }),
      netRegexJa: NetRegexes.startsUsing({ source: '?????????????????????????????????', id: '58AD', capture: false }),
      netRegexCn: NetRegexes.startsUsing({ source: '????????????', id: '58AD', capture: false }),
      netRegexKo: NetRegexes.startsUsing({ source: '????????? ??????', id: '58AD', capture: false }),
      response: (data, _matches, output) => {
        // cactbot-builtin-response
        output.responseOutputStrings = {
          goLeft: Outputs.left,
          goLeftBaitInner: {
            en: 'Left + Bait Inner #1',
            de: 'Links + K??der innen #1',
            fr: '?? gauche + Orientez vers l\'int??rieur #1',
            ja: '??? + ???????????? #1',
            cn: '??? + ???????????? #1',
            ko: '?????? + ?????? ?????? #1',
          },
          goLeftBaitOuter: {
            en: 'Left + Bait Outer #1',
            de: 'Links + K??der au??en #1',
            fr: '?? gauche + Orientez vers l\'ext??rieur #1',
            ja: '??? + ???????????? #1',
            cn: '??? + ???????????? #1',
            ko: '?????? + ?????? ?????? #1',
          },
          goLeftBaitUnknown: {
            en: 'Left + Bait #1',
            de: 'Links + K??der #1',
            fr: '?? gauche + Orientez #1',
            ja: '??? + ?????? #1',
            cn: '??? + ?????? #1',
            ko: '?????? + ?????? #1',
          },
        };

        if (data.statueTetherNumber !== 1)
          return { infoText: output.goLeft!() };

        if (data.statueDir === 'inner')
          return { alarmText: output.goLeftBaitInner!() };
        else if (data.statueDir === 'outer')
          return { alarmText: output.goLeftBaitOuter!() };
        return { alarmText: output.goLeftBaitUnknown!() };
      },
      run: (data) => data.isDoorBoss = true,
    },
    {
      id: 'E12S Promise Rapturous Reach Right',
      type: 'StartsUsing',
      netRegex: NetRegexes.startsUsing({ source: 'Eden\'s Promise', id: '58AE', capture: false }),
      netRegexDe: NetRegexes.startsUsing({ source: 'Edens Verhei??ung', id: '58AE', capture: false }),
      netRegexFr: NetRegexes.startsUsing({ source: 'Promesse D\'??den', id: '58AE', capture: false }),
      netRegexJa: NetRegexes.startsUsing({ source: '?????????????????????????????????', id: '58AE', capture: false }),
      netRegexCn: NetRegexes.startsUsing({ source: '????????????', id: '58AE', capture: false }),
      netRegexKo: NetRegexes.startsUsing({ source: '????????? ??????', id: '58AE', capture: false }),
      response: (data, _matches, output) => {
        // cactbot-builtin-response
        output.responseOutputStrings = {
          goRight: Outputs.right,
          goRightBaitInner: {
            en: 'Right + Bait Inner #1',
            de: 'Rechts + K??der innen #1',
            fr: '?? droite + Orientez vers l\'int??rieur #1',
            ja: '??? + ???????????? #1',
            cn: '??? + ???????????? #1',
            ko: '????????? + ?????? ?????? #1',
          },
          goRightBaitOuter: {
            en: 'Right + Bait Outer #1',
            de: 'Rechts + K??der au??en #1',
            fr: '?? droite + Orientez vers l\'ext??rieur #1',
            ja: '??? + ???????????? #1',
            cn: '??? + ???????????? #1',
            ko: '????????? + ?????? ?????? #1',
          },
          goRightBaitUnknown: {
            en: 'Right + Bait #1',
            de: 'Rechts + K??der #1',
            fr: '?? droite + Orientez #1',
            ja: '??? + ?????? #1',
            cn: '??? + ?????? #1',
            ko: '????????? + ?????? #1',
          },
        };

        if (data.statueTetherNumber !== 1)
          return { infoText: output.goRight!() };

        if (data.statueDir === 'inner')
          return { alarmText: output.goRightBaitInner!() };
        else if (data.statueDir === 'outer')
          return { alarmText: output.goRightBaitOuter!() };
        return { alarmText: output.goRightBaitUnknown!() };
      },
      run: (data) => data.isDoorBoss = true,
    },
    {
      id: 'E12S Promise Maleficium',
      type: 'StartsUsing',
      netRegex: NetRegexes.startsUsing({ source: 'Eden\'s Promise', id: '58A8', capture: false }),
      netRegexDe: NetRegexes.startsUsing({ source: 'Edens Verhei??ung', id: '58A8', capture: false }),
      netRegexFr: NetRegexes.startsUsing({ source: 'Promesse D\'??den', id: '58A8', capture: false }),
      netRegexJa: NetRegexes.startsUsing({ source: '?????????????????????????????????', id: '58A8', capture: false }),
      netRegexCn: NetRegexes.startsUsing({ source: '????????????', id: '58A8', capture: false }),
      netRegexKo: NetRegexes.startsUsing({ source: '????????? ??????', id: '58A8', capture: false }),
      response: Responses.aoe(),
    },
    {
      id: 'E12S Promise Junction Shiva',
      type: 'Tether',
      netRegex: NetRegexes.tether({ id: shivaTetherId, capture: false }),
      // Call out what the mechanic will be so that folks have time to move.
      preRun: (data) => {
        data.junctionSuffix = 'spread';
        data.junctionCount = (data.junctionCount ?? 0) + 1;
      },
      // Add in a slight delay for this big aoe so that trigger is < 10 seconds ahead.
      // Any further than 10 seconds and it's easy to miss reprisal or addle.
      delaySeconds: (data) => data.junctionCount === 2 ? 4 : 0,
      // For the junction with cast, keep the spread up for longer as a reminder.
      durationSeconds: (data) => data.junctionCount === 2 ? 4 : 13,
      alertText: (data, _matches, output) => {
        // The 2nd and 3rd junctions are different mechanics.
        if (data.junctionCount === 2)
          return output.diamondDust!();
        return output.junctionWithCast!();
      },
      outputStrings: {
        junctionWithCast: Outputs.spread,
        diamondDust: {
          en: 'Big AOE, Get Middle',
          de: 'Gro??e AoE, geh in die Mitte',
          fr: 'Grosse AoE, allez au milieu',
          ja: '????????????????????????',
          cn: '????????????????????????',
          ko: '?????? ??????, ????????????',
        },
      },
    },
    {
      id: 'E12S Promise Junction Titan',
      type: 'Tether',
      netRegex: NetRegexes.tether({ id: titanTetherId, capture: false }),
      preRun: (data) => {
        data.junctionSuffix = 'stacks';
        data.junctionCount = (data.junctionCount ?? 0) + 1;
      },
      // Add in a slight delay for this big aoe so that trigger is < 10 seconds ahead.
      // Any further than 10 seconds and it's easy to miss reprisal or addle.
      // Note: Junction Titan is not the same distance away from the aoe as Junction Shiva.
      delaySeconds: (data) => data.junctionCount === 3 ? 5 : 0,
      // For the junction with cast, keep the stack up for longer as a reminder.
      durationSeconds: (data) => data.junctionCount === 3 ? 4 : 13,
      alertText: (data, _matches, output) => {
        // The 2nd and 3rd junctions are different mechanics.
        if (data.junctionCount === 3)
          return output.earthenFury!();
        return output.junctionWithCast!();
      },
      outputStrings: {
        junctionWithCast: {
          en: 'Healer Stacks',
          de: 'Heiler-Gruppen',
          fr: 'Packages Heals',
          ja: '???????????????',
          cn: '????????????',
          ko: '?????? ??????',
        },
        earthenFury: {
          en: 'Big AOE, Bombs Soon',
          de: 'Gro??e AoE, bald Bomben',
          fr: 'Grosse AoE, Bombes bient??t',
          ja: '??????????????????????????????????????????',
          cn: '???????????????????????????',
          ko: '?????? ??????, ?????? ?????????',
        },
      },
    },
    {
      id: 'E12S Promise Tether Collect',
      type: 'Tether',
      netRegex: NetRegexes.tether({ id: tetherIds }),
      run: (data, matches) => {
        data.tethers ??= [];
        data.tethers.push(matches.id);
      },
    },
    {
      id: 'E12S Promise Stock',
      type: 'StartsUsing',
      netRegex: NetRegexes.startsUsing({ source: 'Eden\'s Promise', id: '5892', capture: false }),
      netRegexDe: NetRegexes.startsUsing({ source: 'Edens Verhei??ung', id: '5892', capture: false }),
      netRegexFr: NetRegexes.startsUsing({ source: 'Promesse D\'??den', id: '5892', capture: false }),
      netRegexJa: NetRegexes.startsUsing({ source: '?????????????????????????????????', id: '5892', capture: false }),
      netRegexCn: NetRegexes.startsUsing({ source: '????????????', id: '5892', capture: false }),
      netRegexKo: NetRegexes.startsUsing({ source: '????????? ??????', id: '5892', capture: false }),
      infoText: (data, _matches, output) => {
        data.stockedTethers = data.tethers;
        delete data.tethers;

        const text = getTetherString(data.stockedTethers, output);
        if (!text)
          return;
        return output.stock!({ text: text });
      },
      outputStrings: primalOutputStrings,
    },
    {
      id: 'E12S Promise Cast Release',
      type: 'StartsUsing',
      netRegex: NetRegexes.startsUsing({ source: 'Eden\'s Promise', id: ['4E43', '5893'] }),
      netRegexDe: NetRegexes.startsUsing({ source: 'Edens Verhei??ung', id: ['4E43', '5893'] }),
      netRegexFr: NetRegexes.startsUsing({ source: 'Promesse D\'??den', id: ['4E43', '5893'] }),
      netRegexJa: NetRegexes.startsUsing({ source: '?????????????????????????????????', id: ['4E43', '5893'] }),
      netRegexCn: NetRegexes.startsUsing({ source: '????????????', id: ['4E43', '5893'] }),
      netRegexKo: NetRegexes.startsUsing({ source: '????????? ??????', id: ['4E43', '5893'] }),
      preRun: (data) => data.castCount = (data.castCount ?? 0) + 1,
      // The pattern is cast - cast - release - release - cast - release.
      // #4 (the 2nd release) starts casting just before the second lion fire breath.
      // Delay just a smidgen so that hypothetically you don't jump off your bait spot early.
      // This is a 7 second long cast bar, so you still have 5 seconds to make it in.
      delaySeconds: (data) => data.castCount === 4 ? 1.8 : 0,
      alertText: (data, matches, output) => {
        // The second cast comes with an obliteration group laser (and no junction).
        // The entire party should stack this one.
        if (data.castCount === 2)
          data.junctionSuffix = 'stack';

        // At the end of the fight, there is a stock -> cast -> release,
        // which means that we need to grab the original tethers during the first stock.
        const isRelease = matches.id === '5893';
        const text = getTetherString(isRelease ? data.stockedTethers : data.tethers, output);
        if (!text)
          return;
        if (!data.junctionSuffix)
          return text;
        return output.junctionSuffix!({
          text: text,
          junction: output[data.junctionSuffix]!(),
        });
      },
      run: (data) => {
        delete data.tethers;
        delete data.junctionSuffix;
      },
      outputStrings: primalOutputStrings,
    },
    {
      id: 'E12S Promise Tether Cleanup',
      type: 'StartsUsing',
      netRegex: NetRegexes.startsUsing({ id: ['4E43', '5892', '5893'], capture: false }),
      delaySeconds: 10,
      run: (data) => delete data.tethers,
    },
    {
      id: 'E12S Promise Plunging Ice',
      type: 'StartsUsing',
      // This has a 9 second cast. :eyes:
      netRegex: NetRegexes.startsUsing({ source: 'Eden\'s Promise', id: '589D', capture: false }),
      netRegexDe: NetRegexes.startsUsing({ source: 'Edens Verhei??ung', id: '589D', capture: false }),
      netRegexFr: NetRegexes.startsUsing({ source: 'Promesse D\'??den', id: '589D', capture: false }),
      netRegexJa: NetRegexes.startsUsing({ source: '?????????????????????????????????', id: '589D', capture: false }),
      netRegexCn: NetRegexes.startsUsing({ source: '????????????', id: '589D', capture: false }),
      netRegexKo: NetRegexes.startsUsing({ source: '????????? ??????', id: '589D', capture: false }),
      delaySeconds: 4,
      response: Responses.knockback(),
    },
    {
      id: 'E12S Promise Small Lion Spawn',
      type: 'AddedCombatant',
      netRegex: NetRegexes.addedCombatantFull({ npcNameId: '9819' }),
      run: (data, matches) => {
        data.smallLions ??= [];
        data.smallLions.push(matches);
      },
    },
    {
      id: 'E12S Promise Small Lion Tether',
      type: 'Tether',
      netRegex: NetRegexes.tether({ source: 'Beastly Sculpture', id: '0011' }),
      netRegexDe: NetRegexes.tether({ source: 'Abbild Eines L??wen', id: '0011' }),
      netRegexFr: NetRegexes.tether({ source: 'Cr??ation L??onine', id: '0011' }),
      netRegexJa: NetRegexes.tether({ source: '??????????????????', id: '0011' }),
      netRegexCn: NetRegexes.tether({ source: '??????????????????', id: '0011' }),
      netRegexKo: NetRegexes.tether({ source: '????????? ??????', id: '0011' }),
      condition: Conditions.targetIsYou(),
      // Don't collide with reach left/right call.
      delaySeconds: 0.5,
      response: (data, matches, output) => {
        // cactbot-builtin-response
        output.responseOutputStrings = {
          lionTetherOnYou: {
            en: 'Lion Tether on YOU',
            de: 'L??wen-Verbindung auf DIR',
            fr: 'Lien lion sur VOUS',
            ja: '????????????????????????',
            cn: '??????????????????',
            ko: '?????? ?????? ?????????',
          },
          northEastLion: {
            en: 'NE Lion Tether',
            de: 'NO L??wen-Verbindung',
            fr: 'NE Lien lion',
            cn: '??????(??????)????????????',
            ko: '1??? ?????? ?????????',
          },
          northWestLion: {
            en: 'NW Lion Tether',
            de: 'NW L??wen-Verbindung',
            fr: 'NO Lien lion',
            cn: '??????(??????)????????????',
            ko: '11??? ?????? ?????????',
          },
          southEastLion: {
            en: 'SE Lion Tether',
            de: 'SO L??wen-Verbindung',
            fr: 'SE Lien lion',
            cn: '??????(??????)????????????',
            ko: '5??? ?????? ?????????',
          },
          southWestLion: {
            en: 'SW Lion Tether',
            de: 'SW L??wen-Verbindung',
            fr: 'SO Lien lion',
            cn: '??????(??????)????????????',
            ko: '7??? ?????? ?????????',
          },
        };
        if (!data.smallLions || data.smallLions.length === 0)
          return;

        const lion = data.smallLions?.find((l) => l.id.toUpperCase() === matches.sourceId.toUpperCase());
        if (!lion) {
          console.error('Unable to locate a valid lion.');
          return { alertText: output.lionTetherOnYou!() };
        }
        if (!lion.x || !lion.y) {
          console.error('Invalid Lion', lion);
          return { alertText: output.lionTetherOnYou!() };
        }
        const centerY = -75;
        const x = parseFloat(lion.x);
        const y = parseFloat(lion.y);
        if (y < centerY) {
          if (x > 0)
            return { alertText: output.northEastLion!() };
          return { alertText: output.northWestLion!() };
        }
        if (x > 0)
          return { alertText: output.southEastLion!() };
        return { alertText: output.southWestLion!() };
      },
    },
    {
      id: 'E12S Oracle Shockwave Pulsar',
      type: 'StartsUsing',
      netRegex: NetRegexes.startsUsing({ source: 'Oracle Of Darkness', id: '58F0', capture: false }),
      netRegexDe: NetRegexes.startsUsing({ source: 'Orakel Der Dunkelheit', id: '58F0', capture: false }),
      netRegexFr: NetRegexes.startsUsing({ source: 'Pr??tresse Des T??n??bres', id: '58F0', capture: false }),
      netRegexJa: NetRegexes.startsUsing({ source: '????????????', id: '58F0', capture: false }),
      netRegexCn: NetRegexes.startsUsing({ source: '????????????', id: '58F0', capture: false }),
      netRegexKo: NetRegexes.startsUsing({ source: '????????? ??????', id: '58F0', capture: false }),
      response: Responses.aoe(),
    },
    {
      id: 'E12S Relativity Phase',
      type: 'StartsUsing',
      netRegex: NetRegexes.startsUsing({ source: 'Oracle Of Darkness', id: '58E[0-3]' }),
      netRegexDe: NetRegexes.startsUsing({ source: 'Orakel Der Dunkelheit', id: '58E[0-3]' }),
      netRegexFr: NetRegexes.startsUsing({ source: 'Pr??tresse Des T??n??bres', id: '58E[0-3]' }),
      netRegexJa: NetRegexes.startsUsing({ source: '????????????', id: '58E[0-3]' }),
      netRegexCn: NetRegexes.startsUsing({ source: '????????????', id: '58E[0-3]' }),
      netRegexKo: NetRegexes.startsUsing({ source: '????????? ??????', id: '58E[0-3]' }),
      run: (data, matches) => {
        const phaseMap: { [id: string]: string } = {
          '58E0': 'basic',
          '58E1': 'intermediate',
          '58E2': 'advanced',
          '58E3': 'terminal',
        };
        data.phase = phaseMap[matches.id];
      },
    },
    {
      id: 'E12S Oracle Basic Relativity',
      type: 'StartsUsing',
      netRegex: NetRegexes.startsUsing({ source: 'Oracle Of Darkness', id: '58E0', capture: false }),
      netRegexDe: NetRegexes.startsUsing({ source: 'Orakel Der Dunkelheit', id: '58E0', capture: false }),
      netRegexFr: NetRegexes.startsUsing({ source: 'Pr??tresse Des T??n??bres', id: '58E0', capture: false }),
      netRegexJa: NetRegexes.startsUsing({ source: '????????????', id: '58E0', capture: false }),
      netRegexCn: NetRegexes.startsUsing({ source: '????????????', id: '58E0', capture: false }),
      netRegexKo: NetRegexes.startsUsing({ source: '????????? ??????', id: '58E0', capture: false }),
      response: Responses.bigAoe(),
    },
    {
      id: 'E12S Oracle Intermediate Relativity',
      type: 'StartsUsing',
      netRegex: NetRegexes.startsUsing({ source: 'Oracle Of Darkness', id: '58E1', capture: false }),
      netRegexDe: NetRegexes.startsUsing({ source: 'Orakel Der Dunkelheit', id: '58E1', capture: false }),
      netRegexFr: NetRegexes.startsUsing({ source: 'Pr??tresse Des T??n??bres', id: '58E1', capture: false }),
      netRegexJa: NetRegexes.startsUsing({ source: '????????????', id: '58E1', capture: false }),
      netRegexCn: NetRegexes.startsUsing({ source: '????????????', id: '58E1', capture: false }),
      netRegexKo: NetRegexes.startsUsing({ source: '????????? ??????', id: '58E1', capture: false }),
      response: Responses.bigAoe(),
    },
    {
      id: 'E12S Oracle Advanced Relativity',
      type: 'StartsUsing',
      netRegex: NetRegexes.startsUsing({ source: 'Oracle Of Darkness', id: '58E2', capture: false }),
      netRegexDe: NetRegexes.startsUsing({ source: 'Orakel Der Dunkelheit', id: '58E2', capture: false }),
      netRegexFr: NetRegexes.startsUsing({ source: 'Pr??tresse Des T??n??bres', id: '58E2', capture: false }),
      netRegexJa: NetRegexes.startsUsing({ source: '????????????', id: '58E2', capture: false }),
      netRegexCn: NetRegexes.startsUsing({ source: '????????????', id: '58E2', capture: false }),
      netRegexKo: NetRegexes.startsUsing({ source: '????????? ??????', id: '58E2', capture: false }),
      response: Responses.bigAoe(),
    },
    {
      id: 'E12S Oracle Terminal Relativity',
      type: 'StartsUsing',
      netRegex: NetRegexes.startsUsing({ source: 'Oracle Of Darkness', id: '58E3', capture: false }),
      netRegexDe: NetRegexes.startsUsing({ source: 'Orakel Der Dunkelheit', id: '58E3', capture: false }),
      netRegexFr: NetRegexes.startsUsing({ source: 'Pr??tresse Des T??n??bres', id: '58E3', capture: false }),
      netRegexJa: NetRegexes.startsUsing({ source: '????????????', id: '58E3', capture: false }),
      netRegexCn: NetRegexes.startsUsing({ source: '????????????', id: '58E3', capture: false }),
      netRegexKo: NetRegexes.startsUsing({ source: '????????? ??????', id: '58E3', capture: false }),
      response: Responses.bigAoe(),
    },
    {
      id: 'E12S Oracle Darkest Dance',
      type: 'StartsUsing',
      // Darkest and Somber Dance both.
      netRegex: NetRegexes.startsUsing({ source: 'Oracle Of Darkness', id: ['58BE', '58BD'], capture: false }),
      netRegexDe: NetRegexes.startsUsing({ source: 'Orakel Der Dunkelheit', id: ['58BE', '58BD'], capture: false }),
      netRegexFr: NetRegexes.startsUsing({ source: 'Pr??tresse Des T??n??bres', id: ['58BE', '58BD'], capture: false }),
      netRegexJa: NetRegexes.startsUsing({ source: '????????????', id: ['58BE', '58BD'], capture: false }),
      netRegexCn: NetRegexes.startsUsing({ source: '????????????', id: ['58BE', '58BD'], capture: false }),
      netRegexKo: NetRegexes.startsUsing({ source: '????????? ??????', id: ['58BE', '58BD'], capture: false }),
      infoText: (data, _matches, output) => {
        if (data.role === 'tank')
          return output.tankBait!();
        return output.partyUnder!();
      },
      outputStrings: {
        tankBait: {
          en: 'Bait Far',
          de: 'K??dern - Weit weg',
          fr: 'Attirez au loin',
          ja: '???????????????',
          cn: '?????????',
          ko: '?????? ????????????',
        },
        partyUnder: {
          en: 'Get Under',
          de: 'Unter ihn',
          fr: 'En dessous',
          ja: '?????????????????????',
          cn: '?????????',
          ko: '?????? ????????????',
        },
      },
    },
    {
      id: 'E12S Oracle Somber Dance',
      type: 'Ability',
      // Call for second hit of somber dance after first hit lands.
      netRegex: NetRegexes.ability({ source: 'Oracle Of Darkness', id: '58BD', capture: false }),
      netRegexDe: NetRegexes.ability({ source: 'Orakel Der Dunkelheit', id: '58BD', capture: false }),
      netRegexFr: NetRegexes.ability({ source: 'Pr??tresse Des T??n??bres', id: '58BD', capture: false }),
      netRegexJa: NetRegexes.ability({ source: '????????????', id: '58BD', capture: false }),
      netRegexCn: NetRegexes.ability({ source: '????????????', id: '58BD', capture: false }),
      netRegexKo: NetRegexes.ability({ source: '????????? ??????', id: '58BD', capture: false }),
      suppressSeconds: 5,
      infoText: (data, _matches, output) => {
        if (data.role === 'tank')
          return output.tankBait!();
        return output.partyOut!();
      },
      outputStrings: {
        tankBait: {
          en: 'Bait Close',
          de: 'K??der nah',
          fr: 'Attirez proche',
          ja: '????????????',
          cn: '?????????',
          ko: '????????? ??????',
        },
        partyOut: {
          en: 'Party Out',
          de: 'Gruppe raus',
          fr: 'Groupe au loin',
          ja: '???????????????',
          cn: '????????????BOSS',
          ko: '????????? ?????? ??????',
        },
      },
    },
    {
      id: 'E12S Oracle Cataclysm',
      type: 'StartsUsing',
      netRegex: NetRegexes.startsUsing({ source: 'Oracle Of Darkness', id: '58C2' }),
      netRegexDe: NetRegexes.startsUsing({ source: 'Orakel Der Dunkelheit', id: '58C2' }),
      netRegexFr: NetRegexes.startsUsing({ source: 'Pr??tresse Des T??n??bres', id: '58C2' }),
      netRegexJa: NetRegexes.startsUsing({ source: '????????????', id: '58C2' }),
      netRegexCn: NetRegexes.startsUsing({ source: '????????????', id: '58C2' }),
      netRegexKo: NetRegexes.startsUsing({ source: '????????? ??????', id: '58C2' }),
      delaySeconds: 0.5,
      promise: async (data, matches, output) => {
        // select the Oracle Of Darkness with same source id
        let oracleData = null;
        oracleData = await callOverlayHandler({
          call: 'getCombatants',
          ids: [parseInt(matches.sourceId, 16)],
        });

        // if we could not retrieve combatant data, the
        // trigger will not work, so just resume promise here
        if (oracleData === null) {
          console.error(`Oracle Of Darkness: null data`);
          delete data.safeZone;
          return;
        }
        if (!oracleData.combatants) {
          console.error(`Oracle Of Darkness: null combatants`);
          delete data.safeZone;
          return;
        }
        if (oracleData.combatants.length !== 1) {
          console.error(`Oracle Of Darkness: expected 1, got ${oracleData.combatants.length}`);
          delete data.safeZone;
          return;
        }

        const oracle = oracleData.combatants[0];
        if (!oracle)
          return;

        // Snap heading to closest card and add 2 for opposite direction
        // N = 0, E = 1, S = 2, W = 3
        const cardinal = ((2 - Math.round(oracle.Heading * 4 / Math.PI) / 2) + 2) % 4;

        const dirs: { [dir: number]: string } = {
          0: output.north!(),
          1: output.east!(),
          2: output.south!(),
          3: output.west!(),
        };

        data.safeZone = dirs[cardinal];
      },
      infoText: (data, _matches, output) => !data.safeZone ? output.unknown!() : data.safeZone,
      outputStrings: {
        unknown: Outputs.unknown,
        north: Outputs.north,
        east: Outputs.east,
        south: Outputs.south,
        west: Outputs.west,
      },
    },
    {
      id: 'E12S Shell Crusher',
      type: 'StartsUsing',
      netRegex: NetRegexes.startsUsing({ source: 'Oracle Of Darkness', id: '58C3', capture: false }),
      netRegexDe: NetRegexes.startsUsing({ source: 'Orakel Der Dunkelheit', id: '58C3', capture: false }),
      netRegexFr: NetRegexes.startsUsing({ source: 'Pr??tresse Des T??n??bres', id: '58C3', capture: false }),
      netRegexJa: NetRegexes.startsUsing({ source: '????????????', id: '58C3', capture: false }),
      netRegexCn: NetRegexes.startsUsing({ source: '????????????', id: '58C3', capture: false }),
      netRegexKo: NetRegexes.startsUsing({ source: '????????? ??????', id: '58C3', capture: false }),
      response: Responses.getTogether(),
    },
    {
      id: 'E12S Spirit Taker',
      type: 'Ability',
      // Spirit Taker always comes after Shell Crusher, so trigger on Shell Crusher damage
      // to warn people a second or two earlier than `starts using Spirit Taker` would occur.
      netRegex: NetRegexes.ability({ source: 'Oracle Of Darkness', id: '58C3', capture: false }),
      netRegexDe: NetRegexes.ability({ source: 'Orakel Der Dunkelheit', id: '58C3', capture: false }),
      netRegexFr: NetRegexes.ability({ source: 'Pr??tresse Des T??n??bres', id: '58C3', capture: false }),
      netRegexJa: NetRegexes.ability({ source: '????????????', id: '58C3', capture: false }),
      netRegexCn: NetRegexes.ability({ source: '????????????', id: '58C3', capture: false }),
      netRegexKo: NetRegexes.ability({ source: '????????? ??????', id: '58C3', capture: false }),
      suppressSeconds: 1,
      response: Responses.spread(),
    },
    {
      id: 'E12S Black Halo',
      type: 'StartsUsing',
      netRegex: NetRegexes.startsUsing({ source: 'Oracle Of Darkness', id: '58C7' }),
      netRegexDe: NetRegexes.startsUsing({ source: 'Orakel Der Dunkelheit', id: '58C7' }),
      netRegexFr: NetRegexes.startsUsing({ source: 'Pr??tresse Des T??n??bres', id: '58C7' }),
      netRegexJa: NetRegexes.startsUsing({ source: '????????????', id: '58C7' }),
      netRegexCn: NetRegexes.startsUsing({ source: '????????????', id: '58C7' }),
      netRegexKo: NetRegexes.startsUsing({ source: '????????? ??????', id: '58C7' }),
      response: Responses.tankBuster(),
    },
    {
      id: 'E12S Basic Relativity Debuffs',
      type: 'GainsEffect',
      // 997 Spell-In-Waiting: Dark Fire III
      // 998 Spell-In-Waiting: Shadoweye
      // 99D Spell-In-Waiting: Dark Water III
      // 99E Spell-In-Waiting: Dark Blizzard III
      netRegex: NetRegexes.gainsEffect({ effectId: '99[78DE]' }),
      condition: (data, matches) => data.phase === 'basic' && matches.target === data.me,
      response: (_data, matches, output) => {
        // cactbot-builtin-response
        output.responseOutputStrings = {
          shadoweye: {
            en: 'Eye on YOU',
            de: 'Auge auf DIR',
            fr: '??il sur VOUS',
            ja: '????????????',
            cn: '???????????????',
            ko: '????????? ?????????',
          },
          water: intermediateRelativityOutputStrings.stack,
          longFire: {
            en: 'Long Fire',
            de: 'langes Feuer',
            fr: 'Feu long',
            ja: '????????????(??????)',
            cn: '??????',
            ko: '?????? ?????????',
          },
          shortFire: {
            en: 'Short Fire',
            de: 'kurzes Feuer',
            fr: 'Feu court',
            ja: '????????????(??????)',
            cn: '??????',
            ko: '?????? ?????????',
          },
          longIce: {
            en: 'Long Ice',
            de: 'langes Eis',
            fr: 'Glace longue',
            ja: '????????????(??????)',
            cn: '??????',
            ko: '?????? ????????????',
          },
          shortIce: {
            en: 'Short Ice',
            de: 'kurzes Eis',
            fr: 'Glace courte',
            ja: '????????????(??????)',
            cn: '??????',
            ko: '?????? ????????????',
          },
        };

        if (!matches.effectId)
          return;
        const id = matches.effectId.toUpperCase();

        if (id === '998')
          return { infoText: output.shadoweye!() };
        if (id === '99D')
          return { infoText: output.water!() };

        // Long fire/ice is 15 seconds, short fire/ice is 29 seconds.
        const isLong = parseFloat(matches.duration) > 20;

        if (id === '997') {
          if (isLong)
            return { alertText: output.longFire!() };
          return { alertText: output.shortFire!() };
        }
        if (id === '99E') {
          if (isLong)
            return { alertText: output.longIce!() };
          return { alertText: output.shortIce!() };
        }
      },
    },
    {
      id: 'E12S Intermediate Relativity Debuff Collector',
      type: 'GainsEffect',
      // 690 Spell-In-Waiting: Flare
      // 996 Spell-In-Waiting: Unholy Darkness
      // 998 Spell-In-Waiting: Shadoweye
      // 99C Spell-In-Waiting: Dark Eruption
      // 99E Spell-In-Waiting: Dark Blizzard III
      // 99F Spell-In-Waiting: Dark Aero III
      netRegex: NetRegexes.gainsEffect({ effectId: ['690', '99[68CEF]'] }),
      condition: (data, matches) => data.phase === 'intermediate' && matches.target === data.me,
      preRun: (data, matches) => {
        data.debuffs ??= {};
        data.debuffs[matches.effectId.toUpperCase()] = parseFloat(matches.duration);
      },
      durationSeconds: 20,
      infoText: (data, _matches, output) => {
        const unsortedIds = Object.keys(data.debuffs ?? {});
        if (unsortedIds.length !== 3)
          return;

        // Sort effect ids descending by duration.
        const sortedIds = unsortedIds.sort((a, b) => (data.debuffs?.[b] ?? 0) - (data.debuffs?.[a] ?? 0));
        const keys = sortedIds.map((effectId) => effectIdToOutputStringKey[effectId]);

        const [key0, key1, key2] = keys;
        if (!key0 || !key1 || !key2)
          throw new UnreachableCode();

        // Stash outputstring keys to use later.
        data.intermediateDebuffs = [key1, key2];

        return output.comboText!({
          effect1: output[key0]!(),
          effect2: output[key1]!(),
          effect3: output[key2]!(),
        });
      },
      outputStrings: {
        comboText: {
          en: '${effect1} > ${effect2} > ${effect3}',
          de: '${effect1} > ${effect2} > ${effect3}',
          fr: '${effect1} > ${effect2} > ${effect3}',
          ja: '${effect1} > ${effect2} > ${effect3}',
          cn: '${effect1} > ${effect2} > ${effect3}',
          ko: '${effect1} > ${effect2} > ${effect3}',
        },
        ...intermediateRelativityOutputStrings,
      },
    },
    {
      id: 'E12S Relativity Debuffs',
      type: 'GainsEffect',
      // Players originally get `Spell-in-Waiting: Return` or `Spell-in-Waiting: Return IV`.
      // When Spell-in-Waiting Return IV wears off, players get Return IV effect.
      // When Return IV effect wears off, players get Return effect.
      // When Return effect wears off, players go back to previous locations
      //
      // Return = 994
      // Return IV = 995
      netRegex: NetRegexes.gainsEffect({ effectId: '99[45]' }),
      condition: Conditions.targetIsYou(),
      response: (data, _matches, output) => {
        // cactbot-builtin-response
        output.responseOutputStrings = Object.assign({
          moveAway: {
            en: 'Move!',
            de: 'Bewegen!',
            fr: 'Bougez !',
            ja: '????????????',
            cn: '????????????',
            ko: '????????????!',
          },
        }, intermediateRelativityOutputStrings);

        if (data.phase !== 'intermediate')
          return { infoText: output.moveAway!() };

        const key = data.intermediateDebuffs && data.intermediateDebuffs.shift();
        if (!key)
          return { infoText: output.moveAway!() };
        return { alertText: output[key]!() };
      },
    },
    {
      id: 'E12S Oracle Basic Relativity Shadow Eye Collector',
      type: 'GainsEffect',
      netRegex: NetRegexes.gainsEffect({ effectId: '998' }),
      condition: (data) => data.phase === 'basic',
      run: (data, matches) => {
        data.eyes ??= [];
        data.eyes.push(matches.target);
      },
    },
    {
      id: 'E12S Oracle Basic Relativity Shadow Eye Other',
      type: 'GainsEffect',
      netRegex: NetRegexes.gainsEffect({ effectId: '998' }),
      condition: (data) => data.phase === 'basic',
      delaySeconds: (_data, matches) => parseFloat(matches.duration) - 3,
      suppressSeconds: 3,
      alertText: (data, _matches, output) => {
        const [player1, player2] = data.eyes ?? [];

        if (player1 !== data.me && player2 !== data.me) {
          // Call out both player names if you don't have eye
          return output.lookAwayFromPlayers!({
            player1: data.ShortName(player1),
            player2: data.ShortName(player2),
          });
        } else if (player1 === data.me && player2) {
          // Call out second player name if exists and you have eye
          return output.lookAwayFromPlayer!({ player: data.ShortName(player2) });
        } else if (player2 === data.me) {
          // Call out first player name if you have eye
          return output.lookAwayFromPlayer!({ player: data.ShortName(player1) });
        }

        // Return empty when only you have eye
        return;
      },
      outputStrings: {
        lookAwayFromPlayers: {
          en: 'Look Away from ${player1} and ${player2}',
          de: 'Schau weg von ${player1} und ${player2}',
          fr: 'Ne regardez pas ${player1} et ${player2}',
          ja: '${player1}???${player2}????????????',
          cn: '??????${player1}???${player2}',
          ko: '${player1}??? ${player2}????????? ?????????',
        },
        lookAwayFromPlayer: Outputs.lookAwayFromPlayer,
      },
    },
    {
      // For intermediate and advanced, players should look outside during the final return effect.
      // For basic relativity, the shadoweye happens when the return puddle is dropped.
      id: 'E12S Relativity Look Outside',
      type: 'GainsEffect',
      netRegex: NetRegexes.gainsEffect({ effectId: '994' }),
      condition: (data, matches) => data.phase !== 'basic' && matches.target === data.me,
      delaySeconds: (_data, matches) => parseFloat(matches.duration) - 2.5,
      alertText: (_data, _matches, output) => output.text!(),
      outputStrings: {
        text: {
          en: 'Look Outside',
          de: 'Nach drau??en schauen',
          fr: 'Regardez vers l\'ext??rieur',
          ja: '????????????',
          cn: '??????',
          ko: '?????? ??????',
        },
      },
    },
    {
      id: 'E12S Basic Relativity Yellow Hourglass',
      type: 'AddedCombatant',
      // Orient where "Yellow" Anger's Hourglass spawns
      netRegex: NetRegexes.addedCombatantFull({ npcNameId: '9824' }),
      durationSeconds: 10,
      infoText: (_data, matches, output) => {
        return output.hourglass!({
          dir: dirToOutput(matchedPositionToDir(matches), output),
        });
      },
      outputStrings: {
        north: Outputs.north,
        northeast: Outputs.northeast,
        east: Outputs.east,
        southeast: Outputs.southeast,
        south: Outputs.south,
        southwest: Outputs.southwest,
        west: Outputs.west,
        northwest: Outputs.northwest,
        hourglass: {
          en: 'Yellow: ${dir}',
          de: 'Gelb: ${dir}',
          fr: 'Jaune : ${dir}',
          ja: '??????: ${dir}',
          cn: '??????: ${dir}',
          ko: '??????: ${dir}',
        },
      },
    },
    {
      id: 'E12S Adv Relativity Hourglass Collect',
      type: 'AddedCombatant',
      // Collect Sorrow's Hourglass locations
      netRegex: NetRegexes.addedCombatantFull({ npcNameId: '9823' }),
      run: (data, matches) => {
        const id = matches.id.toUpperCase();

        data.sorrows ??= {};
        data.sorrows[id] = matchedPositionToDir(matches);
      },
    },
    {
      id: 'E12S Adv Relativity Hourglass Collect Yellow Tethers',
      type: 'Tether',
      // '0086' is the Yellow tether that buffs "Quicken"
      // '0085' is the Red tether that buffs "Slow"
      netRegex: NetRegexes.tether({ id: '0086' }),
      condition: (data) => data.phase === 'advanced',
      durationSeconds: 4,
      suppressSeconds: 3,
      infoText: (data, matches, output) => {
        const sorrow1 = data.sorrows?.[matches.sourceId.toUpperCase()];
        if (sorrow1 === undefined)
          return;

        // Calculate opposite side
        const sorrow2 = (sorrow1 + 4) % 8;

        return output.hourglass!({
          dir1: sorrow1 < sorrow2 ? dirToOutput(sorrow1, output) : dirToOutput(sorrow2, output),
          dir2: sorrow1 > sorrow2 ? dirToOutput(sorrow1, output) : dirToOutput(sorrow2, output),
        });
      },
      outputStrings: {
        north: Outputs.north,
        northeast: Outputs.northeast,
        east: Outputs.east,
        southeast: Outputs.southeast,
        south: Outputs.south,
        southwest: Outputs.southwest,
        west: Outputs.west,
        northwest: Outputs.northwest,
        hourglass: {
          en: 'Yellow: ${dir1} / ${dir2}',
          de: 'Gelb: ${dir1} / ${dir2}',
          fr: 'Jaune : ${dir1} / ${dir2}',
          ja: '??????: ${dir1} / ${dir2}',
          cn: '??????: ${dir1} / ${dir2}',
          ko: '??????: ${dir1} / ${dir2}',
        },
      },
    },
    {
      id: 'E12S Initial Dark Water',
      type: 'GainsEffect',
      netRegex: NetRegexes.gainsEffect({ effectId: '99D' }),
      condition: (data) => !data.phase,
      delaySeconds: (data, matches) => {
        const duration = parseFloat(matches.duration);
        return data.seenInitialSpread ? duration - 6 : duration - 8;
      },
      durationSeconds: 5,
      suppressSeconds: 5,
      alertText: (data, _matches, output) => {
        data.seenInitialStacks = true;
        if (data.seenInitialSpread)
          return output.knockbackIntoStackGroups!();
        return output.stackGroups!();
      },
      outputStrings: {
        stackGroups: {
          en: 'Stack Groups',
          de: 'In Gruppen sammeln',
          fr: 'Packez-vous en groupe',
          ja: '?????????',
          cn: '??????',
          ko: '??????',
        },
        knockbackIntoStackGroups: {
          en: 'Knockback Into Stack Groups',
          de: 'R??cksto??, dann in Gruppen sammeln',
          fr: 'Pouss??e puis packez-vous en groupe',
          ja: '???????????????????????????????????????????????????',
          cn: '????????????',
          ko: '?????? ??? ??????',
        },
      },
    },
    {
      id: 'E12S Initial Dark Eruption',
      type: 'GainsEffect',
      netRegex: NetRegexes.gainsEffect({ effectId: '99C' }),
      condition: (data) => !data.phase,
      delaySeconds: (data, matches) => {
        const duration = parseFloat(matches.duration);
        return data.seenInitialSpread ? duration - 6 : duration - 8;
      },
      durationSeconds: 5,
      suppressSeconds: 5,
      alertText: (data, _matches, output) => {
        data.seenInitialSpread = true;
        if (data.seenInitialStacks)
          return output.knockbackIntoSpread!();
        return output.spread!();
      },
      outputStrings: {
        spread: Outputs.spread,
        knockbackIntoSpread: {
          en: 'Knockback Into Spread',
          de: 'R??cksto?? dann verteilen',
          fr: 'Pouss??e puis dispersez-vous',
          ja: '????????????????????????????????????',
          cn: '????????????',
          ko: '?????? ??? ??????',
        },
      },
    },
    {
      id: 'E12S Dark Water Stacks',
      type: 'GainsEffect',
      netRegex: NetRegexes.gainsEffect({ effectId: '99D' }),
      // During Advanced Relativity, there is a very short Dark Water III stack (12s)
      // that applies when people position themselves for the initial Return placement.
      // Most strategies auto-handle this, and so this feels like noise.  HOWEVER,
      // using suppress here without this conditional will pick one of the short/long
      // Dark Water III buffs and suppress the other, so this is a load-bearing conditional.
      // Additionally, `data.phase` is checked here to avoid colliding with the special
      // case of the first dark water in `E12S Initial Dark Water`.
      condition: (data, matches) => data.phase !== undefined && parseFloat(matches.duration) > 13,
      delaySeconds: (_data, matches) => parseFloat(matches.duration) - 4,
      suppressSeconds: 5,
      alertText: (_data, _matches, output) => output.text!(),
      outputStrings: {
        text: {
          en: 'Stack Groups',
          de: 'In Gruppen sammeln',
          fr: 'Packez-vous en groupe',
          ja: '??????',
          cn: '??????',
          ko: '??????',
        },
      },
    },
    {
      id: 'E12S Double Aero Finder',
      type: 'GainsEffect',
      netRegex: NetRegexes.gainsEffect({ effectId: '99F' }),
      // In advanced, Aero comes in ~23 and ~31s flavors
      condition: (data, matches) => data.phase === 'advanced' && parseFloat(matches.duration) > 28,
      infoText: (data, matches, output) => {
        data.doubleAero ??= [];
        data.doubleAero.push(data.ShortName(matches.target));

        if (data.doubleAero.length !== 2)
          return;

        data.doubleAero.sort();
        return output.text!({ name1: data.doubleAero[0], name2: data.doubleAero[1] });
      },
      // This will collide with 'E12S Adv Relativity Buff Collector', sorry.
      tts: null,
      outputStrings: {
        text: {
          en: 'Double Aero: ${name1}, ${name2}',
          de: 'Doppel Windga: ${name1}, ${name2}',
          fr: 'Double Vent : ${name1}, ${name2}',
          ja: '??????????????2: ${name1}, ${name2}',
          cn: '??????: ${name1}, ${name2}',
          ko: '?????? ????????????: ${name1}, ${name2}',
        },
      },
    },
    {
      id: 'E12S Adv Relativity Buff Collector',
      type: 'GainsEffect',
      // 997 Spell-In-Waiting: Dark Fire III
      // 998 Spell-In-Waiting: Shadoweye
      // 99F Spell-In-Waiting: Dark Aero III
      netRegex: NetRegexes.gainsEffect({ effectId: '99[78F]' }),
      condition: (data, matches) => data.phase === 'advanced' && data.me === matches.target,
      durationSeconds: 15,
      alertText: (_data, matches, output) => {
        const id = matches.effectId.toUpperCase();

        // The shadoweye and the double aero person gets aero, so only consider the final aero.
        if (id === '99F') {
          if (parseFloat(matches.duration) < 28)
            return;
          return output.doubleAero!();
        }
        if (id === '997')
          return output.spread!();
        if (id === '998')
          return output.shadoweye!();
      },
      outputStrings: {
        shadoweye: {
          en: 'Eye on YOU',
          de: 'Auge auf DIR',
          fr: '??il sur VOUS',
          ja: '????????????',
          cn: '???????????????',
          ko: '????????? ?????????',
        },
        doubleAero: {
          en: 'Double Aero on YOU',
          de: 'Doppel Windga auf DIR',
          fr: 'Double Vent sur VOUS',
          ja: '???????????????????????2',
          cn: '????????????',
          ko: '?????? ???????????? ?????????',
        },
        spread: {
          en: 'Spread on YOU',
          de: 'Verteilen auf DIR',
          fr: 'Dispersion sur VOUS',
          ja: '???????????????',
          cn: '????????????',
          ko: '????????? ?????????',
        },
      },
    },
  ],
  timelineReplace: [
    {
      'locale': 'de',
      'replaceSync': {
        'Beastly Sculpture': 'Abbild eines L??wen',
        'Bomb Boulder': 'Bomber-Brocken',
        'Chiseled Sculpture': 'Abbild eines Mannes',
        'Eden\'s Promise': 'Edens Verhei??ung',
        'Guardian Of Eden': 'W??chter von Eden',
        'Ice Pillar': 'Eiss??ule',
        'Oracle Of Darkness': 'Orakel der Dunkelheit',
        'Sorrow\'s Hourglass': 'Sanduhr der Sorge',
      },
      'replaceText': {
        'Advanced Relativity': 'Fortgeschrittene Relativit??t',
        '(?<! )Apocalypse': 'Apokalypse',
        'Basic Relativity': 'Grundlegende Relativit??t',
        'Black Halo': 'Geschw??rzter Schein',
        'Blade Of Flame': 'Flammenschwert',
        'Cast': 'Auswerfen',
        'Cataclysm': 'Kataklysmus',
        'Classical Sculpture': 'Klassische Skulptur',
        'Dark Aero III': 'Dunkel-Windga',
        'Dark Current': 'Dunkel-Strom',
        'Dark Eruption': 'Dunkle Eruption',
        'Dark Fire III': 'Dunkel-Feuga',
        'Dark Water III': 'Dunkel-Aquaga',
        'Darkest Dance': 'Finsterer Tanz',
        'Diamond Dust': 'Diamantenstaub',
        'Dual Apocalypse': 'Doppelte Apokalypse',
        'Earthen Fury': 'Gaias Zorn',
        'Empty Hate': 'G??hnender Abgrund',
        'Empty Rage': 'Lockende Leere',
        'Force Of The Land': 'Gaias Tosen',
        'Formless Judgment': 'Formloses Urteil',
        'Frigid Stone': 'Eisstein',
        'Hell\'s Judgment': 'H??llenurteil',
        'Ice Floe': 'Eisfluss',
        'Ice Pillar': 'Eiss??ule',
        'Impact': 'Impakt',
        'Initialize Recall': 'R??ckholung initialisieren',
        'Intermediate Relativity': 'Intermedi??re Relativit??t',
        'Junction Shiva': 'Verbindung: Shiva',
        'Junction Titan': 'Verbindung: Titan',
        'Laser Eye': 'Laserauge',
        'Lionsblaze': 'L??wenfeuer',
        'Maleficium': 'Maleficium',
        'Maelstrom': 'Mahlstrom',
        'Memory\'s End': 'Ende der Erinnerungen',
        'Obliteration Laser': 'Ausl??schung',
        'Palm Of Temperance': 'Hand der M????igung',
        'Paradise Lost': 'Verlorenes Paradies',
        'Pillar Pierce': 'S??ulendurchschlag',
        'Plunging Ice': 'Fallendes Eis',
        'Pulse Of The Land': 'Gaias Beben',
        'Quicken': 'Schnell',
        'Rapturous Reach': 'St??rmischer Griff',
        'Release': 'Freilassen',
        'Return(?! IV)': 'R??ckf??hrung',
        'Return IV': 'Giga-R??ckf??hrung',
        'Shadoweye': 'Schattenauge',
        'Shell Crusher': 'H??llenbrecher',
        'Shockwave Pulsar': 'Schockwellenpulsar',
        'Singular Apocalypse': 'Einfache Apokalypse',
        'Slow': 'Langsam',
        'Somber Dance': 'D??sterer Tanz',
        'Speed': 'Geschwindigkeit',
        'Spell-In-Waiting': 'Verz??gerung',
        'Spirit Taker': 'Geistesdieb',
        'Stock': 'Sammeln',
        'Terminal Relativity': 'Terminale Relativit??t',
        '(?<!Junction )Titan': 'Titan',
        'Triple Apocalypse': 'Dreifache Apokalypse',
        'Under The Weight': 'Wucht der Erde',
        'Weight Of The World': 'Schwere der Erde',
      },
    },
    {
      'locale': 'fr',
      'replaceSync': {
        'Beastly Sculpture': 'cr??ation l??onine',
        'Bomb Boulder': 'bombo rocher',
        'Chiseled Sculpture': 'cr??ation masculine',
        'Eden\'s Promise': 'Promesse d\'??den',
        'Guardian Of Eden': 'Gardien d\'??den',
        'Ice Pillar': 'Pilier de glace',
        'Oracle Of Darkness': 'pr??tresse des T??n??bres',
        'Sorrow\'s Hourglass': 'sablier de chagrin',
      },
      'replaceText': {
        'Advanced Relativity': 'Relativit?? avanc??e',
        '(?<! )Apocalypse': 'Apocalypse',
        'Basic Relativity': 'Relativit?? basique',
        'Black Halo': 'Halo de noirceur',
        'Blade Of Flame': 'Flammes de Lumi??re colossales',
        'Cast': 'Lancer',
        'Cataclysm': 'Cataclysme',
        'Classical Sculpture': 'Serviteur colossal',
        'Dark Aero III': 'M??ga Vent t??n??breux',
        'Dark Current': 'Flux sombre',
        'Dark Eruption': '??ruption t??n??breuse',
        'Dark Fire III': 'M??ga Feu t??n??breux',
        'Dark Water III': 'M??ga Eau t??n??breuse',
        'Darkest Dance': 'Danse de la nuit profonde',
        'Diamond Dust': 'Poussi??re de diamant',
        'Dual Apocalypse': 'Apocalypse double',
        'Earthen Fury': 'Fureur tellurique',
        'Empty Hate': 'Vaine malice',
        'Empty Rage': 'Vaine cruaut??',
        'Force Of The Land': 'Grondement tellurique',
        'Formless Judgment': 'Onde du ch??timent',
        'Frigid Stone': 'Rocher de glace',
        'Hell\'s Judgment': 'Jugement dernier',
        'Ice Floe': 'Flux glac??',
        'Ice Pillar': 'Pilier de glace',
        'Impact': 'Impact',
        'Initialize Recall': 'Remembrances',
        'Intermediate Relativity': 'Relativit?? interm??diaire',
        'Junction Shiva': 'Associer : Shiva',
        'Junction Titan': 'Associer : Titan',
        'Laser Eye': 'Faisceau maser',
        'Lionsblaze': 'Feu l??onin',
        'Maleficium': 'Maleficium',
        'Maelstrom': 'Maelstr??m',
        'Memory\'s End': 'Mort des souvenirs',
        'Obliteration Laser': 'Oblit??ration',
        'Palm Of Temperance': 'Paume de temp??rance',
        'Paradise Lost': 'Paradis perdu',
        'Pillar Pierce': 'Frappe puissante',
        'Plunging Ice': 'Chute de glace',
        'Pulse Of The Land': 'Vibration tellurique',
        'Quicken': 'Acc??l??ration',
        'Rapturous Reach': 'Main voluptueuse',
        'Release': 'Rel??cher',
        'Return(?! IV)': 'Retour',
        'Return IV': 'Giga Retour',
        'Shadoweye': '??il de l\'ombre',
        'Shell Crusher': 'Broyeur de carapace',
        'Shockwave Pulsar': 'Pulsar ?? onde de choc',
        'Singular Apocalypse': 'Apocalypse simple',
        'Slow': 'Lenteur',
        'Somber Dance': 'Danse du cr??puscule',
        'Speed': 'Vitesse',
        'Spell-In-Waiting': 'D??phasage incantatoire',
        'Spirit Taker': 'Arracheur d\'esprit',
        'Stock': 'Stocker',
        'Terminal Relativity': 'Relativit?? terminale',
        '(?<!Junction )Titan': 'Titan',
        'Triple Apocalypse': 'Apocalypse triple',
        'Under The Weight': 'Pression tellurique',
        'Weight Of The World': 'Poids du monde',
      },
    },
    {
      'locale': 'ja',
      'replaceSync': {
        'Beastly Sculpture': '??????????????????',
        'Bomb Boulder': '??????????????????',
        'Chiseled Sculpture': '???????????????',
        'Eden\'s Promise': '?????????????????????????????????',
        'Guardian Of Eden': '???????????????????????????????????????',
        'Ice Pillar': '??????',
        'Oracle Of Darkness': '????????????',
        'Sorrow\'s Hourglass': '?????????????????????',
      },
      'replaceText': {
        'Advanced Relativity': '??????????????????',
        '(?<! )Apocalypse': '??????????????????',
        'Basic Relativity': '??????????????????',
        'Black Halo': '????????????????????????',
        'Blade Of Flame': '???????????????',
        'Cast': '?????????',
        'Cataclysm': '??????????????????',
        'Classical Sculpture': '????????????',
        'Dark Aero III': '?????????????????????',
        'Dark Current': '????????????????????????',
        '(?<! )Dark Eruption(?! )': '???????????????????????????',
        'Dark Eruption / Dark Water III': '???????????????????????????/?????????????????????',
        'Dark Fire III': '?????????????????????',
        'Dark Water III / Dark Eruption': '?????????????????????/???????????????????????????',
        '(?<! )Dark Water III(?! )': '?????????????????????',
        'Darkest Dance': '??????????????????',
        'Diamond Dust': '???????????????????????????',
        'Dual Apocalypse': '??????????????????????????????',
        'Earthen Fury': '???????????????',
        'Empty Hate': '??????????????????',
        'Empty Rage': '??????????????????',
        'Force Of The Land': '???????????????',
        'Formless Judgment': '???????????????',
        'Frigid Stone': '?????????????????????',
        'Hell\'s Judgment': '??????????????????????????????',
        'Ice Floe': '??????????????????',
        'Ice Pillar': '??????',
        'Impact': '??????',
        'Initialize Recall': '????????????',
        'Intermediate Relativity': '??????????????????',
        'Junction Shiva': '?????????????????????????????????',
        'Junction Titan': '????????????????????????????????????',
        'Laser Eye': '??????????????????',
        'Lionsblaze': '???????????????',
        'Maleficium': '?????????????????????',
        'Maelstrom': '???????????????????????????',
        'Memory\'s End': '????????????????????????????????????',
        'Obliteration Laser': '????????????????????? ????????????',
        'Palm Of Temperance': '????????????',
        'Paradise Lost': '????????????????????????',
        'Pillar Pierce': '??????',
        'Plunging Ice': '????????????',
        'Pulse Of The Land': '???????????????',
        'Quicken': '????????????',
        'Rapturous Reach': '????????????',
        'Release': '????????????',
        'Return(?! IV)': '????????????',
        'Return IV': '???????????????',
        'Shadoweye': '??????????????????',
        'Shell Crusher': '???????????????????????????',
        'Shockwave Pulsar': '???????????????????????????????????????',
        'Singular Apocalypse': '?????????????????????????????????',
        'Slow': '?????????',
        'Somber Dance': '??????????????????',
        'Speed': '????????????',
        'Spell-In-Waiting': '?????????????????????',
        'Spirit Taker': '???????????????????????????',
        'Stock': '????????????',
        'Terminal Relativity': '??????????????????',
        '(?<!Junction )Titan': '????????????',
        'Triple Apocalypse': '?????????????????????????????????',
        'Under The Weight': '???????????????',
        'Weight Of The World': '???????????????',
      },
    },
    {
      'locale': 'cn',
      'replaceSync': {
        'Beastly Sculpture': '??????????????????',
        'Bomb Boulder': '????????????',
        'Chiseled Sculpture': '??????????????????',
        'Eden\'s Promise': '????????????',
        'Guardian Of Eden': '????????????',
        'Ice Pillar': '??????',
        'Oracle Of Darkness': '????????????',
        'Sorrow\'s Hourglass': '???????????????',
      },
      'replaceText': {
        'Advanced Relativity': '?????????????????',
        '(?<! )Apocalypse': '??????',
        'Basic Relativity': '?????????????????',
        'Black Halo': '????????????',
        'Blade Of Flame': '????????????',
        'Cast': '??????',
        'Cataclysm': '?????????',
        'Classical Sculpture': '????????????',
        'Dark Aero III': '????????????',
        'Dark Current': '????????????',
        '(?<! )Dark Eruption(?! )': '????????????',
        'Dark Eruption / Dark Water III': '????????????/????????????',
        'Dark Fire III': '????????????',
        'Dark Water III / Dark Eruption': '????????????/????????????',
        '(?<! )Dark Water III(?! )': '????????????',
        'Darkest Dance': '????????????',
        'Diamond Dust': '????????????',
        'Dual Apocalypse': '????????????',
        'Earthen Fury': '????????????',
        'Empty Hate': '???????????????',
        'Empty Rage': '???????????????',
        'Force Of The Land': '????????????',
        'Formless Judgment': '????????????',
        'Frigid Stone': '??????',
        'Hell\'s Judgment': '????????????',
        'Ice Floe': '??????',
        'Ice Pillar': '??????',
        'Impact': '??????',
        'Initialize Recall': '????????????',
        'Intermediate Relativity': '?????????????????',
        'Junction Shiva': '???????????????',
        'Junction Titan': '???????????????',
        'Laser Eye': '?????????',
        'Lionsblaze': '????????????',
        'Maleficium': '??????',
        'Maelstrom': '?????????',
        'Memory\'s End': '????????????',
        'Obliteration Laser': '????????????',
        'Palm Of Temperance': '????????????',
        'Paradise Lost': '?????????',
        'Pillar Pierce': '??????',
        'Plunging Ice': '????????????',
        'Pulse Of The Land': '????????????',
        'Quicken': '??????',
        'Rapturous Reach': '????????????',
        'Release': '??????',
        'Return(?! IV)': '??????',
        'Return IV': '?????????',
        'Shadoweye': '????????????',
        'Shell Crusher': '????????????',
        'Shockwave Pulsar': '???????????????',
        'Singular Apocalypse': '????????????',
        'Slow': '??????',
        'Somber Dance': '????????????',
        'Speed': '??????',
        'Spell-In-Waiting': '????????????',
        'Spirit Taker': '????????????',
        'Stock': '??????',
        'Terminal Relativity': '?????????????????',
        '(?<!Junction )Titan': '??????',
        'Triple Apocalypse': '????????????',
        'Under The Weight': '???????????????',
        'Weight Of The World': '????????????',
      },
    },
    {
      'locale': 'ko',
      'replaceSync': {
        'Beastly Sculpture': '????????? ??????',
        'Bomb Boulder': '????????????',
        'Chiseled Sculpture': '????????? ??????',
        'Eden\'s Promise': '????????? ??????',
        'Guardian Of Eden': '????????? ?????????',
        'Ice Pillar': '????????????',
        'Oracle Of Darkness': '????????? ??????',
        'Sorrow\'s Hourglass': '????????? ????????????',
      },
      'replaceText': {
        'Advanced Relativity': '?????? ??????: ??????',
        '(?<! )Apocalypse': '?????????',
        'Basic Relativity': '?????? ??????: ??????',
        'Black Halo': '?????? ?????????',
        'Blade Of Flame': '????????? ??????',
        'Cast': '??????',
        'Cataclysm': '?????????',
        'Classical Sculpture': '?????? ??????',
        'Dark Aero III': '?????? ????????????',
        'Dark Current': '????????? ??????',
        '(?<! )Dark Eruption(?! )': '????????? ?????????',
        'Dark Eruption / Dark Water III': '????????? ????????? / ?????? ?????????',
        'Dark Fire III': '?????? ?????????',
        'Dark Water III / Dark Eruption': '?????? ????????? / ????????? ?????????',
        '(?<! )Dark Water III(?! )': '?????? ?????????',
        'Darkest Dance': '????????? ?????????',
        'Diamond Dust': '??????????????? ?????????',
        'Dual Apocalypse': '????????? ???',
        'Earthen Fury': '????????? ??????',
        'Empty Hate': '????????? ??????',
        'Empty Rage': '????????? ??????',
        'Force Of The Land': '????????? ??????',
        'Formless Judgment': '?????? ??????',
        'Frigid Stone': '?????????',
        'Hell\'s Judgment': '????????? ??????',
        'Ice Floe': '??????',
        'Ice Pillar': '?????????',
        'Impact': '??????',
        'Initialize Recall': '?????? ??????',
        'Intermediate Relativity': '?????? ??????: ??????',
        'Junction Shiva': '??????: ??????',
        'Junction Titan': '??????: ?????????',
        'Laser Eye': '?????????',
        'Lionsblaze': '????????? ??????',
        'Maleficium': '????????? ??????',
        'Maelstrom': '?????????',
        'Memory\'s End': '????????? ???',
        'Obliteration Laser': '?????? ?????????',
        'Palm Of Temperance': '????????? ???',
        'Paradise Lost': '?????????',
        'Pillar Pierce': '????????? ??????',
        'Plunging Ice': '?????? ??????',
        'Pulse Of The Land': '????????? ??????',
        'Quicken': '??????',
        'Rapturous Reach': '????????? ???',
        'Release': '?????? ??????',
        'Return(?! IV)': '??????',
        'Return IV': '?????????',
        'Shadoweye': '????????? ??????',
        'Shell Crusher': '?????? ??????',
        'Shockwave Pulsar': '?????? ?????????',
        'Singular Apocalypse': '????????? ??????',
        'Slow': '??????',
        'Somber Dance': '????????? ?????????',
        'Speed': '?????? ??????',
        'Spell-In-Waiting': '?????????',
        'Spirit Taker': '?????? ??????',
        'Stock': '?????? ??????',
        'Terminal Relativity': '?????? ??????: ??????',
        '(?<!Junction )Titan': '?????????',
        'Triple Apocalypse': '????????? ???',
        'Under The Weight': '????????? ??????',
        'Weight Of The World': '????????? ??????',
      },
    },
  ],
};

export default triggerSet;
