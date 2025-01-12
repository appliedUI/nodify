import { db } from '@/db/db';
const placeAdjectives = [
  'Serene', 'Tranquil', 'Peaceful', 'Calm', 'Quiet', 'Soothing', 'Restful', 'Idyllic', 'Placid', 'Harmonious',
  'Gentle', 'Undisturbed', 'Untroubled', 'Relaxing', 'Pastoral', 'Bucolic', 'Lush', 'Rejuvenating', 'Meditative', 'Zen',
  'Balmy', 'Halcyon', 'Mellow', 'Still', 'Composed', 'Unruffled', 'Pacifying', 'Soothing', 'Comforting', 'Refreshing',
  'Blissful', 'Ethereal', 'Dreamy', 'Mild', 'Temperate', 'Welcoming', 'Inviting', 'Sheltered', 'Secluded', 'Retreat-like',
  'Sanctuary-like', 'Arcadian', 'Sylvan', 'Edenic', 'Heavenly', 'Utopian', 'Unspoiled', 'Pristine', 'Untouched', 'Natural'
];

const placeNames = [
  'Mountain', 'Beach', 'Forest', 'Desert', 'Island', 'Valley', 'Canyon', 'River', 'Lake', 'Waterfall',
  'Meadow', 'Glacier', 'Cliff', 'Cave', 'Plateau', 'Savannah', 'Prairie', 'Wetland', 'Lagoon', 'Bay',
  'Peninsula', 'Oasis', 'Dune', 'Grove', 'Harbor', 'Fjord', 'Tundra', 'Volcano', 'Reef', 'Geyser',
  'Delta', 'Marsh', 'Swamp', 'Estuary', 'Archipelago', 'Butte', 'Mesa', 'Steppe', 'Badlands', 'Foothills',
  'Highlands', 'Lowlands', 'Rainforest', 'Mangrove', 'Atoll', 'Cove', 'Bluff', 'Springs', 'Terrace', 'Basin'
];

const generateRandomNumber = () => {
  return Math.floor(1000 + Math.random() * 9000);
};

const generateRandomName = () => {
  const adj = placeAdjectives[Math.floor(Math.random() * placeAdjectives.length)];
  const place = placeNames[Math.floor(Math.random() * placeNames.length)];
  // const number = generateRandomNumber();
  return `${adj}-${place}`;
};

const isNameUnique = async (name) => {
  const workspace = await db.workspaces.where('name').equals(name).first();
  return !workspace;
};

const getUniqueName = async () => {
  let unique = false;
  let name = '';
  while (!unique) {
    name = generateRandomName();
    unique = await isNameUnique(name);
  }
  return name;
};

export { getUniqueName };
