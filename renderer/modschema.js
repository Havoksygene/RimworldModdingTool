'use strict';
// Data model + catalogs for the mod builder. Pure data, no DOM (usable from Node tests too).
// Workbenches, base defs, research names (ComplexClothing, FlakArmor, PoweredArmor, Gunsmithing) and the apparel layer /
// body part names were checked against RimWorld 1.7.4985 game files. Other lists (materials, projectiles, sounds, tags) are
// from memory: each has a "custom" escape hatch in the UI.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ModSchema = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const CATALOG = {
    recipeSpeedStats: ['GeneralLaborSpeed', 'CookSpeed', 'SmeltingSpeed', 'DrugSynthesisSpeed', 'DrugCookingSpeed', 'ButcheryFleshSpeed', 'ConstructionSpeed'],
    recipeSkills: ['Crafting', 'Cooking', 'Intellectual', 'Construction', 'Artistic', 'Medicine', 'Shooting', 'Melee', 'Plants', 'Mining'],
    recipeEffects: ['Cook', 'Smith', 'Tailor', 'Smelt', 'CutStone', 'Drill', 'Clean'],
    recipeSounds: ['Recipe_CookMeal', 'Recipe_Machining', 'Recipe_Smith', 'Recipe_Tailor', 'Recipe_Smelt', 'Recipe_MakeStoneBlocks', 'Recipe_Brewing'],
    recipeBenches: ['FueledStove', 'ElectricStove', 'CraftingSpot', 'TableStonecutter', 'DrugLab', 'ElectricSmelter', 'FueledSmithy', 'ElectricSmithy', 'TableMachining', 'FabricationBench', 'HandTailoringBench', 'ElectricTailoringBench', 'Brewery', 'ButcherSpot', 'TableButcher'],
    techLevels: ['Neolithic', 'Medieval', 'Industrial', 'Spacer', 'Ultra'],
    // (all of these workbenches were seen in 1.7 files)
    workbenches: [
      'HandTailoringBench',
      'ElectricTailoringBench',
      'TableMachining',
      'FabricationBench',
      'FueledSmithy',
      'ElectricSmithy',
      'CraftingSpot',
    ],
    materials: [
      'Steel',
      'Plasteel',
      'Silver',
      'Gold',
      'Uranium',
      'Jade',
      'Cloth',
      'Synthread',
      'DevilstrandCloth',
      'Hyperweave',
      'Leather_Plain',
      'Leather_Light',
      'Leather_Heavy',
      'WoodLog',
      'ComponentIndustrial',
      'ComponentSpacer',
      'Chemfuel',
    ],
    stuffCategories: ['Metallic', 'Woody', 'Stony', 'Fabric', 'Leathery'],
    research: ['', 'ComplexClothing', 'FlakArmor', 'PoweredArmor', 'Gunsmithing'], // verified in 1.7; type any other project's defName
    projectiles: ['Bullet_Revolver', 'Bullet_BoltActionRifle', 'Bullet_Shotgun', 'Bullet_AssaultRifle', 'Bullet_SniperRifle', 'Bullet_Minigun'],
    shotSounds: ['Shot_Revolver', 'Shot_BoltActionRifle', 'Shot_Shotgun', 'Shot_AssaultRifle', 'Shot_SniperRifle', 'Shot_Minigun'],
    meleeCapacities: ['Cut', 'Stab', 'Blunt', 'Poke'],
    // tags checked against the 1.7 defs: the ones vanilla weapons / apparel actually use
    weaponTags: [
      'Gun',
      'SimpleGun',
      'IndustrialGunAdvanced',
      'SpacerGun',
      'GunHeavy',
      'GunSingleUse',
      'ShortShots',
      'Revolver',
      'Autopistol',
      'AssaultRifle',
      'SniperRifle',
      'Minigun',
      'NeolithicRangedBasic',
      'NeolithicRangedDecent',
      'NeolithicRangedHeavy',
      'NeolithicMeleeBasic',
      'NeolithicMeleeDecent',
      'NeolithicMeleeAdvanced',
      'MedievalMeleeBasic',
      'MedievalMeleeDecent',
      'MedievalMeleeAdvanced',
      'UltratechMelee',
    ],
    apparelTags: [
      'IndustrialBasic',
      'IndustrialAdvanced',
      'IndustrialMilitaryBasic',
      'IndustrialMilitaryAdvanced',
      'SpacerMilitary',
      'Neolithic',
      'Outlander',
      'BeltDefensePop',
      'Vacsuit',
    ],
    bodyTypes: ['Male', 'Female', 'Thin', 'Fat', 'Hulk'],
    // Body parts an item covers. Torso, Neck, Shoulders, Arms, Legs, UpperHead, FullHead are from 1.7 files; the others are from memory.
    bodyParts: ['Torso', 'Neck', 'Shoulders', 'Arms', 'Legs', 'UpperHead', 'FullHead', 'Eyes', 'Waist', 'Hands', 'Feet'],
    // "How it is made": decides the unfinished item on the bench, the work animation and sound, and the base def.
    // Values copied from the vanilla 1.7 bases (ApparelMakeableBase, ArmorMachineableBase, ApparelArmorHelmetPowerBase, BaseMakeableGun, BaseMeleeWeapon).
    craftStyles: {
      tailoring: {
        label: 'Tailoring (cloth, leather)',
        for: 'apparel',
        unfinished: 'UnfinishedApparel',
        effect: 'Tailor',
        sound: 'Recipe_Tailor',
        benches: ['ElectricTailoringBench'],
        parent: 'ApparelMakeableBase',
        hatParent: 'HatMakeableBase',
      },
      machining: {
        label: 'Machining (armour, metal)',
        for: 'apparel',
        unfinished: 'UnfinishedArmor',
        effect: 'Smith',
        sound: 'Recipe_Machining',
        benches: ['TableMachining'],
        parent: 'ArmorMachineableBase',
        hatParent: 'ArmorHelmetMakeableBase',
      },
      techarmor: {
        label: 'High-tech armour (fabrication)',
        for: 'apparel',
        unfinished: 'UnfinishedTechArmor',
        effect: 'Smith',
        sound: 'Recipe_Machining',
        benches: ['FabricationBench'],
        parent: 'ArmorMachineableBase',
        hatParent: 'ArmorHelmetMakeableBase',
        research: 'PoweredArmor',
      },
      gun: {
        label: 'Gunsmithing (guns)',
        for: 'weapon',
        unfinished: 'UnfinishedGun',
        effect: 'Smith',
        sound: 'Recipe_Smith',
        benches: ['TableMachining'],
        research: 'Gunsmithing',
      },
      workshop: {
        label: 'Workshop (items, components, blocks)',
        for: 'item',
        unfinished: 'UnfinishedComponent',
        effect: 'Smith',
        sound: 'Recipe_Machining',
        benches: ['TableMachining'],
      },
      bionics: {
        label: 'Bionics (fabrication bench)',
        for: 'implant',
        unfinished: 'UnfinishedHealthItemBionic',
        effect: 'Smith',
        sound: 'Recipe_Smith',
        benches: ['FabricationBench'],
      },
      sculpting: {
        label: 'Sculpting (art placed after crafting)',
        for: 'building',
        skill: 'Artistic',
        unfinished: 'UnfinishedSculpture',
        effect: 'Sculpt',
        sound: 'Recipe_Sculpt',
        benches: ['TableSculpting'],
      },
      smithing: {
        label: 'Smithing (melee weapons)',
        for: 'weapon',
        unfinished: 'UnfinishedWeapon',
        effect: 'Smith',
        sound: 'Recipe_Smith',
        benches: ['FueledSmithy'],
      },
    },
    // Item presets, copied from the vanilla 1.7 bases (ResourceBase + Steel / ComponentIndustrial, ChunkBase + ChunkSlagSteel).
    itemPresets: {
      resource: {
        label: 'Resource (ore, metal, cloth, component...)',
        parent: 'ResourceBase',
        stack: 75,
        cats: ['ResourcesRaw'],
        sound: 'Metal_Drop',
        trade: 'All',
        stats: { MarketValue: 1, Mass: 0.5, Beauty: -4 },
      },
      chunk: {
        label: 'Chunk (slag, rock chunk)',
        parent: 'ChunkBase',
        stack: 1,
        cats: ['Chunks'],
        sound: 'ChunkSlag_Drop',
        trade: 'None',
        chunk: true,
        stats: { Mass: 8, MaxHitPoints: 300, Beauty: -8 },
      },
      rawfood: {
        label: 'Raw food (fruit, vegetable, meat, ingredient)',
        parent: 'PlantFoodRawBase',
        stack: 75,
        cats: ['PlantFoodRaw'],
        sound: 'Standard_Drop',
        trade: 'All',
        food: 'raw',
        stats: { MarketValue: 1, Mass: 0.05, MaxHitPoints: 60, Flammability: 1, DeteriorationRate: 6, Nutrition: 0.05 },
        ingest: { foodType: 'VegetableOrFruit', preferability: 'RawBad', sound: 'RawVegetable_Eat', effect: 'EatVegetarian', taste: 'AteRawFood', rot: 30 },
      },
      meal: {
        label: 'Meal (cooked at a stove)',
        parent: 'MealBase',
        stack: 10,
        cats: ['FoodMeals'],
        sound: 'Standard_Drop',
        trade: 'All',
        food: 'meal',
        stats: { MarketValue: 20, Mass: 0.44, MaxHitPoints: 50, Flammability: 1, DeteriorationRate: 10, Nutrition: 0.9 },
        ingest: { foodType: 'Meal', preferability: 'MealSimple', sound: 'Meal_Eat', effect: 'EatVegetarian', taste: 'AteFineMeal', rot: 4 },
        bench: ['FueledStove', 'ElectricStove'],
      },
      drug: {
        label: 'Drug (pill, joint, drink with a high)',
        parent: 'DrugBase',
        stack: 150,
        cats: ['Drugs'],
        sound: 'Standard_Drop',
        trade: 'All',
        food: 'drug',
        stats: { MarketValue: 12, Mass: 0.05, MaxHitPoints: 50, Flammability: 1, DeteriorationRate: 2 },
        ingest: { foodType: 'Processed', preferability: 'NeverForNutrition', sound: 'Ingest_Pill', effect: '', taste: '', rot: 0 },
      },
    },
    foodTypes: ['VegetableOrFruit', 'Meat', 'Meal', 'Processed', 'AnimalProduct', 'Plant', 'Fluid', 'Seed'],
    preferabilities: ['RawBad', 'RawTasty', 'MealAwful', 'MealSimple', 'MealFine', 'MealLavish', 'DesperateOnly', 'NeverForNutrition'],
    ingestSounds: ['Meal_Eat', 'RawVegetable_Eat', 'RawMeat_Eat', 'Ingest_Pill', 'Ingest_Smoke', 'Ingest_Drink', 'Ingest_Beer', 'Ingest_Inject', 'Ingest_Snort'],
    ingestEffects: ['EatVegetarian', 'EatMeat', 'Smoke_Joint', 'Smoke_Flake'],
    tasteThoughts: ['AteRawFood', 'AteFineMeal', 'AteLavishMeal', 'AteKibble'],
    joyKinds: ['Gluttonous', 'Chemical', 'Social', 'Meditative'],
    drugCategories: ['Social', 'Hard', 'Medical'],
    thingCategories: [
      'ResourcesRaw',
      'Manufactured',
      'Textiles',
      'Leathers',
      'StoneBlocks',
      'ItemsMisc',
      'Chunks',
      'StoneChunks',
      'PlantMatter',
      'AnimalProductRaw',
    ],
    techLevels: ['Neolithic', 'Medieval', 'Industrial', 'Spacer', 'Ultra', 'Archotech'],
    researchBenches: ['', 'HiTechResearchBench', 'SimpleResearchBench'],
    researchFacilities: ['MultiAnalyzer', 'VitalsMonitor'],
    itemSounds: ['Metal_Drop', 'Standard_Drop', 'Stone_Drop', 'Wood_Drop', 'Silver_Drop', 'Grain_Drop', 'ChunkRock_Drop', 'ChunkSlag_Drop'],
    tradeability: ['All', 'Buyable', 'Sellable', 'None'],
    stuffAppearances: ['Metal', 'Smooth', 'Bricks', 'Planks'],
    // Building presets, copied from the vanilla 1.7 defs (BuildingBase / FurnitureBase / FurnitureWithQualityBase / TableBase / BenchBase,
    // DiningChair, Table2x2c, HandTailoringBench). margin = how much bigger than its footprint the vanilla picture is drawn.
    buildPresets: {
      decoration: {
        label: 'Decoration (statue, pot, ornament)',
        parent: 'FurnitureBase',
        size: [1, 1],
        margin: 0,
        passability: 'PassThroughOnly',
        pathCost: 30,
        fill: 0.3,
        rotatable: false,
        surface: '',
        sittable: false,
        designation: 'Furniture',
        stats: { Beauty: 3 },
      },
      table: {
        label: 'Table',
        parent: 'TableBase',
        size: [2, 2],
        margin: 2,
        passability: 'PassThroughOnly',
        pathCost: 42,
        fill: 0.4,
        rotatable: false,
        surface: 'Eat',
        sittable: false,
        designation: 'Furniture',
        stats: { Beauty: 1, WorkToBuild: 1500, MaxHitPoints: 100, Mass: 10 },
      },
      chair: {
        label: 'Chair / stool',
        parent: 'FurnitureWithQualityBase',
        size: [1, 1],
        margin: 0,
        passability: 'PassThroughOnly',
        pathCost: 30,
        fill: 0.35,
        rotatable: true,
        surface: '',
        sittable: true,
        designation: 'Furniture',
        stats: { Beauty: 8, Comfort: 0.7, WorkToBuild: 8000, MaxHitPoints: 100, Mass: 5 },
      },
      workbench: {
        label: 'Workbench',
        parent: 'BenchBase',
        size: [3, 1],
        margin: 0.5,
        passability: 'PassThroughOnly',
        pathCost: 50,
        fill: 0.5,
        rotatable: true,
        surface: 'Item',
        sittable: false,
        designation: 'Production',
        bench: true,
        stats: { WorkToBuild: 2000, MaxHitPoints: 180, Mass: 20, Beauty: 0 },
      },
      wall: {
        label: 'Wall (joins up with its neighbours)',
        parent: 'BuildingBase',
        size: [1, 1],
        margin: 0,
        passability: 'Impassable',
        pathCost: null,
        fill: 1,
        rotatable: false,
        surface: '',
        sittable: false,
        designation: 'Structure',
        wall: true,
        stats: { MaxHitPoints: 300, WorkToBuild: 135, Flammability: 1 },
      },
      crafted: {
        label: 'Crafted at a workbench, then placed (like a sculpture)',
        parent: 'BuildingBase',
        size: [1, 1],
        margin: 0,
        passability: 'PassThroughOnly',
        pathCost: 14,
        fill: 0.35,
        rotatable: false,
        surface: '',
        sittable: false,
        designation: '',
        crafted: true,
        stats: { MaxHitPoints: 100, Mass: 5, Beauty: 20, WorkToMake: 5000 },
      },
      facility: {
        label: 'Booster (makes a nearby workbench better)',
        parent: 'BuildingBase',
        size: [1, 1],
        margin: 0,
        passability: 'PassThroughOnly',
        pathCost: 30,
        fill: 0.3,
        rotatable: false,
        surface: '',
        sittable: false,
        designation: 'Production',
        facility: true,
        stats: { WorkToBuild: 1000, MaxHitPoints: 100, Mass: 10, Beauty: 0 },
      },
      other: {
        label: 'Other building',
        parent: 'BuildingBase',
        size: [1, 1],
        margin: 0,
        passability: 'PassThroughOnly',
        pathCost: 30,
        fill: 0.3,
        rotatable: false,
        surface: '',
        sittable: false,
        designation: 'Misc',
        stats: { Beauty: 0 },
      },
    },
    // "Worn as" presets: what the game needs for each way of wearing something.
    wornAs: {
      'torso-skin': { label: 'Body, next to skin (shirt)', groups: ['Torso'], layers: ['OnSkin'], bodyShaped: true },
      'torso-middle': { label: 'Body, middle layer (jacket)', groups: ['Torso', 'Shoulders', 'Arms'], layers: ['Middle'], bodyShaped: true },
      'torso-shell': {
        label: 'Body, outer shell (duster, armour)',
        groups: ['Torso', 'Shoulders', 'Arms', 'Legs'],
        layers: ['Shell'],
        bodyShaped: true,
      },
      legs: { label: 'Legs (pants)', groups: ['Legs'], layers: ['OnSkin'], bodyShaped: true },
      belt: { label: 'Belt or pack', groups: ['Waist'], layers: ['Belt'], bodyShaped: true },
      'headgear-upper': { label: 'Hat / helmet (UpperHead)', groups: ['UpperHead'], layers: ['Overhead'], bodyShaped: false, hat: true },
      'headgear-full': { label: 'Full-head helmet (FullHead)', groups: ['FullHead'], layers: ['Overhead'], bodyShaped: false, hat: true },
      eyes: { label: 'Eyewear', groups: ['Eyes'], layers: ['EyeCover'], bodyShaped: false },
    },
  };

  // Labelled entries for the clickable lists. v = the name was seen in 1.7 game files; otherwise it is from memory
  // (shown with a "?" in the list). Users can add their own entries (modded stats, benches, resources...) in the builder.
  const E = (id, label, group, v, extra) => Object.assign({ id, label, group, v: true }, extra || {}); // all names below were checked against the 1.7 defs
  CATALOG.entries = {
    stats: [
      E('ArmorRating_Sharp', 'Armour: sharp', 'Armour', 1, { kind: 'item' }),
      E('ArmorRating_Blunt', 'Armour: blunt', 'Armour', 1, { kind: 'item' }),
      E('ArmorRating_Heat', 'Armour: heat', 'Armour', 1, { kind: 'item' }),
      E('StuffEffectMultiplierArmor', 'Armour × material strength', 'Armour', 1, { kind: 'item' }),
      E('Insulation_Cold', 'Insulation: cold', 'Temperature', 1, { kind: 'item' }),
      E('Insulation_Heat', 'Insulation: heat', 'Temperature', 1, { kind: 'item' }),
      E('StuffEffectMultiplierInsulation_Cold', 'Cold insulation × material', 'Temperature', 1, { kind: 'item' }),
      E('StuffEffectMultiplierInsulation_Heat', 'Heat insulation × material', 'Temperature', 1, { kind: 'item' }),
      E('ComfyTemperatureMin', 'Comfortable minimum temperature', 'Temperature', 1, { kind: 'wearer' }),
      E('ComfyTemperatureMax', 'Comfortable maximum temperature', 'Temperature', 0, { kind: 'wearer' }),
      E('WorkToMake', 'Work to make', 'Item basics', 1, { kind: 'item' }),
      E('Mass', 'Mass (kg)', 'Item basics', 1, { kind: 'item' }),
      E('MaxHitPoints', 'Hit points', 'Item basics', 1, { kind: 'item' }),
      E('Flammability', 'Flammability', 'Item basics', 1, { kind: 'item' }),
      E('EquipDelay', 'Time to put on (s)', 'Item basics', 1, { kind: 'item' }),
      E('MarketValue', 'Market value', 'Item basics', 1, { kind: 'item' }),
      E('Beauty', 'Beauty', 'Item basics', 1, { kind: 'item' }),
      E('DeteriorationRate', 'Deterioration rate', 'Item basics', 1, { kind: 'item' }),
      E('SellPriceFactor', 'Sell price factor', 'Item basics', 1, { kind: 'item' }),
      E('AccuracyTouch', 'Accuracy: touch range', 'Weapon', 1, { kind: 'item' }),
      E('AccuracyShort', 'Accuracy: short range', 'Weapon', 1, { kind: 'item' }),
      E('AccuracyMedium', 'Accuracy: medium range', 'Weapon', 1, { kind: 'item' }),
      E('AccuracyLong', 'Accuracy: long range', 'Weapon', 1, { kind: 'item' }),
      E('RangedWeapon_Cooldown', 'Time between shots (s)', 'Weapon', 1, { kind: 'item' }),
      E('MoveSpeed', 'Move speed', 'Movement', 0, { kind: 'wearer' }),
      E('CarryingCapacity', 'Carrying capacity', 'Movement', 0, { kind: 'wearer' }),
      E('WorkSpeedGlobal', 'Work speed (all work)', 'Work', 0, { kind: 'wearer' }),
      E('ResearchSpeed', 'Research speed', 'Work', 0, { kind: 'wearer' }),
      E('ConstructionSpeed', 'Construction speed', 'Work', 0, { kind: 'wearer' }),
      E('MiningSpeed', 'Mining speed', 'Work', 0, { kind: 'wearer' }),
      E('PlantWorkSpeed', 'Plant work speed', 'Work', 0, { kind: 'wearer' }),
      E('MedicalTendQuality', 'Medical tend quality', 'Work', 0, { kind: 'wearer' }),
      E('ShootingAccuracyPawn', 'Shooting accuracy', 'Combat', 0, { kind: 'wearer' }),
      E('AimingDelayFactor', 'Aiming time factor', 'Combat', 0, { kind: 'wearer' }),
      E('MeleeHitChance', 'Melee hit chance', 'Combat', 0, { kind: 'wearer' }),
      E('MeleeDodgeChance', 'Melee dodge chance', 'Combat', 0, { kind: 'wearer' }),
      E('SocialImpact', 'Social impact', 'Social', 1, { kind: 'wearer' }),
      E('SlaveSuppressionOffset', 'Slave suppression', 'Social', 1, { kind: 'wearer' }),
      E('VacuumResistance', 'Vacuum resistance', 'Resistance', 1, { kind: 'wearer' }),
      E('ToxicEnvironmentResistance', 'Toxic environment resistance', 'Resistance', 0, { kind: 'wearer' }),
      E('PsychicSensitivity', 'Psychic sensitivity', 'Resistance', 0, { kind: 'wearer' }),
      E('ImmunityGainSpeed', 'Immunity gain speed', 'Resistance', 0, { kind: 'wearer' }),
    ],
    materials: [
      E('Steel', 'Steel', 'Metals', 1),
      E('Plasteel', 'Plasteel', 'Metals', 1),
      E('Silver', 'Silver', 'Metals', 1),
      E('Gold', 'Gold', 'Metals', 1),
      E('Uranium', 'Uranium', 'Metals', 1),
      E('Jade', 'Jade', 'Stone', 1),
      E('Cloth', 'Cloth', 'Cloth and leather'),
      E('Synthread', 'Synthread', 'Cloth and leather'),
      E('DevilstrandCloth', 'Devilstrand cloth', 'Cloth and leather'),
      E('Hyperweave', 'Hyperweave', 'Cloth and leather'),
      E('Leather_Plain', 'Plain leather', 'Cloth and leather'),
      E('Leather_Light', 'Light leather', 'Cloth and leather'),
      E('Leather_Heavy', 'Heavy leather', 'Cloth and leather'),
      E('WoodLog', 'Wood', 'Other', 1),
      E('Chemfuel', 'Chemfuel', 'Other'),
      E('ComponentIndustrial', 'Component', 'Components', 1),
      E('ComponentSpacer', 'Advanced component', 'Components', 1),
    ],
    workbenches: [
      E('HandTailoringBench', 'Hand tailoring bench', 'Tailoring', 1),
      E('ElectricTailoringBench', 'Electric tailoring bench', 'Tailoring', 1),
      E('TableMachining', 'Machining table', 'Machining', 1),
      E('FabricationBench', 'Fabrication bench', 'Machining', 1),
      E('FueledSmithy', 'Fueled smithy', 'Smithing', 1),
      E('ElectricSmithy', 'Electric smithy', 'Smithing', 1),
      E('CraftingSpot', 'Crafting spot', 'Other', 1),
    ],
    bodyParts: CATALOG.bodyParts.map((n) =>
      E(n, n, 'Body parts', ['Torso', 'Neck', 'Shoulders', 'Arms', 'Legs', 'UpperHead', 'FullHead'].includes(n)),
    ),
    stuffCategories: CATALOG.stuffCategories.map((n) => E(n, n, 'Material types')),
    apparelTags: CATALOG.apparelTags.map((n) => E(n, n, 'Who wears it')),
    weaponTags: CATALOG.weaponTags.map((n) =>
      E(n, n, 'Weapon tags', ['SimpleGun', 'Gun', 'Revolver', 'MedievalMeleeBasic', 'NeolithicMeleeBasic'].includes(n)),
    ),
    bodyTypes: CATALOG.bodyTypes.map((n) => E(n, n, 'Body types', 1)),
    capacities: ['Manipulation', 'Moving', 'Sight', 'Hearing', 'Talking', 'Eating', 'Breathing', 'BloodFiltration', 'BloodPumping', 'Metabolism', 'Consciousness'].map((n) =>
      E(n, n, 'Body abilities'),
    ),
    races: [E('Human', 'Human colonist', 'People')],
    bodyParts: ['Shoulder', 'Arm', 'Hand', 'Leg', 'Foot', 'Eye', 'Ear', 'Nose', 'Jaw', 'Tongue', 'Neck', 'Head', 'Skull', 'Brain', 'Heart', 'Lung', 'Kidney', 'Liver', 'Stomach', 'Spine', 'Torso'].map((n) =>
      E(n, n, 'Body parts (humans)'),
    ),
    letterDefs: ['PositiveEvent', 'NeutralEvent', 'NegativeEvent', 'ThreatSmall', 'ThreatBig'],
    biomeIds: ['TemperateForest', 'TemperateSwampland', 'BorealForest', 'Tundra', 'ColdBog', 'IceSheet', 'SeaIce', 'AridShrubland', 'Desert', 'ExtremeDesert', 'TropicalRainforest', 'TropicalSwamp'],
    traitTags: ['SlowFastLearner', 'Sexuality', 'DrugUse'],
    skills: ['Shooting', 'Melee', 'Construction', 'Mining', 'Cooking', 'Plants', 'Animals', 'Crafting', 'Artistic', 'Medicine', 'Social', 'Intellectual'],
    workTags: ['Violent', 'Social', 'Caring', 'Cooking', 'Hauling', 'Cleaning', 'ManualDumb', 'ManualSkilled', 'Intellectual', 'Artistic', 'Crafting', 'Animals', 'Firefighting', 'PlantWork', 'Mining', 'Constructing', 'Commoner', 'AllWork'],
    mechSounds: ['Militor', 'Lifter', 'Constructoid', 'Agrihand', 'Cleansweeper', 'Fabricor', 'Paramedic', 'WarUrchin', 'Pikeman', 'Scorcher', 'Scyther', 'Legionary', 'Tesseron', 'Centipede', 'Diabolus', 'Centurion', 'Warqueen', 'Tunneler', 'Termite', 'Apocriton'],
    mechBodies: ['Mech_Light', 'Lancer', 'Scyther', 'Pikeman', 'MechanicalCentipede', 'MechanicalTermite', 'Mech_Tunneler', 'Mech_Diabolus', 'Mech_Centurion', 'Mech_Warqueen', 'Mech_Agrihand'],
    mechWeights: ['Light', 'Medium', 'Heavy', 'UltraHeavy'],
    mechWeaponTags: ['MechanoidGunShortRange', 'MechanoidGunLongRange', 'MechanoidGunMedium', 'MechanoidGunHeavy', 'MechanoidGunBreach', 'MechanoidGunMiniFlameblaster', 'MechanoidGunNeedleLauncher', 'MechanoidGunToxicNeedle', 'MechanoidGunSlugthrower', 'MechanoidGunSpiner'],
    mechWorkTypes: ['Hauling', 'Construction', 'Cleaning', 'Growing', 'PlantCutting', 'Mining', 'Cooking', 'Crafting', 'Smithing', 'Tailoring', 'Doctor', 'Research'],
    animalBodies: ['QuadrupedAnimalWithPawsAndTail', 'QuadrupedAnimalWithPaws', 'QuadrupedAnimalWithHooves', 'QuadrupedAnimalWithHoovesAndHorn', 'QuadrupedAnimalWithHoovesAndHump', 'QuadrupedAnimalWithHoovesAndTusks', 'QuadrupedAnimalWithHoovesTusksAndTrunk', 'QuadrupedAnimalWithClawsTailAndJowl', 'Bird', 'Monkey', 'Snake', 'TurtleLike', 'BeetleLike', 'BeetleLikeWithClaw'].map((n) => E(n, n.replace(/([a-z])([A-Z])/g, '$1 $2'), 'Body shapes')),
    animalFood: [E('VegetarianRoughAnimal', 'Plants (grass, hay)', 'Food'), E('OmnivoreRoughAnimal', 'Plants and meat', 'Food'), E('OmnivoreAnimal, OvivoreAnimal', 'Meat, plants, eggs', 'Food'), E('CarnivoreAnimal, OvivoreAnimal', 'Meat and eggs', 'Food'), E('CarnivoreAnimal', 'Meat only', 'Food'), E('CarnivoreAnimalStrict', 'Fresh meat only', 'Food'), E('DendrovoreAnimal', 'Wood (trees)', 'Food')],
    animalTags: ['AnimalCommon', 'AnimalUncommon', 'AnimalFarm', 'AnimalFighter', 'AnimalPet', 'AnimalInsect', 'AnimalExotic'].map((n) => E(n, n, 'Trade tags')),
    animalGroups: ['FrontLeftPaw', 'FrontRightPaw', 'FrontLeftLeg', 'FrontRightLeg', 'HeadAttackTool', 'Teeth', 'Beak', 'Feet', 'Mouth', 'HornAttackTool', 'TuskAttackTool', 'LeftHand', 'RightHand', 'FrontLeftClaws', 'FrontRightClaws', 'HeadClaw'],
    extraDamages: ['Flame', 'EMP', 'Stun', 'Burn', 'Frostbite', 'Cut', 'Blunt', 'Stab'].map((n) => E(n, n, 'Damage types')),
    geneCategories: ['Cosmetic_Body', 'Cosmetic_Hair', 'Cosmetic_Skin', 'Beauty', 'Movement', 'Healing', 'Violence', 'Mood', 'Temperature', 'ResistanceAndWeakness', 'Sleep', 'Pain', 'Aptitudes', 'Drugs', 'Reproduction', 'Ability', 'Psychic', 'Miscellaneous'].map((n) =>
      E(n, n, 'Gene categories'),
    ),
    buildCategories: ['Furniture', 'Structure', 'Production', 'Misc', 'Power', 'Security', 'Temperature', 'Joy', 'Ship', 'Floors'].map((n) =>
      E(n, n, 'Build menu tabs'),
    ),
    surfaceTypes: [E('', '(nothing)', 'Surface'), E('Item', 'Items (workbench, shelf)', 'Surface'), E('Eat', 'Meals (dining table)', 'Surface')],
    passability: [
      E('Standable', 'Pawns walk over it (rug, floor item)', 'Passability'),
      E('PassThroughOnly', 'Pawns can pass but slowly (furniture)', 'Passability'),
      E('Impassable', 'Blocks movement (wall-like)', 'Passability'),
    ],
    research: [
      E('', '(none)', 'Research', 1),
      E('ComplexClothing', 'Complex clothing', 'Research', 1),
      E('FlakArmor', 'Flak armour', 'Research', 1),
      E('PoweredArmor', 'Powered armour', 'Research', 1),
      E('Gunsmithing', 'Gunsmithing', 'Research', 1),
    ],
    explosionSounds: ['Explosion_Bomb', 'Explosion_Flame', 'Explosion_EMP', 'Explosion_Smoke', 'Explosion_Rocket'].map((n) =>
      E(n, n.replace('Explosion_', '') + ' explosion', 'Explosion sounds'),
    ),
    damages: ['Bullet', 'Arrow', 'Bomb', 'Flame', 'EMP', 'Smoke', 'Stun'].map((n) => E(n, n, 'Damage types')),
    damagesBase: ['Bullet', 'Arrow', 'Bomb', 'Flame'].map((n) => E(n, n, 'Damage types')),
    hediffs: ['ToxicBuildup', 'FoodPoisoning'].map((n) => E(n, n.replace(/([a-z])([A-Z])/g, '$1 $2'), 'Conditions')),
    spawnables: [E('Filth_Fuel', 'Fuel puddle', 'Filth'), E('Filth_FireFoam', 'Fire foam', 'Filth')],
    gasTypes: ['BlindSmoke', 'ToxGas', 'DeadlifeDust'].map((n) => E(n, n.replace(/([a-z])([A-Z])/g, '$1 $2'), 'Gas')),
    projectiles: CATALOG.projectiles.map((n) => E(n, n.replace('Bullet_', '').replace(/([a-z])([A-Z])/g, '$1 $2') + ' bullet', 'Projectiles')),
    shotSounds: CATALOG.shotSounds.map((n) => E(n, n.replace('Shot_', '').replace(/([a-z])([A-Z])/g, '$1 $2') + ' shot', 'Shot sounds')),
    meleeCapacities: CATALOG.meleeCapacities.map((n) => E(n, n, 'Damage types')),
    unfinished: [
      E('UnfinishedApparel', 'Unfinished clothing (textile)', 'Unfinished items', 1),
      E('UnfinishedArmor', 'Unfinished armour (metal)', 'Unfinished items', 1),
      E('UnfinishedTechArmor', 'Unfinished high-tech armour', 'Unfinished items', 1),
      E('UnfinishedGun', 'Unfinished gun', 'Unfinished items', 1),
      E('UnfinishedWeapon', 'Unfinished melee weapon', 'Unfinished items', 1),
    ],
    craftSounds: [
      E('Recipe_Tailor', 'Tailoring sound', 'Work sounds', 1),
      E('Recipe_Machining', 'Machining sound', 'Work sounds', 1),
      E('Recipe_Smith', 'Smithing sound', 'Work sounds', 1),
    ],
    craftEffects: [E('Tailor', 'Tailoring animation', 'Work animations', 1), E('Smith', 'Smithing animation', 'Work animations', 1)],
  };
  // Materials per category for the "Made from" checklist. v = seen in 1.7 files; others are from memory (shown with "?").
  const M = (id, label) => E(id, label, 'Materials');
  CATALOG.stuffTree = {
    Metallic: [
      M('Steel', 'Steel', 1),
      M('Plasteel', 'Plasteel', 1),
      M('Silver', 'Silver', 1),
      M('Gold', 'Gold', 1),
      M('Uranium', 'Uranium', 1),
      M('Jade', 'Jade', 0),
    ],
    Fabric: [M('Cloth', 'Cloth', 0), M('Synthread', 'Synthread', 0), M('DevilstrandCloth', 'Devilstrand cloth', 0), M('Hyperweave', 'Hyperweave', 0)],
    Leathery: [
      M('Leather_Plain', 'Plain leather', 0),
      M('Leather_Light', 'Light leather', 0),
      M('Leather_Heavy', 'Heavy leather', 0),
      M('Leather_Bear', 'Bear leather', 0),
      M('Leather_Wolf', 'Wolf leather', 0),
      M('Leather_Thrumbo', 'Thrumbo leather', 0),
      M('Leather_Patch', 'Patchleather', 0),
    ],
    Woody: [M('WoodLog', 'Wood', 1)],
    Stony: [
      M('BlocksGranite', 'Granite blocks', 0),
      M('BlocksLimestone', 'Limestone blocks', 0),
      M('BlocksMarble', 'Marble blocks', 0),
      M('BlocksSandstone', 'Sandstone blocks', 0),
      M('BlocksSlate', 'Slate blocks', 0),
    ],
  };
  for (const [c, l] of Object.entries(CATALOG.stuffTree)) CATALOG.entries['stuff_' + c] = l;
  // Real lists read from the game's Data folder (tools/make_gamedata.py -> gamedata.js). Curated entries above keep their friendly
  // names and kinds; everything else the game has is appended, tagged with its DLC when it is not Core.
  CATALOG.srcOf = {};
  CATALOG.biomeData = { animals: [], plants: [] };
  CATALOG.dlcPackage = {
    Royalty: 'Ludeon.RimWorld.Royalty',
    Ideology: 'Ludeon.RimWorld.Ideology',
    Biotech: 'Ludeon.RimWorld.Biotech',
    Anomaly: 'Ludeon.RimWorld.Anomaly',
    Odyssey: 'Ludeon.RimWorld.Odyssey',
  };
  (function mergeGame() {
    let GD = null;
    try {
      GD = typeof GameData !== 'undefined' ? GameData : typeof require === 'function' ? require('./gamedata.js') : null;
    } catch (e) {
      GD = null;
    }
    if (!GD) return;
    const tag = (e) => ({ id: e.id, label: e.label + (e.src && e.src !== 'Core' ? ' (' + e.src + ')' : ''), group: e.group, v: true });
    const merge = (lk, list, keepBlank) => {
      const have = new Set((CATALOG.entries[lk] || []).map((e) => e.id));
      CATALOG.entries[lk] = [...(CATALOG.entries[lk] || []), ...list.filter((e) => !have.has(e.id)).map(tag)];
    };
    merge('stats', GD.stats);
    merge('research', GD.research);
    merge('workbenches', GD.workbenches);
    merge('projectiles', GD.projectiles);
    merge('damages', GD.damages);
    merge(
      'damagesBase',
      GD.damages.filter((d) => d.named),
    );
    merge('hediffs', GD.hediffs);
    merge('traits', GD.traits || []);
    try {
      const DD = typeof DefData !== 'undefined' ? DefData : typeof require === 'function' ? require('./defdata.js') : null;
      if (DD) {
        CATALOG.defData = DD.things;
        CATALOG.entries.animalProfiles = Object.entries(DD.profiles || {}).map(([id, e]) => ({ id, label: e.l + (e.src && e.src !== 'Core' ? ' (' + e.src + ')' : ''), group: 'Animals', v: true }));
        CATALOG.animalProfiles = DD.profiles || {};
        CATALOG.entries.patchTargets = Object.entries(DD.things).map(([id, e]) => ({ id, label: e.l + (e.src && e.src !== 'Core' ? ' (' + e.src + ')' : ''), group: e.k, v: true }));
      }
    } catch (e) {
      /* no def data: the patch editor only offers typed IDs */
    }
    merge('bodyParts', GD.bodyParts || []);
    merge('races', GD.races || []);
    merge('mentalStates', GD.mentalStates || []);
    merge('genes', GD.genes || []);
    merge('spawnables', GD.spawnables);
    merge('animals', GD.animals);
    merge('plants', GD.plants);
    merge('terrains', GD.terrains);
    merge('weathers', GD.weathers);
    merge('diseaseIncidents', GD.diseaseIncidents);
    merge('ambientSounds', GD.ambientSounds);
    CATALOG.entries.biomeWorkers = [
      E('', '(none: the biome does not appear by itself)', 'Where it appears', 1),
      ...GD.biomeWorkers.map((w) =>
        E(w, w.replace(/^BiomeWorker_/, '').replace(/([a-z])([A-Z])/g, '$1 $2') + ' (placed like this vanilla biome)', 'Where it appears'),
      ),
    ];
    // animals / plants with their numeric stats (for "all animals with stat >= X" rules), and which DLC each id needs
    CATALOG.biomeData = { animals: GD.animals, plants: GD.plants };
    for (const l of [GD.animals, GD.plants, GD.terrains, GD.weathers, GD.diseaseIncidents, GD.ambientSounds, GD.stats])
      for (const e of l) if (e.src && e.src !== 'Core') CATALOG.srcOf[e.id] = e.src;
    CATALOG.entries.gasTypes = GD.gasTypes.map((g) => E(g, g.replace(/([a-z])([A-Z])/g, '$1 $2'), 'Gas', 1));
    merge('shotSounds', GD.sounds.shot);
    merge('explosionSounds', GD.sounds.explosion || []);
    merge('craftSounds', GD.sounds.work);
    merge(
      'buildCategories',
      GD.designations.filter((d) => !['Orders', 'Zone'].includes(d.id)),
    );
    const order = ['Metallic', 'Woody', 'Stony', 'Fabric', 'Leathery'];
    const cats = [...order, ...Object.keys(GD.stuff).filter((c) => !order.includes(c))].filter((c) => GD.stuff[c]);
    CATALOG.stuffTree = {};
    for (const c of cats) {
      CATALOG.stuffTree[c] = GD.stuff[c].map((e) => E(e.id, e.label + (e.src && e.src !== 'Core' ? ' (' + e.src + ')' : ''), 'Materials'));
      CATALOG.entries['stuff_' + c] = CATALOG.stuffTree[c];
    }
    CATALOG.entries.stuffCategories = cats.map((c) => E(c, c, 'Material types'));
    CATALOG.entries.materials = [
      ...CATALOG.entries.materials,
      ...cats.flatMap((c) =>
        GD.stuff[c]
          .filter((e) => !CATALOG.entries.materials.some((m) => m.id === e.id))
          .map((e) => E(e.id, e.label + (e.src && e.src !== 'Core' ? ' (' + e.src + ')' : ''), c)),
      ),
    ];
  })();
  // entries for a list key: labelled data if we have it, else the plain list with the id as the label
  CATALOG.entriesFor = (lk) => CATALOG.entries[lk] || (CATALOG[lk] || []).filter(Boolean).map((n) => E(n, n, 'List'));

  const APPAREL_STATS = [
    ['WorkToMake', 'Work to make', 1200],
    ['Mass', 'Mass (kg)', 1],
    ['MaxHitPoints', 'Hit points', 100],
    ['MarketValue', 'Market value', 100],
    ['Flammability', 'Flammability (0-1)', 1],
    ['EquipDelay', 'Equip delay (s)', 2],
  ];
  // Fixed-material items state armour / insulation directly; items made "from any material" scale the material's values instead.
  const APPAREL_FIXED = [
    ['ArmorRating_Sharp', 'Armour: sharp', 0],
    ['ArmorRating_Blunt', 'Armour: blunt', 0],
    ['ArmorRating_Heat', 'Armour: heat', 0],
    ['Insulation_Cold', 'Insulation: cold', 0],
    ['Insulation_Heat', 'Insulation: heat', 0],
  ];
  const APPAREL_STUFF = [
    ['StuffEffectMultiplierArmor', 'Armour × material', 0.3],
    ['StuffEffectMultiplierInsulation_Cold', 'Cold insulation × material', 0.6],
    ['StuffEffectMultiplierInsulation_Heat', 'Heat insulation × material', 0.85],
  ];
  const BUILDING_STATS = [
    ['WorkToBuild', 'Work to build', 600],
    ['MaxHitPoints', 'Hit points', 100],
    ['Flammability', 'Flammability', 1],
    ['Mass', 'Mass (kg)', 10],
    ['Beauty', 'Beauty (negative = ugly)', 0],
  ];
  const nw = (it) => it.preset !== 'wall';
  const WALL_HELP =
    'Grid of 4 × 4 cells, the bottom-left cell is a wall with no neighbours. Cell number = which sides connect (up = 1, right = 2, down = 4, left = 8), counted from the bottom-left, left to right, bottom row first: bottom row = alone, up, right, up+right; second row = down, up+down, right+down, up+right+down; third row = left, left+up, left+right, left+right+up; top row = left+down, left+up+down, left+right+down, all four. Same as the wall template on the RimWorld modding wiki.';
  const ITEM_STATS = [
    ['MarketValue', 'Market value (silver each)', 1],
    ['Mass', 'Mass (kg each)', 0.5],
    ['MaxHitPoints', 'Hit points', 100],
    ['Flammability', 'Flammability (0-1)', 0],
    ['DeteriorationRate', 'Deterioration per day outdoors', 0],
    ['Beauty', 'Beauty (negative = ugly)', -4],
  ];
  // vanilla Steel: how good it is as a building / weapon / apparel material
  const STUFF_POWER = [
    ['StuffPower_Armor_Sharp', 'Armour: sharp', 0.9],
    ['StuffPower_Armor_Blunt', 'Armour: blunt', 0.45],
    ['StuffPower_Armor_Heat', 'Armour: heat', 0.6],
    ['StuffPower_Insulation_Cold', 'Insulation: cold', 3],
    ['StuffPower_Insulation_Heat', 'Insulation: heat', 0],
    ['SharpDamageMultiplier', 'Weapon sharp damage × ', 1],
    ['BluntDamageMultiplier', 'Weapon blunt damage × ', 1],
  ];
  const STUFF_FACTORS = [
    ['MaxHitPoints', 'Hit points × (buildings)', 1],
    ['Beauty', 'Beauty × (buildings)', 1],
    ['Flammability', 'Flammability ×', 1],
  ];
  const BUILDING_EXTRA = { chair: [['Comfort', 'Comfort (0-1)', 0.7]], crafted: [['WorkToMake', 'Work to make', 5000]] };
  const WEAPON_STATS = [
    ['WorkToMake', 'Work to make', 4000],
    ['Mass', 'Mass (kg)', 3],
    ['MarketValue', 'Market value', 200],
  ];
  const RANGED_STATS = [
    ['AccuracyTouch', 'Accuracy touch', 0.7],
    ['AccuracyShort', 'Accuracy short', 0.7],
    ['AccuracyMedium', 'Accuracy medium', 0.6],
    ['AccuracyLong', 'Accuracy long', 0.5],
    ['RangedWeapon_Cooldown', 'Cooldown (s)', 1.5],
  ];

  // ---- floors (TerrainDef): built floors the player lays, and natural ground (soil, sand...) for biomes ----
  const FLOOR_STATS = [
    ['Beauty', 'Beauty (negative = ugly)', 0],
    ['Cleanliness', 'Cleanliness (negative = dirty)', 0],
    ['WorkToBuild', 'Work to build', 100],
    ['Flammability', 'Flammability', 0],
  ];
  const FLOOR_PRESETS = {
    built: { label: 'Floor players build', edgeType: 'Hard', renderPrecedence: 100, pathCost: '', fertility: 0, affordances: [], needed: 'Light', stats: { Beauty: 0, WorkToBuild: 100 } },
    natural: { label: 'Natural ground (for biomes)', edgeType: 'FadeRough', renderPrecedence: 340, pathCost: 2, fertility: 0.5, affordances: ['Light', 'Medium', 'Heavy', 'Diggable'], needed: '', stats: { Beauty: 0 } },
  };
  function applyFloorPreset(it) {
    const p = FLOOR_PRESETS[it.preset] || FLOOR_PRESETS.built;
    it.edgeType = p.edgeType;
    it.renderPrecedence = p.renderPrecedence;
    it.pathCost = p.pathCost;
    it.fertility = p.fertility;
    it.affordances = [...p.affordances];
    it.affordanceNeeded = p.needed;
    it.stats = { ...p.stats };
  }

  // ---- plants (ThingDef): grass or flower, bush, tree ----
  const PLANT_STATS = [
    ['MaxHitPoints', 'Hit points', 100],
    ['Flammability', 'Flammability', 1],
    ['Nutrition', 'Nutrition when eaten by animals', 0.5],
    ['Beauty', 'Beauty', 0],
    ['BeautyOutdoors', 'Beauty outdoors', 0],
  ];
  const PLANT_PRESETS = {
    flower: { label: 'Grass or flower', parent: 'PlantBase', stats: { MaxHitPoints: 85, Flammability: 1.3, Nutrition: 0.5 }, fertilityMin: 0.05, fertilitySensitivity: 0.3, growDays: 2.5, visualSize: '0.4~0.6', harvestYield: '', harvestWork: 40 },
    bush: { label: 'Bush (can give food or material)', parent: 'BushBase', stats: { MaxHitPoints: 120, Nutrition: 0.5 }, fertilityMin: 0.5, fertilitySensitivity: 0.5, growDays: 6, visualSize: '0.95~1.7', harvestYield: 10, harvestWork: 250 },
    tree: { label: 'Tree', parent: 'TreeBase', stats: { MaxHitPoints: 200, Flammability: 0.8, Nutrition: 2, Beauty: 1, BeautyOutdoors: 1 }, fertilityMin: 0.7, fertilitySensitivity: 0.5, growDays: 20, visualSize: '1.5~2.0', harvestYield: 25, harvestWork: 800 },
  };
  function applyPlantPreset(it) {
    const p = PLANT_PRESETS[it.preset] || PLANT_PRESETS.flower;
    it.stats = { ...p.stats };
    for (const k of ['fertilityMin', 'fertilitySensitivity', 'growDays', 'visualSize', 'harvestYield', 'harvestWork']) it[k] = p[k];
    if (it.preset === 'tree' && !it.harvestedThing) it.harvestedThing = 'WoodLog';
  }

  // ---- animals: one file with the race (ThingDef) and its PawnKindDef. Presets copy typical vanilla values (cat, cow, timber wolf, chicken). ----
  const ANIMAL_STATS = [
    ['MoveSpeed', 'Move speed (cells per second)', 4],
    ['MarketValue', 'Market value', 100],
    ['ComfyTemperatureMin', 'Coldest comfortable temperature', -10],
    ['ComfyTemperatureMax', 'Hottest comfortable temperature (empty = default)', ''],
    ['FilthRate', 'Filth it leaves (0 = none)', 0],
    ['Wildness', 'Wildness (0 = tames easily, 1 = almost impossible)', 0.5],
    ['LeatherAmount', 'Leather it gives (empty = default 40)', ''],
    ['CaravanRidingSpeedFactor', 'Caravan riding speed (empty = cannot be ridden; horse 1.6)', ''],
  ];
  const CONDITION_EFFECTS = {
    Eclipse: { label: 'Eclipse (no sunlight)', cls: 'GameCondition_NoSunlight', worker: 'IncidentWorker_MakeGameCondition', target: 'World', permanent: true },
    SolarFlare: { label: 'Solar flare (electricity stops)', cls: 'GameCondition_DisableElectricity', worker: 'IncidentWorker_MakeGameCondition', target: 'World', permanent: true },
    Aurora: { label: 'Aurora (mood boost outside)', cls: 'GameCondition_Aurora', worker: 'IncidentWorker_Aurora', target: 'World', permanent: true },
    ToxicFallout: { label: 'Toxic fallout', cls: 'GameCondition_ToxicFallout', worker: 'IncidentWorker_MakeGameCondition', target: 'Map_PlayerHome', permanent: true },
    VolcanicWinter: { label: 'Volcanic winter (cold, dark)', cls: 'GameCondition_VolcanicWinter', worker: 'IncidentWorker_MakeGameCondition', target: 'Map_PlayerHome', permanent: true },
    HeatWave: { label: 'Heat wave', cls: 'GameCondition_HeatWave', worker: 'IncidentWorker_HeatWave', target: 'Map_PlayerHome', underground: false },
    ColdSnap: { label: 'Cold snap', cls: 'GameCondition_ColdSnap', worker: 'IncidentWorker_ColdSnap', target: 'Map_PlayerHome', underground: false },
  };
  const MECH_STATS = [
    ['MoveSpeed', 'Move speed (cells per second)', 3.4],
    ['ArmorRating_Blunt', 'Armour: blunt (0.2 = 20%)', 0.1],
    ['ArmorRating_Sharp', 'Armour: sharp', 0.2],
    ['ArmorRating_Heat', 'Armour: heat (vanilla 2)', 2],
    ['BandwidthCost', 'Bandwidth it uses on the mechanitor', 1],
    ['ControlTakingTime', 'Time to take control (seconds)', 12],
    ['MechEnergyLossPerHP', 'Energy lost per point of damage (higher = more tiring)', 0.66],
    ['WorkSpeedGlobal', 'Work speed (vanilla mechs 0.5)', 0.5],
    ['MarketValue', 'Market value', 800],
  ];
  const MECH_PRESETS = {
    light: { label: 'Light mechanoid (like a militor)', body: 'Mech_Light', weightClass: 'Light', baseBodySize: 0.7, healthScale: 1, drawSize: 1.25, soundsLike: 'Militor', combatPower: 45, isFighter: true, weaponTags: ['MechanoidGunShortRange'], workTypes: [], butcher: [{ name: 'Steel', value: 10 }], stats: { MoveSpeed: 3.8, ArmorRating_Blunt: 0.1, ArmorRating_Sharp: 0.2, BandwidthCost: 1, ControlTakingTime: 12, MechEnergyLossPerHP: 0.66, MarketValue: 800 }, tools: [{ label: 'head', capacity: 'Blunt', power: 6, cooldown: 2.6, group: 'HeadAttackTool' }], gest: [{ name: 'Steel', value: 50 }, { name: 'SubcoreBasic', value: 1 }], gestWork: 1800, gestDays: 2, gestCycles: 1, gestResearch: 'BasicMechtech' },
    medium: { label: 'Medium mechanoid (like a lancer)', body: 'Lancer', weightClass: 'Medium', baseBodySize: 1, healthScale: 1, drawSize: 1.5, soundsLike: 'Legionary', combatPower: 100, isFighter: true, weaponTags: ['MechanoidGunLongRange'], workTypes: [], butcher: [{ name: 'Steel', value: 15 }], stats: { MoveSpeed: 4.7, ArmorRating_Blunt: 0.2, ArmorRating_Sharp: 0.4, BandwidthCost: 2, ControlTakingTime: 18, MechEnergyLossPerHP: 0.33, MarketValue: 1200 }, tools: [{ label: 'left fist', capacity: 'Blunt', power: 12, cooldown: 2, group: 'LeftHand' }, { label: 'right fist', capacity: 'Blunt', power: 12, cooldown: 2, group: 'RightHand' }, { label: 'head', capacity: 'Blunt', power: 8.5, cooldown: 2, group: 'HeadAttackTool' }], gest: [{ name: 'Steel', value: 75 }, { name: 'Plasteel', value: 75 }, { name: 'ComponentIndustrial', value: 4 }, { name: 'SubcoreRegular', value: 1 }], gestWork: 1800, gestDays: 2, gestCycles: 2, gestResearch: 'StandardMechtech' },
    heavy: { label: 'Heavy mechanoid (like a centipede)', body: 'MechanicalCentipede', weightClass: 'Heavy', baseBodySize: 3, healthScale: 4.32, drawSize: 3, soundsLike: 'Centipede', combatPower: 400, isFighter: true, weaponTags: ['MechanoidGunHeavy'], workTypes: [], butcher: [{ name: 'Steel', value: 30 }, { name: 'Plasteel', value: 10 }], stats: { MoveSpeed: 1.9, ArmorRating_Blunt: 0.22, ArmorRating_Sharp: 0.72, BandwidthCost: 4, ControlTakingTime: 24, MechEnergyLossPerHP: 0.2, MarketValue: 2000 }, tools: [{ label: 'head', capacity: 'Blunt', power: 17, cooldown: 2.6, group: 'HeadAttackTool' }], gest: [{ name: 'Steel', value: 100 }, { name: 'Plasteel', value: 100 }, { name: 'ComponentSpacer', value: 3 }, { name: 'SubcoreHigh', value: 1 }], gestWork: 1800, gestDays: 2, gestCycles: 4, gestResearch: 'HighMechtech' },
  };
  function applyMechPreset(it) {
    const p = MECH_PRESETS[it.preset] || MECH_PRESETS.light;
    for (const k of ['body', 'weightClass', 'baseBodySize', 'healthScale', 'drawSize', 'soundsLike', 'combatPower', 'isFighter', 'gestWork', 'gestDays', 'gestCycles', 'gestResearch']) it[k] = p[k];
    for (const k of ['weaponTags', 'workTypes', 'butcher', 'tools']) it[k] = JSON.parse(JSON.stringify(p[k]));
    it.gest = JSON.parse(JSON.stringify(p.gest));
    it.stats = { ...p.stats };
  }
  const ANIMAL_PRESETS = {
    pet: { label: 'Small pet (like a cat)', body: 'QuadrupedAnimalWithPawsAndTail', baseBodySize: 0.32, healthScale: 0.42, hungerRate: 0.15, foodType: 'CarnivoreAnimal, OvivoreAnimal', predator: true, maxPreyBodySize: 0.25, herdAnimal: false, packAnimal: false, trainability: 'None', petness: 1, nuzzleMtb: 12, lifeExpectancy: 10, gestationDays: 10, litterMax: 3, juvenileAge: 0.15, adultAge: 0.4, leather: 'Leather_Light', meatLabel: '', soundsLike: 'Cat', tradeTags: ['AnimalCommon', 'AnimalPet'], combatPower: 35, ecoWeight: 0.3, wildGroup: '', produce: '', stats: { MoveSpeed: 4.4, MarketValue: 100, ComfyTemperatureMin: -25, Wildness: 0 }, tools: [{ label: 'left claw', capacity: 'Scratch', power: 6, cooldown: 1.5, group: 'FrontLeftPaw' }, { label: 'right claw', capacity: 'Scratch', power: 6, cooldown: 1.5, group: 'FrontRightPaw' }, { label: 'teeth', capacity: 'Bite', power: 5, cooldown: 2, group: 'Teeth' }] },
    farm: { label: 'Farm herd animal (like a cow)', body: 'QuadrupedAnimalWithHooves', baseBodySize: 2.4, healthScale: 1.5, hungerRate: 0.535, foodType: 'VegetarianRoughAnimal', predator: false, maxPreyBodySize: 0, herdAnimal: true, packAnimal: false, trainability: 'None', petness: 0, nuzzleMtb: '', lifeExpectancy: 22, gestationDays: 6.66, litterMax: 1, juvenileAge: 0.2, adultAge: 0.3333, leather: 'Leather_Plain', meatLabel: '', soundsLike: 'Cow', tradeTags: ['AnimalCommon', 'AnimalFarm'], combatPower: 75, ecoWeight: 1.1, wildGroup: '3~7', produce: 'milk', produceThing: 'Milk', produceAmount: 14, produceDays: 1, stats: { MoveSpeed: 3.2, MarketValue: 300, ComfyTemperatureMin: -10, FilthRate: 16, Wildness: 0 }, tools: [{ label: 'head', capacity: 'Blunt', power: 8.8, cooldown: 2.6, group: 'HeadAttackTool' }, { label: 'teeth', capacity: 'Bite', power: 8.8, cooldown: 2.6, group: 'Teeth' }] },
    predator: { label: 'Wild predator (like a timber wolf)', body: 'QuadrupedAnimalWithPawsAndTail', baseBodySize: 0.85, healthScale: 1.1, hungerRate: 0.3, foodType: 'CarnivoreAnimal', predator: true, maxPreyBodySize: 0.7, herdAnimal: false, packAnimal: false, trainability: 'Intermediate', petness: 0.1, nuzzleMtb: '', lifeExpectancy: 14, gestationDays: 15, litterMax: 4, juvenileAge: 0.15, adultAge: 0.4, leather: 'Leather_Plain', meatLabel: '', soundsLike: 'Wolf_Timber', tradeTags: ['AnimalUncommon', 'AnimalFighter'], combatPower: 90, ecoWeight: 0.6, wildGroup: '2~4', produce: '', stats: { MoveSpeed: 5.5, MarketValue: 250, ComfyTemperatureMin: -35, Wildness: 0.85 }, tools: [{ label: 'left claw', capacity: 'Scratch', power: 10.9, cooldown: 2, group: 'FrontLeftPaw' }, { label: 'right claw', capacity: 'Scratch', power: 10.9, cooldown: 2, group: 'FrontRightPaw' }, { label: 'teeth', capacity: 'Bite', power: 14, cooldown: 2, group: 'Teeth' }] },
    bird: { label: 'Bird (like a chicken)', body: 'Bird', baseBodySize: 0.3, healthScale: 0.35, hungerRate: 0.14, foodType: 'OmnivoreRoughAnimal', predator: false, maxPreyBodySize: 0, herdAnimal: false, packAnimal: false, trainability: 'None', petness: 0, nuzzleMtb: '', lifeExpectancy: 8, gestationDays: 4, litterMax: 2, juvenileAge: 0.1, adultAge: 0.2, leather: 'Leather_Bird', meatLabel: '', soundsLike: 'Chicken', tradeTags: ['AnimalCommon', 'AnimalFarm'], combatPower: 20, ecoWeight: 0.3, wildGroup: '', produce: '', stats: { MoveSpeed: 2.9, MarketValue: 50, ComfyTemperatureMin: 0, Wildness: 0 }, tools: [{ label: 'beak', capacity: 'Bite', power: 3, cooldown: 2, group: 'Beak' }, { label: 'feet', capacity: 'Scratch', power: 2, cooldown: 1.8, group: 'Feet' }] },
  };
  function applyAnimalPreset(it) {
    const p = ANIMAL_PRESETS[it.preset] || ANIMAL_PRESETS.pet;
    for (const k of ['body', 'baseBodySize', 'healthScale', 'hungerRate', 'foodType', 'predator', 'maxPreyBodySize', 'herdAnimal', 'packAnimal', 'trainability', 'petness', 'nuzzleMtb', 'lifeExpectancy', 'gestationDays', 'litterMax', 'juvenileAge', 'adultAge', 'leather', 'meatLabel', 'soundsLike', 'combatPower', 'ecoWeight', 'wildGroup', 'produce']) it[k] = p[k];
    it.produceThing = p.produce === 'milk' ? p.produceThing : p.produce === 'wool' ? 'WoolSheep' : '';
    it.produceAmount = p.produceAmount || 14;
    it.produceDays = p.produceDays || 1;
    it.tradeTags = p.tradeTags.slice();
    it.stats = { ...p.stats };
    it.tools = p.tools.map((t) => ({ ...t }));
  }

  // ---- genes (GeneDef): effects, and an optional picture attached to the body (tail, wings...) drawn in front of / behind it per direction ----
  const GENE_DIRS = ['South', 'East', 'North'];
  // Where a picture sits on the pawn. [x, z, layer] per facing (z up). Tail numbers are from vanilla furry tail; the others are my estimates (vanilla has no wing or arm genes) and may need a nudge for your picture size.
  const SHAPES = {
    tail: { label: 'Tail', S: [-0.1, -0.25, -2], E: [-0.5, -0.15, -2], N: [0.1, -0.25, 90], size: 1, color: 'Hair', tags: ['Tail'] },
    wings: { label: 'Wings (behind the body, in front when facing north)', S: [0, 0.05, -3], E: [-0.1, 0.05, -3], N: [0, 0.05, 90], size: 1.6, color: 'Ignored', tags: ['Wings'] },
    back: { label: 'Back item (shell, spines, growth)', S: [0, 0, -1], E: [-0.2, 0, -1], N: [0, 0.05, 90], size: 1, color: 'Ignored', tags: [] },
    arm: { label: 'Extra arm / visible limb (in front of the body)', S: [0.3, -0.05, 40], E: [0.05, -0.05, 40], N: [0.3, -0.05, 40], size: 1, color: 'Skin', tags: [] },
    chest: { label: 'Chest / belly overlay (markings, under clothes)', S: [0, 0, 5], E: [0, 0, 5], N: [0, 0, 5], size: 1, color: 'Skin', tags: [] },
    head: { label: 'On the head (ears, horns, antennae)', S: [0, 0, 70], E: [0, 0, 70], N: [0, 0, 70], size: 1, color: 'Skin', tags: [], head: true },
    custom: { label: 'Custom (keep my numbers)' },
  };
  const SHAPE_OPTS = () => Object.entries(SHAPES).map(([v, o]) => [v, o.label]);
  function applyShape(it, withTags) {
    const sh = SHAPES[it.shape];
    if (!sh || !sh.S) return;
    [['South', 'S'], ['East', 'E'], ['North', 'N']].forEach(([D, k]) => {
      it['offset' + D + 'X'] = sh[k][0];
      it['offset' + D + 'Z'] = sh[k][1];
      it['layer' + D] = sh[k][2];
    });
    it.meshSize = sh.size;
    it.colorType = sh.color;
    if (withTags) it.exclusionTags = sh.tags.slice();
  }
  function applyGenePreset(it) {
    it.hasBody = it.preset === 'attachment';
    it.exclusionTags = it.hasBody ? (SHAPES[it.shape] && SHAPES[it.shape].tags ? SHAPES[it.shape].tags.slice() : ['Tail']) : it.preset === 'hairColor' ? ['HairColor'] : it.preset === 'skinColor' ? ['SkinColorOverride'] : [];
    it.displayCategory = it.preset === 'hairColor' ? 'Cosmetic_Hair' : it.preset === 'skinColor' ? 'Cosmetic_Skin' : 'Miscellaneous';
  }

  let counter = 0;
  const uid = () => 'i' + Date.now().toString(36) + (counter++).toString(36);

  // Defaults for each item type. The UI form is built from FIELDS below; the generator reads these shapes.
  function newItem(type) {
    const base = { id: uid(), type, defName: '', label: '', description: '', sprites: {} };
    if (type === 'apparel')
      return {
        ...base,
        wornAs: 'torso-shell',
        techLevel: 'Industrial',
        tags: ['IndustrialBasic'],
        stats: {
          WorkToMake: 1200,
          Mass: 1,
          MaxHitPoints: 100,
          MarketValue: 100,
          EquipDelay: 2,
          StuffEffectMultiplierArmor: 0.3,
          StuffEffectMultiplierInsulation_Cold: 0.6,
          StuffEffectMultiplierInsulation_Heat: 0.85,
          ArmorRating_Sharp: 0,
          ArmorRating_Blunt: 0,
          Insulation_Cold: 0,
          Insulation_Heat: 0,
        },
        customStats: [],
        equipOffsets: [],
        craftable: true,
        workbenches: ['ElectricTailoringBench'],
        researchCustom: '',
        research: '',
        craftSkill: 4,
        shellBehindHead: false,
        useStuff: true,
        stuffCategories: ['Fabric'],
        stuffCount: 40,
        cost: [],
        bodyTypes: [...CATALOG.bodyTypes],
        craftStyle: 'tailoring',
      };
    if (type === 'weapon')
      return {
        ...base,
        mode: 'ranged',
        techLevel: 'Industrial',
        tags: ['Gun'],
        stats: {
          WorkToMake: 4000,
          Mass: 3,
          MarketValue: 200,
          AccuracyTouch: 0.7,
          AccuracyShort: 0.7,
          AccuracyMedium: 0.6,
          AccuracyLong: 0.5,
          RangedWeapon_Cooldown: 1.5,
        },
        customStats: [],
        equipOffsets: [],
        craftable: true,
        workbenches: ['TableMachining'],
        research: 'Gunsmithing',
        researchCustom: '',
        craftSkill: 4,
        craftStyle: 'gun',
        useStuff: false,
        stuffCategories: ['Metallic'],
        stuffCount: 40,
        cost: [
          { name: 'Steel', value: 40 },
          { name: 'ComponentIndustrial', value: 2 },
        ],
        drawSize: 1,
        projectile: 'Bullet_Revolver',
        projectileCustom: '',
        sound: 'Shot_Revolver',
        soundCustom: '',
        range: 25.9,
        warmup: 1,
        burst: 1,
        burstTicks: 5,
        tools: [
          { label: 'handle', capacity: 'Blunt', power: 8, cooldown: 2 },
          { label: 'blade', capacity: 'Cut', power: 12, cooldown: 2 },
        ],
        angleOffset: -65,
      };
    if (type === 'biome')
      return {
        ...base,
        workerClass: '',
        movementDifficulty: 1,
        settlementWeight: 1,
        animalDensity: 3,
        plantDensity: 0.5,
        wildPlantRegrowDays: 20,
        diseaseMtbDays: 50,
        forageability: 0,
        foragedFood: '',
        allowFarmingCamps: true,
        wildPlants: [],
        wildAnimals: [],
        packAnimals: [],
        terrains: [
          { terrain: 'Soil', min: -999, max: 0.87 },
          { terrain: 'SoilRich', min: 0.87, max: 999 },
        ],
        patches: [],
        weather: [{ name: 'Clear', value: 18 }],
        diseases: [],
        ambient: [],
      };
    if (type === 'xmlfile') return { ...base, preset: 'edit', eStats: {}, eCost: {}, eBenchAdd: [], eBenchRemove: [], eLabel: '', eDesc: '', eResearch: '', patchOp: 'replace', patchDefType: 'ThingDef', patchDefName: '', patchPath: '', patchValue: '', patchMod: '', xmlText: '' };
    if (type === 'xenotype') return { ...base, genes: [], inheritable: true, displayPriority: '', weight: 0 };
    if (type === 'implant') {
      return {
        ...base, preset: 'replace', races: ['Human'], bodyParts: ['Shoulder'], partEfficiency: 1.25, betterThanNatural: true, capMods: [], capFactors: [], statOffsets: [], statFactors: [], painFactor: '', hungerFactor: '',
        abilities: [], drawOnPawn: false, shape: 'arm', colorType: 'Skin', meshSize: 1,
        offsetSouthX: 0.3, offsetSouthZ: -0.05, layerSouth: 40, offsetEastX: 0.05, offsetEastZ: -0.05, layerEast: 40, offsetNorthX: 0.3, offsetNorthZ: -0.05, layerNorth: 40,
        cost: [{ name: 'Plasteel', value: 15 }, { name: 'ComponentSpacer', value: 4 }], craftable: true, craftStyle: 'bionics', workbenches: ['FabricationBench'], research: 'Bionics', researchCustom: '', craftSkill: 8,
        medicineSkill: 5, surgeryWork: 2500, stats: { Mass: 1, WorkToMake: 26000 },
      };
    }
    if (type === 'recipe')
      return { ...base, preset: 'make', workAmount: 400, workSpeedStat: 'GeneralLaborSpeed', workSkill: 'Crafting', minSkill: 0, effect: 'Smith', sound: 'Recipe_Machining', benches: ['CraftingSpot'], research: '', researchCustom: '', ingredients: [], ingredientCats: [], products: [], bulk: false, attachRecipe: '', attachBenches: [] };
    if (type === 'research')
      return { ...base, baseCost: 500, techLevel: 'Industrial', prerequisites: [], requiredBench: '', requiredFacilities: [], ownTab: true, tabLabel: '', tab: '', viewX: '', viewY: '' };
    if (type === 'hediff') {
      return { ...base, isBad: true, durationHours: 24, painFactor: '', hungerFactor: '', capMods: [], capFactors: [], statOffsets: [], statFactors: [] };
    }
    if (type === 'ability') {
      return { ...base, targeting: 'pawn', range: 12.9, warmup: 1, cooldown: 60, hostile: true, casterViolence: false, hemogenCost: '', needCapacity: '', effHediffs: [], hediffSelf: false, effProjectile: '', effSpawn: '', effMental: '', mentalGoodwill: '', effTeleport: '', teleRange: 25, teleStun: 1, minRange: '' };
    }
    if (type === 'gene') {
      const it = {
        ...base,
        preset: 'attachment',
        shape: 'tail',
        displayCategory: 'Miscellaneous',
        biostatCpx: 1,
        biostatMet: 0,
        biostatArc: 0,
        exclusionTags: ['Tail'],
        statOffsets: [],
        statFactors: [],
        capMods: [],
        forcedTraits: [],
        colorValue: '',
        abilities: [],
        colorType: 'Hair',
        meshSize: 1,
        offsetSouthX: -0.1, offsetSouthZ: -0.25, layerSouth: -2,
        offsetEastX: -0.5, offsetEastZ: -0.15, layerEast: -2,
        offsetNorthX: 0.1, offsetNorthZ: -0.25, layerNorth: 90,
      };
      return it;
    }
    if (type === 'incident')
      return { ...base, kind: 'condition', effect: 'Eclipse', category: 'Misc', baseChance: 1, minRefireDays: 15, earliestDay: '', durationDays: '0.75~1.25', letterLabel: '', letterText: '', letterDef: 'NegativeEvent', allowedBiomes: [], disallowedBiomes: [], hediff: '', victimFraction: '0.2~0.5', diseaseTarget: 'human', diseaseParts: [], maxVictims: '' };
    if (type === 'trait')
      return { ...base, commonality: 1, commonalityFemale: '', exclusionTags: [], conflictingTraits: [], statOffsets: [], statFactors: [], skillGains: [], disabledWorkTags: [], socialFightFactor: '', moodEffect: '', moodDescription: '' };
    if (type === 'thought')
      return { ...base, kind: 'memory', moodEffect: 5, durationDays: 1, stackLimit: 1, hediff: '', requiredTraits: [], nullifyingTraits: [], requiredGenes: [] };
    if (type === 'mech') {
      const it = { ...base, preset: 'light', customStats: [], gestate: true, gestResearchCustom: '' };
      applyMechPreset(it);
      return it;
    }
    if (type === 'animal') {
      const it = { ...base, preset: 'pet', customStats: [], drawSize: 1, color: '', maleLabel: '', femaleLabel: '', babyLabel: '', juvenileLabel: '', eggHatchDays: 3.5, eggFertilizedMax: 1 };
      applyAnimalPreset(it);
      return it;
    }
    if (type === 'plant') {
      const it = { ...base, preset: 'bush', customStats: [], harvestedThing: '', sowable: false, sowWork: 170, growMinTemp: '', growMaxTemp: '', clusterRadius: '', clusterWeight: '' };
      applyPlantPreset(it);
      return it;
    }
    if (type === 'floor') {
      const it = { ...base, preset: 'built', customStats: [], cost: [], research: '', researchCustom: '', color: '', designation: 'Floors', stats: {} };
      applyFloorPreset(it);
      return it;
    }
    if (type === 'item') {
      const it = {
        ...base,
        preset: 'resource',
        stats: {},
        customStats: [],
        stackLimit: 75,
        thingCategories: ['ResourcesRaw'],
        soundDrop: 'Metal_Drop',
        tradeability: 'All',
        isStuff: false,
        stuffCategories: ['Metallic'],
        stuffAppearance: 'Metal',
        stuffColor: '#808080',
        stuffCommonality: 1,
        stuffPower: {},
        stuffFactors: {},
        deposit: false,
        depositCommonality: 1,
        depositCount: 30,
        depositLump: '20~30',
        smeltable: false,
        smeltProducts: [],
        cutProducts: [],
        craftable: false,
        craftStyle: 'workshop',
        workbenches: [],
        research: '',
        researchCustom: '',
        craftSkill: 0,
        cost: [],
        productCount: 1,
      };
      applyItemPreset(it);
      return it;
    }
    if (type === 'building') {
      const it = {
        ...base,
        preset: 'decoration',
        stats: { WorkToBuild: 600, MaxHitPoints: 100, Flammability: 1, Mass: 10 },
        customStats: [],
        equipOffsets: [],
        designation: 'Furniture',
        research: '',
        researchCustom: '',
        useStuff: true,
        stuffCategories: ['Metallic', 'Woody', 'Stony'],
        excludeStuff: [],
        stuffCount: 40,
        cost: [],
        linkStyle: 'CornerFiller',
        wallLooks: false,
        craftCategory: 'BuildingsArt',
        natural: false,
        rockKind: 'stone',
        color: '',
        mineableThing: '',
        dropChance: 0.25,
        mineableYield: 40,
        veinCommonality: 1,
        veinSize: '30~40',
        facilityOffsets: [],
        facilityTargets: [],
        facilityMax: 1,
        facilityAdjacent: false,
        facilityRange: '',
        drawW: '',
        drawH: '',
      };
      applyBuildPreset(it);
      return it;
    }
    if (type === 'projectile')
      return {
        ...base,
        damageDef: 'Bullet',
        damageCustom: '',
        damage: 12,
        speed: 55,
        stoppingPower: '',
        armorPen: '',
        explodes: false,
        radius: 1.5,
        glow: false,
        arc: false,
        drawW: '',
        drawH: '',
        preThing: '',
        preThingCustom: '',
        preChance: 1,
        postThing: '',
        postThingCustom: '',
        postCount: 1,
        postChance: 1,
        gas: '',
        explodeSound: '',
        explodeSoundCustom: '',
        colorCenter: '',
        colorEdge: '',
        hediff: '',
        hediffCustom: '',
        hediffAmount: 0.01,
        baseDamage: '',
        baseDamageCustom: '',
      };
    if (type === 'hair') return { ...base, styleGender: 'Any', styleTags: [] };
    if (type === 'beard') return { ...base, styleGender: 'Male', styleTags: [] };
    if (type === 'head') return { ...base, gender: 'Male', narrow: false, eyeOffsetX: 0.16 };
    if (type === 'body') return { ...base, headOffset: [0, 0.34] };
    throw new Error('unknown item type ' + type);
  }

  // Form description, read by the UI. t = text | num | bool | select | combo | multi | pairs | tools | sprite | area
  const defOf = (it) => (CATALOG.defData || {})[it.patchDefName] || null;
  const retexKind = (it) => {
    const d = defOf(it);
    if (!d || !d.tx) return '';
    const g = d.gc || 'Single';
    return /^Multi/.test(g) ? 'multi' : /^(Single|StackCount)/.test(g) ? 'single' : '';
  };
  const wornKind = (it) => !!(defOf(it) && defOf(it).wp);
  const FIELDS = {
    extra: [
      {
        k: 'extraXml',
        t: 'xml',
        label: 'Add your own XML (optional)',
        help: "For people who know what they are doing, or XML written by an AI. It is pasted inside this item's definition (for example extra <comps>, <tools> or <modExtensions>). The builder checks that it is well formed.",
      },
    ],
    common: [
      { k: 'label', t: 'text', label: 'Name shown in game' },
      { k: 'defName', t: 'text', label: 'defName', help: 'Unique ID, letters/digits/underscore only. Filled in from the name if empty.' },
      { k: 'description', t: 'area', label: 'Description' },
    ],
    apparel: [
      { k: 'wornAs', t: 'select', label: 'Worn as', opts: () => Object.entries(CATALOG.wornAs).map(([v, o]) => [v, o.label]) },
      {
        k: 'covers',
        t: 'multi',
        label: 'Covers these body parts',
        lk: 'bodyParts',
        opts: () => CATALOG.bodyParts,
        def: (it) => CATALOG.wornAs[it.wornAs].groups,
        custom: true,
        help: 'Pre-filled from "Worn as". Tick or add parts to change what this item protects and what it blocks other clothes from covering.',
      },
      { k: 'techLevel', t: 'select', label: 'Tech level', opts: () => CATALOG.techLevels.map((v) => [v, v]) },
      {
        k: 'tags',
        t: 'multi',
        label: 'Apparel tags',
        lk: 'apparelTags',
        opts: () => CATALOG.apparelTags,
        custom: true,
        help: 'Decide which NPC factions can wear it.',
      },
      { k: 'sprites.icon', t: 'sprite', label: 'Icon sprite (single image)', mode: 'single' },
      {
        k: 'sprites.worn',
        t: 'sprite',
        label: 'Worn sprite (south / east / north)',
        mode: 'facings',
        help: 'For body clothes the same set is copied for each body type below.',
      },
      {
        k: 'bodyTypes',
        t: 'multi',
        label: 'Body types with sprites',
        lk: 'bodyTypes',
        opts: () => CATALOG.bodyTypes,
        custom: true,
        show: (it) => CATALOG.wornAs[it.wornAs].bodyShaped,
      },
      { k: 'shellBehindHead', t: 'bool', label: 'Drawn behind the head (cape style)', show: (it) => it.wornAs === 'torso-shell' },
      { k: 'stats', t: 'stats', label: 'Item properties', list: APPAREL_STATS, extra: (it) => (it.useStuff ? APPAREL_STUFF : APPAREL_FIXED) },
      { k: 'sprites.wornBy', t: 'wornby', label: 'Sprites per body type', show: (it) => !!(it.sprites && it.sprites.wornBy) },
      {
        k: 'customStats',
        t: 'pairs',
        label: 'More item properties',
        lk: 'stats',
        kind: 'item',
        help: 'Properties of the item itself (armour, mass, ...). Click Add, pick from the list or type your own ID (for stats from other mods).',
      },
      {
        k: 'equipOffsets',
        t: 'pairs',
        label: 'Bonuses to the wearer',
        lk: 'stats',
        kind: 'wearer',
        help: 'Added to the person wearing it (negative numbers subtract). Example: Move speed 0.2. Pick from the list or type a modded stat ID.',
      },
    ],
    craftRecipe: [
      { k: 'craftable', t: 'bool', label: 'Can be crafted (adds a recipe)', show: (it) => it.type !== 'building' },
      {
        k: 'craftStyle',
        t: 'select',
        label: 'How it is made',
        opts: (it) =>
          Object.entries(CATALOG.craftStyles)
            .filter(([v]) => stylesFor(it).includes(v))
            .map(([v, c]) => [v, c.label]),
        show: (it) => it.craftable,
        help: 'Sets the unfinished item on the bench, the work sound and animation, and the usual workbench. A steel helmet is Machining, a shirt is Tailoring.',
      },
      {
        k: 'craftUnfinished',
        t: 'combo',
        lk: 'unfinished',
        label: 'Unfinished item on the bench (optional)',
        show: (it) => it.craftable,
        help: 'Leave on (style default) to use the one for the chosen style.',
      },
      {
        k: 'sprites.unfinished',
        t: 'sprite',
        label: 'Your own unfinished-item picture (optional)',
        mode: 'single',
        show: (it) => it.craftable,
        help: 'Shown while the item is being made on the bench. If set, the builder makes a new unfinished item for this recipe and uses it instead of the one above.',
      },
      { k: 'craftSound', t: 'sound', kind: 'work', lk: 'craftSounds', label: 'Work sound (optional)', show: (it) => it.craftable },
      { k: 'craftEffect', t: 'combo', lk: 'craftEffects', label: 'Work animation (optional)', show: (it) => it.craftable },
      {
        k: 'workbenches',
        t: 'multi',
        label: 'Made at workbench',
        lk: 'workbenches',
        opts: () => CATALOG.workbenches,
        custom: true,
        show: (it) => it.craftable,
        help: 'Tick vanilla benches, or type the exact defName of a modded bench.',
      },
      {
        k: 'research',
        t: 'combo',
        lk: 'research',
        label: 'Research needed',
        opts: () => CATALOG.research,
        show: (it) => it.craftable,
        custom: 'researchCustom',
      },
      { k: 'craftSkill', t: 'num', label: 'Crafting skill needed', show: (it) => it.craftable },
    ],
    materials: [
      {
        k: 'useStuff',
        hideRock: true,
        t: 'bool',
        label: 'Made from any material of a category (like cloth or metal)',
        show: (it) => it.type === 'building' || it.craftable,
      },
      {
        k: 'stuffCategories',
        hideRock: true,
        t: 'stufftree',
        label: 'Can be made from',
        lk: 'stuffCategories',
        show: (it) => (it.type === 'building' || it.craftable) && it.useStuff,
        help: 'Tick a category to allow all its materials, open it (▸) to untick single ones. Untick = off by default in the bill (players can turn it back on). "?" = name not checked in 1.7.',
      },
      { k: 'stuffCount', hideRock: true, t: 'num', label: 'Material amount', show: (it) => (it.type === 'building' || it.craftable) && it.useStuff },
      {
        k: 'cost',
        hideRock: true,
        t: 'pairs',
        label: 'Fixed ingredients',
        lk: 'materials',
        show: (it) => it.type === 'building' || it.craftable,
        help: 'Click Add and pick a resource, or type the ID of a modded one.',
      },
    ],
    weapon: [
      {
        k: 'mode',
        t: 'select',
        label: 'Weapon kind',
        opts: () => [
          ['ranged', 'Ranged (gun)'],
          ['melee', 'Melee'],
        ],
      },
      { k: 'techLevel', t: 'select', label: 'Tech level', opts: () => CATALOG.techLevels.map((v) => [v, v]) },
      { k: 'tags', t: 'multi', label: 'Weapon tags', lk: 'weaponTags', opts: () => CATALOG.weaponTags, custom: true },
      { k: 'sprites.main', t: 'sprite', label: 'Weapon sprite (single image)', mode: 'single' },
      { k: 'drawSize', t: 'num', label: 'Draw size (from the viewer)' },
      { k: 'stats', t: 'stats', label: 'Item properties', list: WEAPON_STATS, extra: (it) => (it.mode === 'ranged' ? RANGED_STATS : []) },
      {
        k: 'projectile',
        t: 'combo',
        lk: 'projectiles',
        label: 'Projectile',
        opts: () => CATALOG.projectiles,
        custom: 'projectileCustom',
        show: (it) => it.mode === 'ranged',
      },
      {
        k: 'sound',
        t: 'sound',
        kind: 'shot',
        lk: 'shotSounds',
        label: 'Shot sound',
        opts: () => CATALOG.shotSounds,
        custom: 'soundCustom',
        show: (it) => it.mode === 'ranged',
      },
      { k: 'range', t: 'num', label: 'Range (cells)', show: (it) => it.mode === 'ranged' },
      { k: 'warmup', t: 'num', label: 'Aim time (s)', show: (it) => it.mode === 'ranged' },
      { k: 'burst', t: 'num', label: 'Shots per burst', show: (it) => it.mode === 'ranged' },
      { k: 'burstTicks', t: 'num', label: 'Ticks between burst shots', show: (it) => it.mode === 'ranged' },
      { k: 'tools', t: 'tools', label: 'Melee attacks', show: (it) => it.mode === 'melee' },
      { k: 'meleeExtra', t: 'pairs', label: 'On every hit: extra damage (number = amount)', lk: 'extraDamages', show: (it) => it.mode === 'melee', help: 'Extra damage of another type on top of the hit, for example Flame 8 (can set the target on fire), EMP 9 (hurts machines), Stun 14. A damage type from another mod: Add, then type your ID.' },
      { k: 'meleeExtraChance', t: 'num', label: 'Chance of the extra damage per hit (%, empty = always)', show: (it) => it.mode === 'melee' && (it.meleeExtra || []).length > 0 },
      { k: 'meleeHediff', t: 'combo', lk: 'hediffs', label: 'On every hit: gives the target this condition', custom: true, show: (it) => it.mode === 'melee', help: 'Any condition (poison buildup, a slowing condition made in this mod, ...). It builds up with the damage dealt, like the vanilla toxic bite.' },
      { k: 'meleeHediffAmount', t: 'num', label: 'Condition strength per point of damage (vanilla toxic bite 0.015)', show: (it) => it.mode === 'melee' && !!it.meleeHediff },
      { k: 'angleOffset', t: 'num', label: 'Held angle offset', show: (it) => it.mode === 'melee' },
      { k: 'customStats', t: 'pairs', label: 'More item properties', lk: 'stats', kind: 'item' },
      { k: 'equipOffsets', t: 'pairs', label: 'Bonuses to the wearer while held', lk: 'stats', kind: 'wearer' },
    ],
    building: [
      {
        k: 'preset',
        t: 'select',
        label: 'Kind of building',
        opts: () => Object.entries(CATALOG.buildPresets).map(([v, o]) => [v, o.label]),
        help: 'Changing this refills size, walking behaviour and the usual stats with typical values.',
      },
      {
        k: 'linkStyle',
        t: 'select',
        label: 'How wall pieces connect',
        opts: () => [
          ['CornerFiller', 'Smooth corners (sheet 320 × 320, like the vanilla wall)'],
          ['Basic', 'Plain (sheet 256 × 256, like sandbags)'],
        ],
        show: (it) => it.preset === 'wall',
        help: 'A wall uses one sheet of 16 small pictures; the game picks the right piece depending on which neighbours it touches. Corner filler walls need the bigger 320 × 320 sheet (cells of 80 px, with an extra border that overlaps the neighbours). Plain walls use 4 × 4 cells of 64 px.',
      },
      {
        k: 'natural',
        t: 'bool',
        label: 'Natural rock (found in mountains and mined, not built)',
        show: (it) => it.preset === 'wall',
        help: 'Turns the wall into mountain rock: no cost or build menu, pawns mine it. The game decides where rocks appear on a map in its own program, so a modded rock is mined normally but only appears on maps through other mods or patches.',
      },
      {
        k: 'rockKind',
        t: 'select',
        label: 'Kind of rock',
        opts: () => [['stone', 'Stone (drops a chunk now and then)'], ['ore', 'Ore vein (drops a resource, appears in veins)']],
        show: (it) => it.preset === 'wall' && it.natural,
      },
      { k: 'color', t: 'text', label: 'Tint colour (optional, like #695f61)', show: (it) => it.preset === 'wall' && it.natural, help: 'Multiplies the picture colour, like the vanilla grey rocks. Leave empty for none.' },
      {
        k: 'mineableThing',
        t: 'combo',
        lk: 'materials',
        label: 'What mining it gives',
        custom: true,
        show: (it) => it.preset === 'wall' && it.natural,
        help: 'Stone: a chunk item (make one in the item builder, kind "Chunk"). Ore: a resource. Items made in this mod are in the list.',
      },
      { k: 'dropChance', t: 'num', label: 'Chance a mined cell gives a chunk (vanilla 0.25)', show: (it) => it.preset === 'wall' && it.natural && it.rockKind !== 'ore' },
      { k: 'mineableYield', t: 'num', label: 'How many one cell gives (vanilla steel 40)', show: (it) => it.preset === 'wall' && it.natural && it.rockKind === 'ore' },
      { k: 'veinCommonality', t: 'num', label: 'How common the veins are (vanilla 1)', show: (it) => it.preset === 'wall' && it.natural && it.rockKind === 'ore' },
      { k: 'veinSize', t: 'text', label: 'Vein size range (like 30~40)', show: (it) => it.preset === 'wall' && it.natural && it.rockKind === 'ore' },
      {
        k: 'wallLooks',
        hideRock: true,
        t: 'bool',
        label: 'Different sheet per material look (smooth / bricks / planks)',
        show: (it) => it.preset === 'wall',
        help: 'Vanilla walls look different depending on the material: stone is smooth/bricks, wood is planks. Tick to give one sheet for each; otherwise one sheet is used for every material.',
      },
      {
        k: 'sprites.atlas',
        t: 'sprite',
        label: 'Wall sheet (the smooth look when per-material sheets are on)',
        mode: 'single',
        show: (it) => it.preset === 'wall',
        help: WALL_HELP,
      },
      { k: 'sprites.atlasBricks', t: 'sprite', label: 'Sheet: bricks', mode: 'single', show: (it) => it.preset === 'wall' && it.wallLooks && !it.natural },
      { k: 'sprites.atlasPlanks', t: 'sprite', label: 'Sheet: planks', mode: 'single', show: (it) => it.preset === 'wall' && it.wallLooks && !it.natural },
      { k: 'sizeX', t: 'num', label: 'Width in cells', show: nw },
      { k: 'sizeZ', t: 'num', label: 'Height in cells', show: nw },
      { k: 'rotatable', t: 'bool', label: 'Can be rotated (has a picture for each direction)', show: nw },
      {
        k: 'sprites.single',
        t: 'sprite',
        label: 'Picture',
        mode: 'single',
        show: (it) => it.preset !== 'wall' && !it.rotatable,
        help: (it) => buildPicHint(it),
      },
      {
        k: 'sprites.main',
        t: 'sprite',
        label: 'Pictures (south / east / north)',
        mode: 'facings',
        show: (it) => it.preset !== 'wall' && !!it.rotatable,
        help: (it) => buildPicHint(it),
      },
      {
        k: 'drawW',
        t: 'num',
        label: 'Drawn width (empty = automatic)',
        show: nw,
        help: 'Vanilla tables use a picture 2 cells bigger than the footprint (a 2 × 2 table is drawn 4 × 4), benches 0.5 bigger, chairs the same size. Empty = that automatic value for the chosen kind.',
      },
      { k: 'drawH', t: 'num', label: 'Drawn height (empty = automatic)', show: nw },
      { k: 'passability', t: 'combo', lk: 'passability', label: 'Walking over it', show: nw },
      { k: 'pathCost', t: 'num', label: 'Walking cost (higher = pawns avoid it)', show: nw },
      { k: 'fillPercent', t: 'num', label: 'Cover value (0-1, how much it blocks shots)', show: nw },
      { k: 'surface', t: 'combo', lk: 'surfaceTypes', label: 'Surface (what can be put on top)', show: nw },
      {
        k: 'powerUse',
        t: 'num',
        label: 'Power use in watts (0 = no power)',
        show: (it) => it.preset === 'workbench' || it.preset === 'facility',
        help: 'Vanilla: electric tailor bench 120, machining table 350. With power it also gets an on/off switch and can break down.',
      },
      { k: 'unpoweredSpeed', t: 'num', label: 'Speed without power (0-1)', show: (it) => it.preset === 'workbench' && Number(it.powerUse) > 0 },
      {
        k: 'benchSpeed',
        t: 'num',
        label: 'Work speed factor (1 = normal)',
        show: (it) => it.preset === 'workbench',
        help: 'Vanilla: hand tailor bench 0.5. Empty = normal speed.',
      },
      { k: 'buildSkill', t: 'num', label: 'Construction skill needed', show: (it) => it.preset === 'workbench' },
      {
        k: 'facilityTargets',
        t: 'multi',
        label: 'Makes these buildings better',
        lk: 'workbenches',
        opts: () => CATALOG.workbenches,
        custom: true,
        show: (it) => it.preset === 'facility',
        help: 'Tick vanilla workbenches, or type the exact defName of a modded building. Buildings made in this mod are added automatically. For vanilla targets the builder writes a small patch file; this works for benches that already accept boosters like the tool cabinet.',
      },
      {
        k: 'facilityOffsets',
        t: 'pairs',
        label: 'What it adds to them',
        lk: 'stats',
        show: (it) => it.preset === 'facility',
        help: 'Pick a stat and the amount added, e.g. WorkTableWorkSpeedFactor 0.1 = +10% work speed. The vanilla tool cabinet gives +0.06.',
      },
      { k: 'facilityMax', t: 'num', label: 'How many of them count per bench', show: (it) => it.preset === 'facility' },
      { k: 'facilityAdjacent', t: 'bool', label: 'Must touch the bench', show: (it) => it.preset === 'facility' },
      { k: 'facilityRange', t: 'num', label: 'Reach in cells (empty = 8, the game default)', show: (it) => it.preset === 'facility' },
      { k: 'sittable', t: 'bool', label: 'Pawns can sit on it', show: nw },
      { k: 'craftCategory', t: 'select', label: 'Storage category once crafted', opts: () => [['BuildingsArt', 'Art (like sculptures)'], ['BuildingsFurniture', 'Furniture']], show: (it) => it.preset === 'crafted' },
      { k: 'designation', hideRock: true, t: 'combo', lk: 'buildCategories', label: 'Build menu tab', show: (it) => it.preset !== 'crafted' },
      { k: 'stats', t: 'stats', label: 'Item properties', list: BUILDING_STATS, extra: (it) => BUILDING_EXTRA[it.preset] || [] },
      { k: 'customStats', t: 'pairs', label: 'More item properties', lk: 'stats', kind: 'item' },
      { k: 'research', hideRock: true, t: 'combo', lk: 'research', label: 'Research needed to build', custom: 'researchCustom', show: (it) => it.preset !== 'crafted' },
    ],
    biome: [
      {
        k: 'sprites.single',
        t: 'sprite',
        label: 'World map picture',
        mode: 'single',
        help: 'The tile picture drawn for this biome on the world map. Vanilla biome pictures are 512 × 512. Kept exactly as you give it.',
      },
      {
        k: 'workerClass',
        t: 'combo',
        lk: 'biomeWorkers',
        label: 'Where it appears on the world map',
        help: 'The game decides this with a small program, which an XML mod cannot write. Pick none (the biome is defined but not placed by itself) or reuse a vanilla one (then it competes with that biome for the same climate).',
      },
      { k: 'movementDifficulty', t: 'num', label: 'Travel difficulty on the world map (1 = easy)' },
      { k: 'settlementWeight', t: 'num', label: 'How likely settlements start here (1 = normal)' },
      { k: 'animalDensity', t: 'num', label: 'Wild animal density (vanilla 0 - 7, temperate forest 3.7)' },
      { k: 'plantDensity', t: 'num', label: 'Wild plant density (vanilla 0 - 1.7, temperate forest 0.65)' },
      { k: 'wildPlantRegrowDays', t: 'num', label: 'Days for wild plants to regrow' },
      { k: 'forageability', t: 'num', label: 'Foraging (0 = nothing to forage, 1 = vanilla forest)' },
      { k: 'foragedFood', t: 'combo', lk: 'materials', label: 'What foraging gives', show: (it) => Number(it.forageability) > 0, custom: true },
      { k: 'allowFarmingCamps', t: 'bool', label: 'Farming camps can appear' },
      {
        k: 'wildPlants',
        t: 'wildlist',
        kind: 'plants',
        lk: 'plants',
        label: 'Wild plants',
        help: 'Pick plants and how common each is (vanilla grass 5, a tree 0.5). A "Rule" adds every plant whose stat (a stat in its definition, like Nutrition or Beauty) is at least / at most / exactly a number, when the export is made.',
      },
      {
        k: 'wildAnimals',
        t: 'wildlist',
        kind: 'animals',
        lk: 'animals',
        label: 'Wild animals',
        help: 'Pick animals and how common each is (hare 1, muffalo 0.5, bear 0.07). A "Rule" adds every animal whose stat matches when the export is made, for example every animal with a stat of at least 1. Specific animals and rules can be mixed. A specific entry always wins over a rule.',
      },
      { k: 'packAnimals', t: 'multi', lk: 'animals', label: 'Animals that can be pack animals here', custom: true },
      {
        k: 'terrains',
        t: 'bands',
        label: 'Ground by fertility',
        help: 'Which floor covers each fertility range (-999 to 999 means "no limit"). Vanilla temperate forest: soil up to 0.87, rich soil above.',
      },
      {
        k: 'patches',
        t: 'patches',
        label: 'Patches of other ground (ponds, rock, sand...)',
        help: 'Noise patches laid over the ground. "Frequency" is the size of the noise (smaller = bigger patches, vanilla 0.015). Each band is a floor that is used when the noise value is between min and max.',
      },
      { k: 'previewSeed', t: 'biomePreview', label: 'Preview map (approximate)' },
      { k: 'weather', t: 'pairs', lk: 'weathers', label: 'Weather and how common each is' },
      { k: 'diseaseMtbDays', t: 'num', label: 'Average days between diseases (lower = more often)' },
      { k: 'diseases', t: 'pairs', lk: 'diseaseIncidents', label: 'Diseases and how common each is' },
      { k: 'ambient', t: 'multi', lk: 'ambientSounds', label: 'Ambient sounds', custom: true },
    ],
    incident: [
      { k: 'kind', t: 'select', label: 'Kind of event', opts: () => [['condition', 'A weather / sky condition (eclipse, heat wave, cold snap...)'], ['disease', 'A disease outbreak using a condition (hediff)']], help: 'Events choose themselves at random, by their chance below. Raids, trader visits and animal arrivals use faction and trader definitions that this builder does not make; change those with the "Defs / Patches" editor.' },
      { k: 'effect', t: 'select', label: 'What happens (behaviour copied from)', show: (it) => it.kind === 'condition', opts: () => Object.entries(CONDITION_EFFECTS).map(([v, o]) => [v, o.label]), help: 'Your event is a new condition with your own name and text, behaving like this vanilla one.' },
      { k: 'hediff', t: 'combo', lk: 'hediffs', custom: true, label: 'The disease (condition) people catch', show: (it) => it.kind === 'disease', help: 'A condition made in this mod, or a vanilla disease such as Flu. Make sure it makes people ill and can be cured, or the outbreak will be permanent.' },
      { k: 'diseaseTarget', t: 'select', label: 'Who catches it', show: (it) => it.kind === 'disease', opts: () => [['human', 'Colonists'], ['animal', 'Tame animals']] },
      { k: 'victimFraction', t: 'text', label: 'Share of people hit (like 0.2~0.5)', show: (it) => it.kind === 'disease' },
      { k: 'maxVictims', t: 'num', label: 'Most people hit at once (empty = no limit)', show: (it) => it.kind === 'disease' },
      { k: 'diseaseParts', t: 'multi', lk: 'bodyParts', custom: true, label: 'Body parts it strikes (optional)', show: (it) => it.kind === 'disease' },
      { k: 'durationDays', t: 'text', label: 'Lasts (days, like 1.5~3.5)', show: (it) => it.kind === 'condition' },
      { k: 'baseChance', t: 'num', label: 'How likely (1 = like a heat wave, 0.1 = rare, 3 = often)' },
      { k: 'minRefireDays', t: 'num', label: 'Not again for at least (days)' },
      { k: 'earliestDay', t: 'num', label: 'Not before day (empty = from the start)' },
      { k: 'letterDef', t: 'combo', lk: 'letterDefs', label: 'Kind of letter', help: 'PositiveEvent (blue), NeutralEvent, NegativeEvent (red), ThreatSmall, ThreatBig.' },
      { k: 'letterLabel', t: 'text', label: 'Letter title (empty = the name)' },
      { k: 'letterText', t: 'area', label: 'Letter text (empty = the description)' },
      { k: 'allowedBiomes', t: 'multi', lk: 'biomeIds', custom: true, label: 'Only in these biomes (optional)', help: 'Empty = everywhere.' },
      { k: 'disallowedBiomes', t: 'multi', lk: 'biomeIds', custom: true, label: 'Never in these biomes (optional)' },
    ],
    trait: [
      { k: 'commonality', t: 'num', label: 'How often new colonists get it (1 = average; kind 2, psychopath 1, cannibal 0.6; 0 = never at random)' },
      { k: 'commonalityFemale', t: 'num', label: 'Same, for women only (empty = same as above)' },
      { k: 'conflictingTraits', t: 'multi', lk: 'traits', custom: true, label: 'Cannot be combined with these traits', help: 'Vanilla traits, traits of this mod, or another mod\'s trait (type its ID).' },
      { k: 'exclusionTags', t: 'multi', lk: 'traitTags', custom: true, label: 'Cannot be combined with traits sharing a tag', help: 'Give two of your traits the same tag and they will exclude each other.' },
      { k: 'statOffsets', t: 'pairs', label: 'Adds to stats', lk: 'stats', help: 'For example WorkSpeedGlobal 0.2 (vanilla hard worker). Stats from other mods: Add, then type your own ID.' },
      { k: 'statFactors', t: 'pairs', label: 'Multiplies stats', lk: 'stats', help: '0.5 = halved, 1.5 = +50%.' },
      { k: 'skillGains', t: 'pairs', label: 'Skill levels gained or lost', lk: 'skills', help: 'For example Shooting 4, or Social -3.' },
      { k: 'disabledWorkTags', t: 'multi', lk: 'workTags', custom: true, label: 'Work the pawn refuses to do', help: 'Violent = cannot fight, like a pacifist. Social, Intellectual, Caring, Cooking, Hauling...' },
      { k: 'socialFightFactor', t: 'num', label: 'Chance of social fights (empty = unchanged, 0 = never, 2 = twice as often)' },
      { k: 'moodEffect', t: 'num', label: 'Constant mood effect (+ happy, - unhappy; empty = none)', help: 'Makes a thought that is always active for pawns with this trait, with the name and text below.' },
      { k: 'moodDescription', t: 'text', label: 'Text of that mood thought (first person, like "I love this place.")', show: (it) => it.moodEffect !== '' && it.moodEffect != null },
    ],
    thought: [
      { k: 'kind', t: 'select', label: 'Kind of thought', opts: () => [['memory', 'Memory (a one-off event the pawn remembers for some days)'], ['condition', 'While the pawn has a condition (hediff)'], ['always', 'Always, for pawns with a trait or gene']], help: 'Memories are given by something that happens, like eating a food (use it as "Mood memory after eating" on a food item). Condition thoughts follow a condition of this mod or vanilla. "Always" needs a required trait or gene below.' },
      { k: 'moodEffect', t: 'num', label: 'Mood effect (+ happy, - unhappy; lavish meal +12, raw food -7)' },
      { k: 'durationDays', t: 'num', label: 'Remembered for (days)', show: (it) => it.kind === 'memory' },
      { k: 'stackLimit', t: 'num', label: 'How many can pile up at once', show: (it) => it.kind === 'memory' },
      { k: 'hediff', t: 'combo', lk: 'hediffs', custom: true, label: 'While the pawn has this condition', show: (it) => it.kind === 'condition', help: 'A condition made in this mod, or any vanilla / modded one by ID. If the condition has several stages, only the first is covered here.' },
      { k: 'requiredTraits', t: 'multi', lk: 'traits', custom: true, label: 'Only for pawns with one of these traits (optional)' },
      { k: 'nullifyingTraits', t: 'multi', lk: 'traits', custom: true, label: 'Never for pawns with these traits (optional)' },
      { k: 'requiredGenes', t: 'multi', lk: 'genes', custom: true, label: 'Only for pawns with one of these genes (optional, Biotech)' },
    ],
    mech: [
      { k: 'preset', t: 'select', label: 'Kind of mechanoid', opts: () => Object.entries(MECH_PRESETS).map(([v, o]) => [v, o.label]), help: 'Changing this refills the usual numbers, attacks, gestation cost and research from a vanilla mech. Needs the Biotech expansion.' },
      { k: 'sprites.main', t: 'sprite', label: 'Body picture (south / east / north)', mode: 'facings', help: 'One picture per direction; west is the east one flipped by the game. Vanilla light mechs are drawn about 1.1 to 1.25 cells wide.' },
      { k: 'drawSize', t: 'num', label: 'Picture size (militor 1.25, lancer 1.5, centipede 3)' },
      { k: 'soundsLike', t: 'combo', lk: 'mechSounds', label: 'Sounds copied from', help: 'Hurt, death and call sounds of this vanilla mech. Empty = silent.' },
      { k: 'body', t: 'combo', lk: 'mechBodies', label: 'Body shape (its body parts)', custom: true, help: 'Mech_Light: head only. Lancer: two hands and a head. MechanicalCentipede, Scyther, Pikeman... Another mod\'s body: type its ID.' },
      { k: 'weightClass', t: 'combo', lk: 'mechWeights', label: 'Weight class', help: 'Light, Medium, Heavy or UltraHeavy. Decides which gestator can make it (light = mech gestator, others = large mech gestator).' },
      { k: 'baseBodySize', t: 'num', label: 'Body size (militor 0.7, lancer 1, centipede 3)' },
      { k: 'healthScale', t: 'num', label: 'Health scale (militor 1, centipede 4.32)' },
      { k: 'isFighter', t: 'bool', label: 'Fights in combat', help: 'Untick for workers (lifter, constructoid): they run away instead.' },
      { k: 'combatPower', t: 'num', label: 'Combat power (militor 45, lancer 100, centipede 400)' },
      { k: 'weaponTags', t: 'multi', lk: 'mechWeaponTags', custom: true, label: 'Guns it may carry (weapon tags)', help: 'The game gives it a gun with one of these tags. Empty = no gun, melee only.' },
      { k: 'tools', t: 'tools', label: 'Melee attacks', groups: true, caps: () => ['Blunt', 'Scratch', 'Cut', 'Stab', 'Bite'], help: 'The last box is the body part that makes the attack. It must exist on the body shape (Mech_Light has HeadAttackTool; Lancer has LeftHand, RightHand, HeadAttackTool).' },
      { k: 'workTypes', t: 'multi', lk: 'mechWorkTypes', custom: true, label: 'Work it can be ordered to do', help: 'Hauling, Construction, Cleaning, Growing, Mining... Empty = a pure fighter.' },
      { k: 'butcher', t: 'pairs', lk: 'materials', label: 'Scrap it gives when butchered', help: 'Vanilla: militor 10 steel, centipede 30 steel + 10 plasteel.' },
      { k: 'stats', t: 'stats', label: 'Mechanoid numbers', list: MECH_STATS },
      { k: 'customStats', t: 'pairs', label: 'More properties', lk: 'stats', kind: 'item', help: 'Any stat, including those from other mods: Add, then "Use … as my own ID".' },
      { k: 'gestate', t: 'bool', label: 'A mechanitor can gestate it', help: 'Adds a recipe to the mech gestator (light) or the large mech gestator.' },
      { k: 'gest', t: 'pairs', lk: 'materials', label: 'Gestation ingredients', show: (it) => it.gestate, help: 'Vanilla militor: 50 steel + 1 basic subcore.' },
      { k: 'gestWork', t: 'num', label: 'Work to start gestation', show: (it) => it.gestate },
      { k: 'gestDays', t: 'num', label: 'Days per gestation cycle', show: (it) => it.gestate, help: 'Vanilla: 2 days.' },
      { k: 'gestCycles', t: 'num', label: 'Number of cycles (each one needs the mechanitor to feed it)', show: (it) => it.gestate },
      { k: 'gestResearch', t: 'combo', lk: 'research', custom: 'gestResearchCustom', label: 'Research needed to gestate', show: (it) => it.gestate, help: 'Vanilla: BasicMechtech (light), StandardMechtech (medium), HighMechtech (heavy).' },
    ],
    animal: [
      { k: 'preset', t: 'select', label: 'Kind of animal', opts: () => Object.entries(ANIMAL_PRESETS).map(([v, o]) => [v, o.label]), help: 'Changing this refills the usual numbers, attacks, sounds and trade tags from a typical vanilla animal; everything stays editable.' },
      { k: 'sprites.main', t: 'sprite', label: 'Body picture (south / east / north)', mode: 'facings', help: 'One picture per direction; west is the east one flipped by the game. Vanilla animals are drawn about 1 cell wide for a cat.' },
      { k: 'sprites.female', t: 'sprite', label: 'Female body picture (optional)', mode: 'facings', help: 'Empty = females use the body picture above.' },
      { k: 'sprites.baby', t: 'sprite', label: 'Baby picture (optional)', mode: 'facings', help: 'Empty = the adult picture, smaller.' },
      { k: 'sprites.juvenile', t: 'sprite', label: 'Juvenile picture (optional)', mode: 'facings', help: 'Empty = the adult picture, a bit smaller.' },
      { k: 'sprites.dessicated', t: 'sprite', label: 'Dessicated corpse picture (optional)', mode: 'facings', help: 'Empty = the body picture is used.' },
      { k: 'maleLabel', t: 'text', label: 'Name for males (bull, rooster... empty = same)' },
      { k: 'femaleLabel', t: 'text', label: 'Name for females (cow, hen... empty = same)' },
      { k: 'babyLabel', t: 'text', label: 'Name of babies (kitten, chick... empty = same)' },
      { k: 'juvenileLabel', t: 'text', label: 'Name of juveniles (empty = same)' },
      { k: 'drawSize', t: 'num', label: 'Picture size when adult (1 = vanilla cat; cow 1.25)' },
      { k: 'color', t: 'color', label: 'Tint of the picture (optional)' },
      { k: 'soundsLike', t: 'combo', lk: 'animalProfiles', label: 'Sounds and head position copied from', help: 'Hurt, death, call and angry sounds, melee and eating sounds, and where the head is drawn: copied from this vanilla animal.' },
      { k: 'body', t: 'combo', lk: 'animalBodies', label: 'Body shape (its body parts)', custom: true, help: 'Decides which body parts it has, so which body parts an attack can use and where implants go. Another mod\'s body: type its ID.' },
      { k: 'baseBodySize', t: 'num', label: 'Body size (cat 0.32, cow 2.4, human 1)' },
      { k: 'healthScale', t: 'num', label: 'Health scale (cat 0.42, cow 1.5)' },
      { k: 'hungerRate', t: 'num', label: 'Hunger rate (cat 0.15, cow 0.535)' },
      { k: 'foodType', t: 'combo', lk: 'animalFood', label: 'What it eats', custom: true },
      { k: 'leather', t: 'combo', lk: 'materials', label: 'Leather it gives', custom: true, help: 'For example Leather_Plain. A leather from another mod: type its ID.' },
      { k: 'meatLabel', t: 'text', label: 'Name of its meat (empty = "meat")' },
      { k: 'stats', t: 'stats', label: 'Animal properties', list: ANIMAL_STATS },
      { k: 'customStats', t: 'pairs', label: 'More properties (stats not above)', lk: 'stats', kind: 'item', help: 'Any stat, including those from other mods: Add, then "Use … as my own ID".' },
      { k: 'predator', t: 'bool', label: 'Hunts other animals' },
      { k: 'maxPreyBodySize', t: 'num', label: 'Largest prey it hunts (body size)', show: (it) => !!it.predator },
      { k: 'herdAnimal', t: 'bool', label: 'Lives and moves in a herd' },
      { k: 'packAnimal', t: 'bool', label: 'Can carry caravan goods' },
      { k: 'trainability', t: 'select', label: 'How much it can be trained', opts: () => [['None', 'None'], ['Simple', 'Simple (obedience)'], ['Intermediate', 'Intermediate (guard, rescue)'], ['Advanced', 'Advanced (release, haul)']] },
      { k: 'petness', t: 'num', label: 'How pet-like it is (0-1; cat 1)' },
      { k: 'nuzzleMtb', t: 'num', label: 'Hours between nuzzling its owner (empty = never)' },
      { k: 'lifeExpectancy', t: 'num', label: 'Life expectancy (years)' },
      { k: 'gestationDays', t: 'num', label: 'Pregnancy length (days)' },
      { k: 'litterMax', t: 'num', label: 'Largest litter' },
      { k: 'juvenileAge', t: 'num', label: 'Becomes a juvenile at (fraction of life, cat 0.15)' },
      { k: 'adultAge', t: 'num', label: 'Becomes an adult at (fraction of life, cat 0.4)' },
      { k: 'tools', t: 'tools', label: 'Attacks', groups: true, caps: () => ['Scratch', 'Bite', 'Blunt', 'Cut', 'Stab', 'Poke', 'ToxicBite'], help: 'The last box is the body part that makes the attack. It must exist on the body shape (a cat has FrontLeftPaw, FrontRightPaw, Teeth, HeadAttackTool).' },
      { k: 'produce', t: 'select', label: 'Regular product', opts: () => [['', 'None'], ['milk', 'Milk (milked)'], ['wool', 'Wool (shorn)'], ['eggs', 'Eggs (can hatch into new animals)']] },
      { k: 'sprites.egg', t: 'sprite', label: 'Egg picture (single image)', mode: 'single', show: (it) => it.produce === 'eggs', help: 'Used for both the unfertilized and the fertilized egg. Empty = the vanilla bird egg.' },
      { k: 'eggHatchDays', t: 'num', label: 'Days for a fertilized egg to hatch', show: (it) => it.produce === 'eggs' },
      { k: 'eggFertilizedMax', t: 'num', label: 'Fertilized eggs per laying period', show: (it) => it.produce === 'eggs' },
      { k: 'produceThing', t: 'combo', lk: 'spawnables', label: 'What it gives', custom: true, show: (it) => !!it.produce && it.produce !== 'eggs', help: 'Milk, WoolSheep... or an item made in this mod.' },
      { k: 'produceAmount', t: 'num', label: 'Amount each time (eggs: per laying)', show: (it) => !!it.produce },
      { k: 'produceDays', t: 'num', label: 'Days between products (eggs: between layings)', show: (it) => !!it.produce },
      { k: 'combatPower', t: 'num', label: 'Combat power (raid / manhunter strength; cat 35, cow 75)' },
      { k: 'ecoWeight', t: 'num', label: 'Weight in the ecosystem (how much space it takes)' },
      { k: 'wildGroup', t: 'text', label: 'Wild group size (for example 3~7, empty = alone)' },
      { k: 'tradeTags', t: 'multi', lk: 'animalTags', label: 'Sold by traders as', custom: true },
    ],
    xmlfile: [
      {
        k: 'preset',
        t: 'select',
        label: 'What this file is',
        opts: () => [['edit', 'Change an existing thing: pick it, see its values, edit them (also retexture)'], ['quick', 'Quick patch: change one value by its path'], ['patch', 'Patch file written by hand (XML)'], ['defs', 'Definitions file written by hand (XML)']],
        help: 'A patch changes existing definitions (vanilla or another mod) without replacing them. A definitions file adds new things. Both are checked for well-formed XML.',
      },
      { k: 'patchDefName', t: 'combo', lk: 'patchTargets', label: 'The thing to change', custom: true, show: (it) => it.preset === 'edit', help: 'Any item, weapon, apparel, building, plant or animal of the game and its expansions. Not in the list (another mod)? Use "Use … as my own ID": you can still change its stats and ingredients by name.' },
      { k: 'eLabel', t: 'text', label: 'New name (empty = unchanged)', show: (it) => it.preset === 'edit' && !!it.patchDefName },
      { k: 'eDesc', t: 'area', label: 'New description (empty = unchanged)', show: (it) => it.preset === 'edit' && !!it.patchDefName },
      { k: 'eStats', t: 'patchedit', label: 'Stats, ingredients and workbenches', show: (it) => it.preset === 'edit' && !!it.patchDefName, help: 'Type a new value to change it; tick "remove" to take it away. Only what you change is written to the patch.' },
      { k: 'eResearch', t: 'combo', lk: 'research', label: 'Research needed to craft it (empty = unchanged)', custom: true, show: (it) => it.preset === 'edit' && !!it.patchDefName },
      { k: 'sprites.retexOne', t: 'sprite', label: 'New picture (retexture)', mode: 'single', show: (it) => it.preset === 'edit' && retexKind(it) === 'single', help: 'Replaces the picture of this thing: the image is written to the same texture path the game uses, which overrides the original. Keep the same size as the original.' },
      { k: 'sprites.retexMulti', t: 'sprite', label: 'New picture (south / east / north)', mode: 'facings', show: (it) => it.preset === 'edit' && retexKind(it) === 'multi', help: 'This thing is drawn per direction. West is the east one flipped by the game.' },
      { k: 'sprites.retexWorn', t: 'sprite', label: 'New worn picture (south / east / north)', mode: 'facings', show: (it) => it.preset === 'edit' && wornKind(it), help: 'What the pawn wears. For body-shaped clothes this one picture is used for every body type (Male, Female, Thin, Fat, Hulk).' },
      { k: 'patchOp', t: 'select', label: 'What to do', opts: () => [['replace', 'Change a value'], ['add', 'Add something inside'], ['remove', 'Remove it']], show: (it) => it.preset === 'quick' },
      { k: 'patchDefType', t: 'text', label: 'Kind of definition (ThingDef, RecipeDef, GeneDef...)', show: (it) => it.preset === 'quick', help: 'ThingDef covers items, weapons, apparel, buildings and animals.' },
      { k: 'patchDefName', t: 'text', label: 'defName of the thing to change', show: (it) => it.preset === 'quick', help: 'For example Steel, MeleeWeapon_LongSword, Human.' },
      { k: 'patchPath', t: 'text', label: 'Part inside it', show: (it) => it.preset === 'quick', help: 'Slash-separated path inside the definition, for example statBases/MarketValue (change/remove) or statBases / costList (add inside). Empty = the definition itself.' },
      { k: 'patchValue', t: 'text', label: 'New value, or the XML to add', show: (it) => it.preset === 'quick' && it.patchOp !== 'remove', help: 'Change: just the new value, for example 50. Add: XML such as <Steel>10</Steel>.' },
      { k: 'patchMod', t: 'text', label: 'Only if this mod is loaded (optional name)', show: (it) => it.preset === 'quick' || it.preset === 'edit', help: 'For example Royalty or the name of another mod, so a patch for an optional mod does not cause errors when it is missing.' },
      { k: 'xmlText', t: 'xml', label: 'The XML', show: (it) => it.preset !== 'quick', rows: 16, help: 'Paste the whole file, or only the inside (the <Defs> or <Patch> wrapper is added for you). XML written by an AI works here too.' },
    ],
    xenotype: [
      { k: 'sprites.icon', t: 'sprite', label: 'Xenotype icon (single image)', mode: 'single', help: 'Shown in the xenotype list. Vanilla icons are small squares.' },
      { k: 'genes', t: 'multi', lk: 'genes', label: 'Genes of this xenotype', custom: true, help: 'Vanilla genes and the genes made in this mod are in the list. Another mod\'s gene: type its ID. Genes that share an exclusion tag cannot be combined.' },
      { k: 'descriptionShort', t: 'area', label: 'Short description (shown in the xenotype list; empty = none)' },
      { k: 'inheritable', t: 'bool', label: 'Passed on to children' },
      { k: 'nameMaker', t: 'text', label: 'Name generator for men (optional ID)', help: 'Empty = normal human names. Vanilla example: NamerPersonDirtmole_Male. A name generator from another mod: type its ID.' },
      { k: 'nameMakerFemale', t: 'text', label: 'Name generator for women (optional ID)' },
      { k: 'displayPriority', t: 'num', label: 'List order (empty = after vanilla)' },
      { k: 'weight', t: 'num', label: 'How often free-roaming pawns of this type appear (0 = never)', help: 'Vanilla baseliner is 40. Leave 0 and use the xenotype from the gene editor only.' },
    ],
    implant: [
      {
        k: 'preset',
        t: 'select',
        label: 'Kind of implant',
        opts: () => [['replace', 'Replacement part (replaces the natural one, like a bionic arm)'], ['addon', 'Add-on implant (sits in the natural part, like a painstopper)']],
      },
      { k: 'sprites.single', t: 'sprite', label: 'Item picture (single image)', mode: 'single', help: 'The item lying on the ground and in the inventory. Kept exactly as you give it.' },
      { k: 'races', t: 'multi', lk: 'races', label: 'Who it can be installed on', custom: true, help: 'Human colonists by default. Add animals (a horse, a dog...), mechanoids or another mod\'s race. The body part below must exist on that race: animals have Leg, Eye, Ear, Jaw, Neck, Head, Brain, Heart, Lung, Kidney, Liver, Stomach, Torso, Tail... but no Shoulder or Hand.' },
      { k: 'bodyParts', t: 'multi', lk: 'bodyParts', label: 'Installed on this body part', custom: true, help: 'Vanilla bionic arm: Shoulder; leg: Leg; eye: Eye; painstopper: Brain. For an add-on any listed part works. Another mod\'s part: type its ID.' },
      { k: 'partEfficiency', t: 'num', label: 'How well the part works (1 = like natural, 1.25 = bionic)', show: (it) => it.preset === 'replace' },
      { k: 'betterThanNatural', t: 'bool', label: 'Counts as better than natural (no penalty for missing the original)', show: (it) => it.preset === 'replace' },
      { k: 'capMods', t: 'pairs', label: 'Body abilities: add or subtract', lk: 'capacities', help: 'For example Manipulation 0.1.' },
      { k: 'capFactors', t: 'pairs', label: 'Body abilities: multiply', lk: 'capacities' },
      { k: 'statOffsets', t: 'pairs', label: 'Adds to stats', lk: 'stats', help: 'Stats from other mods: Add, then type your own ID.' },
      { k: 'statFactors', t: 'pairs', label: 'Multiplies stats', lk: 'stats' },
      { k: 'painFactor', t: 'num', label: 'Pain multiplier (empty = unchanged, 0 = no pain)' },
      { k: 'hungerFactor', t: 'num', label: 'Hunger multiplier (empty = unchanged)' },
      { k: 'abilities', t: 'multi', lk: 'abilities', label: 'Gives these abilities', custom: true, help: 'Abilities made in this mod are in the list, or type any ability ID.' },
      { k: 'drawOnPawn', t: 'bool', label: 'Show a picture on the pawn (visible arm, wings, ...)' },
      { k: 'shape', t: 'select', label: 'Where it sits on the pawn', opts: SHAPE_OPTS, show: (it) => it.drawOnPawn, help: 'Picking one fills in layers, offsets, size and colour; you can still change the numbers below.' },
      { k: 'sprites.main', t: 'sprite', label: 'Pawn picture (south / east / north)', mode: 'facings', show: (it) => it.drawOnPawn, help: 'West is the east one flipped by the game.' },
      { k: 'colorType', t: 'select', label: 'Colour of the picture', opts: () => [['Skin', 'Skin colour'], ['Hair', 'Hair colour'], ['Ignored', 'Not coloured (as drawn)']], show: (it) => it.drawOnPawn },
      { k: 'meshSize', t: 'num', label: 'Picture size (1 = one cell)', show: (it) => it.drawOnPawn },
      { k: 'layerSouth', t: 'num', label: 'Layer facing south (higher = in front; body 0)', show: (it) => it.drawOnPawn },
      { k: 'offsetSouthX', t: 'num', label: 'South: shift sideways', show: (it) => it.drawOnPawn },
      { k: 'offsetSouthZ', t: 'num', label: 'South: shift up (+) / down (-)', show: (it) => it.drawOnPawn },
      { k: 'layerEast', t: 'num', label: 'Layer facing east / west', show: (it) => it.drawOnPawn },
      { k: 'offsetEastX', t: 'num', label: 'East: shift sideways (west is mirrored)', show: (it) => it.drawOnPawn },
      { k: 'offsetEastZ', t: 'num', label: 'East: shift up (+) / down (-)', show: (it) => it.drawOnPawn },
      { k: 'layerNorth', t: 'num', label: 'Layer facing north', show: (it) => it.drawOnPawn },
      { k: 'offsetNorthX', t: 'num', label: 'North: shift sideways', show: (it) => it.drawOnPawn },
      { k: 'offsetNorthZ', t: 'num', label: 'North: shift up (+) / down (-)', show: (it) => it.drawOnPawn },
      { k: 'medicineSkill', t: 'num', label: 'Medicine skill needed for the surgery' },
      { k: 'surgeryWork', t: 'num', label: 'Work for the surgery (vanilla 2500)' },
      { k: 'cost', t: 'pairs', label: 'Ingredients to make the item', lk: 'materials', help: 'Vanilla bionic arm: 15 Plasteel + 4 advanced components.' },
      { k: 'workbenches', t: 'multi', label: 'Made at workbench', lk: 'workbenches', opts: () => CATALOG.workbenches, custom: true },
      { k: 'research', t: 'combo', lk: 'research', label: 'Research needed', opts: () => CATALOG.research, custom: 'researchCustom' },
      { k: 'craftSkill', t: 'num', label: 'Crafting skill needed to make the item' },
      { k: 'stats', t: 'stats', label: 'Item properties', list: [['Mass', 'Mass (kg)', 1], ['WorkToMake', 'Work to make', 26000], ['MarketValue', 'Market value (empty = from ingredients)', 0]] },
    ],
    recipe: [
      { k: 'preset', t: 'select', label: 'Kind of recipe', opts: () => [['make', 'New recipe (ingredients become products at a bench)'], ['attach', 'Add an existing recipe to another bench']] },
      { k: 'ingredients', t: 'pairs', lk: 'materials', label: 'Ingredients (specific things)', show: (it) => it.preset !== 'attach', help: 'Click Add and pick an item, or type the ID of a modded one. The number is how many are used per job.' },
      { k: 'ingredientCats', t: 'pairs', lk: 'thingCategories', label: 'Ingredients (any item of a category)', show: (it) => it.preset !== 'attach', help: 'For example MeatRaw 1 = one piece of any raw meat. The cook can pick which one in the bill.' },
      { k: 'products', t: 'pairs', lk: 'materials', label: 'Makes', show: (it) => it.preset !== 'attach', help: 'What one job produces, and how many.' },
      { k: 'bulk', t: 'bool', label: 'Also add a "x4" bulk version', show: (it) => it.preset !== 'attach', help: 'A second recipe that uses four times the ingredients and makes four times the products in one job.' },
      { k: 'workAmount', t: 'num', label: 'Work needed (vanilla: cooking a simple meal 300, smelting slag 400, stone blocks 1600)', show: (it) => it.preset !== 'attach' },
      { k: 'workSpeedStat', t: 'combo', lk: 'recipeSpeedStats', label: 'Work speed depends on', show: (it) => it.preset !== 'attach' },
      { k: 'workSkill', t: 'combo', lk: 'recipeSkills', label: 'Skill used (and trained)', show: (it) => it.preset !== 'attach' },
      { k: 'minSkill', t: 'num', label: 'Minimum skill level (0 = anyone)', show: (it) => it.preset !== 'attach' },
      { k: 'effect', t: 'combo', lk: 'recipeEffects', label: 'Work animation', show: (it) => it.preset !== 'attach' },
      { k: 'sound', t: 'combo', lk: 'recipeSounds', label: 'Work sound', show: (it) => it.preset !== 'attach' },
      { k: 'benches', t: 'multi', lk: 'recipeBenches', custom: true, label: 'Made at bench', show: (it) => it.preset !== 'attach', help: 'Tick vanilla benches, or type the defName of a modded bench. Players then see it in the bench\'s "Add bill" list; the bill options (do X times, until you have X, forever) are built into the game.' },
      { k: 'research', t: 'combo', lk: 'research', label: 'Research needed (optional)', custom: 'researchCustom', show: (it) => it.preset !== 'attach' },
      { k: 'attachRecipe', t: 'text', label: 'Existing recipe ID', show: (it) => it.preset === 'attach', help: 'The defName of a vanilla or modded recipe, for example Make_Pemmican or SmeltWeapon.' },
      { k: 'attachBenches', t: 'multi', lk: 'recipeBenches', custom: true, label: 'Also available at these benches', show: (it) => it.preset === 'attach' },
    ],
    research: [
      { k: 'baseCost', t: 'num', label: 'Research cost (work points)', help: 'Vanilla: smithing 700, electricity 1000, multi-analyzer 4000, fabrication 6500.' },
      { k: 'techLevel', t: 'combo', lk: 'techLevels', label: 'Tech level', help: 'Neolithic, Medieval, Industrial, Spacer... Research is slower outside the faction tech level.' },
      { k: 'prerequisites', t: 'multi', lk: 'research', custom: true, label: 'Must research first', help: 'Vanilla projects, projects of this mod, or another mod\'s project (type its ID).' },
      { k: 'requiredBench', t: 'combo', lk: 'researchBenches', label: 'Research bench needed (optional)', help: 'HiTechResearchBench = the hi-tech research bench. Empty = any research bench.' },
      { k: 'requiredFacilities', t: 'multi', lk: 'researchFacilities', custom: true, label: 'Needs these facilities next to the bench (optional)', help: 'For example MultiAnalyzer.' },
      { k: 'ownTab', t: 'bool', label: 'Put it in a research tab of its own', help: 'A tab is made for your mod (name below). Untick to put it in the Main tab or another tab.' },
      { k: 'tabLabel', t: 'text', label: 'Name of your research tab (empty = the mod name)', show: (it) => it.ownTab },
      { k: 'tab', t: 'text', label: 'Existing tab ID (empty = Main)', show: (it) => !it.ownTab, help: 'Main, or the ID of another mod\'s tab.' },
      { k: 'viewX', t: 'num', label: 'Position across (empty = arranged for you)', help: 'Vanilla Main tab runs from 0 to about 15 across. Columns follow the "must research first" chain.' },
      { k: 'viewY', t: 'num', label: 'Position down (empty = arranged for you)' },
    ],
    hediff: [
      { k: 'isBad', t: 'bool', label: 'Counts as bad (shown red, treated as an ailment)' },
      { k: 'durationHours', t: 'num', label: 'Lasts this many hours (2.5 = 1 in-game hour; empty = until removed)', help: 'A game day is 24 hours. After this the condition disappears by itself.' },
      { k: 'capMods', t: 'pairs', label: 'Body abilities: add or subtract', lk: 'capacities', help: 'For example Moving -0.3. Another mod\'s ability: type your own ID.' },
      { k: 'capFactors', t: 'pairs', label: 'Body abilities: multiply', lk: 'capacities', help: '0.5 = halved, 1.5 = +50%.' },
      { k: 'statOffsets', t: 'pairs', label: 'Adds to stats', lk: 'stats', help: 'Stats from other mods: Add, then type your own ID.' },
      { k: 'statFactors', t: 'pairs', label: 'Multiplies stats', lk: 'stats', help: '1.2 = +20%, 0.8 = -20%.' },
      { k: 'painFactor', t: 'num', label: 'Pain multiplier (empty = unchanged, 0 = no pain)' },
      { k: 'hungerFactor', t: 'num', label: 'Hunger multiplier (empty = unchanged, 2 = twice as hungry)' },
    ],
    ability: [
      { k: 'sprites.icon', t: 'sprite', label: 'Ability icon (single image)', mode: 'single', help: 'The button shown to the player. Vanilla ability icons are small squares.' },
      {
        k: 'targeting',
        t: 'select',
        label: 'Who or what it targets',
        opts: () => [['pawn', 'A person or animal at a distance'], ['touch', 'A person or animal next to the user (touch)'], ['location', 'A spot on the ground'], ['jump', 'A spot on the ground, jumping there (needs Biotech)'], ['self', 'The user (no target)']],
      },
      { k: 'range', t: 'num', label: 'Range in cells (vanilla 12.9, ends in .9)', show: (it) => it.targeting === 'pawn' || it.targeting === 'location' || it.targeting === 'jump' },
      { k: 'minRange', t: 'num', label: 'Shortest jump in cells (empty = none)', show: (it) => it.targeting === 'jump' },
      { k: 'warmup', t: 'num', label: 'Seconds before it fires' },
      { k: 'cooldown', t: 'num', label: 'Seconds before it can be used again (60 = 1 s, game day = 60000 ticks ≈ 1000 s)' },
      { k: 'hostile', t: 'bool', label: 'Counts as hostile (use only on enemies)' },
      { k: 'casterViolence', t: 'bool', label: 'Needs a user who can do violence' },
      { k: 'hemogenCost', t: 'num', label: 'Hemogen cost (0-1, empty = none, needs Biotech)' },
      { k: 'needCapacity', t: 'combo', lk: 'capacities', label: 'Body ability the user needs (optional)', custom: true, help: 'For example Manipulation for touch abilities. Another mod\'s ability: type your own ID.' },
      { k: 'effHediffs', t: 'multi', lk: 'hediffs', label: 'Effect: gives these conditions (hediffs)', custom: true, help: 'Any condition from the game or another mod (type its ID), for example one that slows, speeds up or heals.' },
      { k: 'hediffSelf', t: 'bool', label: 'Conditions go on the user, not the target', show: (it) => (it.effHediffs || []).length > 0 },
      { k: 'effProjectile', t: 'combo', lk: 'projectiles', label: 'Effect: launches this projectile', custom: true, help: 'Projectiles made in this mod are in the list.' },
      { k: 'effSpawn', t: 'combo', lk: 'spawnables', label: 'Effect: puts this thing on the ground at the target', custom: true },
      { k: 'effMental', t: 'combo', lk: 'mentalStates', label: 'Effect: puts the target in this mental state', custom: true, help: 'Berserk, wandering sadly, daze... Another mod\'s state: type its ID. Use it on a pawn target.' },
      { k: 'mentalGoodwill', t: 'num', label: 'Goodwill change with the target\'s faction (negative = angers them)', show: (it) => !!it.effMental },
      { k: 'effTeleport', t: 'select', label: 'Effect: moves the target (teleport)', opts: () => [['', 'None'], ['selected', 'To a spot you choose (like Skip)'], ['random', 'To a random spot nearby (like Chaos skip)']], help: 'The target can be the user. Use a "person or animal at a distance" target. Copied from the vanilla Royalty skip abilities.' },
      { k: 'teleRange', t: 'num', label: 'How far it can send the target, in cells', show: (it) => !!it.effTeleport },
      { k: 'teleStun', t: 'num', label: 'Seconds the target is stunned after landing (0 = not)', show: (it) => !!it.effTeleport },
    ],
    gene: [
      {
        k: 'preset',
        t: 'select',
        label: 'Kind of gene',
        opts: () => [['attachment', 'Body attachment (tail, wings, fins...) with a picture'], ['effects', 'Effects only (no picture)'], ['hairColor', 'Hair colour'], ['skinColor', 'Skin colour']],
        help: 'A body attachment is drawn on the pawn. Its layer can differ per direction, for example a tail behind the body when facing south or east but in front when facing north.',
      },
      { k: 'sprites.icon', t: 'sprite', label: 'Gene icon (single image)', mode: 'single', help: 'Shown in the gene list. Vanilla gene icons are small squares. Colour genes can leave it empty: the game\'s own colour icon is used.' },
      { k: 'colorValue', t: 'color', label: 'The colour', show: (it) => it.preset === 'hairColor' || it.preset === 'skinColor', help: 'Hair or skin of carriers always has exactly this colour (vanilla snow-white hair, ink-black skin).' },
      { k: 'forcedTraits', t: 'pairs', label: 'Forced traits (number = degree; empty if the trait has no degrees)', lk: 'traits', help: 'Carriers always have these personality traits. Degrees: for example Kind has none, Psychic sensitivity uses -2, -1, 1, 2. A trait from another mod: Add, then type your own ID.' },
      { k: 'shape', t: 'select', label: 'Where it sits on the pawn', opts: SHAPE_OPTS, show: (it) => it.preset === 'attachment', help: 'Picking one fills in sensible layers, offsets, size and colour; you can still change every number below (they stay as you set them). Tail numbers come from vanilla; wings, back, arm and chest are my estimates.' },
      { k: 'sprites.main', t: 'sprite', label: 'Body picture (south / east / north)', mode: 'facings', show: (it) => it.preset === 'attachment', help: 'One picture per direction; west is the east one flipped by the game.' },
      { k: 'colorType', t: 'select', label: 'Colour of the picture', opts: () => [['Hair', 'Hair colour'], ['Skin', 'Skin colour'], ['Ignored', 'Not coloured (as drawn)']], show: (it) => it.preset === 'attachment' },
      { k: 'meshSize', t: 'num', label: 'Picture size (1 = one cell, vanilla tails)', show: (it) => it.preset === 'attachment' },
      { k: 'layerSouth', t: 'num', label: 'Layer facing south (higher = in front; body is 0, vanilla tail -2, north tail 90)', show: (it) => it.preset === 'attachment' },
      { k: 'offsetSouthX', t: 'num', label: 'South: shift sideways', show: (it) => it.preset === 'attachment' },
      { k: 'offsetSouthZ', t: 'num', label: 'South: shift up (+) / down (-)', show: (it) => it.preset === 'attachment' },
      { k: 'layerEast', t: 'num', label: 'Layer facing east / west', show: (it) => it.preset === 'attachment' },
      { k: 'offsetEastX', t: 'num', label: 'East: shift sideways (west is mirrored)', show: (it) => it.preset === 'attachment' },
      { k: 'offsetEastZ', t: 'num', label: 'East: shift up (+) / down (-)', show: (it) => it.preset === 'attachment' },
      { k: 'layerNorth', t: 'num', label: 'Layer facing north', show: (it) => it.preset === 'attachment' },
      { k: 'offsetNorthX', t: 'num', label: 'North: shift sideways', show: (it) => it.preset === 'attachment' },
      { k: 'offsetNorthZ', t: 'num', label: 'North: shift up (+) / down (-)', show: (it) => it.preset === 'attachment' },
      { k: 'displayCategory', t: 'combo', lk: 'geneCategories', label: 'Gene category (tab in the gene list)', custom: true },
      { k: 'biostatCpx', t: 'num', label: 'Complexity cost' },
      { k: 'biostatMet', t: 'num', label: 'Metabolic cost (negative = saves food)' },
      { k: 'biostatArc', t: 'num', label: 'Archite capsules needed (0 = none)' },
      { k: 'exclusionTags', t: 'multi', label: 'Cannot be combined with genes sharing a tag', lk: 'geneTags', custom: true, opts: () => [['Tail', 'Tail'], ['Ears', 'Ears'], ['Wings', 'Wings']], help: 'Two genes with the same tag cannot be in one xenotype. A tail gene uses Tail.' },
      { k: 'statOffsets', t: 'pairs', label: 'Adds to stats', lk: 'stats', help: 'For example ComfyTemperatureMin -10 (vanilla furry tail). Not in the list (a stat from another mod)? Click Add, then "Use … as my own ID" and type it; you can save it to reuse.' },
      { k: 'statFactors', t: 'pairs', label: 'Multiplies stats', lk: 'stats', help: '1.2 = +20%, 0.8 = -20%. Stats from other mods: Add, then type your own ID.' },
      { k: 'abilities', t: 'multi', lk: 'abilities', label: 'Gives these abilities', custom: true, help: 'Abilities made in this mod are in the list. Another mod\'s ability: type its ID.' },
      { k: 'capMods', t: 'pairs', label: 'Body abilities (added)', lk: 'capacities', help: 'For example Manipulation 0.05 (vanilla smooth tail). A body ability from another mod: Add, then type your own ID.' },
    ],
    plant: [
      {
        k: 'preset',
        t: 'select',
        label: 'Kind of plant',
        opts: () => Object.entries(PLANT_PRESETS).map(([v, o]) => [v, o.label]),
        help: 'Changing this refills the usual numbers. Add the plant to a biome under "Wild plants" to have it grow wild.',
      },
      {
        k: 'sprites.single',
        t: 'sprite',
        label: 'Plant picture (single image)',
        mode: 'single',
        help: 'One picture; the game scales it with the plant\'s age and size range. Kept exactly as you give it.',
      },
      { k: 'stats', t: 'stats', label: 'Plant properties', list: PLANT_STATS },
      { k: 'customStats', t: 'pairs', label: 'More properties', lk: 'stats', kind: 'item' },
      { k: 'fertilityMin', t: 'num', label: 'Lowest ground fertility it grows on (grass 0.05, soil 1)' },
      { k: 'fertilitySensitivity', t: 'num', label: 'How much fertility speeds growth (0 = not at all, 1 = fully)' },
      { k: 'growDays', t: 'num', label: 'Days to grow fully' },
      { k: 'growMinTemp', t: 'num', label: 'Coldest temperature it grows in (optional, game default 6)' },
      { k: 'growMaxTemp', t: 'num', label: 'Hottest temperature it grows in (optional, game default 42)' },
      { k: 'visualSize', t: 'text', label: 'Size range when grown (like 0.4~0.6)' },
      { k: 'clusterRadius', t: 'num', label: 'Wild cluster radius in cells (optional)' },
      { k: 'clusterWeight', t: 'num', label: 'How strongly it grows in clumps (optional, bigger = more)' },
      { k: 'harvestedThing', t: 'combo', lk: 'materials', label: 'What harvesting gives', custom: true, help: 'An item from the game or this mod (for example WoodLog, or an item you made). Empty = cannot be harvested.' },
      { k: 'harvestYield', t: 'num', label: 'How many one harvest gives', show: (it) => !!it.harvestedThing },
      { k: 'harvestWork', t: 'num', label: 'Work to harvest', show: (it) => !!it.harvestedThing },
      { k: 'sowable', t: 'bool', label: 'Players can sow it in growing zones' },
      { k: 'sowWork', t: 'num', label: 'Work to sow', show: (it) => it.sowable },
    ],
    floor: [
      {
        k: 'preset',
        t: 'select',
        label: 'Kind of floor',
        opts: () => Object.entries(FLOOR_PRESETS).map(([v, o]) => [v, o.label]),
        help: 'Built floors appear in the build menu. Natural ground is for biomes: pick it in a biome under "Ground by fertility" or in a patch. Changing this refills the usual numbers.',
      },
      {
        k: 'sprites.single',
        t: 'sprite',
        label: 'Floor picture (single image)',
        mode: 'single',
        help: 'Repeated over every cell. Kept exactly as you give it. Vanilla floor pictures are square tiles.',
      },
      { k: 'color', t: 'text', label: 'Tint colour (optional, like #8c8c8c)', help: 'Multiplies the picture colour. Leave empty for none.' },
      { k: 'edgeType', t: 'select', label: 'Edge with the next ground', opts: () => [['Hard', 'Hard edge (built floors)'], ['FadeRough', 'Soft rough fade (natural ground)'], ['Water', 'Water edge']] },
      { k: 'renderPrecedence', t: 'num', label: 'Drawn over others with lower number (vanilla: concrete 70, soil 340)' },
      { k: 'pathCost', t: 'num', label: 'Walking cost (empty = default, higher = pawns avoid it)' },
      { k: 'fertility', t: 'num', label: 'Fertility (0 = nothing grows, 1 = plain soil)' },
      {
        k: 'affordances',
        t: 'multi',
        label: 'What can be built on it',
        opts: () => [['Light', 'Light buildings'], ['Medium', 'Medium buildings'], ['Heavy', 'Heavy buildings'], ['Diggable', 'Can be dug'], ['Walkable', 'Walkable']],
        custom: true,
        help: 'Light / Medium / Heavy: kinds of buildings allowed on it. Built floors get Walkable automatically.',
      },
      { k: 'affordanceNeeded', t: 'combo', label: 'Ground it needs under it', opts: () => [['', 'None'], ['Light', 'Light'], ['Medium', 'Medium'], ['Heavy', 'Heavy']], show: (it) => it.preset === 'built' },
      { k: 'designation', t: 'combo', lk: 'buildCategories', label: 'Build menu tab', show: (it) => it.preset === 'built' },
      { k: 'stats', t: 'stats', label: 'Floor properties', list: FLOOR_STATS },
      { k: 'customStats', t: 'pairs', label: 'More properties', lk: 'stats', kind: 'item' },
      { k: 'cost', t: 'pairs', label: 'Cost to build', lk: 'materials', show: (it) => it.preset === 'built', help: 'Click Add and pick a resource, or type the ID of a modded one.' },
      { k: 'research', t: 'combo', lk: 'research', label: 'Research needed to build', custom: 'researchCustom', show: (it) => it.preset === 'built' },
    ],
    item: [
      {
        k: 'preset',
        t: 'select',
        label: 'Kind of item',
        opts: () => Object.entries(CATALOG.itemPresets).map(([v, o]) => [v, o.label]),
        help: 'Changing this refills the stack size, category, sound and usual numbers.',
      },
      {
        k: 'sprites.single',
        t: 'sprite',
        label: 'Picture (single image)',
        mode: 'single',
        help: 'Kept exactly as you give it. Vanilla item pictures are small squares.',
      },
      { k: 'stackLimit', t: 'num', label: 'How many fit in one stack' },
      {
        k: 'thingCategories',
        t: 'multi',
        label: 'Storage / trading categories',
        lk: 'thingCategories',
        custom: true,
        help: 'Decides which stockpile filters and traders handle it. Resources: ResourcesRaw or Manufactured. Chunks: Chunks. Type the ID of a modded category if you need one.',
      },
      { k: 'soundDrop', t: 'combo', lk: 'itemSounds', label: 'Sound when dropped' },
      { k: 'tradeability', t: 'combo', lk: 'tradeability', label: 'Can be bought / sold (All, Buyable, Sellable, None)' },
      { k: 'foodType', t: 'combo', lk: 'foodTypes', label: 'What eats it (food type)', show: isFood, help: 'Humans eat Meal, VegetableOrFruit, Meat, Processed... You can list several separated by a comma, like "Plant, Processed".' },
      { k: 'preferability', t: 'combo', lk: 'preferabilities', label: 'How much pawns like it', show: (it) => isFood(it) && it.preset !== 'drug', help: 'RawBad/RawTasty for raw food, MealSimple/MealFine/MealLavish for meals. NeverForNutrition = only eaten on purpose.' },
      { k: 'ingestSound', t: 'combo', lk: 'ingestSounds', label: 'Eating sound', show: isFood },
      { k: 'ingestEffect', t: 'combo', lk: 'ingestEffects', label: 'Eating animation (optional)', show: isFood },
      { k: 'tasteThought', t: 'combo', lk: 'tasteThoughts', label: 'Mood memory after eating (vanilla thought, optional)', show: (it) => isFood(it) && it.preset !== 'drug', help: 'AteFineMeal, AteLavishMeal, AteRawFood... must be an existing thought.' },
      { k: 'joy', t: 'num', label: 'Recreation gained when consumed (0-1)', show: isFood },
      { k: 'joyKind', t: 'combo', lk: 'joyKinds', label: 'Kind of recreation', show: isFood },
      { k: 'rotDays', t: 'num', label: 'Days before it rots (0 = never)', show: (it) => isFood(it) && it.preset !== 'drug', help: 'Vanilla meals 4 days, raw vegetables 30 days.' },
      { k: 'drugCategory', t: 'combo', lk: 'drugCategories', label: 'Drug category (for drug policies)', show: (it) => it.preset === 'drug' },
      { k: 'highHours', t: 'num', label: 'The high lasts (hours)', show: (it) => it.preset === 'drug' },
      { k: 'highMood', t: 'num', label: 'Mood while high (+ happy, - unhappy)', show: (it) => it.preset === 'drug' },
      { k: 'highConsciousness', t: 'num', label: 'Consciousness change while high (-0.3 = 30% less)', show: (it) => it.preset === 'drug' },
      { k: 'highMoving', t: 'num', label: 'Movement change while high', show: (it) => it.preset === 'drug' },
      { k: 'highPain', t: 'num', label: 'Pain change while high (-0.2 = less pain)', show: (it) => it.preset === 'drug' },
      { k: 'highHunger', t: 'num', label: 'Hunger rate change while high (0.3 = hungrier)', show: (it) => it.preset === 'drug' },
      { k: 'addictive', t: 'bool', label: 'Can cause tolerance and addiction', show: (it) => it.preset === 'drug', help: 'Builds a tolerance with each dose; once tolerance is high enough a dose can make the pawn addicted, with withdrawal if they go without.' },
      { k: 'addictiveness', t: 'num', label: 'Chance a dose causes addiction (0-1, smokeleaf 0.02, flake 0.1)', show: (it) => it.preset === 'drug' && it.addictive },
      { k: 'minTolerance', t: 'num', label: 'Tolerance needed before addiction is possible (0-1)', show: (it) => it.preset === 'drug' && it.addictive },
      { k: 'toleranceGain', t: 'num', label: 'Tolerance gained per dose (0-1, smokeleaf 0.03)', show: (it) => it.preset === 'drug' && it.addictive },
      { k: 'toleranceFade', t: 'num', label: 'Tolerance lost per day (smokeleaf 0.015)', show: (it) => it.preset === 'drug' && it.addictive },
      { k: 'withdrawMood', t: 'num', label: 'Mood during withdrawal (negative)', show: (it) => it.preset === 'drug' && it.addictive },
      { k: 'withdrawConsciousness', t: 'num', label: 'Consciousness change during withdrawal', show: (it) => it.preset === 'drug' && it.addictive },
      { k: 'withdrawMoving', t: 'num', label: 'Movement change during withdrawal', show: (it) => it.preset === 'drug' && it.addictive },
      { k: 'withdrawRecover', t: 'num', label: 'Addiction fades per day without the drug (0.0333 = about 30 days)', show: (it) => it.preset === 'drug' && it.addictive },
      { k: 'stats', t: 'stats', label: 'Item properties', list: ITEM_STATS, extra: (it) => [...(it.craftable ? [['WorkToMake', 'Work to make', 100]] : []), ...(isFood(it) && it.preset !== 'drug' ? [['Nutrition', 'Nutrition (raw potato 0.05, simple meal 0.9)', 0.9], ['FoodPoisonChanceFixedHuman', 'Food poisoning chance (0-1)', 0.02]] : [])] },
      { k: 'customStats', t: 'pairs', label: 'More item properties', lk: 'stats', kind: 'item' },
      { k: 'smeltable', t: 'bool', label: 'Can be smelted into other things', show: (it) => (CATALOG.itemPresets[it.preset] || {}).chunk },
      {
        k: 'cutProducts',
        t: 'pairs',
        label: 'Cutting it at the stonecutter gives',
        lk: 'materials',
        show: (it) => (CATALOG.itemPresets[it.preset] || {}).chunk,
        help: 'Vanilla rock chunks give 20 blocks. Put "StoneChunks" in the storage categories above so the normal "make stone blocks" recipe accepts this chunk.',
      },
      {
        k: 'cost',
        t: 'pairs',
        label: 'Ingredients to make it',
        lk: 'materials',
        show: (it) => it.craftable,
        help: 'Click Add and pick a resource, or type the ID of a modded one.',
      },
      { k: 'productCount', t: 'num', label: 'How many one job makes', show: (it) => it.craftable },
      {
        k: 'smeltProducts',
        t: 'pairs',
        label: 'Smelting gives',
        lk: 'materials',
        show: (it) => (CATALOG.itemPresets[it.preset] || {}).chunk && it.smeltable,
        help: 'Vanilla steel slag gives 15 steel.',
      },
      {
        k: 'isStuff',
        t: 'bool',
        label: 'Can be used as a building / weapon / apparel material',
        show: (it) => !(CATALOG.itemPresets[it.preset] || {}).chunk,
        help: 'Like steel, wood or cloth: it then appears in the material list of buildings, weapons and apparel of the matching category.',
      },
      { k: 'stuffCategories', t: 'multi', label: 'Material category', lk: 'stuffCategories', custom: true, show: (it) => it.isStuff },
      { k: 'stuffAppearance', t: 'combo', lk: 'stuffAppearances', label: 'Look of walls made from it', show: (it) => it.isStuff },
      { k: 'stuffColor', t: 'color', label: 'Colour it gives', show: (it) => it.isStuff },
      { k: 'stuffCommonality', t: 'num', label: 'How often the game picks it (1 = like steel)', show: (it) => it.isStuff },
      { k: 'stuffPower', t: 'stats', store: 'stuffPower', label: 'Material strength', list: STUFF_POWER, show: (it) => it.isStuff },
      { k: 'stuffFactors', t: 'stats', store: 'stuffFactors', label: 'Effect on what is built', list: STUFF_FACTORS, show: (it) => it.isStuff },
      {
        k: 'deposit',
        t: 'bool',
        label: 'Found as underground ore (deep drill)',
        show: (it) => !(CATALOG.itemPresets[it.preset] || {}).chunk,
        help: 'Makes it appear in deep deposits on maps. Vanilla steel: commonality 4, 45 per portion, lump size 20~30.',
      },
      { k: 'depositCommonality', t: 'num', label: 'Deposit commonality', show: (it) => it.deposit },
      { k: 'depositCount', t: 'num', label: 'Amount per drilling', show: (it) => it.deposit },
      { k: 'depositLump', t: 'text', label: 'Deposit size (like 20~30)', show: (it) => it.deposit },
    ],
    projectile: [
      {
        k: 'sprites.single',
        t: 'sprite',
        label: 'Projectile picture (single image)',
        mode: 'single',
        help: 'Kept exactly as you give it (not squared). If it looks stretched in game, set the drawn size below.',
      },
      { k: 'drawW', t: 'num', label: 'Drawn width in cells (optional)' },
      { k: 'drawH', t: 'num', label: 'Drawn height in cells (optional)' },
      { k: 'glow', t: 'bool', label: 'Glows (drawn over the dark, like energy bolts)' },
      {
        k: 'damageDef',
        t: 'combo',
        lk: 'damages',
        label: 'Damage type',
        custom: 'damageCustom',
        help: 'What kind of damage it does. Bullet, Arrow, Flame, EMP, Bomb... Pick from the list, or type the ID of a modded damage type.',
      },
      { k: 'damage', t: 'num', label: 'Damage (empty = the damage type default)' },
      { k: 'speed', t: 'num', label: 'Speed (vanilla bullets 55, shells about 40)' },
      { k: 'stoppingPower', t: 'num', label: 'Stopping power (optional)' },
      { k: 'armorPen', t: 'num', label: 'Armour penetration (optional, 0-1)' },
      {
        k: 'explodeSound',
        t: 'sound',
        kind: 'explosion',
        lk: 'explosionSounds',
        label: 'Explosion sound (optional)',
        custom: 'explodeSoundCustom',
        show: (it) => it.explodes,
      },
      {
        k: 'colorCenter',
        t: 'color',
        label: 'Explosion colour, centre (optional)',
        show: (it) => it.explodes,
        help: 'Tints the middle of the blast. Makes a custom damage type based on the one below.',
      },
      { k: 'colorEdge', t: 'color', label: 'Explosion colour, edge (optional)', show: (it) => it.explodes },
      { k: 'arc', t: 'bool', label: 'Flies in an arc, over obstacles (like launcher shells)' },
      { k: 'explodes', t: 'bool', label: 'Explodes on impact' },
      { k: 'radius', t: 'num', label: 'Explosion radius in cells', show: (it) => it.explodes },
      {
        k: 'preThing',
        t: 'combo',
        blank: '(none)',
        lk: 'spawnables',
        label: 'Leaves this before the explosion (optional)',
        custom: 'preThingCustom',
        show: (it) => it.explodes,
        help: 'Any item, filth, building or plant. Not living creatures. Pick from the list or type the exact ID of a modded thing.',
      },
      { k: 'preChance', t: 'num', label: 'Chance for that (0-1)', show: (it) => it.explodes && (it.preThing || it.preThingCustom) },
      {
        k: 'postThing',
        t: 'combo',
        blank: '(none)',
        lk: 'spawnables',
        label: 'Leaves this after the explosion (optional)',
        custom: 'postThingCustom',
        show: (it) => it.explodes,
        help: 'Spawned around the impact point once the explosion is done.',
      },
      { k: 'postCount', t: 'num', label: 'How many', show: (it) => it.explodes && (it.postThing || it.postThingCustom) },
      { k: 'postChance', t: 'num', label: 'Chance for each (0-1)', show: (it) => it.explodes && (it.postThing || it.postThingCustom) },
      {
        k: 'gas',
        t: 'combo',
        blank: '(none)',
        lk: 'gasTypes',
        label: 'Leaves a gas cloud (optional)',
        show: (it) => it.explodes,
        help: 'Smoke that blinds, toxic gas, or deadlife dust. Only the gas types the game knows.',
      },
      {
        k: 'hediff',
        t: 'combo',
        blank: '(none)',
        lk: 'hediffs',
        label: 'Also inflicts this condition on hit (optional)',
        custom: 'hediffCustom',
        help: 'Like toxic buildup or food poisoning. Pick from the list, or type the ID of a condition from another mod. The builder makes a custom damage type that adds it.',
      },
      {
        k: 'hediffAmount',
        t: 'num',
        label: 'Condition amount per point of damage',
        show: (it) => it.hediff || it.hediffCustom,
        help: 'Vanilla toxic bullets use 0.0065 (toxic buildup 0-1). Higher = stronger.',
      },
      {
        k: 'baseDamage',
        t: 'combo',
        blank: '(same as the damage type above)',
        lk: 'damagesBase',
        label: 'Damage type to copy for the custom damage',
        custom: 'baseDamageCustom',
        show: (it) => it.hediff || it.hediffCustom || (it.explodes && (it.colorCenter || it.colorEdge)),
        help: 'The condition and the explosion colours need a new damage type. It behaves like this one (Bullet, Arrow, Flame...). Empty = the damage type chosen higher up.',
      },
    ],
    hair: [
      { k: 'sprites.main', t: 'sprite', label: 'Hair sprite (south / east / north)', mode: 'facings' },
      {
        k: 'styleGender',
        t: 'select',
        label: 'Style gender',
        opts: () => ['Any', 'Male', 'Female', 'MaleUsually', 'FemaleUsually'].map((v) => [v, v]),
      },
    ],
    beard: [
      { k: 'sprites.main', t: 'sprite', label: 'Beard sprite (south / east / north)', mode: 'facings' },
      {
        k: 'styleGender',
        t: 'select',
        label: 'Style gender',
        opts: () => ['Male', 'Any', 'Female', 'MaleUsually', 'FemaleUsually'].map((v) => [v, v]),
      },
    ],
    head: [
      { k: 'sprites.main', t: 'sprite', label: 'Head sprite (south / east / north)', mode: 'facings' },
      { k: 'gender', t: 'select', label: 'Gender', opts: () => ['Male', 'Female', 'None'].map((v) => [v, v]) },
      { k: 'narrow', t: 'bool', label: 'Narrow head (uses the vanilla NarrowBase: narrower hair and beard)' },
      { k: 'eyeOffsetX', t: 'num', label: 'Eye offset on side views (vanilla: 0.13-0.18)', show: (it) => !it.narrow },
    ],
    body: [
      { k: 'sprites.main', t: 'sprite', label: 'Naked body sprite (south / east / north)', mode: 'facings' },
      { k: 'headOffset', t: 'vec', label: 'Head offset (x, z)', help: "Taken from the viewer's head offset." },
    ],
  };

  // Vanilla pictures are 64 pixels per drawn cell (checked in the 1.7 texture list: a 3.5 x 1.5 bench is 224 x 96, a 4 x 4 table 256 x 256).
  function buildPicHint(it) {
    const P = CATALOG.buildPresets[it.preset] || CATALOG.buildPresets.other,
      n = (v, d) => (Number(v) > 0 ? Number(v) : d);
    const w = n(it.drawW, n(it.sizeX, 1) + (P.margin || 0)),
      h = n(it.drawH, n(it.sizeZ, 1) + (P.margin || 0));
    const a = Math.round(w * 64),
      b = Math.round(h * 64);
    return (
      `Vanilla size for this building: ${a} × ${b} px (64 pixels per drawn cell)` +
      (a !== b && it.rotatable ? '; the east picture is ' + b + ' × ' + a + ' (turned).' : '.') +
      ' Pictures are kept exactly as you give them.'
    );
  }
  // ---- biome rules: "every animal / plant whose <stat> is >= / <= / = <number>" ----
  // pool = the game's animals / plants plus the ones found by scanning other mods (project.scanned)
  function wildPool(kind, project) {
    const byId = new Map();
    for (const e of CATALOG.biomeData[kind] || []) byId.set(e.id, e);
    for (const e of (project && project.scanned && project.scanned[kind]) || []) if (!byId.has(e.id)) byId.set(e.id, e);
    return [...byId.values()];
  }
  const RULE_OPS = [
    ['>=', 'at least'],
    ['<=', 'at most'],
    ['=', 'exactly'],
  ];
  function matchRule(r, kind, project) {
    const thr = Number(r.value);
    if (!r.stat || r.value === '' || r.value == null || Number.isNaN(thr)) return [];
    const ok = (v) => (r.op === '<=' ? v <= thr : r.op === '=' ? v === thr : v >= thr);
    return wildPool(kind, project).filter((e) => e.stats && typeof e.stats[r.stat] === 'number' && ok(e.stats[r.stat]));
  }
  // -> [{id, commonality}] : explicit entries win over rules, the first rule wins over later ones
  function resolveWild(list, kind, project) {
    const out = new Map();
    for (const e of list || []) if (e && !e.rule && e.id && !out.has(e.id)) out.set(e.id, { id: e.id, commonality: e.commonality });
    for (const e of list || [])
      if (e && e.rule) for (const m of matchRule(e, kind, project)) if (!out.has(m.id)) out.set(m.id, { id: m.id, commonality: e.commonality });
    return [...out.values()];
  }
  // Fill an item's stack size, categories, sound and numbers from its preset.
  function isFood(it) {
    return !!(CATALOG.itemPresets[it.preset] || {}).food;
  }
  function applyItemPreset(it) {
    const p = CATALOG.itemPresets[it.preset] || CATALOG.itemPresets.resource;
    it.stackLimit = p.stack;
    it.thingCategories = [...p.cats];
    it.soundDrop = p.sound;
    it.tradeability = p.trade;
    it.stats = { ...p.stats };
    const ig = p.ingest;
    if (ig) {
      it.foodType = ig.foodType;
      it.preferability = ig.preferability;
      it.ingestSound = ig.sound;
      it.ingestEffect = ig.effect;
      it.tasteThought = ig.taste;
      it.rotDays = ig.rot;
      it.joy = p.food === 'drug' ? 0.8 : 0;
      it.joyKind = p.food === 'drug' ? 'Chemical' : 'Gluttonous';
      it.drugCategory = 'Social';
      it.highHours = 6;
      it.highMood = 10;
      it.highConsciousness = 0;
      it.highMoving = 0;
      it.highPain = 0;
      it.highHunger = 0;
      it.addictive = false;
      it.addictiveness = 0.05;
      it.minTolerance = 0.15;
      it.toleranceGain = 0.03;
      it.toleranceFade = 0.015;
      it.withdrawMood = -20;
      it.withdrawConsciousness = -0.2;
      it.withdrawMoving = -0.15;
      it.withdrawRecover = 0.0333;
    }
    if (p.bench) it.workbenches = [...p.bench];
    if (p.food) it.craftStyle = 'workshop';
    if (p.chunk) {
      it.isStuff = false;
      it.deposit = false;
    }
  }
  // Fill a building's size / walking / stats from its preset (the user can still change everything afterwards).
  function applyBuildPreset(it) {
    const p = CATALOG.buildPresets[it.preset] || CATALOG.buildPresets.other;
    it.sizeX = p.size[0];
    it.sizeZ = p.size[1];
    it.passability = p.passability;
    it.pathCost = p.pathCost;
    it.fillPercent = p.fill;
    it.rotatable = p.rotatable;
    it.surface = p.surface;
    it.sittable = p.sittable;
    it.designation = p.designation;
    if (p.wall) {
      it.useStuff = true;
      it.stuffCategories = ['Metallic', 'Woody', 'Stony'];
      it.stuffCount = 5;
      it.stats = {};
    }
    if (p.crafted) {
      it.useStuff = true;
      it.stuffCategories = ['Metallic', 'Woody', 'Stony'];
      it.stuffCount = 50;
      it.craftable = true;
      it.craftStyle = 'sculpting';
      it.workbenches = [...CATALOG.craftStyles.sculpting.benches];
      it.research = '';
      it.stats = { ...p.stats };
    } else if (it.craftable) it.craftable = false;
    if (p.bench) {
      it.powerUse = it.powerUse === undefined ? 0 : it.powerUse;
      it.unpoweredSpeed = it.unpoweredSpeed || 0.5;
      it.useStuff = true;
      it.stuffCategories = ['Metallic', 'Woody'];
      it.stuffCount = 75;
    }
    it.stats = Object.assign({}, it.stats || {});
    delete it.stats.Comfort;
    Object.assign(it.stats, p.stats);
  }
  // Choosing a "how it is made" style also picks its usual workbench and research (the user can still change them).
  function applyCraftStyle(it) {
    const c = CATALOG.craftStyles[it.craftStyle];
    if (!c) return;
    it.workbenches = [...c.benches];
    if (c.research) {
      it.research = c.research;
      it.researchCustom = '';
    } else if (it.research === 'Gunsmithing' || it.research === 'PoweredArmor') it.research = '';
  }
  // which "how it is made" styles make sense for each type
  function stylesFor(it) {
    const all = Object.entries(CATALOG.craftStyles);
    const by = (f) => all.filter(([, c]) => f(c)).map(([v]) => v);
    if (it.type === 'weapon') return by((c) => c.for === 'weapon');
    if (it.type === 'item') return by((c) => c.for === 'item' || c.for === 'weapon');
    if (it.type === 'building') return by((c) => c.for === 'building' || c.for === 'item');
    if (it.type === 'implant') return by((c) => c.for === 'implant');
    return by((c) => c.for === 'apparel');
  }
  function styleOf(it) {
    if (stylesFor(it).includes(it.craftStyle)) return [it.craftStyle, CATALOG.craftStyles[it.craftStyle]];
    const def = it.type === 'weapon' ? (it.mode === 'melee' ? 'smithing' : 'gun') : it.type === 'item' ? 'workshop' : it.type === 'implant' ? 'bionics' : it.type === 'building' ? 'sculpting' : 'tailoring';
    return [def, CATALOG.craftStyles[def]];
  }
  const TYPE_LABELS = {
    apparel: 'Apparel',
    weapon: 'Weapon',
    building: 'Building',
    item: 'Item',
    floor: 'Floor',
    gene: 'Gene',
    ability: 'Ability',
    hediff: 'Condition (hediff)',
    implant: 'Implant / bionic part',
    research: 'Research project',
    incident: 'Event (random incident)',
    trait: 'Trait',
    thought: 'Thought (mood effect)',
    mech: 'Mechanoid (Biotech)',
    recipe: 'Recipe (bill at a bench)',
    xenotype: 'Xenotype (a group of genes)',
    xmlfile: 'Your own XML (Defs / Patch)',
    animal: 'Animal',
    plant: 'Plant',
    biome: 'Biome',
    projectile: 'Projectile',
    hair: 'Hair',
    beard: 'Beard',
    head: 'Head',
    body: 'Body',
  };
  const fieldsFor = (type) =>
    type === 'xmlfile'
      ? [{ k: 'label', t: 'text', label: 'Name of this file (only for you)' }, { k: 'defName', t: 'text', label: 'File name part', help: 'Becomes part of the file name. Letters, digits and _ only; filled in from the name if empty.' }, ...FIELDS.xmlfile]
      : [
    ...FIELDS.common,
    ...(FIELDS[type] || []),
    ...FIELDS.extra,
    ...(type === 'apparel' || type === 'weapon' || type === 'item' || type === 'building' ? FIELDS.craftRecipe : []),
    ...(type === 'apparel' || type === 'weapon' || type === 'building' ? FIELDS.materials : []),
  ];

  function newProject() {
    return {
      version: 1,
      meta: { name: 'My Mod', author: 'Me', packageId: 'me.mymod', description: '', versions: '1.6, 1.7', prefix: '', spriteSize: 'square' },
      items: [],
    };
  }

  return {
    applyBuildPreset,
    applyItemPreset,
    applyFloorPreset,
    applyGenePreset,
    applyShape,
    applyMechPreset,
    CONDITION_EFFECTS,
    MECH_PRESETS,
    MECH_STATS,
    applyAnimalPreset,
    ANIMAL_PRESETS,
    ANIMAL_STATS,
    SHAPES,
    defOf,
    applyPlantPreset,
    PLANT_STATS,
    PLANT_PRESETS,
    FLOOR_STATS,
    wildPool,
    matchRule,
    resolveWild,
    RULE_OPS,
    ITEM_STATS,
    STUFF_POWER,
    STUFF_FACTORS,
    BUILDING_STATS,
    applyCraftStyle,
    styleOf,
    stylesFor,
    CATALOG,
    APPAREL_FIXED,
    APPAREL_STUFF,
    APPAREL_STATS,
    WEAPON_STATS,
    RANGED_STATS,
    FIELDS,
    TYPE_LABELS,
    newItem,
    newProject,
    fieldsFor,
  };
});
