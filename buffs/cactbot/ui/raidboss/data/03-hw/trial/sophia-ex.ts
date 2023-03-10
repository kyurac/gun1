import Conditions from '../../../../../resources/conditions';
import NetRegexes from '../../../../../resources/netregexes';
import { UnreachableCode } from '../../../../../resources/not_reached';
import Outputs from '../../../../../resources/outputs';
import { Responses } from '../../../../../resources/responses';
import ZoneId from '../../../../../resources/zone_id';
import { RaidbossData } from '../../../../../types/data';
import { Output, TriggerSet } from '../../../../../types/trigger';

export interface Data extends RaidbossData {
  cloneSpots?: { [id: string]: string };
  scaleSophias?: string[];
  quasarTethers?: string[];
  aeroClones?: string[];
  thunderClones?: string[];
  seenThunder?: boolean;
  clonesActive?: boolean;
  sadTethers?: boolean; // :C
}

const findSafeDir = (data: Data) => {
  // Tethers are ordered with all East tethers first. This *doesn't* mean that the East
  // or West tethers are themselves in order within their half!
  // The eight scale entities are listed in the data object, with West at indices 0-3,
  // under data.scaleSophias.
  let safeDir = 0;
  // If there's a side with more tethers, we know for sure that's the safe side.
  // This will give us the tilt direction for all but the 1/1, 2/2, and 3/3 cases.
  // The safe side is represented here by whether safeDir is positive or negative.
  // (West/negative, East/positive.)
  for (const tether of data.quasarTethers ?? []) {
    const idx = data.scaleSophias?.indexOf(tether);
    if (idx === undefined)
      throw new UnreachableCode();
    safeDir += idx < 4 ? -1 : 1;
  }
  return safeDir;
};

const callSafeDir = (callIndex: number, output: Output) => {
  const outputs: { [callIndex: string]: string } = {
    '2': output.goEastHardTilt!(),
    '1': output.goEastSoftTilt!(),
    '-2': output.goWestHardTilt!(),
    '-1': output.goWestSoftTilt!(),
    // Stringified because Javascript doesn't do negative-integer key values.
  };
  return outputs[callIndex.toString()];
};

const tiltOutputStrings = {
  goEastHardTilt: {
    en: 'Go East (Hard Tilt)',
    de: 'Nach Osten gehen (starke Neigung)',
    fr: 'Allez ?? l\'Est (Inclinaison forte)',
    ja: '?????? (???????????????)',
    cn: '????????????????????????',
    ko: '???????????? (?????? ????????????)',
  },
  goEastSoftTilt: {
    en: 'Go East (Soft Tilt)',
    de: 'Nach Osten gehen (leichte Neigung)',
    fr: 'Allez ?? l\'Est (Inclinaison faible)',
    ja: '?????? (???????????????)',
    cn: '????????????????????????',
    ko: '???????????? (?????? ????????????)',
  },
  goWestHardTilt: {
    en: 'Go West (Hard Tilt)',
    de: 'Nach Westen gehen (starke Neigung)',
    fr: 'Allez ?? l\'Ouest (Inclinaison forte)',
    ja: '?????? (???????????????)',
    cn: '????????????????????????',
    ko: '???????????? (?????? ????????????)',
  },
  goWestSoftTilt: {
    en: 'Go West (Soft Tilt)',
    de: 'Nach Westen gehen (leichte Neigung)',
    fr: 'Allez ?? l\'Ouest (Inclinaison faible)',
    ja: '?????? (???????????????)',
    cn: '????????????????????????',
    ko: '???????????? (?????? ????????????)',
  },
};

