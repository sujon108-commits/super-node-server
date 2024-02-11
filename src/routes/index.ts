import { Router } from "express";
import MatchController from "../controllers/api/MatchController";

const router = Router();
router.post("/save-match", MatchController.addMatchAndMarket);
router.post("/delete-market", MatchController.deleteMarket);

export default router;
