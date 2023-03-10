import NetRegexes from '../../../../../resources/netregexes';
import { Responses } from '../../../../../resources/responses';
import ZoneId from '../../../../../resources/zone_id';
import { RaidbossData } from '../../../../../types/data';
import { TriggerSet } from '../../../../../types/trigger';

export type Data = RaidbossData;

const triggerSet: TriggerSet<Data> = {
  zoneId: ZoneId.AsphodelosTheFourthCircle,
  timelineFile: 'p4n.txt',
  triggers: [
    {
      id: 'P4N Elegant Evisceration',
      type: 'StartsUsing',
      netRegex: NetRegexes.startsUsing({ id: '6A50', source: 'Hesperos' }),
      netRegexDe: NetRegexes.startsUsing({ id: '6A50', source: 'Hesperos' }),
      netRegexFr: NetRegexes.startsUsing({ id: '6A50', source: 'Hespéros' }),
      netRegexJa: NetRegexes.startsUsing({ id: '6A50', source: 'ヘスペロス' }),
      response: Responses.tankCleave('alert'),
    },
    // Strong proximity Aoe
    {
      id: 'P4N Levinstrike Pinax',
      type: 'StartsUsing',
      netRegex: NetRegexes.startsUsing({ id: '6A3F', source: 'Hesperos', capture: false }),
      netRegexDe: NetRegexes.startsUsing({ id: '6A3F', source: 'Hesperos', capture: false }),
      netRegexFr: NetRegexes.startsUsing({ id: '6A3F', source: 'Hespéros', capture: false }),
      netRegexJa: NetRegexes.startsUsing({ id: '6A3F', source: 'ヘスペロス', capture: false }),
      alertText: (_data, _matches, output) => output.text!(),
      outputStrings: {
        text: {
          en: 'Go to Corner',
          de: 'In eine Ecke gehen',
          fr: 'Allez dans un coin',
          ko: '구석으로',
        },
      },
    },
    {
      id: 'P4N Well Pinax',
      type: 'StartsUsing',
      netRegex: NetRegexes.startsUsing({ id: '6A3E', source: 'Hesperos', capture: false }),
      netRegexDe: NetRegexes.startsUsing({ id: '6A3E', source: 'Hesperos', capture: false }),
      netRegexFr: NetRegexes.startsUsing({ id: '6A3E', source: 'Hespéros', capture: false }),
      netRegexJa: NetRegexes.startsUsing({ id: '6A3E', source: 'ヘスペロス', capture: false }),
      delaySeconds: 4,
      alertText: (_data, _matches, output) => output.text!(),
      outputStrings: {
        text: {
          en: 'Middle Knockback',
          de: 'Rückstoß von der Mitte',
          fr: 'Poussée au milieu',
          ko: '중앙에서 넉백',
        },
      },
    },
    {
      id: 'P4N Acid Pinax',
      type: 'StartsUsing',
      netRegex: NetRegexes.startsUsing({ id: '6A3C', source: 'Hesperos', capture: false }),
      netRegexDe: NetRegexes.startsUsing({ id: '6A3C', source: 'Hesperos', capture: false }),
      netRegexFr: NetRegexes.startsUsing({ id: '6A3C', source: 'Hespéros', capture: false }),
      netRegexJa: NetRegexes.startsUsing({ id: '6A3C', source: 'ヘスペロス', capture: false }),
      response: Responses.spread(),
    },
    {
      id: 'P4N Lava Pinax',
      type: 'StartsUsing',
      netRegex: NetRegexes.startsUsing({ id: '6A3D', source: 'Hesperos', capture: false }),
      netRegexDe: NetRegexes.startsUsing({ id: '6A3D', source: 'Hesperos', capture: false }),
      netRegexFr: NetRegexes.startsUsing({ id: '6A3D', source: 'Hespéros', capture: false }),
      netRegexJa: NetRegexes.startsUsing({ id: '6A3D', source: 'ヘスペロス', capture: false }),
      response: Responses.stackMarker(),
    },
    {
      id: 'P4N Decollation',
      type: 'StartsUsing',
      netRegex: NetRegexes.startsUsing({ id: '6A51', source: 'Hesperos', capture: false }),
      netRegexDe: NetRegexes.startsUsing({ id: '6A51', source: 'Hesperos', capture: false }),
      netRegexFr: NetRegexes.startsUsing({ id: '6A51', source: 'Hespéros', capture: false }),
      netRegexJa: NetRegexes.startsUsing({ id: '6A51', source: 'ヘスペロス', capture: false }),
      response: Responses.aoe(),
    },
    {
      id: 'P4N Bloodrake',
      type: 'StartsUsing',
      netRegex: NetRegexes.startsUsing({ id: '6A40', source: 'Hesperos', capture: false }),
      netRegexDe: NetRegexes.startsUsing({ id: '6A40', source: 'Hesperos', capture: false }),
      netRegexFr: NetRegexes.startsUsing({ id: '6A40', source: 'Hespéros', capture: false }),
      netRegexJa: NetRegexes.startsUsing({ id: '6A40', source: 'ヘスペロス', capture: false }),
      response: Responses.aoe(),
    },
    {
      id: 'P4N Hell Skewer',
      type: 'StartsUsing',
      netRegex: NetRegexes.startsUsing({ id: '6A4F', source: 'Hesperos', capture: false }),
      netRegexDe: NetRegexes.startsUsing({ id: '6A4F', source: 'Hesperos', capture: false }),
      netRegexFr: NetRegexes.startsUsing({ id: '6A4F', source: 'Hespéros', capture: false }),
      netRegexJa: NetRegexes.startsUsing({ id: '6A4F', source: 'ヘスペロス', capture: false }),
      response: Responses.awayFromFront(),
    },
    {
      id: 'P4N Belone Coils',
      type: 'StartsUsing',
      netRegex: NetRegexes.startsUsing({ id: '69DD', source: 'Hesperos', capture: false }),
      netRegexDe: NetRegexes.startsUsing({ id: '69DD', source: 'Hesperos', capture: false }),
      netRegexFr: NetRegexes.startsUsing({ id: '69DD', source: 'Hespéros', capture: false }),
      netRegexJa: NetRegexes.startsUsing({ id: '69DD', source: 'ヘスペロス', capture: false }),
      delaySeconds: 2,
      infoText: (_data, _matches, output) => output.text!(),
      outputStrings: {
        text: {
          en: 'Get Other Role Tower',
          de: 'Geh in einen Turm einer anderen Rolle',
          fr: 'Prenez la tour de votre rôle',
          ko: '내 직업군이 아닌쪽 장판 밟기',
        },
      },
    },
    {
      id: 'P4N Northerly Shift Slash',
      type: 'StartsUsing',
      netRegex: NetRegexes.startsUsing({ id: '6A4A', source: 'Hesperos', capture: false }),
      netRegexDe: NetRegexes.startsUsing({ id: '6A4A', source: 'Hesperos', capture: false }),
      netRegexFr: NetRegexes.startsUsing({ id: '6A4A', source: 'Hespéros', capture: false }),
      netRegexJa: NetRegexes.startsUsing({ id: '6A4A', source: 'ヘスペロス', capture: false }),
      alertText: (_data, _matches, output) => output.text!(),
      outputStrings: {
        text: {
          en: 'Go North Edge',
          de: 'Geh zur nördlichen Kante',
          fr: 'Allez au bord nord',
          ko: '북쪽 구석으로',
        },
      },
    },
    {
      id: 'P4N Easterly Shift Slash',
      type: 'StartsUsing',
      netRegex: NetRegexes.startsUsing({ id: '6A4C', source: 'Hesperos', capture: false }),
      netRegexDe: NetRegexes.startsUsing({ id: '6A4C', source: 'Hesperos', capture: false }),
      netRegexFr: NetRegexes.startsUsing({ id: '6A4C', source: 'Hespéros', capture: false }),
      netRegexJa: NetRegexes.startsUsing({ id: '6A4C', source: 'ヘスペロス', capture: false }),
      alertText: (_data, _matches, output) => output.text!(),
      outputStrings: {
        text: {
          en: 'Go East Edge',
          de: 'Geh zur östlichen Kante',
          fr: 'Allez au bord est',
          ko: '동쪽 구석으로',
        },
      },
    },
    {
      id: 'P4N Southerly Shift Slash',
      type: 'StartsUsing',
      netRegex: NetRegexes.startsUsing({ id: '6A4B', source: 'Hesperos', capture: false }),
      netRegexDe: NetRegexes.startsUsing({ id: '6A4B', source: 'Hesperos', capture: false }),
      netRegexFr: NetRegexes.startsUsing({ id: '6A4B', source: 'Hespéros', capture: false }),
      netRegexJa: NetRegexes.startsUsing({ id: '6A4B', source: 'ヘスペロス', capture: false }),
      alertText: (_data, _matches, output) => output.text!(),
      outputStrings: {
        text: {
          en: 'Go South Edge',
          de: 'Geh zur südlichen Kante',
          fr: 'Allez au bord sud',
          ko: '남쪽 구석으로',
        },
      },
    },
    {
      id: 'P4N Westerly Shift Slash',
      type: 'StartsUsing',
      netRegex: NetRegexes.startsUsing({ id: '6A4D', source: 'Hesperos', capture: false }),
      netRegexDe: NetRegexes.startsUsing({ id: '6A4D', source: 'Hesperos', capture: false }),
      netRegexFr: NetRegexes.startsUsing({ id: '6A4D', source: 'Hespéros', capture: false }),
      netRegexJa: NetRegexes.startsUsing({ id: '6A4D', source: 'ヘスペロス', capture: false }),
      alertText: (_data, _matches, output) => output.text!(),
      outputStrings: {
        text: {
          en: 'Go West Edge',
          de: 'Geh zur westlichen Kante',
          fr: 'Allez au bord ouest',
          ko: '서쪽 구석으로',
        },
      },
    },
    {
      id: 'P4N Northerly Shift Knockback',
      type: 'StartsUsing',
      netRegex: NetRegexes.startsUsing({ id: '6DAE', source: 'Hesperos', capture: false }),
      netRegexDe: NetRegexes.startsUsing({ id: '6DAE', source: 'Hesperos', capture: false }),
      netRegexFr: NetRegexes.startsUsing({ id: '6DAE', source: 'Hespéros', capture: false }),
      netRegexJa: NetRegexes.startsUsing({ id: '6DAE', source: 'ヘスペロス', capture: false }),
      delaySeconds: 2,
      alertText: (_data, _matches, output) => output.text!(),
      outputStrings: {
        text: {
          en: 'North Knockback',
          de: 'Rückstoß vom Norden',
          fr: 'Poussée au nord',
          ko: '북쪽 넉백',
        },
      },
    },
    {
      id: 'P4N Easterly Shift Knockback',
      type: 'StartsUsing',
      netRegex: NetRegexes.startsUsing({ id: '6DB0', source: 'Hesperos', capture: false }),
      netRegexDe: NetRegexes.startsUsing({ id: '6DB0', source: 'Hesperos', capture: false }),
      netRegexFr: NetRegexes.startsUsing({ id: '6DB0', source: 'Hespéros', capture: false }),
      netRegexJa: NetRegexes.startsUsing({ id: '6DB0', source: 'ヘスペロス', capture: false }),
      delaySeconds: 2,
      alertText: (_data, _matches, output) => output.text!(),
      outputStrings: {
        text: {
          en: 'East Knockback',
          de: 'Rückstoß vom Osten',
          fr: 'Poussée à l\'est',
          ko: '동쪽 넉백',
        },
      },
    },
    {
      id: 'P4N Southerly Shift Knockback',
      type: 'StartsUsing',
      netRegex: NetRegexes.startsUsing({ id: '6DAF', source: 'Hesperos', capture: false }),
      netRegexDe: NetRegexes.startsUsing({ id: '6DAF', source: 'Hesperos', capture: false }),
      netRegexFr: NetRegexes.startsUsing({ id: '6DAF', source: 'Hespéros', capture: false }),
      netRegexJa: NetRegexes.startsUsing({ id: '6DAF', source: 'ヘスペロス', capture: false }),
      delaySeconds: 2,
      alertText: (_data, _matches, output) => output.text!(),
      outputStrings: {
        text: {
          en: 'South Knockback',
          de: 'Rückstoß vom Süden',
          fr: 'Poussée au sud',
          ko: '남쪽 넉백',
        },
      },
    },
    {
      id: 'P4N Westerly Shift Knockback',
      type: 'StartsUsing',
      netRegex: NetRegexes.startsUsing({ id: '6DB1', source: 'Hesperos', capture: false }),
      netRegexDe: NetRegexes.startsUsing({ id: '6DB1', source: 'Hesperos', capture: false }),
      netRegexFr: NetRegexes.startsUsing({ id: '6DB1', source: 'Hespéros', capture: false }),
      netRegexJa: NetRegexes.startsUsing({ id: '6DB1', source: 'ヘスペロス', capture: false }),
      delaySeconds: 2,
      alertText: (_data, _matches, output) => output.text!(),
      outputStrings: {
        text: {
          en: 'West Knockback',
          de: 'Rückstoß vom Westen',
          fr: 'Poussée à l\'ouest',
          ko: '서쪽 넉백',
        },
      },
    },
    {
      id: 'P4N Belone Bursts',
      type: 'StartsUsing',
      netRegex: NetRegexes.startsUsing({ id: '69D9', source: 'Hesperos', capture: false }),
      netRegexDe: NetRegexes.startsUsing({ id: '69D9', source: 'Hesperos', capture: false }),
      netRegexFr: NetRegexes.startsUsing({ id: '69D9', source: 'Hespéros', capture: false }),
      netRegexJa: NetRegexes.startsUsing({ id: '69D9', source: 'ヘスペロス', capture: false }),
      infoText: (_data, _matches, output) => output.text!(),
      outputStrings: {
        text: {
          en: 'Pop other role orbs',
          de: 'Nimm einen Orb einer anderen Rolle',
          fr: 'Éclatez l\'orbe d\'un autre rôle',
          ko: '내 직업군과 다른 구슬 터뜨리기',
        },
      },
    },
  ],
  timelineReplace: [
    {
      'locale': 'en',
      'replaceText': {
        'Well Pinax/Levinstrike Pinax': 'Well/Levinstrike Pinax',
        'Levinstrike Pinax/Well Pinax': 'Levinstrike/Well Pinax',
      },
    },
    {
      'locale': 'de',
      'replaceSync': {
        'Hesperos': 'Hesperos',
      },
      'replaceText': {
        '\\(cleave\\)': '(Cleave)',
        '\\(knockback\\)': '(Rückstoß)',
        'Acid Pinax': 'Säure-Pinax',
        'Belone Bursts': 'Berstendes Belone',
        'Belone Coils': 'Gewundenes Belone',
        'Bloodrake': 'Blutharke',
        'Burst(?!s)': 'Einschlag',
        'Decollation': 'Enthauptung',
        'Directional Shift': 'Himmelsrichtung-Schwingen',
        'Elegant Evisceration': 'Adrette Ausweidung',
        'Hell Skewer': 'Höllenspieß',
        'Levinstrike Pinax': 'Donner-Pinax',
        '(?<!\\w )Pinax': 'Pinax',
        'Setting the Scene': 'Vorhang auf',
        'Shifting Strike': 'Schwingenschlag',
        'Well Pinax': 'Brunnen-Pinax',
        'Westerly Shift': 'Schwingen gen Westen',
      },
    },
    {
      'locale': 'fr',
      'missingTranslations': true,
      'replaceSync': {
        'Hesperos': 'Hespéros',
      },
      'replaceText': {
        'Acid Pinax': 'Pinax de poison',
        'Belone Bursts': 'Bélos enchanté : explosion',
        'Belone Coils': 'Bélos enchanté : rotation',
        'Bloodrake': 'Racle de sang',
        'Burst(?!s)': 'Explosion',
        'Decollation': 'Décollation',
        'Elegant Evisceration': 'Éviscération élégante',
        'Hell Skewer': 'Embrochement infernal',
        'Levinstrike Pinax': 'Pinax de foudre',
        '(?<!\\w )Pinax': 'Pinax',
        'Setting the Scene': 'Lever de rideau',
        'Shifting Strike': 'Frappe mouvante',
        'Well Pinax': 'Pinax d\'eau',
        'Westerly Shift': 'Frappe mouvante vers l\'ouest',
      },
    },
    {
      'locale': 'ja',
      'missingTranslations': true,
      'replaceSync': {
        'Hesperos': 'ヘスペロス',
      },
      'replaceText': {
        'Acid Pinax': 'ピナクスポイズン',
        'Belone Bursts': 'エンチャンテッドペロネー：エクスプロージョン',
        'Belone Coils': 'エンチャンテッドペロネー：ラウンド',
        'Bloodrake': 'ブラッドレイク',
        'Burst(?!s)': '大爆発',
        'Decollation': 'デコレーション',
        'Elegant Evisceration': 'エレガントイヴィセレーション',
        'Hell Skewer': 'ヘルスキュアー',
        'Levinstrike Pinax': 'ピナクスサンダー',
        '(?<!\\w )Pinax': 'ピナクス',
        'Setting the Scene': '劇場創造',
        'Shifting Strike': 'シフティングストライク',
        'Well Pinax': 'ピナクススプラッシュ',
        'Westerly Shift': 'シフティングストライクW',
      },
    },
  ],
};

export default triggerSet;
