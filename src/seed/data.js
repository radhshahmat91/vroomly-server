// Demo content for Vroomly. Everything here is fictional demo data.
export const PASSWORD = 'Vroomly@123';

const av = (n) => `https://i.pravatar.cc/240?img=${n}`;

export const users = {
  admin: { name: 'Vroomly Admin', email: 'admin@vroomly.app', role: 'admin', image: av(68), city: 'San Francisco' },
  amelia: {
    name: 'Amelia Hart', email: 'host@vroomly.app', role: 'owner', hostStatus: 'approved', image: av(47), city: 'Los Angeles',
    phone: '+1 310 555 0142', bio: 'Weekend road-tripper who keeps her cars spotless. Pick-up in Santa Monica, Venice or Pasadena.',
  },
  daniel: {
    name: 'Daniel Okafor', email: 'daniel@vroomly.app', role: 'owner', hostStatus: 'approved', image: av(12), city: 'Denver',
    phone: '+1 303 555 0177', bio: 'Skier and trail runner. My cars are made for the mountains and winter-ready.',
  },
  priya: {
    name: 'Priya Raman', email: 'priya@vroomly.app', role: 'owner', hostStatus: 'approved', image: av(45), city: 'Seattle',
    phone: '+1 206 555 0119', bio: 'Compact and efficient cars for people who hate circling for parking.',
  },
  marcus: {
    name: 'Marcus Bell', email: 'marcus@vroomly.app', role: 'owner', hostStatus: 'approved', image: av(33), city: 'Austin',
    phone: '+1 512 555 0163', bio: 'Mechanic by day. Everything I list has been serviced by me.',
  },
  sofia: {
    name: 'Sofia Martinez', email: 'sofia@vroomly.app', role: 'owner', hostStatus: 'approved', image: av(25), city: 'Miami',
    phone: '+1 305 555 0138', bio: 'Convertibles and weekend cars along Biscayne Bay. Airport hand-off available.',
  },
  liam: {
    name: 'Liam Chen', email: 'liam@vroomly.app', role: 'renter', hostStatus: 'pending', image: av(15), city: 'Portland',
    hostProfile: { phone: '+1 503 555 0190', city: 'Portland', about: 'I own a 2020 Subaru Outback that sits in the garage during the week. Happy to share it with careful drivers.' },
  },
  noah: { name: 'Noah Walker', email: 'renter@vroomly.app', role: 'renter', image: av(53), city: 'Los Angeles', phone: '+1 213 555 0101' },
  emma: { name: 'Emma Brooks', email: 'emma@vroomly.app', role: 'renter', image: av(5), city: 'San Francisco' },
  olivia: { name: 'Olivia Reyes', email: 'olivia@vroomly.app', role: 'renter', image: av(32), city: 'Miami' },
  james: { name: 'James Carter', email: 'james@vroomly.app', role: 'renter', image: av(59), city: 'Austin' },
  ethan: { name: 'Ethan Park', email: 'ethan@vroomly.app', role: 'renter', status: 'suspended', suspendedReason: 'Repeated no-shows on confirmed trips.', image: av(60), city: 'Seattle' },
};

const city = (name, lat, lng, address, country = 'United States') => ({ city: name, lat, lng, address, country });
const where = {
  santaMonica: city('Los Angeles', 34.0195, -118.4912, 'Ocean Ave, Santa Monica'),
  venice: city('Los Angeles', 33.985, -118.4695, 'Abbot Kinney Blvd, Venice'),
  pasadena: city('Los Angeles', 34.1478, -118.1445, 'Colorado Blvd, Pasadena'),
  lodo: city('Denver', 39.753, -105.0, 'Blake St, LoDo'),
  capHillDenver: city('Denver', 39.7313, -104.978, 'E 13th Ave, Capitol Hill'),
  capHillSeattle: city('Seattle', 47.6253, -122.3222, 'Pike St, Capitol Hill'),
  ballard: city('Seattle', 47.6686, -122.384, 'NW Market St, Ballard'),
  mission: city('San Francisco', 37.7599, -122.4148, 'Valencia St, Mission District'),
  eastAustin: city('Austin', 30.263, -97.715, 'E 6th St, East Austin'),
  soco: city('Austin', 30.2489, -97.75, 'S Congress Ave'),
  wynwood: city('Miami', 25.801, -80.199, 'NW 2nd Ave, Wynwood'),
  southBeach: city('Miami', 25.7826, -80.1341, 'Collins Ave, South Beach'),
};

