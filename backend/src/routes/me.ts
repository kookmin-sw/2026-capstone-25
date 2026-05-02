import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();

router.get("/", authMiddleware, (req, res) => {
  res.json({
    id: req.userId,
    email: req.userEmail,
  });
});

export default router;
