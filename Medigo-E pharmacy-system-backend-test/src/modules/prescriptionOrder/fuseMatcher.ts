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
    keys: ['name', 'genericName', 'brandName'],
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
  const results = fuse.search(query || drugName, { limit }) as Array<{ item: IndexableProduct; score?: number }>;

  return results.map((r: { item: IndexableProduct; score?: number }) => ({
    _id: String(r.item._id),
    name: r.item.name,
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
