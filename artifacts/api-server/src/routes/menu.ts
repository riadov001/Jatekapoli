import { Router, type IRouter } from "express";
import { db, menuItemsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import {
  CreateMenuItemBody,
  CreateMenuItemParams,
  UpdateMenuItemBody,
  UpdateMenuItemParams,
  DeleteMenuItemParams,
  GetMenuItemParams,
  ListMenuItemsParams,
  ListMenuItemsQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/restaurants/:restaurantId/menu", async (req, res): Promise<void> => {
  const pathParams = ListMenuItemsParams.safeParse(req.params);
  if (!pathParams.success) {
    res.status(400).json({ error: pathParams.error.message });
    return;
  }

  const queryParams = ListMenuItemsQueryParams.safeParse(req.query);
  const restaurantId = pathParams.data.restaurantId;

  let conditions = [eq(menuItemsTable.restaurantId, restaurantId)];

  if (queryParams.success && queryParams.data.category) {
    conditions.push(eq(menuItemsTable.category, queryParams.data.category));
  }

  const items = await db.select().from(menuItemsTable).where(and(...conditions));
  res.json(items);
});

router.post("/restaurants/:restaurantId/menu", async (req, res): Promise<void> => {
  const pathParams = CreateMenuItemParams.safeParse(req.params);
  if (!pathParams.success) {
    res.status(400).json({ error: pathParams.error.message });
    return;
  }

  const parsed = CreateMenuItemBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [item] = await db.insert(menuItemsTable).values({
    ...parsed.data,
    restaurantId: pathParams.data.restaurantId,
    isAvailable: true,
    isPopular: parsed.data.isPopular ?? false,
  }).returning();

  res.status(201).json(item);
});

router.get("/menu/:id", async (req, res): Promise<void> => {
  const params = GetMenuItemParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [item] = await db.select().from(menuItemsTable).where(eq(menuItemsTable.id, params.data.id)).limit(1);
  if (!item) {
    res.status(404).json({ error: "Menu item not found" });
    return;
  }

  res.json(item);
});

router.patch("/menu/:id", async (req, res): Promise<void> => {
  const params = UpdateMenuItemParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateMenuItemBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [item] = await db
    .update(menuItemsTable)
    .set(parsed.data)
    .where(eq(menuItemsTable.id, params.data.id))
    .returning();

  if (!item) {
    res.status(404).json({ error: "Menu item not found" });
    return;
  }

  res.json(item);
});

router.delete("/menu/:id", async (req, res): Promise<void> => {
  const params = DeleteMenuItemParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  await db.delete(menuItemsTable).where(eq(menuItemsTable.id, params.data.id));
  res.sendStatus(204);
});

export default router;
