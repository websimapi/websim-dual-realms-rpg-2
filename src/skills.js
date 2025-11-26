// Defines the 30+ skills in opposing pairs
export const SKILL_PAIRS = [
    { a: "Assault", b: "Flee", category: "Combat" },
    { a: "Might", b: "Cower", category: "Combat" },
    { a: "Sorcery", b: "Befuddlement", category: "Combat" },
    { a: "Archery", b: "Arrow-Catching", category: "Combat" },
    { a: "Parrying", b: "Face-Tanking", category: "Combat" },

    { a: "Excavation", b: "Reburying", category: "Gathering" },
    { a: "Lumberjacking", b: "Replanting", category: "Gathering" },
    { a: "Angling", b: "Fish-Releasing", category: "Gathering" },
    { a: "Foraging", b: "Littering", category: "Gathering" },
    { a: "Hunting", b: "Resurrecting", category: "Gathering" },

    { a: "Forging", b: "Unsmithing", category: "Production" },
    { a: "Culinary", b: "Food-Spoiling", category: "Production" },
    { a: "Fletching", b: "Arrow-Unmaking", category: "Production" },
    { a: "Alchemy", b: "Diluting", category: "Production" },
    { a: "Tailoring", b: "Unravelling", category: "Production" },

    { a: "Acrobatics", b: "Stumbling", category: "Utility" },
    { a: "Pilfering", b: "Charitable-Giving", category: "Utility" },
    { a: "Herblore", b: "Weed-Growing", category: "Utility" },
    { a: "Cartography", b: "Getting-Lost", category: "Utility" },
    { a: "Haggling", b: "Getting-Ripped-Off", category: "Utility" }
];

export const LEVEL_TABLE = [];
for (let i = 1; i <= 100; i++) {
    LEVEL_TABLE[i] = Math.floor(100 * Math.pow(1.1, i - 1));
}

export function getLevel(xp) {
    for (let i = 99; i >= 1; i--) {
        if (xp >= LEVEL_TABLE[i]) return i + 1;
    }
    return 1;
}