export const cars = [
  // ───────── approved ─────────
  {
    key: 'tesla3', owner: 'amelia', brand: 'Tesla', model: 'Model 3 Long Range', year: 2022, category: 'sedan', fuelType: 'electric', transmission: 'automatic', seats: 5, doors: 4,
    pricePerDay: 89, weeklyDiscount: 10, monthlyDiscount: 22, where: where.santaMonica, photos: ['tesla3Black', 'evCharging', 'teslaMountain'],
    description: 'Long-range electric sedan with a glass roof and quick acceleration. It is charged to at least 90% at pick-up and a charging cable lives in the trunk. Pick-up a few minutes from the Santa Monica pier.',
    features: ['Autopilot', 'Glass roof', 'Apple CarPlay', 'USB charging', 'Backup camera', 'Keyless entry'],
  },
  {
    key: 'tesla3b', owner: 'daniel', brand: 'Tesla', model: 'Model 3 Standard Range', year: 2021, category: 'sedan', fuelType: 'electric', transmission: 'automatic', seats: 5, doors: 4,
    pricePerDay: 72, weeklyDiscount: 12, monthlyDiscount: 25, where: where.lodo, photos: ['teslaMountain', 'evMountain', 'evCharging'],
    description: 'Quiet electric commuter that is just as happy on the drive up to the Rockies. All-weather tires fitted for winter. Superchargers are a short walk from the pick-up spot in LoDo.',
    features: ['All-weather tires', 'Heated seats', 'Bluetooth', 'GPS navigation', 'Backup camera'],
  },
  {
    key: 'leaf', owner: 'priya', brand: 'Nissan', model: 'Leaf', year: 2020, category: 'hatchback', fuelType: 'electric', transmission: 'automatic', seats: 5, doors: 5,
    pricePerDay: 46, weeklyDiscount: 10, monthlyDiscount: 20, where: where.capHillSeattle, photos: ['evCharging', 'sedanCity'],
    description: 'Easy, silent city runabout with room for luggage. Ideal for errands and day trips around Puget Sound. Home charger available for renters staying more than three days.',
    features: ['Apple CarPlay', 'Android Auto', 'Backup camera', 'USB charging', 'Cruise control'],
  },
  {
    key: 'corolla', owner: 'priya', brand: 'Toyota', model: 'Corolla Hybrid', year: 2022, category: 'sedan', fuelType: 'hybrid', transmission: 'automatic', seats: 5, doors: 4,
    pricePerDay: 52, weeklyDiscount: 10, monthlyDiscount: 22, where: where.ballard, photos: ['sedanCity', 'carSunset'],
    description: 'Dependable hybrid that sips fuel — over 50 mpg in mixed driving. Clean, no-fuss and comfortable for long days behind the wheel. Pick-up near the Ballard locks.',
    features: ['Bluetooth', 'Apple CarPlay', 'Lane assist', 'Cruise control', 'Backup camera'],
  },
  {
    key: 'pajero', owner: 'daniel', brand: 'Mitsubishi', model: 'Pajero Sport', year: 2021, category: 'suv', fuelType: 'diesel', transmission: 'automatic', seats: 7, doors: 5,
    pricePerDay: 74, weeklyDiscount: 12, monthlyDiscount: 25, where: where.capHillDenver, photos: ['pajero1', 'pajero2', 'pajero3'],
    description: 'Seven-seat 4x4 built for gravel roads and mountain passes. Third-row seats fold flat for skis and camping gear. A roof rack and recovery kit are included.',
    features: ['4WD', 'Roof rack', 'Third row seating', 'Heated seats', 'Bluetooth', 'Cruise control'],
  },
  {
    key: 'crv', owner: 'marcus', brand: 'Honda', model: 'CR-V Hybrid', year: 2021, category: 'suv', fuelType: 'hybrid', transmission: 'automatic', seats: 5, doors: 5,
    pricePerDay: 66, weeklyDiscount: 10, monthlyDiscount: 20, where: where.eastAustin, photos: ['suvDesert', 'suvSunset'],
    description: 'Roomy, efficient family SUV with a huge trunk. Serviced by me every 5,000 miles. Pick-up in East Austin with easy access to the highway.',
    features: ['AWD', 'Apple CarPlay', 'Android Auto', 'Child seat available', 'Backup camera', 'Keyless entry'],
  },
  {
    key: 'prado', owner: 'amelia', brand: 'Toyota', model: 'Land Cruiser Prado', year: 2018, category: 'suv', fuelType: 'diesel', transmission: 'automatic', seats: 7, doors: 5,
    pricePerDay: 112, weeklyDiscount: 12, monthlyDiscount: 24, where: where.pasadena, photos: ['suvSunset', 'suvDesert', 'pajero1'],
    description: 'Go-anywhere seven-seater with a legendary reputation for reliability. Comfortable leather seats, a proper spare and a fridge-ready cargo area. Perfect for desert weekends.',
    features: ['4WD', 'Leather seats', 'Roof rack', 'GPS navigation', 'Third row seating', 'Pet friendly'],
  },
  {
    key: 'smartEq', owner: 'priya', brand: 'Smart', model: 'EQ Fortwo', year: 2020, category: 'hatchback', fuelType: 'electric', transmission: 'automatic', seats: 2, doors: 3,
    pricePerDay: 39, weeklyDiscount: 10, monthlyDiscount: 20, where: where.mission, photos: ['smartWhite', 'smartWhite2', 'smartBlueBrick'],
    description: 'The easiest car in San Francisco to park — it fits sideways in tight spots. Fully electric with plenty of range for city days. Pick-up in the Mission with a charger on site.',
    features: ['Bluetooth', 'USB charging', 'Backup camera', 'Easy parking'],
  },
  {
    key: 'smartPassion', owner: 'priya', brand: 'Smart', model: 'Fortwo Passion', year: 2019, category: 'hatchback', fuelType: 'petrol', transmission: 'automatic', seats: 2, doors: 3,
    pricePerDay: 34, weeklyDiscount: 8, monthlyDiscount: 18, where: where.capHillSeattle, photos: ['smartGreen', 'smartRed', 'smartBlueEv'],
    description: 'A tiny car with a big personality. Great for two people and a weekend bag, and it turns on a dime. Fuel-efficient and fun in city traffic.',
    features: ['Bluetooth', 'Cruise control', 'USB charging', 'Easy parking'],
  },
  {
    key: 'cj7', owner: 'marcus', brand: 'Jeep', model: 'CJ-7 Classic', year: 1984, category: 'offroad', fuelType: 'petrol', transmission: 'manual', seats: 4, doors: 2,
    pricePerDay: 69, weeklyDiscount: 10, monthlyDiscount: 20, where: where.soco, photos: ['jeepCJ', 'jeepField', 'jeepFog'],
    description: 'A restored classic with a removable top and a manual gearbox. It rides rough and rewards confident drivers — manual licence required. I will walk you through the quirks at hand-off.',
    features: ['4WD', 'Removable top', 'Manual gearbox', 'Roll bar', 'Bluetooth speaker'],
  },
  {
    key: 'wrangler', owner: 'daniel', brand: 'Jeep', model: 'Wrangler Unlimited', year: 2019, category: 'offroad', fuelType: 'petrol', transmission: 'automatic', seats: 5, doors: 4,
    pricePerDay: 98, weeklyDiscount: 12, monthlyDiscount: 24, where: where.lodo, photos: ['jeepBlueTrail', 'jeepRed', 'jeepClassic'],
    description: 'Four-door Wrangler with a hard top, tow hooks and all-terrain tires. Takes mountain trails in stride and still behaves on the highway. Ski-rack and recovery strap included.',
    features: ['4WD', 'Tow hooks', 'All-terrain tires', 'Apple CarPlay', 'Roof rack', 'Removable top'],
  },
  {
    key: 'miata91', owner: 'sofia', brand: 'Mazda', model: 'MX-5 Miata', year: 1991, category: 'convertible', fuelType: 'petrol', transmission: 'manual', seats: 2, doors: 2,
    pricePerDay: 79, weeklyDiscount: 10, monthlyDiscount: 20, where: where.southBeach, photos: ['miataWater', 'miataWater2', 'miataNight'],
    description: 'Pop-up headlights, a five-speed manual and a soft top that goes down in ten seconds. The best seat in Miami for sunset drives along the causeway. Lovingly maintained.',
    features: ['Convertible top', 'Manual gearbox', 'Bluetooth speaker', 'Pop-up headlights'],
  },
  {
    key: 'miata94', owner: 'amelia', brand: 'Mazda', model: 'MX-5 Miata Club', year: 1994, category: 'convertible', fuelType: 'petrol', transmission: 'manual', seats: 2, doors: 2,
    pricePerDay: 85, weeklyDiscount: 10, monthlyDiscount: 20, where: where.venice, photos: ['miataRoad', 'miataDusk', 'miataGreen'],
    description: 'A red roadster for Pacific Coast Highway days. Light, agile and surprisingly practical for two. Top-down weather guaranteed most of the year in Venice.',
    features: ['Convertible top', 'Manual gearbox', 'Bluetooth speaker', 'Pop-up headlights'],
  },
  {
    key: 'camaro', owner: 'amelia', brand: 'Chevrolet', model: 'Camaro SS', year: 2020, category: 'sports', fuelType: 'petrol', transmission: 'automatic', seats: 4, doors: 2,
    pricePerDay: 129, weeklyDiscount: 10, monthlyDiscount: 22, where: where.pasadena, photos: ['camaro1', 'camaro2', 'camaro3'],
    description: 'Bright yellow V8 muscle with a rumble you will hear before you see it. Launch control, performance brakes and a surprisingly usable back seat. Drivers must be 25 or older.',
    features: ['V8 engine', 'Apple CarPlay', 'Heated seats', 'Performance brakes', 'Keyless entry', 'Backup camera'],
  },
  {
    key: 'amg', owner: 'sofia', brand: 'Mercedes-Benz', model: 'AMG GT', year: 2021, category: 'luxury', fuelType: 'petrol', transmission: 'automatic', seats: 2, doors: 2,
    pricePerDay: 245, weeklyDiscount: 8, monthlyDiscount: 18, where: where.wynwood, photos: ['sportsGarage', 'sportsSilver', 'redForest'],
    description: 'A grand tourer for special occasions: hand-built V8, leather cockpit and exhaust modes from civilised to loud. Refundable security deposit and driver verification required.',
    features: ['V8 engine', 'Leather seats', 'Burmester audio', 'Sport exhaust', 'GPS navigation', 'Keyless entry'],
  },
  {
    key: 'porsche', owner: 'sofia', brand: 'Porsche', model: '911 Carrera S', year: 2019, category: 'luxury', fuelType: 'petrol', transmission: 'automatic', seats: 4, doors: 2,
    pricePerDay: 289, weeklyDiscount: 8, monthlyDiscount: 15, where: where.southBeach, photos: ['sportsSilver', 'sportsGarage', 'redForest'],
    description: 'The everyday supercar: rear-engined, razor-sharp and still comfortable on a long drive. Sport Chrono package, adaptive suspension and a surprisingly large front trunk.',
    features: ['Sport Chrono', 'Leather seats', 'Apple CarPlay', 'Adaptive suspension', 'Backup camera'],
  },
  // ───────── waiting for review ─────────
  {
    key: 'smartCabrio', owner: 'priya', status: 'pending', brand: 'Smart', model: 'EQ Fortwo Cabrio', year: 2021, category: 'convertible', fuelType: 'electric', transmission: 'automatic', seats: 2, doors: 2,
    pricePerDay: 49, weeklyDiscount: 10, monthlyDiscount: 20, where: where.mission, photos: ['smartBlueEv', 'smartBlueBrick'],
    description: 'Open-air electric micro-car for sunny San Francisco afternoons. The roof folds back at the touch of a button and the car charges overnight at home.',
    features: ['Convertible top', 'Bluetooth', 'USB charging', 'Easy parking'],
  },
  {
    key: 'wranglerSahara', owner: 'daniel', status: 'pending', brand: 'Jeep', model: 'Wrangler Sahara', year: 2017, category: 'offroad', fuelType: 'petrol', transmission: 'automatic', seats: 5, doors: 4,
    pricePerDay: 88, weeklyDiscount: 10, monthlyDiscount: 20, where: where.capHillDenver, photos: ['jeepClassic', 'jeepRed'],
    description: 'Well-kept Sahara trim with leather seats and a hard top. New to the platform and ready for its first trail weekend. Winter tires fitted from November.',
    features: ['4WD', 'Leather seats', 'Hard top', 'Bluetooth', 'Tow hooks'],
  },
  // ───────── rejected ─────────
  {
    key: 'classicConv', owner: 'marcus', status: 'rejected', adminNote: 'Please add current registration and insurance details to the description, and upload at least one interior photo.',
    brand: 'Ford', model: 'Thunderbird Convertible', year: 1964, category: 'convertible', fuelType: 'petrol', transmission: 'automatic', seats: 4, doors: 2,
    pricePerDay: 140, weeklyDiscount: 5, monthlyDiscount: 10, where: where.eastAustin, photos: ['classicWhite'],
    description: 'A white 1960s convertible for weddings and photo shoots. Chauffeur or self-drive available by arrangement. Includes a picnic hamper.',
    features: ['Convertible top', 'Whitewall tires', 'Bench seat'],
  },
];

