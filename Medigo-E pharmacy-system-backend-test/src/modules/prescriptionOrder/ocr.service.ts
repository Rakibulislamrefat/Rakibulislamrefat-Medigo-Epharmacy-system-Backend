import Tesseract from 'tesseract.js';
import { ApiError } from '../../shared/utils';
import Product from '../product/Product.schema';

export type SuggestedMedicine = {
  id: string;
  name: string;
  dosage: string;
  quantity: number;
  price: number;
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

      // Tesseract.js can work with URLs directly
      const { data } = await Tesseract.recognize(imagePath, 'eng', {
        logger: (m) => {
          // Optional: Log progress
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

  /**
   * Parse extracted text to identify medicines
   * Looks for common patterns like "Aspirin 500mg x 10 tablets"
   */
  static parseMedicinesFromText(text: string): Array<{ name: string; dosage: string; quantity: string }> {
    const medicines: Array<{ name: string; dosage: string; quantity: string }> = [];

    if (!text) return medicines;

    // Split by common delimiters
    const lines = text.split(/[\n\r]+/);

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.length < 3) continue;

      // Pattern: "Medicine Name Dosage x Quantity"
      // Example: "Aspirin 500mg x 10 tablets"
      const match = trimmed.match(
        /^([a-zA-Z\s]+?)\s+(\d+\s*(?:mg|g|mcg|ml)?)\s*(?:x|X)?\s*(\d+)?/
      );

      if (match) {
        medicines.push({
          name: match[1].trim(),
          dosage: match[2].trim(),
          quantity: match[3] || '1',
        });
      }
    }

    return medicines;
  }

  static async matchMedicinesFromText(text: string): Promise<SuggestedMedicine[]> {
    if (!text?.trim()) return [];

    const normalizedText = text.toLowerCase();
    const medicines = await Product.find({ status: "active" })
      .select("_id name genericName brandName strength price salePrice")
      .lean();

    return medicines
      .filter((medicine: any) => {
        const names = [medicine.name, medicine.genericName, medicine.brandName]
          .filter(Boolean)
          .map((name) => String(name).toLowerCase());

        return names.some((name) => normalizedText.includes(name));
      })
      .map((medicine: any) => ({
        id: String(medicine._id),
        name: medicine.name,
        dosage: medicine.strength || "",
        quantity: 1,
        price: Number(medicine.salePrice ?? medicine.price ?? 0),
      }));
  }

  /**
   * Validate prescription data before sending to pharmacist
   */
  static validateExtractionQuality(text: string): { isValid: boolean; confidence: number } {
    if (!text || text.length < 10) {
      return { isValid: false, confidence: 0 };
    }

    // Check for common medical keywords
    const medicalKeywords = ['mg', 'ml', 'tablet', 'capsule', 'injection', 'spray', 'dose', 'times'];
    const foundKeywords = medicalKeywords.filter((keyword) => text.toLowerCase().includes(keyword)).length;

    const confidence = Math.min(100, (foundKeywords / medicalKeywords.length) * 100);

    // Consider valid if we found at least 1 medical keyword
    return { isValid: foundKeywords >= 1, confidence };
  }
}
