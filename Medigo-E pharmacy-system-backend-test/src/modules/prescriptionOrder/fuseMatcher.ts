import Fuse from 'fuse.js';
import Product from '../product/Product.schema';

type IndexableProduct = {
  _id: string;
  name: string;
  genericName: string;
  brandName: string;
  strength: string;
  price: number;
  salePrice: number | null;
  stockQty: number;
  dosageForm?: string;
};

let cached: { fuse: Fuse<IndexableProduct>; products: IndexableProduct[] } | null = null;

const normalize = (s?: string) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const removeStrengthAndForm = (value: string) => value
  .replace(/\b\d+(?:\.\d+)?\s*(?:mg|mcg|g|ml|iu)\b/gi, '')
  .replace(/\b(?:tablet|tablets|capsule|capsules|syrup|injection|sprinkle|mups|cream|drops?)\b/gi, '')
  .replace(/\s+/g, ' ')
  .trim();

const formatProductName = (product: IndexableProduct) => {
  const name = String(product.name || '').trim();
  const normalizedName = normalize(name);
  const dosageForm = product.dosageForm === 'other'
    ? ''
    : String(product.dosageForm || '').replace(/^\w/, (letter) => letter.toUpperCase());
  const additions = [product.strength, dosageForm]
    .map((value) => String(value || '').trim())
    .filter((value) => value && !normalizedName.includes(normalize(value)));

  return [name, ...additions].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
};

export async function ensureCatalogLoaded() {
  if (cached) return cached;

  const products = await Product.find({ status: 'active' })
    .select('_id name genericName brandName strength price salePrice stockQty dosageForm')
    .lean();

  const indexable = (products || []).map((p: any) => ({
    _id: String(p._id),
    name: p.name || '',
    genericName: p.genericName || '',
    brandName: p.brandName || '',
    strength: p.strength || '',
    dosageForm: p.dosageForm || 'other',
    price: Number(p.salePrice ?? p.price ?? 0),
    salePrice: p.salePrice ?? null,
    stockQty: Number(p.stockQty ?? 0),
  }));

  const fuse = new Fuse<IndexableProduct>(indexable, {
    keys: ['name', 'genericName', 'brandName', 'strength'],
    threshold: 0.6,
    includeScore: true,
    ignoreLocation: true,
    minMatchCharLength: 2,
  });

  cached = { fuse, products: indexable };
  return cached;
}

export async function matchMedicineFuse(drugName: string, limit = 6): Promise<Array<{ _id: string; name: string; price: number; stock: number; score: number }>> {
  if (!drugName || !drugName.trim()) return [] as Array<{ _id: string; name: string; price: number; stock: number; score: number }>;

  const loaded = await ensureCatalogLoaded();
  const fuse = loaded.fuse;
  const query = normalize(drugName);
  const requestedStrength = query.match(/\b\d+(?:\.\d+)?\s*(?:mg|mcg|g|ml|iu)\b/i)?.[0];
  const requestedStrengthValue = requestedStrength ? Number(requestedStrength.match(/[\d.]+/)?.[0]) : null;
  const nameQuery = removeStrengthAndForm(query) || query;
  const results = fuse.search(nameQuery, { limit: loaded.products.length }) as Array<{ item: IndexableProduct; score?: number }>;

  return results
    .filter((r: { item: IndexableProduct; score?: number }) => {
      if (requestedStrengthValue === null || !r.item.strength) return true;
      const candidateStrengthValue = Number(String(r.item.strength).match(/[\d.]+/)?.[0]);
      return !Number.isFinite(candidateStrengthValue) || candidateStrengthValue === requestedStrengthValue;
    })
    .slice(0, limit)
    .map((r: { item: IndexableProduct; score?: number }) => ({
    _id: String(r.item._id),
    name: formatProductName(r.item),
    genericName: r.item.genericName,
    brandName: r.item.brandName,
    strength: r.item.strength,
    dosageForm: r.item.dosageForm,
    price: Number(r.item.price ?? 0),
    salePrice: r.item.salePrice ?? null,
    stock: Number(r.item.stockQty ?? 0),
    score: Number(1 - (r.score ?? 1)),
    }));
}

export function selectBestSuggestion(suggestions: Array<{ _id: string; score: number }>, threshold = 0.5) {
  if (!suggestions || suggestions.length === 0) return null;
  const best = suggestions[0];
  return best.score >= threshold ? String(best._id) : null;
}

export function clearMatcherCache() {
  cached = null;
}