const reviewTexts = {
  tesla3: [
    ['Picked it up in minutes. The car was spotless, fully charged and Amelia sent clear instructions for the parking garage. Smoothest rental I have had.', 'Thank you Noah! Come back any time — the PCH is lovely in the evening.'],
    ['Super quiet and fast. I loved having a charger cable ready in the trunk. Would book again for a longer trip.', null],
    ['Great communication and the car drove perfectly. Glass roof made the Malibu drive feel special.', null],
  ],
  camaro: [
    ['An absolute blast. The V8 sounds incredible and the car looked brand new. Hand-off took less than five minutes.', 'Glad you enjoyed it, Emma! The Camaro loves long open roads.'],
    ['Powerful and fun, a little thirsty on fuel as expected. Amelia was flexible with the return time which I really appreciated.', null],
    ['Turned heads everywhere. Clean car, easy pick-up and fair price for a weekend like this.', null],
  ],
  pajero: [
    ['Took it up to the mountains with five friends and all our gear. It handled the gravel roads with no drama and Daniel included a recovery kit.', 'Great trip report! Thanks for taking care of it.'],
    ['Comfortable and roomy. Heated seats were a nice surprise on a cold morning.', null],
  ],
  smartEq: [['Parking in the Mission has never been this easy. Charged, tidy and exactly as described. Priya was lovely to deal with.', 'Thanks Noah — enjoy those parking spots!']],
  miata91: [
    ['Top down along the causeway at sunset — worth every dollar. The manual gearbox is a joy and Sofia walked me through the car beforehand.', 'It is one of my favourites too. Thanks for the lovely review!'],
    ['Fun little car. It is old, so expect some character, but it was reliable all weekend.', null],
  ],
  cj7: [['Rough, loud and wonderful. Marcus clearly knows the Jeep inside out and gave great tips for the dirt roads east of Austin.', null]],
  amg: [['A proper special-occasion car. Sofia verified everything quickly and the AMG delivered the drama I was hoping for.', 'Thank you Emma, it was a pleasure to host you.']],
  corolla: [['Does exactly what it says: cheap to run, comfortable and clean. Great for a week of meetings around Seattle.', null]],
  wrangler: [['Took it up a snowy pass and it never skipped a beat. Daniel included a ski rack and chains. Highly recommended for mountain trips.', 'Thank you Emma! Glad the chains were useful.']],
  crv: [['Plenty of space for the whole family and very economical. The car was serviced and spotless.', null]],
  leaf: [['Car was fine and did the job, but the battery was only at about 60% when I picked it up so I had to charge before leaving. Host was friendly and fixed it quickly.', 'Sorry about the charge level, Emma — I now top up to 90% before every hand-off.']],
  porsche: [['Handling is razor sharp and the car looked immaculate. Pick-up in South Beach was easy and Sofia answered every message within minutes.', null]],
};

