import { Router } from "express";
import { prisma } from "../lib/prisma";
import { ah, param } from "../lib/http";
import { me, requireAuth } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

router.get(
  "/",
  ah(async (req, res) => {
    const user = me(req);
    const [notifications, unread] = await Promise.all([
      prisma.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 60 }),
      prisma.notification.count({ where: { userId: user.id, read: false } }),
    ]);
    res.json({ notifications, unread });
  }),
);

router.post(
  "/read-all",
  ah(async (req, res) => {
    await prisma.notification.updateMany({ where: { userId: me(req).id, read: false }, data: { read: true } });
    res.json({ ok: true });
  }),
);

router.post(
  "/:id/read",
  ah(async (req, res) => {
    await prisma.notification.updateMany({ where: { id: param(req, "id"), userId: me(req).id }, data: { read: true } });
    res.json({ ok: true });
  }),
);

export default router;
