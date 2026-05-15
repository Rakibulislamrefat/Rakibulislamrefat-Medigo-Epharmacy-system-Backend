import { Router } from "express";
import { getFrontendConfig } from "./config.controller";

const router = Router();

router.get("/frontend", getFrontendConfig);

export default router;
