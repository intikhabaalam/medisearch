import mongoose from "mongoose";
import Product from "../../models/productModel.js";
import { enrichMedicineAssets, searchRealMedicines } from "../../services/openFdaService.js";

function present(value) {
    if (Array.isArray(value)) return value.filter(Boolean);
    if (typeof value === "string") return value.trim();
    return value;
}

function normalizeProductData(product) {
    if (!product) return null;
    const doc = product.toObject ? product.toObject() : product;

    return {
        ...doc,
        brand: present(doc.brand) || doc.name,
        genericName: present(doc.genericName) || "",
        activeIngredient: present(doc.activeIngredient) || "",
        manufacturer: present(doc.manufacturer) || "",
        dosageForm: present(doc.dosageForm) || "",
        strength: present(doc.strength) || "",
        category: present(doc.category) || "",
        indications: Array.isArray(doc.indications) ? doc.indications.filter(Boolean) : [],
        warnings: Array.isArray(doc.warnings) ? doc.warnings.filter(Boolean) : [],
        packaging: present(doc.packaging) || "",
        dosageLabel: present(doc.dosageLabel) || "",
        rxRequired: doc.rxRequired ?? false,
        rating: doc.rating || null,
        reviewsCount: doc.reviewsCount || null,
        source: doc.source || "catalog",
        priceSource: doc.priceSource || "catalog",
        imageIsOfficial: Boolean(doc.imageIsOfficial),
        stock: Number.isFinite(Number(doc.stock)) ? Number(doc.stock) : 0,
        price: Number(doc.price) || 0
    };
}

function catalogDescription(fdaMed) {
    return fdaMed.description
        || fdaMed.indications?.[0]
        || [fdaMed.brand, fdaMed.genericName, fdaMed.strength].filter(Boolean).join(" — ")
        || "FDA-listed medicine";
}

function catalogPrice(fdaMed) {
    if (Number.isFinite(Number(fdaMed.price)) && Number(fdaMed.price) > 0) {
        return Number(fdaMed.price);
    }
    return 99;
}

