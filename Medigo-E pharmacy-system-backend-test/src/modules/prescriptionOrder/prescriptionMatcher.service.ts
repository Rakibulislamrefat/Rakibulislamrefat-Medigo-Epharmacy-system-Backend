import Product from "../product/Product.schema";
import { matchMedicineFuse, selectBestSuggestion } from './fuseMatcher';

export type ParsedPrescriptionLine = {
  ocrLine: string;
  parsedName: string;
  quantity: number;
  suggestions: Array<{
    _id: string;
    name: string;
    price: number;
    stock: number;
    score: number;
  }>;
  selectedMedicineId: string | null;
  manualReview: boolean;
};

const normalizeText = (value: string) => String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

const stripCommonPrefixes = (line: string) => {
  return line
    .replace(/^\d+\s*[.):-]\s*/i, "")
    .replace(/^\s*(tab|cap|syp|inj|tablet|capsule|syrup|injection)\.?\s+/i, "")
    .trim();
};

export const parseOcrLines = (ocrText: string): string[] => {
  if (!ocrText || !String(ocrText).trim()) return [];

  const lines = String(ocrText)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const meaningfulLines: string[] = [];

  for (const line of lines) {
    const lower = line.toLowerCase();

    if (
      lower.includes("doctor") ||
      lower.includes("signature") ||
      lower.includes("advice") ||
      lower.includes("follow up") ||
      lower.includes("pharmacy") ||
      lower.includes("date") ||
      lower.includes("patient") ||
      lower.includes("name")
    ) {
      continue;
    }

    if (/^\d+[.):-]/.test(line) || /^(tab|cap|syp|inj|tablet|capsule|syrup|injection)\b/i.test(line)) {
      meaningfulLines.push(line);
    }
  }

  return meaningfulLines;
};

export const extractDrugName = (line: string): string => {
  if (!line) return "";

  let cleaned = stripCommonPrefixes(line);

  const strengthIndex = cleaned.search(/\b\d+(?:\.\d+)?\s*(?:mg|mcg|g|ml|iu)\b/i);
  if (strengthIndex > 0) {
    cleaned = cleaned.slice(0, strengthIndex);
  }

  // Remove common dosage and strength patterns like 665mg, 20 mg, 5ml, 1+0+1
  cleaned = cleaned.replace(/\b\d+(?:\.\d+)?\s*(?:mg|mcg|g|ml|iu)\b/gi, "");
  cleaned = cleaned.replace(/\b\d+(?:\s*tsf)?\s*[+\-]\s*\d+(?:\s*tsf)?\s*[+\-]\s*\d+(?:\s*tsf)?\b/gi, "");
  cleaned = cleaned.replace(/\b(?:od|bd|tid|qid|hs|ac|pc|stat)\b/gi, "");
  cleaned = cleaned.replace(/\b(?:as advised|as directed|for|days|day|after|before|breakfast|lunch|dinner|meal|meals|twice|thrice|once|daily|weekly)\b/gi, "");
  cleaned = cleaned.replace(/\b\d+\s*(?:days?|weeks?|months?)\b/gi, "");
  cleaned = cleaned.replace(/\b(?:tab|cap|syp|inj|tablet|capsule|syrup|injection)\b/gi, "");
  cleaned = cleaned.replace(/\s+/g, " ").trim();

  return cleaned.replace(/^[,;:-]+|[,;:-]+$/g, "").trim();
};

export const extractQuantity = (line: string): number => {
  if (!line) return 1;

  const dayMatch = line.match(/\b(\d+)\s*(?:days?|weeks?|months?)\b/i);
  const frequencyMatch = line.match(/\b(\d+)\s*[+\-]\s*(\d+)\s*[+\-]\s*(\d+)\b/);

  if (frequencyMatch) {
    const doseCount = [Number(frequencyMatch[1]), Number(frequencyMatch[2]), Number(frequencyMatch[3])]
      .filter((value) => Number.isFinite(value) && value >= 0)
      .reduce((sum, value) => sum + value, 0);

    if (dayMatch) {
      return Math.max(1, doseCount * Number(dayMatch[1]));
    }
    return Math.max(1, doseCount);
  }

  if (dayMatch) {
    return Math.max(1, Number(dayMatch[1]));
  }

  return 1;
};

export const matchMedicine = async (drugName: string) => {
  if (!drugName || !drugName.trim()) return [];
  const results = await matchMedicineFuse(drugName);
  return results.map((r: any) => ({ _id: r._id, name: r.name, price: r.price, stock: r.stock, score: r.score }));
};

export const autoMatchPrescription = async (prescriptionOrder: any) => {
  const ocrText = prescriptionOrder?.extractedText || prescriptionOrder?.ocrText || "";
  const lines = parseOcrLines(ocrText);

  const items: ParsedPrescriptionLine[] = [];

  for (const line of lines) {
    const parsedName = extractDrugName(line);
    const strength = line.match(/\b\d+(?:\.\d+)?\s*(?:mg|mcg|g|ml|iu)\b/i)?.[0] || "";
    const suggestions = parsedName ? await matchMedicine(`${parsedName} ${strength}`.trim()) : [];
    const selectedMedicineId = suggestions.length ? selectBestSuggestion(suggestions as any, 0.5) : null;

    items.push({
      ocrLine: line,
      parsedName,
      quantity: extractQuantity(line),
      suggestions,
      selectedMedicineId,
      manualReview: suggestions.length === 0 || !selectedMedicineId,
    });
  }

  return {
    items,
    status: "pending_verification",
  };
};

export const calculateOrderTotals = async (items: any[], deliveryFee = 0, discount = 0) => {
  const itemTotals = [] as Array<{ itemId?: string; medicineId?: string | null; unitPrice: number; quantity: number; lineTotal: number }>;

  for (const item of items || []) {
    const medicineId = item?.selectedMedicineId || item?.medicineId;
    if (!medicineId) {
      itemTotals.push({
        itemId: item?.id || item?.ocrLine,
        medicineId: null,
        unitPrice: 0,
        quantity: Number(item?.quantity || 1),
        lineTotal: 0,
      });
      continue;
    }

    const product: any = await Product.findById(medicineId).select("price salePrice stockQty").lean();
    const unitPrice = Number(product?.salePrice ?? product?.price ?? 0);
    const quantity = Math.max(Number(item?.quantity || 1), 1);

    itemTotals.push({
      itemId: item?.id || item?.ocrLine,
      medicineId: String(medicineId),
      unitPrice,
      quantity,
      lineTotal: unitPrice * quantity,
    });
  }

  const subtotal = itemTotals.reduce((sum, entry) => sum + Number(entry.lineTotal || 0), 0);
  const totalDiscount = Number(discount || 0);
  const totalDeliveryFee = Number(deliveryFee || 0);
  const finalTotal = Math.max(0, subtotal + totalDeliveryFee - totalDiscount);

  return {
    items: itemTotals,
    subtotal,
    deliveryFee: totalDeliveryFee,
    discount: totalDiscount,
    finalTotal,
  };
};
