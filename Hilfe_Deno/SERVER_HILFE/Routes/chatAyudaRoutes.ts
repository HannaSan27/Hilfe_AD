import { Router } from "../Dependencies/dependencies.ts";
import { responderChatAyuda } from "../Controller/chatAyudaController.ts";

const router = new Router();
router.post("/api/chat-ayuda", responderChatAyuda);

export default router;
