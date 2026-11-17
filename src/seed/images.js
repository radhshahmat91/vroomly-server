// Free-to-use photos from Pexels (https://www.pexels.com). Paths are "<id>/<file>".
const px = (path, w = 1200) => `https://images.pexels.com/photos/${path}?auto=compress&cs=tinysrgb&w=${w}`;

const P = (id) => `${id}/pexels-photo-${id}.jpeg`;
const S = (id, slug) => `${id}/pexels-photo-${id}/free-photo-of-${slug}.jpeg`;

export const photos = {
  tesla3Black: S(18569455, 'a-black-tesla-model-3-is-parked-on-the-street'),
  evCharging: S(24376862, 'electric-car-while-charging'),
  teslaMountain: P(9482560),
  evMountain: P(9482552),
  sedanCity: P(12090822),
  carSunset: P(12944702),
  pajero1: S(18207329, 'view-of-a-mitsubishi-pajero-driving-on-a-dirt-road'),
  pajero2: S(18207328, 'view-of-a-mitsubishi-pajero-driving-on-a-dirt-road'),
  pajero3: S(18207345, 'mitsubishi-pajero-car-on-dirt-road'),
  suvDesert: S(32720088, 'suv-navigating-desert-at-sunset'),
  suvSunset: P(12984743),
  smartWhite: S(27576117, 'smart-fortwo'),
  smartWhite2: S(27576108, 'smart-fortwo'),
  smartBlueBrick: P(166680),
  smartGreen: P(3936980),
  smartRed: S(27576981, 'smart-fortwo'),
  smartBlueEv: P(4014135),
  jeepCJ: S(19016180, 'blue-jeep-cj'),
  jeepField: S(27118085, 'a-jeep-is-parked-in-a-field-with-a-tent'),
  jeepFog: P(11143679),
  jeepBlueTrail: P(14512047),
  jeepRed: P(12510718),
  jeepClassic: P(10873769),
  miataWater: P(2932801),
  miataWater2: P(2932807),
  miataNight: P(2906849),
  miataRoad: P(3954213),
  miataDusk: P(3758443),
  miataGreen: P(8717325),
  camaro1: P(5543518),
  camaro2: P(5543497),
  camaro3: P(5543476),
  sportsGarage: S(33268786, 'sleek-white-sports-car-in-dark-garage-setting'),
  sportsSilver: P(2475808),
  redForest: P(210019),
  classicWhite: S(36808266, 'classic-white-convertible-car-in-sunny-park'),
};

export const img = (key, w = 1200) => ({ url: px(photos[key], w) });
export const imgs = (...keys) => keys.map((k) => img(k));
