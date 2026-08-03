import Tesseract from 'tesseract.js';
import Fuse from 'fuse.js';
import { ApiError } from '../../shared/utils';
import Product from '../product/Product.schema';

export type SuggestedMedicine = {
  id: string | null;
  rawText: string;
  name: string;
  genericName?: string;
  brandName?: string;
  strength?: string;
  dosage: string;
  quantity: number;
  price: number | null;
  salePrice?: number | null;
  stockQty: number;
  available: boolean;
  matchConfidence: number;
  productInfo?: Record<string, any> | null;
};

export class OCRService {
  /**
   * Extract text from prescription image using Tesseract.js
   * Supports image URLs (Cloudinary) and local file paths
   */
  static async extractTextFromPrescription(imagePath: string): Promise<string> {
    try {
      if (!imagePath) {
        throw new ApiError(400, 'Image path is required');
      }

      const { data } = await Tesseract.recognize(imagePath, 'eng', {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
          }
        },
      });

      if (!data.text) {
        throw new ApiError(500, 'No text could be extracted from the prescription');
      }

      return data.text.trim();
    } catch (error) {
      console.error('OCR Error:', error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, `OCR processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private static normalizeName(value: string): string {
    return String(value || '')
      .toLowerCase()
      .replace(/\b(tab|cap|syp|inj|tablet|capsule|syrup|injection)\.?\b/gi, '')
      .replace(/\b\d+(?:\.\d+)?\s*(?:mg|mcg|g|ml|iu)\b/gi, '')
      .replace(/\b\d+\s*[+\-]\s*\d+\s*[+\-]\s*\d+\b/g, '')
      .replace(/\b(?:od|bd|tid|qid|hs|ac|pc|stat)\b/gi, '')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  /**
   * Parse OCR text into individual prescription line items.
   * It intentionally skips header / footer / advice / signature sections.
   */
  static parseMedicinesFromText(text: string): Array<{ name: string; dosage: string; quantity: string }> {
    const medicines: Array<{ name: string; dosage: string; quantity: string }> = [];

    if (!text) return medicines;

    const lines = String(text).split(/[\n\r]+/).map((line) => line.trim()).filter(Boolean);

    for (const line of lines) {
      const lower = line.toLowerCase();

      if (
        lower.includes('doctor') ||
        lower.includes('signature') ||
        lower.includes('patient') ||
        lower.includes('date') ||
        lower.includes('diagnosis') ||
        lower.includes('advice') ||
        lower.includes('follow up') ||
        lower.includes('note') ||
        lower.includes('pharmacy') ||
        lower.includes('sample') ||
        lower.includes('fictitious') ||
        lower.includes('document') ||
        lower.includes('medical record') ||
        lower.includes('repeat') ||
        lower.includes('created') ||
        lower.includes('software') ||
        lower.includes('testing') ||
        lower.startsWith('dr.') ||
        lower.startsWith('dr')
      ) {
        continue;
      }

      const hasMedicineEvidence = /\b(?:\d+(?:\.\d+)?\s*(?:mg|g|mcg|ml|iu)|\d+\s*[+\-]\s*\d+\s*[+\-]\s*\d+|x\s*\d+|(?:tablet|capsule|syrup|injection|tab|cap|syp|inj|spray|drop|cream)\b|\b(?:od|bd|tid|qid|hs|ac|pc|stat)\b|\b(?:after|before)\s+(?:\d+\s*)?(?:meals?|days?|weeks?|months?)\b)/i.test(line);
      if (!hasMedicineEvidence) continue;

      const cleanedLine = line.replace(/^\d+[.):-]\s*/i, '').trim();
      const match = cleanedLine.match(/^([A-Za-z][A-Za-z0-9 .()-]+?)(?=\s+(?:\d+(?:\.\d+)?\s*(?:mg|g|mcg|ml|iu)|\d+\s*[+\-]\s*\d+\s*[+\-]\s*\d+|x\s*\d+|for\b|days?|weeks?|months?|after|before|meal|meals))/i);

      let rawName = (match?.[1] || cleanedLine)
        .replace(/\b(tab|cap|syp|inj|tablet|capsule|syrup|injection)\.??\b/gi, '')
        .replace(/\d+\s*[+\-]\s*\d+\s*[+\-]\s*\d+(?:tsf)?/gi, '')
        .replace(/\b(after|before|for|as needed|at night|at morning|after meals|before breakfast|after lunch|after dinner|at night|at morning|at noon)\b.*$/i, '')
        .replace(/^[\s\.\-]+/, '')
        .replace(/\s+/g, ' ')
        .trim();
      const dosageMatch = cleanedLine.match(/(\d+(?:\.\d+)?\s*(?:mg|g|mcg|ml|iu))/i);
      const dosage = dosageMatch?.[1] || '';
      const frequencyMatch = cleanedLine.match(/(\d+(?:tsf)?)[+\-](\d+(?:tsf)?)[+\-](\d+(?:tsf)?)/i);
      const quantityMatch = cleanedLine.match(/(?:x|X)\s*(\d+)/i);
      const quantity = frequencyMatch
        ? String(
            [frequencyMatch[1], frequencyMatch[2], frequencyMatch[3]].reduce(
              (sum, part) => sum + Number(String(part).replace(/\D/g, '')),
              0
            )
          )
        : quantityMatch?.[1] || '1';

      if (!rawName || rawName.length < 2) continue;

      medicines.push({
        name: rawName.replace(/\s+/g, ' '),
        dosage,
        quantity,
      });
    }

    return medicines;
  }

  static async matchMedicinesFromText(text: string): Promise<SuggestedMedicine[]> {
    if (!text?.trim()) return [];

    const parsedMedicines = this.parseMedicinesFromText(text);

    const products = await Product.find({ status: 'active' })
      .select('_id name genericName brandName strength dosageForm price salePrice stockQty manufacturer categories tags images sku otc requiresPrescription currency')
      .lean();

    const indexableProducts = (products || []).map((product: any) => ({
      _id: String(product._id),
      name: product.name || '',
      genericName: product.genericName || '',
      brandName: product.brandName || '',
      strength: product.strength || '',
      dosageForm: product.dosageForm || 'other',
      price: Number(product.salePrice ?? product.price ?? 0),
      salePrice: product.salePrice ?? null,
      stockQty: Number(product.stockQty ?? 0),
      productInfo: product,
    }));

    const fuse = new Fuse(indexableProducts, {
      keys: ['name', 'genericName', 'brandName'],
      threshold: 0.8,
      includeScore: true,
      ignoreLocation: true,
      minMatchCharLength: 3,
    });

    const suggestions: SuggestedMedicine[] = [];

    for (const item of parsedMedicines) {
      const normalizedName = this.normalizeName(item.name);
      const cleanedLine = normalizedName || this.normalizeName(item.dosage || item.name);
      const searchResults = cleanedLine ? fuse.search(cleanedLine) : [];
      const topResult = searchResults[0] as any;
      const rawScore = Number(topResult?.score ?? 1);
      const matchConfidence = Number(Math.max(0, 1 - rawScore).toFixed(2));
      const product = topResult?.item as any;

      if (!product?._id) {
        suggestions.push({
          id: null,
          rawText: item.name,
          name: item.name,
          dosage: item.dosage || '',
          quantity: Number(item.quantity || 1),
          price: null,
          salePrice: null,
          stockQty: 0,
          available: false,
          matchConfidence: 0,
          productInfo: null,
        });
        continue;
      }

      const isConfident = matchConfidence >= 0.2;
      const stockQty = Number(product?.stockQty ?? 0);
      const available = Boolean(stockQty > 0 && isConfident);
      const price = product ? Number(product.price ?? 0) : null;

      suggestions.push({
        id: String(product._id),
        rawText: item.name,
        name: product.name || item.name,
        genericName: product.genericName || undefined,
        brandName: product.brandName || undefined,
        strength: product.strength || undefined,
        dosage: item.dosage || '',
        quantity: Number(item.quantity || 1),
        price,
        salePrice: product.salePrice ?? null,
        stockQty,
        available,
        matchConfidence: isConfident ? matchConfidence : 0,
        productInfo: {
          _id: String(product._id),
          name: product.name,
          genericName: product.genericName,
          brandName: product.brandName,
          strength: product.strength,
          dosageForm: product.dosageForm,
          price: Number(product.price ?? 0),
          salePrice: product.salePrice ?? null,
          stockQty,
          manufacturer: product.manufacturer,
          categories: product.categories,
          tags: product.tags,
          images: product.images,
          sku: product.sku,
          otc: product.otc,
          requiresPrescription: product.requiresPrescription,
          currency: product.currency,
        },
      });
    }

    return suggestions;
  }

  /**
   * Validate prescription data before sending to pharmacist
   */
  static validateExtractionQuality(text: string): { isValid: boolean; confidence: number } {
    if (!text || text.length < 10) {
      return { isValid: false, confidence: 0 };
    }

    const medicalKeywords = ['mg', 'ml', 'tablet', 'capsule', 'injection', 'spray', 'dose', 'times'];
    const foundKeywords = medicalKeywords.filter((keyword) => text.toLowerCase().includes(keyword)).length;

    const confidence = Math.min(100, (foundKeywords / medicalKeywords.length) * 100);

    return { isValid: foundKeywords >= 1, confidence };
  }
}
