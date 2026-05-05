// Uzbek-aware slugifier. Produces lowercase, hyphenated, ASCII slug.
const map: Record<string, string> = {
    "ʻ": "", "ʼ": "", "'": "", "‘": "", "’": "",
    "ў": "u", "Ў": "u",
    "ғ": "g", "Ғ": "g",
    "қ": "q", "Қ": "q",
    "ҳ": "h", "Ҳ": "h",
    "а": "a", "б": "b", "в": "v", "г": "g", "д": "d", "е": "e", "ё": "yo",
    "ж": "j", "з": "z", "и": "i", "й": "y", "к": "k", "л": "l", "м": "m",
    "н": "n", "о": "o", "п": "p", "р": "r", "с": "s", "т": "t", "у": "u",
    "ф": "f", "х": "x", "ц": "ts", "ч": "ch", "ш": "sh", "щ": "sh",
    "ъ": "", "ы": "i", "ь": "", "э": "e", "ю": "yu", "я": "ya",
    "А": "a", "Б": "b", "В": "v", "Г": "g", "Д": "d", "Е": "e", "Ё": "yo",
    "Ж": "j", "З": "z", "И": "i", "Й": "y", "К": "k", "Л": "l", "М": "m",
    "Н": "n", "О": "o", "П": "p", "Р": "r", "С": "s", "Т": "t", "У": "u",
    "Ф": "f", "Х": "x", "Ц": "ts", "Ч": "ch", "Ш": "sh", "Щ": "sh",
    "Ъ": "", "Ы": "i", "Ь": "", "Э": "e", "Ю": "yu", "Я": "ya",
};

export function slugify(input: string): string {
    let s = (input || "").trim().toLowerCase();
    s = Array.from(s).map((c) => (map[c] !== undefined ? map[c] : c)).join("");
    s = s
        .normalize("NFKD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .replace(/-{2,}/g, "-");
    return s || "restoran";
}
