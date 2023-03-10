import NetRegexes from '../../../../../resources/netregexes';
import ZoneId from '../../../../../resources/zone_id';
import { OopsyData } from '../../../../../types/data';
import { OopsyTriggerSet } from '../../../../../types/oopsy';

export type Data = OopsyData;

const triggerSet: OopsyTriggerSet<Data> = {
  zoneId: ZoneId.EdensPromiseAnamorphosis,
  damageWarn: {
    'E11N Burnt Strike Lightning': '562E', // Line cleave
    'E11N Burnt Strike Fire': '562C', // Line cleave
    'E11N Burnt Strike Holy': '5630', // Line cleave
    'E11N Burnout': '562F', // Burnt Strike lightning expansion
    'E11N Shining Blade': '5631', // Baited explosion
    'E11N Halo Of Flame Brightfire': '563B', // Red circle intermission explosion
    'E11N Halo Of Levin Brightfire': '563C', // Blue circle intermission explosion
    'E11N Resounding Crack': '564D', // Demi-Gukumatz 270 degree frontal cleave
    'E11N Image Burnt Strike Lightning': '5645', // Fate Breaker's Image line cleave
    'E11N Image Burnt Strike Fire': '5643', // Fate Breaker's Image line cleave
    'E11N Image Burnout': '5646', // Fate Breaker's Image lightning expansion
  },
  damageFail: {
    'E11N Blasting Zone': '563E', // Prismatic Deception charges
  },
  shareWarn: {
    'E11N Burn Mark': '564F', // Powder Mark debuff explosion
  },
  triggers: [
    {
      id: 'E11N Blastburn Knocked Off',
      type: 'Ability',
      // 562D = Burnt Strike fire followup during most of the fight
      // 5644 = same thing, but from Fatebreaker's Image
      netRegex: NetRegexes.ability({ id: ['562D', '5644'] }),
      deathReason: (_data, matches) => {
        return {
          id: matches.targetId,
          name: matches.target,
          text: {
            en: 'Knocked off',
            de: 'Runtergefallen',
            fr: 'A été assommé(e)',
            ja: 'ノックバック',
            cn: '击退坠落',
            ko: '넉백',
          },
        };
      },
    },
  ],
};

export default triggerSet;
