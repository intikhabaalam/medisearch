/**
 * Real medicine data via:
 * 1. OpenFDA NDC + Drug Label APIs (US FDA open data — free)
 * 2. RxNorm (NIH / NLM — free) for international name mapping
 * 3. DailyMed (NIH — free) for official SPL images when available
 * 4. CMS NADAC (Medicaid.gov — free) for pharmacy acquisition cost when available
 *
 * Clinical fields are only returned when the source provides them.
 */

const PLACEHOLDER_IMAGES = {
    capsule: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&q=80&w=800",
    tablet: "https://images.unsplash.com/photo-1550572017-edd951aa8f72?auto=format&fit=crop&q=80&w=800",
    solution: "https://images.unsplash.com/photo-1471864190281-a93a3070b6de?auto=format&fit=crop&q=80&w=800",
    supplements: "https://images.unsplash.com/photo-1577401239170-897942555fb3?auto=format&fit=crop&q=80&w=800",
    general: "https://images.unsplash.com/photo-1587854692152-cbe660dbde88?auto=format&fit=crop&q=80&w=800"
};

const NADAC_DATASTORE =
    "https://data.medicaid.gov/api/1/datastore/query/fbb83258-11c7-47f5-8b18-5f8e79f7e704/0";

function firstValue(value) {
    if (Array.isArray(value)) return value.find(Boolean) || "";
    return value || "";
}

function asList(value) {
    if (!value) return [];
    return Array.isArray(value) ? value.filter(Boolean) : [String(value)];
}

function cleanSectionText(rawText, maxLen = 400) {
    if (!rawText) return "";
    let str = Array.isArray(rawText) ? rawText.join(" ") : String(rawText);
    str = str.replace(/\s+/g, " ").trim();
    if (str.length > maxLen) {
        str = str.slice(0, maxLen).replace(/[,;.\s]+$/, "") + "...";
    }
    return str;
}

function parseLabelList(rawText) {
    const text = cleanSectionText(rawText, 600);
    if (!text) return [];
    const sentences = text
        .split(/(?<=[.?!])\s+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 20 && !/^\d+\s+(indications|warnings)/i.test(s));
    return sentences.slice(0, 4);
}

function pickPlaceholderImage(dosageForm = "", category = "") {
    const text = `${dosageForm} ${category}`.toLowerCase();
    if (text.includes("capsule")) return PLACEHOLDER_IMAGES.capsule;
    if (text.includes("tablet") || text.includes("pill")) return PLACEHOLDER_IMAGES.tablet;
    if (text.includes("solution") || text.includes("liquid") || text.includes("suspension") || text.includes("syrup")) {
        return PLACEHOLDER_IMAGES.solution;
    }
    if (text.includes("vitamin") || text.includes("dietary") || text.includes("supplement")) {
        return PLACEHOLDER_IMAGES.supplements;
    }
    return PLACEHOLDER_IMAGES.general;
}

function openFdaUrl(pathname, search, limit) {
    const key = process.env.OPENFDA_API_KEY ? `&api_key=${encodeURIComponent(process.env.OPENFDA_API_KEY)}` : "";
    return `https://api.fda.gov${pathname}?search=${encodeURIComponent(search)}&limit=${limit}${key}`;
}

async function fetchJson(url, timeoutMs = 4000) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const res = await fetch(url, { signal: controller.signal });
        if (res.status === 404) return { results: [] };
        if (!res.ok) {
            const err = new Error(`Upstream responded ${res.status}`);
            err.status = res.status;
            throw err;
        }
        return await res.json();
    } finally {
        clearTimeout(timeout);
    }
}

/**
 * Map international / brand / generic names through RxNorm.
 */
export async function resolveInternationalSynonyms(searchTerm) {
    const synonyms = [searchTerm];
    try {
        const url = `https://rxnav.nlm.nih.gov/REST/drugs.json?name=${encodeURIComponent(searchTerm)}`;
        const data = await fetchJson(url, 2500);
        const groups = data?.drugGroup?.conceptGroup || [];
        for (const group of groups) {
            for (const concept of group.conceptProperties || []) {
                const rxName = (concept.name || "").split(" ")[0];
                const fullName = concept.name || "";
                for (const candidate of [fullName, rxName]) {
                    if (candidate && !synonyms.some((s) => s.toLowerCase() === candidate.toLowerCase())) {
                        synonyms.push(candidate);
                    }
                }
            }
        }
    } catch {
        // Non-blocking: continue with the original term
    }
    return synonyms.slice(0, 3);
}