/**
 * Past trips (completed, paid, reviewed). Offsets are in days relative to today so the demo
 * always looks fresh: [car, renter, startOffset, days].
 */
export const completedTrips = [
  ['tesla3', 'noah', -160, 3, 0],
  ['tesla3', 'emma', -100, 4, 1],
  ['tesla3', 'olivia', -40, 2, 2],
  ['camaro', 'emma', -130, 2, 0],
  ['camaro', 'noah', -75, 3, 1],
  ['camaro', 'james', -20, 2, 2],
  ['pajero', 'emma', -110, 5, 0],
  ['pajero', 'olivia', -45, 3, 1],
  ['smartEq', 'noah', -90, 2, 0],
  ['miata91', 'emma', -85, 3, 0],
  ['miata91', 'james', -30, 2, 1],
  ['cj7', 'noah', -60, 4, 0],
  ['amg', 'emma', -55, 2, 0],
  ['corolla', 'noah', -50, 5, 0],
  ['wrangler', 'emma', -25, 3, 0],
  ['crv', 'noah', -35, 6, 0],
  ['leaf', 'emma', -15, 2, 0],
  ['porsche', 'olivia', -65, 2, 0],
].map(([car, renter, start, days, idx]) => ({ car, renter, start, days, review: reviewTexts[car][idx] }));

