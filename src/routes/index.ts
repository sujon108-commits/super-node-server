import { Router } from "express";
import MatchController from "../controllers/api/MatchController";
import OddsController from "../controllers/api/OddsController";

const router = Router();
router.post("/save-match", MatchController.addMatchAndMarket);
router.post("/delete-market", MatchController.deleteMarket);

router.get("/get-odds", OddsController.getOdds);
router.get("/get-bookmaker-odds", OddsController.getOdds);
router.get("/get-single-session", OddsController.getSingleSessionMarket);
router.get("/get-marketes", OddsController.getMarketList);
router.get("/get-bookmaker-marketes", OddsController.getMarketList);
router.get("/get-sessions", OddsController.getSessions);

export default router;