async function fetchDailyMedImage(drugName) {
    if (!drugName) return "";
    try {
        const listUrl = `https://dailymed.nlm.nih.gov/dailymed/services/v2/spls.json?drug_name=${encodeURIComponent(drugName)}&pagesize=1`;
        const listData = await fetchJson(listUrl, 2500);
        const setId = listData?.data?.[0]?.setid;
        if (!setId) return "";
        const mediaUrl = `https://dailymed.nlm.nih.gov/dailymed/services/v2/spls/${setId}/media.json`;
        const mediaData = await fetchJson(mediaUrl, 2500);
        const media = mediaData?.data || [];
        const image = media.find((m) => {
            const mime = (m.mime_type || m.mimeType || "").toLowerCase();
            const name = (m.name || m.title || "").toLowerCase();
            return mime.includes("image") || /\.(jpg|jpeg|png|gif)$/i.test(name);
        });
        const fileName = image?.name || image?.title;
        if (!fileName) return "";
        return `https://dailymed.nlm.nih.gov/dailymed/image.cfm?setid=${encodeURIComponent(setId)}&name=${encodeURIComponent(fileName)}`;
    } catch {
        return "";
    }
}

async function fetchNadacListingPrice(name) {
    if (!name) return null;
    try {
        const safe = String(name).replace(/'/g, " ").slice(0, 80);
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000);
        let data = null;
        try {
            const res = await fetch(NADAC_DATASTORE, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                signal: controller.signal,
                body: JSON.stringify({
                    limit: 5,
                    conditions: [
                        { resource: "t", property: "ndc_description", value: safe, operator: "contains" }
                    ]
                })
            });
            if (res.ok) data = await res.json();
        } finally {
            clearTimeout(timeout);
        }
        const rows = data?.results || data?.data || [];
        const row = rows.find((r) => r["nadac_per_unit"] || r["NADAC Per Unit"] || r.nadac_per_unit);
        const perUnit = Number(row?.nadac_per_unit ?? row?.["NADAC Per Unit"] ?? row?.nadacPerUnit);
        if (!Number.isFinite(perUnit) || perUnit <= 0) return null;
        // NADAC is USD per unit. Catalog prices are INR; convert a 10-unit pack using a fixed INR reference.
        const inrPack = Math.max(15, Math.round(perUnit * 10 * 84));
        return { price: inrPack, priceSource: "nadac" };
    } catch {
        return null;
    }
}

