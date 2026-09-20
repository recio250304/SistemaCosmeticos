import { Router } from "express";
import {
  autenticar,
  RequestAutenticado
} from "../middleware/auth.js";
import { requireRole } from "../middleware/requireRole.js";

const router = Router();

router.get(
  "/perfil",
  autenticar,
  (req: RequestAutenticado, res) => {
    res.json({
      mensaje: "Acceso autorizado.",
      usuario: req.usuario
    });
  }
);

router.get(
  "/admin-test",
  autenticar,
  requireRole("ADMIN"),
  (req: RequestAutenticado, res) => {
    res.json({
      mensaje: "Acceso administrativo autorizado.",
      usuario: req.usuario
    });
  }
);

export default router;