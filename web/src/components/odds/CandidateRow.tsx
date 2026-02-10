'use client';

import type { Contract, MarketSource, TimeFilter } from '@/lib/types';
import { MARKET_SOURCES } from '@/lib/types';
import { formatPercent, formatPriceChange, formatVolume, getPriceChangeColor, cn } from '@/lib/utils';
import { MarketPriceCell } from './MarketPriceCell';

interface CandidateRowProps {
  contract: Contract;
  rank: number;
  sources: MarketSource[];
  changePeriod?: TimeFilter;
  hideVolume?: boolean;
}

// Get initials from a name (e.g., "Joe Biden" -> "JB")
function getInitials(name: string): string {
  return name
    .split(' ')
    .map(word => word[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

// Generate a consistent color based on name
function getAvatarColor(name: string): string {
  const colors = [
    'bg-blue-500',
    'bg-red-500',
    'bg-green-500',
    'bg-purple-500',
    'bg-orange-500',
    'bg-cyan-500',
    'bg-pink-500',
    'bg-indigo-500',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

// Get X (Twitter) handle for a candidate
function getTwitterHandle(name: string): string | undefined {
  const handles: Record<string, string> = {
    // Top candidates
    'JD Vance': 'JDVance',
    'Gavin Newsom': 'GavinNewsom',
    'Marco Rubio': 'marcorubio',
    'Alexandria Ocasio-Cortez': 'AOC',
    'Josh Shapiro': 'GovernorShapiro',
    'Pete Buttigieg': 'PeteButtigieg',
    'Gretchen Whitmer': 'graborwhitmer',
    'Ron DeSantis': 'RonDeSantis',
    'Nikki Haley': 'NikkiHaley',
    'Donald Trump': 'realDonaldTrump',
    'Donald Trump Jr.': 'DonaldJTrumpJr',
    'Kamala Harris': 'KamalaHarris',
    'Vivek Ramaswamy': 'VivekGRamaswamy',
    'Tim Walz': 'Tim_Walz',
    'Andy Beshear': 'AndyBeshearKY',
    'JB Pritzker': 'GovPritzker',
    'Wes Moore': 'iamwesmoore',
    'Jon Ossoff': 'ossaborgia',
    'Glenn Youngkin': 'GlennYoungkin',
    'Tulsi Gabbard': 'TulsiGabbard',
    'Tucker Carlson': 'TuckerCarlson',
    'Ted Cruz': 'tedcruz',
    'Josh Hawley': 'HawleyMO',
    'Sarah Sanders': 'SarahHuckabee',
    'Brian Kemp': 'BrianKempGA',
    'Kristi Noem': 'KristiNoem',
    'Mike Pence': 'Mike_Pence',
    'Rand Paul': 'RandPaul',
    'Tom Cotton': 'SenTomCotton',
    'Robert F. Kennedy Jr.': 'RobertKennedyJr',
    'Elon Musk': 'elonmusk',

    // Democrats
    'Michelle Obama': 'MichelleObama',
    'Barack Obama': 'BarackObama',
    'Hillary Clinton': 'HillaryClinton',
    'Bernie Sanders': 'BernieSanders',
    'Elizabeth Warren': 'eaborren',
    'Amy Klobuchar': 'amyklobuchar',
    'Cory Booker': 'CoryBooker',
    'Mark Kelly': 'SenMarkKelly',
    'John Fetterman': 'JohnFetterman',
    'Raphael Warnock': 'SenatorWarnock',
    'Chris Murphy': 'ChrisMurphyCT',
    'Ro Khanna': 'RoKhanna',
    'Ruben Gallego': 'RubenGallego',
    'Phil Murphy': 'GovMurphy',
    'Jared Polis': 'GovofCO',
    'Roy Cooper': 'NC_Governor',
    'Andrew Cuomo': 'andrewcuomo',
    'Andrew Yang': 'AndrewYang',
    'Elissa Slotkin': 'ElissaSlotkin',
    'Jasmine Crockett': 'JasmineCrockett',
    'Zohran Mamdani': 'ZohranKMamdani',
    'James Talarico': 'jamestalarico',
    'Rahm Emanuel': 'RahmEmanuel',
    'Gina Raimondo': 'GinaRaimondo',
    'Hakeem Jeffries': 'RepJeffries',
    'Stacey Abrams': 'staboreyabrams',

    // Republicans
    'Greg Abbott': 'GregAbbott_TX',
    'Matt Gaetz': 'mattgaetz',
    'Marjorie Taylor Greene': 'RepMTG',
    'Byron Donalds': 'ByronDonalds',
    'Elise Stefanik': 'EliseStefanik',
    'John Thune': 'SenJohnThune',
    'Katie Britt': 'SenKatieBritt',
    'Thomas Massie': 'RepThomasMassie',
    'Steve Bannon': 'SteveBannon',
    'Tim Scott': 'SenatorTimScott',
    'Rick Scott': 'SenRickScott',
    'Bill Hagerty': 'SenatorHagerty',
    'Joni Ernst': 'SenJoniErnst',
    'Dan Crenshaw': 'DanCrenshawTX',
    'Liz Cheney': 'Liz_Cheney',

    // Business/Media
    'Jamie Dimon': 'jamie_dimon',
    'Mark Cuban': 'mcuban',
    'Oprah Winfrey': 'Oprah',
    'Dwayne Johnson': 'TheRock',
    "Dwayne 'The Rock' Johnson": 'TheRock',
    'Kim Kardashian': 'KimKardashian',
    'LeBron James': 'KingJames',
    'Tom Brady': 'TomBrady',
    'Jon Stewart': 'jonstewart',
    'Joe Rogan': 'joerogan',
    'Dana White': 'danawhite',
    'MrBeast': 'MrBeast',
    'Stephen A. Smith': 'stephenasmith',
    'Stephen Smith': 'stephenasmith',
    'Chelsea Clinton': 'ChelseaClinton',
    'George Clooney': 'GeorgeClooney',

    // Trump family
    'Ivanka Trump': 'IvankaTrump',
    'Eric Trump': 'EricTrump',
    'Lara Trump': 'LaraLeaTrump',

    // Cabinet/Admin
    'Pete Hegseth': 'PeteHegseth',
    'Kash Patel': 'Kaborh_Patel',
    'Doug Burgum': 'DougBurgum',
    'Ben Carson': 'RealBenCarson',
    'Linda McMahon': 'LindaMcMahon',
  };

  return handles[name];
}

// Get image zoom/position settings per candidate
// scale: zoom level (1 = no zoom, 2 = 2x zoom)
// position: CSS object-position value
function getImageSettings(name: string): { scale: number; position: string } {
  const settings: Record<string, { scale: number; position: string }> = {
    // Senate portrait - already a headshot, minimal adjustment
    'JD Vance': { scale: 1.3, position: '50% 15%' },
    'Gavin Newsom': { scale: 1.5, position: '50% 20%' },
    'Marco Rubio': { scale: 1.5, position: '50% 20%' },

    // Already face-focused - less zoom needed
    'Josh Shapiro': { scale: 1.1, position: '50% 30%' },
    'Gretchen Whitmer': { scale: 1.1, position: '50% 25%' },

    // Good middle ground
    'Alexandria Ocasio-Cortez': { scale: 1.4, position: '50% 20%' },
    'Kamala Harris': { scale: 1.4, position: '50% 20%' },
    'Donald Trump': { scale: 1.5, position: '50% 15%' },
    'Pete Buttigieg': { scale: 1.5, position: '50% 20%' },
    'Ron DeSantis': { scale: 1.5, position: '50% 20%' },
    'Nikki Haley': { scale: 1.5, position: '50% 20%' },
    'Vivek Ramaswamy': { scale: 1.5, position: '50% 20%' },
    'Tim Walz': { scale: 1.5, position: '50% 20%' },
    'Andy Beshear': { scale: 1.5, position: '50% 20%' },
    'JB Pritzker': { scale: 1.5, position: '50% 20%' },
    'Wes Moore': { scale: 1.5, position: '50% 20%' },
    'Jon Ossoff': { scale: 1.5, position: '50% 20%' },
    'Mark Kelly': { scale: 1.5, position: '50% 20%' },
    'Cory Booker': { scale: 1.5, position: '50% 20%' },
    'Amy Klobuchar': { scale: 1.5, position: '50% 20%' },
    'Bernie Sanders': { scale: 1.5, position: '50% 20%' },
    'Elizabeth Warren': { scale: 1.5, position: '50% 20%' },
    'Michelle Obama': { scale: 1.5, position: '50% 20%' },
    'Barack Obama': { scale: 1.5, position: '50% 20%' },
    'Hillary Clinton': { scale: 1.5, position: '50% 20%' },
    'John Fetterman': { scale: 1.5, position: '50% 20%' },
    'Mike Pence': { scale: 1.5, position: '50% 20%' },
    'Ted Cruz': { scale: 1.5, position: '50% 20%' },
    'Josh Hawley': { scale: 1.5, position: '50% 20%' },
    'Rand Paul': { scale: 1.5, position: '50% 20%' },
    'Tom Cotton': { scale: 1.5, position: '50% 20%' },
    'Glenn Youngkin': { scale: 1.5, position: '50% 20%' },
    'Brian Kemp': { scale: 1.5, position: '50% 20%' },
    'Kristi Noem': { scale: 1.5, position: '50% 20%' },
    'Sarah Sanders': { scale: 1.5, position: '50% 20%' },
    'Tulsi Gabbard': { scale: 1.5, position: '50% 20%' },
    'Elon Musk': { scale: 1.5, position: '50% 20%' },
    'Tucker Carlson': { scale: 1.5, position: '50% 20%' },
    'Robert F. Kennedy Jr.': { scale: 1.5, position: '50% 20%' },

    // Party logos - no zoom
    'Democratic Party': { scale: 1, position: 'center' },
    'Republican Party': { scale: 1, position: 'center' },
  };

  return settings[name] || { scale: 1.5, position: '50% 20%' };
}

export function CandidateRow({ contract, rank, sources, changePeriod = '1d', hideVolume = false }: CandidateRowProps) {
  // Get price for each source
  const getPriceForSource = (source: MarketSource) => {
    return contract.prices.find((p) => p.source === source);
  };

  const initials = getInitials(contract.name);
  const avatarColor = getAvatarColor(contract.name);
  const imageSettings = getImageSettings(contract.name);
  const twitterHandle = getTwitterHandle(contract.name);

  return (
    <tr className="border-b hover:bg-muted/50 transition-colors">
      {/* Rank */}
      <td className="px-3 py-2 text-center text-muted-foreground w-12">
        {rank}
      </td>

      {/* Candidate Name */}
      <td className="px-3 py-2 font-medium">
        <div className="flex items-center gap-2">
          {contract.imageUrl ? (
            <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
              <img
                src={contract.imageUrl}
                alt={contract.name}
                className="w-full h-full object-cover"
                style={{
                  transform: `scale(${imageSettings.scale})`,
                  objectPosition: imageSettings.position,
                }}
              />
            </div>
          ) : (
            <div className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0',
              avatarColor
            )}>
              {initials}
            </div>
          )}
          <div className="flex flex-col">
            <span>{contract.name}</span>
            {twitterHandle && (
              <a
                href={`https://x.com/${twitterHandle}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                @{twitterHandle}
              </a>
            )}
          </div>
        </div>
      </td>

      {/* Aggregated Price */}
      <td className="px-3 py-2 text-center">
        <span className="font-mono font-bold text-lg">
          {formatPercent(contract.aggregatedPrice, 1)}
        </span>
      </td>

      {/* Price Change */}
      <td className={cn('px-3 py-2 text-center font-mono text-sm', getPriceChangeColor(contract.priceChange))}>
        {formatPriceChange(contract.priceChange)}
      </td>

      {/* Price from each source */}
      {sources.map((source) => (
        <MarketPriceCell
          key={source}
          price={getPriceForSource(source)}
          source={source}
        />
      ))}

      {/* Total Volume */}
      {!hideVolume && (
        <td className="px-3 py-2 text-center text-sm text-muted-foreground">
          {formatVolume(contract.totalVolume)}
        </td>
      )}
    </tr>
  );
}
