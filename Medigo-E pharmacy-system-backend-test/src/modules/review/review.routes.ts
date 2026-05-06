import { Router } from "express";
import { protect } from "../../middleware/auth.middleware";
import { createReview, deleteReview, listMyReviews, listReviews } from "./review.controller";

const router = Router();

router.get("/", listReviews);
router.get("/me", protect, listMyReviews);
router.post("/", protect, createReview);
router.delete("/:id", protect, deleteReview);

export default router;

