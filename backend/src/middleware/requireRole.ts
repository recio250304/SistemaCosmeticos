import { Response, NextFunction } from "express";
import { RequestAutenticado } from "./auth.js";

export function requireRole(...rolesPermitidos: string[]) {
  return (
    req: RequestAutenticado,
    res: Response,
    next: NextFunction
  ) => {
    if (!req.usuario) {
      return res.status(401).json({
        mensaje: "Usuario no autenticado."
      });
    }

    if (!rolesPermitidos.includes(req.usuario.rol)) {
      return res.status(403).json({
        mensaje: "No tienes permisos para realizar esta acción."
      });
    }

    next();
  };
}