async function persistFdaMedicine(fdaMed) {
    const ndc = fdaMed.ndc || "";
    const brand = fdaMed.brand || fdaMed.name;
    const genericName = fdaMed.genericName || "";

    const existingQuery = [];
    if (ndc) existingQuery.push({ ndc });
    if (brand && genericName) {
        existingQuery.push({
            brand: new RegExp(`^${brand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
            genericName: new RegExp(`^${genericName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i")
        });
    }
    existingQuery.push({
        name: new RegExp(`^${String(fdaMed.name || brand).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i")
    });

    let existing = await Product.findOne({ $or: existingQuery });
    if (existing) {
        const updates = {};
        if (!existing.brand && brand) updates.brand = brand;
        if (!existing.genericName && genericName) updates.genericName = genericName;
        if (!existing.activeIngredient && fdaMed.activeIngredient) updates.activeIngredient = fdaMed.activeIngredient;
        if (!existing.manufacturer && fdaMed.manufacturer) updates.manufacturer = fdaMed.manufacturer;
        if (!existing.dosageForm && fdaMed.dosageForm) updates.dosageForm = fdaMed.dosageForm;
        if (!existing.strength && fdaMed.strength) updates.strength = fdaMed.strength;
        if (!existing.category && fdaMed.category) updates.category = fdaMed.category;
        if ((!existing.indications || existing.indications.length === 0) && fdaMed.indications?.length) {
            updates.indications = fdaMed.indications;
        }
        if ((!existing.warnings || existing.warnings.length === 0) && fdaMed.warnings?.length) {
            updates.warnings = fdaMed.warnings;
        }
        if (!existing.packaging && fdaMed.packaging) updates.packaging = fdaMed.packaging;
        if (!existing.dosageLabel && fdaMed.dosageLabel) updates.dosageLabel = fdaMed.dosageLabel;
        if (!existing.ndc && ndc) updates.ndc = ndc;
        if (fdaMed.image && fdaMed.imageIsOfficial) {
            updates.image = fdaMed.image;
            updates.imageIsOfficial = true;
        }
        if (fdaMed.price && existing.priceSource !== "nadac" && fdaMed.priceSource === "nadac") {
            updates.price = fdaMed.price;
            updates.priceSource = "nadac";
        }
        if (Object.keys(updates).length > 0) {
            existing.set(updates);
            await existing.save();
        }
        return existing;
    }

    return Product.create({
        name: fdaMed.name || brand,
        brand,
        genericName,
        activeIngredient: fdaMed.activeIngredient || "",
        manufacturer: fdaMed.manufacturer || "",
        dosageForm: fdaMed.dosageForm || "",
        strength: fdaMed.strength || "",
        category: fdaMed.category || "",
        description: catalogDescription(fdaMed),
        indications: fdaMed.indications || [],
        warnings: fdaMed.warnings || [],
        packaging: fdaMed.packaging || "",
        dosageLabel: fdaMed.dosageLabel || "",
        rxRequired: fdaMed.rxRequired ?? false,
        price: catalogPrice(fdaMed),
        priceSource: fdaMed.priceSource || "catalog",
        stock: 50,
        expiresOn: "2028-12-31",
        image: fdaMed.image,
        imageIsOfficial: Boolean(fdaMed.imageIsOfficial),
        ndc,
        source: "openfda",
        isActive: true
    });
}

/**
 * GET /api/products
 */
const getProducts = async (req, res) => {
    try {
        const products = await Product.find({ isActive: true }).sort({ createdAt: -1 });
        res.status(200).json(products.map(normalizeProductData));
    } catch (err) {
        console.error("getProducts error:", err.message);
        res.status(500).json({ error: "Failed to fetch products", details: err.message });
    }
};

/**
 * GET /api/products/search?q=...
 */
const searchMedicines = async (req, res) => {
    const rawQuery = req.query.q || req.query.query || req.query.search || "";
    const cleanQuery = rawQuery.trim();

    if (!cleanQuery) {
        const allProducts = await Product.find({ isActive: true }).limit(24);
        return res.status(200).json({
            query: "",
            count: allProducts.length,
            medicines: allProducts.map(normalizeProductData),
            sourceError: null
        });
    }

    try {
        const escapedQuery = cleanQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const regex = new RegExp(escapedQuery, "i");

        const localProducts = await Product.find({
            isActive: true,
            $or: [
                { name: regex },
                { description: regex },
                { brand: regex },
                { genericName: regex },
                { activeIngredient: regex }
            ]
        }).lean();

        const combinedResults = [...localProducts.map(normalizeProductData)];
        const existingNames = new Set(
            combinedResults.map((p) => `${(p.brand || p.name || "").toLowerCase()}|${(p.genericName || "").toLowerCase()}`)
        );

        let sourceError = null;
        try {
            const fdaResult = await searchRealMedicines(cleanQuery, 8);
            sourceError = fdaResult.sourceError || null;

            for (const fdaMed of fdaResult.medicines || []) {
                const medKey = `${(fdaMed.brand || fdaMed.name || "").toLowerCase()}|${(fdaMed.genericName || "").toLowerCase()}`;
                if (existingNames.has(medKey)) continue;

                const persisted = await persistFdaMedicine(fdaMed);
                combinedResults.push(normalizeProductData(persisted));
                existingNames.add(medKey);
            }
        } catch (apiErr) {
            sourceError = apiErr.message || "Medicine database is temporarily unavailable";
            console.warn("[searchMedicines] OpenFDA query warning, serving local results:", sourceError);
        }

        res.status(200).json({
            query: cleanQuery,
            count: combinedResults.length,
            medicines: combinedResults,
            sourceError
        });
    } catch (err) {
        console.error("searchMedicines error:", err.message);
        res.status(500).json({ error: "Failed to perform medicine search", details: err.message });
    }
};

/**
 * GET /api/products/:pid
 */
const getProduct = async (req, res) => {
    const { pid } = req.params;

    try {
        let product = null;

        if (mongoose.Types.ObjectId.isValid(pid)) {
            product = await Product.findById(pid);
        }

        if (!product) {
            const escaped = String(pid).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            product = await Product.findOne({
                $or: [
                    { name: new RegExp(`^${escaped}$`, "i") },
                    { brand: new RegExp(`^${escaped}$`, "i") }
                ]
            });
        }

        if (!product && !mongoose.Types.ObjectId.isValid(pid)) {
            const fdaResult = await searchRealMedicines(pid, 1);
            if (fdaResult.medicines?.length) {
                product = await persistFdaMedicine(fdaResult.medicines[0]);
            }
        }

        if (!product) {
            return res.status(404).json({ error: "Medicine not found in catalog or approved pharmacopeia." });
        }

        res.status(200).json(normalizeProductData(product));
    } catch (err) {
        console.error("getProduct error:", err.message);
        res.status(500).json({ error: "Failed to retrieve medicine details", details: err.message });
    }
};

const productController = {
    getProducts,
    searchMedicines,
    getProduct
};

export default productController;