export const ratingByTrip = { 'tesla3-noah': 5, 'tesla3-emma': 5, 'tesla3-olivia': 5, 'camaro-emma': 5, 'camaro-noah': 4, 'camaro-james': 5, 'pajero-emma': 5, 'pajero-olivia': 4, 'smartEq-noah': 5, 'miata91-emma': 5, 'miata91-james': 4, 'cj7-noah': 4, 'amg-emma': 5, 'corolla-noah': 4, 'wrangler-emma': 5, 'crv-noah': 4, 'leaf-emma': 3, 'porsche-olivia': 5 };

/** Trip that finished but has no review yet — lets the demo renter try the review form. */
export const unreviewedTrip = { car: 'prado', renter: 'noah', start: -8, days: 3 };

export const upcoming = [
  // status, car, renter, startOffset, days, extras
  { status: 'confirmed', car: 'tesla3b', renter: 'noah', start: 5, days: 3, message: 'Flying in Friday evening — can I pick up around 7pm?' },
  { status: 'confirmed', car: 'miata94', renter: 'emma', start: 9, days: 2, message: 'Weekend up the coast with my sister.' },
  { status: 'confirmed', car: 'smartPassion', renter: 'olivia', start: 18, days: 4, message: '' },
  { status: 'accepted', car: 'amg', renter: 'noah', start: 12, days: 2, message: 'Anniversary weekend. I will bring my licence and a deposit if needed.' },
  { status: 'pending', car: 'camaro', renter: 'olivia', start: 3, days: 3, message: 'Hi Amelia! Birthday trip with friends — is the car free Friday to Sunday?' },
  { status: 'pending', car: 'camaro', renter: 'james', start: 4, days: 3, message: 'Looking for a car for a long weekend. Happy to pick up anytime.' },
  { status: 'pending', car: 'miata94', renter: 'noah', start: 14, days: 2, message: 'Would love to take it up the coast road.' },
  { status: 'pending', car: 'crv', renter: 'james', start: 6, days: 2, message: 'Family visit this week, need space for car seats.' },
  { status: 'rejected', car: 'tesla3', renter: 'james', start: 2, days: 2, reason: 'The car is booked for servicing on those dates.' },
  { status: 'cancelled', car: 'leaf', renter: 'emma', start: 7, days: 2, reason: 'Plans changed.', cancelledBy: 'renter' },
  { status: 'cancelled', car: 'pajero', renter: 'noah', start: 10, days: 3, reason: 'Trip postponed because of snow.', cancelledBy: 'renter', paidThenRefunded: true },
];

export const blockedRanges = [
  { car: 'tesla3', start: 20, days: 3, reason: 'Scheduled service' },
  { car: 'camaro', start: 30, days: 5, reason: 'Personal use' },
  { car: 'wrangler', start: 12, days: 4, reason: 'Winter tire swap' },
];

export const complaints = [
  { user: 'noah', category: 'booking', subject: 'Pick-up time changed at the last minute', description: 'The host asked to move our pick-up by three hours the evening before. I could not rearrange my flight and had to wait at the airport. Could you review how last-minute changes are handled?', status: 'open', trip: 'miata91' },
  { user: 'emma', category: 'vehicle', subject: 'Battery was not charged as described', description: 'The listing said the car would be charged to 90% but it was at about 60% when I collected it. The host fixed it quickly, but this should be reflected on the listing.', status: 'in_review', response: 'Thanks for flagging this. We have contacted the host and asked them to update the listing description.', trip: 'leaf' },
  { user: 'amelia', category: 'renter', subject: 'Late return on a weekend rental', description: 'A renter returned the car four hours after the agreed time without messaging me first. I would like this noted on the account.', status: 'resolved', response: 'We have spoken with the renter and added a note to their account. Thanks for letting us know.' },
];
