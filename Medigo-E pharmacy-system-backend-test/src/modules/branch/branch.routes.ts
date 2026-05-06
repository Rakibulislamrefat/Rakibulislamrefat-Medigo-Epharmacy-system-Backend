import { Router } from "express";
import { protect } from "../../middleware/auth.middleware";
import { authorize } from "../../middleware/role.middleware";
import { createBranch, deleteBranch, listBranches, updateBranch } from "./branch.controller";

const router = Router();

router.get("/", listBranches);
router.post("/", protect, authorize("admin"), createBranch);
router.patch("/:id", protect, authorize("admin"), updateBranch);
router.delete("/:id", protect, authorize("admin"), deleteBranch);

export default router;