const triggerSet: TriggerSet<Data> = {
  zoneId: ZoneId.ContainmentBayP1T6Extreme,
  timelineFile: 'sophia-ex.txt',
  timelineTriggers: [
    {
      // Gnosis does in fact have a cast time, but it's only 2.7 seconds.
      // It's safer to warn via the timeline.
      id: 'SophiaEX Gnosis',
      regex: /Gnosis/,
      beforeSeconds: 5,
      response: Responses.knockback(),
    },
    {
      // Onrush also has a 2.7 second cast time and thus is best notified from the timeline.
      id: 'SophiaEX Onrush',
      regex: /Onrush/,
      beforeSeconds: 5,
      infoText: (_data, _matches, output) => output.text!(),
      outputStrings: {
        text: {
          en: 'Avoid Dash Attack',
          de: 'Ansturm-Angriff ausweichen',
          fr: '??vitez l\'attaque Charge',
          ja: '???????????????',
          cn: '????????????',
          ko: '?????? ?????? ?????????',
        },
      },
    },
    {
      id: 'SophiaEX Cintamani',
      regex: /Cintamani/,
      beforeSeconds: 4,
      response: Responses.aoe(),
    },
    {
      id: 'SophiaEX Dischordant Cleansing',
      regex: /Dischordant Cleansing/,
      beforeSeconds: 6,
      alertText: (_data, _matches, output) => output.text!(),
      outputStrings: {
        text: {
          en: 'Stack With Partner',
          de: 'Mit Partner stacken',
          fr: 'Packez-vous avec votre partenaire',
          ja: '?????????????????????',
          cn: '?????????',
          ko: '?????? ???????????? ?????????',
        },
      },
    },
    {
      id: 'SophiaEX Quasar Bait',
      regex: /Quasar \(Snapshot\)/,
      beforeSeconds: 6,
      infoText: (_data, _matches, output) => output.text!(),
      outputStrings: {
        text: {
          en: 'Bait Quasar Meteors',
          de: 'Quasar Meteore k??dern',
          fr: 'Attirez les m??t??ores du Quasar',
          ja: '??????????????????',
          cn: '????????????',
          ko: '?????? ????????????',
        },
      },
    },
  ],
  triggers: [
    {
      id: 'SophiaEX Tank Buster',
      type: 'StartsUsing',
      netRegex: NetRegexes.startsUsing({ id: '19C4', source: 'Sophia' }),
      netRegexDe: NetRegexes.startsUsing({ id: '19C4', source: 'Sophia' }),
      netRegexFr: NetRegexes.startsUsing({ id: '19C4', source: 'Sophia' }),
      netRegexJa: NetRegexes.startsUsing({ id: '19C4', source: '????????????' }),
      netRegexCn: NetRegexes.startsUsing({ id: '19C4', source: '?????????' }),
      netRegexKo: NetRegexes.startsUsing({ id: '19C4', source: '?????????' }),
      response: Responses.tankBusterSwap(),
    },
    {
      id: 'SophiaEX Thunder 2',
      type: 'StartsUsing',
      netRegex: NetRegexes.startsUsing({ id: '19B0', source: 'Sophia', capture: false }),
      netRegexDe: NetRegexes.startsUsing({ id: '19B0', source: 'Sophia', capture: false }),
      netRegexFr: NetRegexes.startsUsing({ id: '19B0', source: 'Sophia', capture: false }),
      netRegexJa: NetRegexes.startsUsing({ id: '19B0', source: '????????????', capture: false }),
      netRegexCn: NetRegexes.startsUsing({ id: '19B0', source: '?????????', capture: false }),
      netRegexKo: NetRegexes.startsUsing({ id: '19B0', source: '?????????', capture: false }),
      response: Responses.awayFromFront(),
    },
    {
      id: 'SophiaEX Thunder 3',
      type: 'StartsUsing',
      netRegex: NetRegexes.startsUsing({ id: '19AC', source: 'Sophia', capture: false }),
      netRegexDe: NetRegexes.startsUsing({ id: '19AC', source: 'Sophia', capture: false }),
      netRegexFr: NetRegexes.startsUsing({ id: '19AC', source: 'Sophia', capture: false }),
      netRegexJa: NetRegexes.startsUsing({ id: '19AC', source: '????????????', capture: false }),
      netRegexCn: NetRegexes.startsUsing({ id: '19AC', source: '?????????', capture: false }),
      netRegexKo: NetRegexes.startsUsing({ id: '19AC', source: '?????????', capture: false }),
      response: Responses.getUnder(),
    },
    {
      // Technically this one does have a telegraph, but it feels really weird
      // to have Thunder 3 with popup text and this one not.
      id: 'SophiaEX Aero 3',
      type: 'StartsUsing',
      netRegex: NetRegexes.startsUsing({ id: '19AE', source: 'Sophia', capture: false }),
      netRegexDe: NetRegexes.startsUsing({ id: '19AE', source: 'Sophia', capture: false }),
      netRegexFr: NetRegexes.startsUsing({ id: '19AE', source: 'Sophia', capture: false }),
      netRegexJa: NetRegexes.startsUsing({ id: '19AE', source: '????????????', capture: false }),
      netRegexCn: NetRegexes.startsUsing({ id: '19AE', source: '?????????', capture: false }),
      netRegexKo: NetRegexes.startsUsing({ id: '19AE', source: '?????????', capture: false }),
      response: Responses.getOut(),
    },
    {
      id: 'SophiaEX Divine Spark',
      type: 'StartsUsing',
      netRegex: NetRegexes.startsUsing({ id: '19B6', source: 'The Second Demiurge', capture: false }),
      netRegexDe: NetRegexes.startsUsing({ id: '19B6', source: 'Zweit(?:e|er|es|en) Demiurg', capture: false }),
      netRegexFr: NetRegexes.startsUsing({ id: '19B6', source: 'Second D??miurge', capture: false }),
      netRegexJa: NetRegexes.startsUsing({ id: '19B6', source: '????????????', capture: false }),
      netRegexCn: NetRegexes.startsUsing({ id: '19B6', source: '????????????', capture: false }),
      netRegexKo: NetRegexes.startsUsing({ id: '19B6', source: '???2??????', capture: false }),
      response: Responses.lookAway(),
    },
    {
      id: 'SophiaEX Gnostic Rant',
      type: 'StartsUsing',
      netRegex: NetRegexes.startsUsing({ id: '19B8', source: 'The Third Demiurge', capture: false }),
      netRegexDe: NetRegexes.startsUsing({ id: '19B8', source: 'Dritt(?:e|er|es|en) Demiurg', capture: false }),
      netRegexFr: NetRegexes.startsUsing({ id: '19B8', source: 'Troisi??me D??miurge', capture: false }),
      netRegexJa: NetRegexes.startsUsing({ id: '19B8', source: '????????????', capture: false }),
      netRegexCn: NetRegexes.startsUsing({ id: '19B8', source: '????????????', capture: false }),
      netRegexKo: NetRegexes.startsUsing({ id: '19B8', source: '???3??????', capture: false }),
      infoText: (_data, _matches, output) => output.text!(),
      outputStrings: {
        text: {
          en: 'Get behind lancer',
          de: 'Geh hinter dem 3. Demiurg',
          fr: 'Passez derri??re le lancier',
          ja: '????????????????????????',
          cn: '??????3????????????',
          ko: '???3?????? ?????? ??????',
        },
      },
    },
    {
      id: 'SophiaEX Infusion',
      type: 'StartsUsing',
      netRegex: NetRegexes.startsUsing({ id: '1988', source: 'The First Demiurge' }),
      netRegexDe: NetRegexes.startsUsing({ id: '1988', source: 'Erst(?:e|er|es|en) Demiurg' }),
      netRegexFr: NetRegexes.startsUsing({ id: '1988', source: 'Premier D??miurge' }),
      netRegexJa: NetRegexes.startsUsing({ id: '1988', source: '????????????' }),
      netRegexCn: NetRegexes.startsUsing({ id: '1988', source: '????????????' }),
      netRegexKo: NetRegexes.startsUsing({ id: '1988', source: '???1??????' }),
      infoText: (data, matches, output) => {
        if (Conditions.targetIsYou())
          return output.infusionOnYou!();

        return output.infusionOn!({ player: data.ShortName(matches.target) });
      },
      outputStrings: {
        infusionOnYou: {
          en: 'Infusion on YOU',
          de: 'Schneisenschl??ger auf DIR',
          fr: 'Infusion sur VOUS',
          ja: '??????????????????',
          cn: '????????????',
          ko: '????????? ?????????',
        },
        infusionOn: {
          en: 'Infusion on ${player}',
          de: 'Schneisenschl??ger auf ${player}',
          fr: 'Infusion sur ${player}',
          ja: '${player}????????????',
          cn: '?????????${player}',
          ko: '${player} ?????? ?????????',
        },
      },
    },
    {
      // The Aion Teleos clones have 10 fixed points where they can appear, but not all
      // combinations are valid:
      // (0,9), (0,-9), (-10,9), (-10,-9), (10,9), (10,-9), (-15,9), (-15,-9), (15,9), (15,-9).
      // Each quadrant can contain 0 or 1 clones, and the center can have 0-2.
      // There will always be 4 clones.
      // There can never be more than 3 clones North or South.

      // The full sequence for clones is:
      // 1. Clones appear, alongside a Cintamani cast
      // If it's the first clone set:
      // 2. Sophia casts Thunder III
      // 3. Sophia casts Aero
      // 4. Sophia casts Arms of Wisdom
      // 5. Barbelo moves to cast Light Dew
      // 6. Barbelo casts Light Dew and Sophia casts Execute
      // 7. Clones disappear

      // If it's not the first clone set:
      // 2. Sophia casts Arms Of Wisdom
      // 3. Sophia casts Thunder
      // 4. Sophia casts Aero
      // 5. Quasars cast, snapshot, and resolve
      // 6. Sophia casts Arms Of Wisdom again
      // 7. Dischordant Cleansing circles go out and resolve
      // 8. Sophia casts Execute
      // 9. Clones disappear
      id: 'SophiaEX Clone Collect',
      type: 'AddedCombatant',
      netRegex: NetRegexes.addedCombatantFull({ name: 'Aion Teleos' }),
      netRegexDe: NetRegexes.addedCombatantFull({ name: 'Aion Teleos' }),
      netRegexFr: NetRegexes.addedCombatantFull({ name: 'Aion Teleos' }),
      netRegexJa: NetRegexes.addedCombatantFull({ name: '??????????????????????????????' }),
      netRegexCn: NetRegexes.addedCombatantFull({ name: '??????' }),
      netRegexKo: NetRegexes.addedCombatantFull({ name: '????????? ?????????' }),
      run: (data, matches) => {
        data.cloneSpots ??= {};
        const x = parseFloat(matches.x);
        const y = parseFloat(matches.y);
        // We start with Y since it's a binary choice.
        // Note that Y-values are inverted! (In-game, 0,1 is one unit South from the origin)
        let positionString = y > 0 ? 'S' : 'N';
        // The center two clones aren't exactly on the centerline, so we round the X coordinates.
        if (Math.round(x) !== 0)
          positionString += Math.round(x) < 0 ? 'W' : 'E';
        // Yes, we have to specifically uppercase this for 03 log lines.
        // No, we don't know why. Blame Square/Ravahn/Hydaelyn.
        data.cloneSpots[matches.id.toUpperCase()] = positionString;
      },
    },
    {
      // Thunder is always cast first when the Aion Teleos spawn.
      // Because we don't know whether there will be one or two Thunder tethers,
      // we have to separate out the "seen Thunder" logic.
      id: 'SophiaEX Duplicate Collect',
      type: 'Tether',
      netRegex: NetRegexes.tether({ id: '002D' }),
      run: (data, matches) => {
        const spot = data.cloneSpots?.[matches.sourceId];
        if (!spot)
          throw new UnreachableCode();
        if (data.seenThunder) {
          data.aeroClones ??= [];
          data.aeroClones.push(spot);
        } else {
          data.thunderClones ??= [];
          data.thunderClones.push(spot);
        }
      },
    },
    {
      // The ability here is Duplicate. The first Duplicate is always used alongside Thunder 2/3.
      id: 'SophiaEX Thunder Seen',
      type: 'StartsUsing',
      netRegex: NetRegexes.startsUsing({ id: '19AB', source: 'Aion Teleos', capture: false }),
      netRegexDe: NetRegexes.startsUsing({ id: '19AB', source: 'Aion Teleos', capture: false }),
      netRegexFr: NetRegexes.startsUsing({ id: '19AB', source: 'Aion Teleos', capture: false }),
      netRegexJa: NetRegexes.startsUsing({ id: '19AB', source: '??????????????????????????????', capture: false }),
      netRegexCn: NetRegexes.startsUsing({ id: '19AB', source: '??????', capture: false }),
      netRegexKo: NetRegexes.startsUsing({ id: '19AB', source: '????????? ?????????', capture: false }),
      delaySeconds: 1,
      suppressSeconds: 5,
      run: (data) => data.seenThunder = true,
    },
    {
      // Quasar can either be meteor baits or a platform tilt,
      // but the platform will not tilt while clones are active.
      // Since both have the same tethers and initial cast,
      // our best way to call the mechanic is to check whether clones are active.
      id: 'SophiaEX Clones Active',
      type: 'AddedCombatant',
      netRegex: NetRegexes.addedCombatant({ name: 'Aion Teleos', capture: false }),
      netRegexDe: NetRegexes.addedCombatant({ name: 'Aion Teleos', capture: false }),
      netRegexFr: NetRegexes.addedCombatant({ name: 'Aion Teleos', capture: false }),
      netRegexJa: NetRegexes.addedCombatant({ name: '??????????????????????????????', capture: false }),
      netRegexCn: NetRegexes.addedCombatant({ name: '??????', capture: false }),
      netRegexKo: NetRegexes.addedCombatant({ name: '????????? ?????????', capture: false }),
      run: (data) => data.clonesActive = true,
    },
    {
      // During the first post-intermission clones sequence,
      // Barbelo separates and makes one safespot dangerous with Light Dew, the orange laser.
      // Unfortunately Barbelo doesn't have a cast time on Light Dew, so we can't use that.
      // Instead, we warn the user when Barbelo separates from Sophia, which is 1983.
      id: 'SophiaEX Light Dew',
      type: 'Ability',
      netRegex: NetRegexes.ability({ id: '1983', source: 'Sophia', capture: false }),
      netRegexDe: NetRegexes.ability({ id: '1983', source: 'Sophia', capture: false }),
      netRegexFr: NetRegexes.ability({ id: '1983', source: 'Sophia', capture: false }),
      netRegexJa: NetRegexes.ability({ id: '1983', source: '????????????', capture: false }),
      netRegexCn: NetRegexes.ability({ id: '1983', source: '?????????', capture: false }),
      netRegexKo: NetRegexes.ability({ id: '1983', source: '?????????', capture: false }),
      condition: (data) => data.clonesActive,
      infoText: (_data, _matches, output) => output.text!(),
      outputStrings: {
        text: {
          en: 'Avoid head laser',
          de: 'Kopflaser ausweichen',
          fr: '??vitez le laser de la t??te',
          ja: '????????????????????????',
          cn: '???????????????',
          ko: '?????? ????????? ?????????',
        },
      },
    },
    {
      id: 'SophiaEX Execute',
      type: 'StartsUsing',
      netRegex: NetRegexes.startsUsing({ id: '19AA', source: 'Sophia' }),
      netRegexDe: NetRegexes.startsUsing({ id: '19AA', source: 'Sophia' }),
      netRegexFr: NetRegexes.startsUsing({ id: '19AA', source: 'Sophia' }),
      netRegexJa: NetRegexes.startsUsing({ id: '19AA', source: '????????????' }),
      netRegexCn: NetRegexes.startsUsing({ id: '19AA', source: '?????????' }),
      netRegexKo: NetRegexes.startsUsing({ id: '19AA', source: '?????????' }),
      durationSeconds: (_data, matches) => parseFloat(matches.castTime),
      alertText: (data, _matches, output) => {
        if (!data.thunderClones)
          return;
        const localeCompass: { [dir: string]: string } = {
          'N': output.north!(),
          'S': output.south!(),
          'NW': output.northwest!(),
          'NE': output.northeast!(),
          'SW': output.southwest!(),
          'SE': output.southeast!(),
        };
        const firstClone = data.thunderClones[0];
        const secondClone = data.thunderClones[1];

        if (firstClone && secondClone) {
          return output.multiple!({
            dir1: localeCompass[firstClone],
            dir2: localeCompass[secondClone],
          });
        } else if (firstClone) {
          return localeCompass[firstClone];
        }
      },
      outputStrings: {
        north: Outputs.dirN,
        south: Outputs.dirS,
        northwest: Outputs.dirNW,
        northeast: Outputs.dirNE,
        southwest: Outputs.dirSW,
        southeast: Outputs.dirSE,
        multiple: {
          en: '${dir1} / ${dir2}',
          de: '${dir1} / ${dir2}',
          fr: '${dir1} / ${dir2}',
          ja: '${dir1} / ${dir2}',
          cn: '${dir1} / ${dir2}',
          ko: '${dir1} / ${dir2}',
        },
      },
    },
    {
      id: 'SophiaEX Clone Cleanup',
      type: 'Ability',
      netRegex: NetRegexes.ability({ id: '19AA', source: 'Sophia', capture: false }),
      netRegexDe: NetRegexes.ability({ id: '19AA', source: 'Sophia', capture: false }),
      netRegexFr: NetRegexes.ability({ id: '19AA', source: 'Sophia', capture: false }),
      netRegexJa: NetRegexes.ability({ id: '19AA', source: '????????????', capture: false }),
      netRegexCn: NetRegexes.ability({ id: '19AA', source: '?????????', capture: false }),
      netRegexKo: NetRegexes.ability({ id: '19AA', source: '?????????', capture: false }),
      delaySeconds: 5,
      run: (data) => {
        delete data.aeroClones;
        delete data.clonesActive;
        delete data.cloneSpots;
        delete data.thunderClones;
        delete data.seenThunder;
      },
    },
    {
      // The eight Sophia entities on the scale pans have IDs that run sequentially,
      // from n + 0 to n + 7. They spawn into the instance in a random order, but the
      // locations where they spawn have a fixed association with their sequence number offset:

      // 0: (-55.0637, -3.496415)
      // 1: (-55.06367, -10.1404)
      // 2: (-55.06363, 9.5766)
      // 3: (-55.0637, 3.523648)
      // 4: (54.9907, 3.387837)
      // 5: (54.98699, 9.576593)
      // 6: (54.9907, -3.50686)
      // 7: (54.99068, -10.14043)

      // Because of this, we need only see one entity use a 21 log line and we can find the rest.
      id: 'SophiaEX Quasar Setup',
      type: 'Ability',
      netRegex: NetRegexes.abilityFull({ id: '19A[89]' }),
      condition: (data) => !data.scaleSophias,
      // We *really* shouldn't have to suppress this...
      suppressSeconds: 5,
      run: (data, matches) => {
        let offset;
        const yKey = Math.floor(parseFloat(matches.y)).toString();
        if (parseFloat(matches.x) < 0) {
          const offsetMap: { [yKey: string]: number } = {
            '-4': 0,
            '-11': 1,
            '9': 2,
            '3': 3,
          };
          offset = offsetMap[yKey];
        } else {
          const offsetMap: { [yKey: string]: number } = {
            '3': 4,
            '9': 5,
            '-4': 6,
            '-11': 7,
          };
          offset = offsetMap[yKey];
        }
        if (offset === undefined)
          throw new UnreachableCode();
        const seqStart = parseInt(matches.sourceId, 16) - offset;
        for (let i = 0; i < 8; i++) {
          data.scaleSophias ??= [];
          data.scaleSophias.push((seqStart + i).toString(16).toUpperCase());
        }
      },
    },
    {
      // We collect tethers here for later use on Quasar calls.
      // Blue Quasars (19A9) weigh 3 units, while orange ones (19A8) weigh 1.
      // Meteor Quasars happen only when we have a 3/1 split of tethers (balanced).
      // If the tether split is not 3/1, it will always be one of these possibilities:
      // 1/1, 2/2, 3/3, 2/1, 3/2, 4/2, 4/3
      // If the difference of the sum of weights on each side is 1, the tilt will be soft.
      // Otherwise it will be hard.
      // There will always be exactly one blue Quasar, unless the split is 4/2.
      id: 'SophiaEX Quasar Tether Collect',
      type: 'Tether',
      netRegex: NetRegexes.tether({ id: '0011' }),
      condition: (data) => {
        // We shouldn't run this while Aion Teleos mechanics are active.
        return !data.clonesActive;
      },
      run: (data, matches) => {
        data.quasarTethers ??= [];
        data.quasarTethers.push(matches.sourceId);
      },
    },
    {
      id: 'SophiaEX Tilt Via Tether',
      type: 'Tether',
      netRegex: NetRegexes.tether({ id: '0011', capture: false }),
      condition: (data) => {
        // No platform tilts if clones are up.
        return !data.clonesActive;
      },
      // We let the storage triggers catch up before calling.
      delaySeconds: .5,
      durationSeconds: 12, // Ensuring that forgetful people aren't forgotten.
      suppressSeconds: 5,
      alertText: (data, _matches, output) => {
        // If we somehow skipped the first set of Quasars, we won't know the locations of
        // the scale entities. Activate the sadTethers flag and wait for the actual casts.
        if (!data.scaleSophias) {
          data.sadTethers = true;
          return;
        }
        const safeDir = findSafeDir(data);
        if (safeDir === 0) {
          // If it's the 1/1, 2/2, or 3/3 case, we sadly don't have enough information.
          // We have to quit here and wait for the actual cast.
          data.sadTethers = true;
          return;
        }
        return callSafeDir(safeDir, output);
      },
      outputStrings: tiltOutputStrings,
    },
    {
      // This specifically calls the case where it's 1/1;2/2;3/3 tethers,
      // or any tether combination if we skipped the first Meteor Quasars.
      // The blue Quasar, 19A9, is *alway* on the dangerous side.
      // The 20/startsUsing log lines don't actually have position data,
      // but we enumerated all the locations earlier,
      // so anytime one of these entities casts, we know where it is.
      id: 'SophiaEX Tilt Via Cast',
      type: 'StartsUsing',
      netRegex: NetRegexes.startsUsing({ id: '19A9', source: 'Sophia' }),
      netRegexDe: NetRegexes.startsUsing({ id: '19A9', source: 'Sophia' }),
      netRegexFr: NetRegexes.startsUsing({ id: '19A9', source: 'Sophia' }),
      netRegexJa: NetRegexes.startsUsing({ id: '19A9', source: '????????????' }),
      netRegexCn: NetRegexes.startsUsing({ id: '19A9', source: '?????????' }),
      netRegexKo: NetRegexes.startsUsing({ id: '19A9', source: '?????????' }),
      condition: (data) => data.sadTethers,
      durationSeconds: 10,
      suppressSeconds: 5,
      alertText: (data, matches, output) => {
        let safeDir = findSafeDir(data);
        // If this is the first set of Meteor Quasars, there is no tilt.
        if (data.quasarTethers?.length === 4 && safeDir !== 0)
          return;
        if (safeDir === 0) {
          const idx = data.scaleSophias?.indexOf(matches.sourceId);
          if (idx === undefined)
            throw new UnreachableCode();
          safeDir = idx < 4 ? 2 : -2;
        }
        return callSafeDir(safeDir, output);
      },
      outputStrings: tiltOutputStrings,
    },
    {
      id: 'SophiaEX Quasar Cleanup',
      type: 'Ability',
      netRegex: NetRegexes.ability({ id: '19A9', capture: false }),
      run: (data) => {
        delete data.quasarTethers;
        delete data.sadTethers;
      },
    },
  ],
  timelineReplace: [
    {
      'locale': 'de',
      'replaceSync': {
        'Aion Teleos': 'Aion Teleos',
        'Barbelo': 'Barbelo',
        'Sophia': 'Sophia',
        'The First Demiurge': 'Erst(?:e|er|es|en) Demiurg',
        'The Second Demiurge': 'Zweit(?:e|er|es|en) Demiurg',
        'The Third Demiurge': 'Dritt(?:e|er|es|en) Demiurg',
      },
      'replaceText': {
        '\\(Meteor Detonate\\)': '(Meteor Explosion)',
        '\\(Snapshot\\)': '(Meteor Positionen)',
        '\\(Tilt\\)': '(Neigung)',
        'Aero III': 'Windga',
        'Arms of Wisdom': 'Arme der Weisheit',
        'Cintamani': 'Chintamani',
        'Cloudy Heavens': 'Nebul??se Himmel',
        'Dischordant Cleansing': 'Dissonante Bu??e',
        'Divine Spark': 'G??ttlicher Funke',
        'Execute': 'Exekutieren',
        'Gnosis': 'Gnosis',
        'Gnostic Spear': 'Gnostischer Speer',
        'Horizontal Kenoma': 'Horizontales Kenoma',
        'Light Dew': 'Lichttau',
        'Onrush': 'Heranst??rmen',
        'Quasar': 'Quasar',
        'Ring of Pain': 'Ring des Schmerzes',
        'The Scales Of Wisdom': 'Waage der Weisheit',
        'Tethers': 'Verbindungen',
        'Thunder II\\/III': 'Blitzra/Blitzga',
        'Thunder II(?!(?:I|\\/))': 'Blitzra',
        'Thunder III': 'Blitzga',
        'Vertical Kenoma': 'Vertikales Kenoma',
        'Zombification': 'Zombie',
      },
    },
    {
      'locale': 'fr',
      'replaceSync': {
        'Aion Teleos': 'Aion Teleos',
        'Barbelo': 'Barbelo',
        'Sophia': 'Sophia',
        'The First Demiurge': 'Premier D??miurge',
        'The Second Demiurge': 'Second D??miurge',
        'The Third Demiurge': 'Troisi??me D??miurge',
      },
      'replaceText': {
        '\\?': ' ?',
        '\\(Meteor Detonate\\)': '(Explosion des m??t??ores)',
        '\\(Snapshot\\)': '(Instantan??)',
        '\\(Tilt\\)': '(Inclinaison)',
        'Aero III': 'M??ga Vent',
        'Arms of Wisdom': 'Bras de la sagesse',
        'Cintamani': 'Chintamani',
        'Cloudy Heavens': 'Ciel n??buleux',
        'Dischordant Cleansing': 'Purification Discordante',
        'Divine Spark': '??tincelle divine',
        'Execute': 'Ex??cution',
        'Gnosis': 'Gnose',
        'Gnostic Spear': '??pieu Gnostique',
        'Horizontal Kenoma': 'Kenoma horizontal',
        'Light Dew': 'Ros??e De Lumi??re',
        'Onrush': 'Charge',
        'Quasar': 'Quasar',
        'Quasar Tethers': 'Liens Quasar',
        'Ring of Pain': 'Anneau de douleur',
        'The Scales Of Wisdom': 'Balance de la sagesse',
        'Thunder II\\/III': 'Extra Foudre/Mega Foudre',
        'Thunder II(?!(?:I|\\/))': 'Extra Foudre',
        'Thunder III': 'M??ga Foudre',
        'Vertical Kenoma': 'Kenoma Vertical',
        'Zombification': 'Zombification',
      },
    },
    {
      'locale': 'ja',
      'replaceSync': {
        'Aion Teleos': '??????????????????????????????',
        'Barbelo': '????????????',
        'Sophia': '????????????',
        'The First Demiurge': '????????????',
        'The Second Demiurge': '????????????',
        'The Third Demiurge': '????????????',
      },
      'replaceText': {
        '\\?': ' ?',
        '\\(Meteor Detonate\\)': '(?????????)',
        '\\(Snapshot\\)': '(?????????)',
        '\\(Tilt\\)': '(??????)',
        'Aero III': '????????????',
        'Arms of Wisdom': '???????????????????????????',
        'Cintamani': '??????????????????',
        'Cloudy Heavens': '????????????????????????',
        'Dischordant Cleansing': '???????????????',
        'Divine Spark': '??????????????????',
        'Execute': '?????????????????????',
        'Gnosis': '???????????????',
        'Gnostic Spear': '????????????',
        'Horizontal Kenoma': '????????????',
        'Light Dew': '??????????????????',
        'Onrush': '??????????????????',
        'Quasar': '???????????????',
        'Ring of Pain': '??????????????????????????????',
        'The Scales Of Wisdom': '???????????????????????????????????????',
        '(?<= )Tethers': '???',
        'Thunder II\\/III': '????????????/????????????',
        'Thunder II(?!(?:I|\\/I))': '????????????',
        'Thunder III': '????????????',
        'Vertical Kenoma': '????????????',
        'Zombification': '????????????',
      },
    },
    {
      'locale': 'cn',
      'replaceSync': {
        'Aion Teleos': '??????',
        'Barbelo': '?????????',
        'Sophia': '?????????',
        'The First Demiurge': '????????????',
        'The Second Demiurge': '????????????',
        'The Third Demiurge': '????????????',
      },
      'replaceText': {
        '\\?': ' ?',
        '\\(Meteor Detonate\\)': '(????????????)',
        '\\(Snapshot\\)': '(??????)',
        '\\(Tilt\\)': '(??????)',
        'Aero III': '??????',
        'Arms of Wisdom': '????????????',
        'Cintamani': '????????????',
        'Cloudy Heavens': '????????????',
        'Dischordant Cleansing': '???????????????',
        'Divine Spark': '????????????',
        'Execute': '??????',
        'Gnosis': '??????',
        'Gnostic Spear': '????????????',
        'Horizontal Kenoma': '????????????',
        'Light Dew': '??????',
        'Onrush': '??????',
        'Quasar': '?????????',
        'Ring of Pain': '????????????',
        'The Scales Of Wisdom': '???????????????',
        'Thunder II\\/III': '??????/??????',
        'Thunder II(?!(?:I|\\/))': '??????',
        'Thunder III': '??????',
        'Vertical Kenoma': '????????????',
        'Zombification': '??????',
      },
    },
    {
      'locale': 'ko',
      'replaceSync': {
        'Aion Teleos': '????????? ?????????',
        'Barbelo': '????????????',
        'Sophia': '?????????',
        'The First Demiurge': '???1??????',
        'The Second Demiurge': '???2??????',
        'The Third Demiurge': '???3??????',
      },
      'replaceText': {
        'Aero III': '????????????',
        'Arms of Wisdom': '????????? ??????',
        'Cintamani': '????????????',
        'Cloudy Heavens': '?????? ??????',
        'Dischordant Cleansing': '???????????? ???',
        'Divine Spark': '????????? ??????',
        'Execute': '??????',
        'Gnosis': '?????? ??????',
        'Gnostic Spear': '?????? ?????????',
        'Horizontal Kenoma': '?????? ??????',
        'Light Dew': '?????? ??????',
        'Onrush': '??????',
        'Quasar': '?????????',
        'Ring Of Pain': '????????? ????????????',
        'The Scales Of Wisdom': '????????? ??????',
        'Thunder II\\/III': '?????????/?????????',
        'Thunder II(?!(?:I|\\/))': '?????????',
        'Thunder III': '?????????',
        'Vertical Kenoma': '?????? ??????',
        'Zombification': '??????',
      },
    },
  ],
};

export default triggerSet;