function buildNdcSearch(term) {
    const escaped = term.replace(/["\\]/g, " ").trim();
    return `(brand_name:"${escaped}" OR generic_name:"${escaped}" OR brand_name:${escaped}* OR generic_name:${escaped}* OR active_ingredients.name:"${escaped}")`;
}

function mapNdcRecord(item) {
    const brand = firstValue(item.brand_name) || firstValue(item.generic_name);
    const generic = firstValue(item.generic_name) || brand;
    const ingredients = asList(item.active_ingredients);
    const activeIngredient = ingredients
        .map((ing) => (typeof ing === "string" ? ing : [ing.name, ing.strength].filter(Boolean).join(" ")))
        .filter(Boolean)
        .join(", ");
    const strength = ingredients
        .map((ing) => (typeof ing === "object" ? ing.strength : ""))
        .filter(Boolean)
        .join(", ");
    const dosageForm = firstValue(item.dosage_form);
    const manufacturer = firstValue(item.labeler_name);
    const category = firstValue(item.pharm_class) || firstValue(item.product_type);
    const packaging = asList(item.packaging)
        .map((pkg) => (typeof pkg === "string" ? pkg : pkg.description))
        .filter(Boolean)
        .join("; ");
    const ndc = firstValue(item.product_ndc) || firstValue(item.package_ndc);
    const productType = (firstValue(item.product_type) || "").toLowerCase();
    const rxRequired = productType.includes("prescription") || (!productType.includes("otc") && productType.includes("human"));

    return {
        name: brand,
        brand,
        genericName: generic,
        activeIngredient: activeIngredient || generic,
        manufacturer,
        dosageForm,
        strength,
        category,
        packaging: cleanSectionText(packaging, 160),
        ndc,
        rxRequired,
        productType
    };
}

async function enrichFromLabel(term, mapped) {
    try {
        const search = `(openfda.brand_name:"${term}" OR openfda.generic_name:"${term}" OR openfda.brand_name:${term}* OR openfda.generic_name:${term}*)`;
        const data = await fetchJson(openFdaUrl("/drug/label.json", search, 5), 4000);
        const labels = data?.results || [];
        const byBrand = new Map();
        for (const label of labels) {
            const ofda = label.openfda || {};
            const key = (firstValue(ofda.brand_name) || firstValue(ofda.generic_name) || "").toLowerCase();
            if (key && !byBrand.has(key)) {
                byBrand.set(key, label);
            }
        }

        return mapped.map((med) => {
            const label = byBrand.get((med.brand || "").toLowerCase())
                || byBrand.get((med.genericName || "").toLowerCase())
                || labels[0];
            if (!label) return med;
            const ofda = label.openfda || {};
            const indications = parseLabelList(label.indications_and_usage || label.purpose);
            const warnings = parseLabelList(label.warnings_and_cautions || label.warnings || label.precautions);
            const dosageText = cleanSectionText(label.dosage_and_administration, 400);
            return {
                ...med,
                manufacturer: med.manufacturer || firstValue(ofda.manufacturer_name),
                category: med.category || firstValue(ofda.pharm_class_cs) || firstValue(ofda.product_type),
                indications,
                warnings,
                dosageLabel: dosageText,
                description: indications[0] || ""
            };
        });
    } catch {
        return mapped;
    }
}

export async function searchRealMedicines(rawQuery, limit = 8) {
    const cleanTerm = (rawQuery || "").trim().replace(/[^a-zA-Z0-9 +.-]/g, "");
    if (!cleanTerm) return { medicines: [], sourceError: null };

    const searchTerms = await resolveInternationalSynonyms(cleanTerm);
    const results = [];
    const seenKeys = new Set();
    let sourceError = null;

    for (const term of searchTerms) {
        if (results.length >= limit) break;
        try {
            const data = await fetchJson(openFdaUrl("/drug/ndc.json", buildNdcSearch(term), limit), 5000);
            const items = data?.results || [];
            if (!items.length) continue;

            const mapped = [];
            for (const item of items) {
                const med = mapNdcRecord(item);
                if (!med.name) continue;
                const key = `${(med.brand || "").toLowerCase()}|${(med.genericName || "").toLowerCase()}|${(med.strength || "").toLowerCase()}`;
                if (seenKeys.has(key)) continue;
                seenKeys.add(key);
                mapped.push(med);
                if (results.length + mapped.length >= limit) break;
            }

            const enriched = await enrichFromLabel(term, mapped);
            results.push(...enriched);
            if (results.length >= limit) break;
        } catch (err) {
            sourceError = err.message || "Medicine database is temporarily unavailable";
            console.warn(`[OpenFDA Search] Term "${term}":`, sourceError);
        }
    }

    const withAssets = results.slice(0, limit).map((med) => ({
        ...med,
        image: pickPlaceholderImage(med.dosageForm, med.category),
        imageIsOfficial: false,
        price: null,
        priceSource: null,
        source: "openfda",
        isActive: true
    }));

    return { medicines: withAssets, sourceError };
}

export async function enrichMedicineAssets(med) {
    if (!med) return med;
    const [image, nadac] = await Promise.all([
        fetchDailyMedImage(med.brand || med.genericName || med.name),
        fetchNadacListingPrice(med.brand || med.genericName || med.name)
    ]);
    return {
        ...med,
        image: image || med.image || pickPlaceholderImage(med.dosageForm, med.category),
        imageIsOfficial: Boolean(image) || Boolean(med.imageIsOfficial),
        price: nadac?.price ?? med.price ?? null,
        priceSource: nadac?.priceSource || med.priceSource || null
    };
}

export async function getRealMedicineByName(name) {
    const { medicines, sourceError } = await searchRealMedicines(name, 1);
    const medicine = medicines[0] ? await enrichMedicineAssets(medicines[0]) : null;
    return { medicine, sourceError };
}

export default {
    searchRealMedicines,
    getRealMedicineByName,
    enrichMedicineAssets,
    resolveInternationalSynonyms
};
