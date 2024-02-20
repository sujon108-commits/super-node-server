import { Router } from "express";
import MatchController from "../controllers/api/MatchController";
import OddsController from "../controllers/api/OddsController";

const router = Router();
router.post("/save-match", MatchController.addMatchAndMarket);
router.post("/delete-market", MatchController.deleteMarket);

router.get("/get-sports", OddsController.getSports);
router.get("/get-odds", OddsController.getOdds);
router.get("/get-series", OddsController.getSeries);
router.get("/get-matches", OddsController.getMatchList);
router.get("/get-matches-t10", OddsController.getMatchListT10);
router.get("/get-bookmaker-odds", OddsController.getOdds);
router.get("/get-single-session", OddsController.getSingleSessionMarket);
router.get("/get-marketes", OddsController.getMarketList);
router.get("/get-marketes-t10", OddsController.getMarketList);
router.get("/get-bookmaker-marketes", OddsController.getMarketList);
router.get("/get-sessions", OddsController.getSessions);
router.get("/get-sessions-t10", OddsController.getSessions);
router.get("/fancy-data", OddsController.fancyData);

export default router;
