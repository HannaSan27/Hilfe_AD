import { Router } from "../Dependencies/dependencies.ts";
import { verificarSesion } from "../Middlewares/authMiddleware.ts";
import { getWallet, deposit, withdraw } from "../Controller/wallet.controller.ts";

const walletRoutes = new Router();

walletRoutes
  .get("/api/wallet", verificarSesion, getWallet)
  .post("/api/wallet/deposit", verificarSesion, deposit)
  .post("/api/wallet/withdraw", verificarSesion, withdraw);

export default walletRoutes;