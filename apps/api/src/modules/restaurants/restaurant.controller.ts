import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../middleware/error.middleware.js';
import {
  createTableSchema,
  createMenuCategorySchema,
  createMenuItemSchema,
  createOrderSchema,
  updateOrderStatusSchema,
  TableStatus,
  OrderStatus,
  KitchenItemStatus,
  MovementType,
} from '@hotelpro/shared';
import { Prisma } from '@prisma/client';

export class RestaurantController {
  // -----------------------------------------------------------
  // Dining Tables
  // -----------------------------------------------------------
  static async listTables(req: Request, res: Response, next: NextFunction) {
    try {
      const branchId = req.query.branchId as string;
      const where: Prisma.DiningTableWhereInput = {
        organizationId: req.tenantId,
        isActive: true,
      };
      if (branchId) where.branchId = branchId;

      const tables = await prisma.diningTable.findMany({
        where,
        include: {
          orders: {
            where: { status: { in: [OrderStatus.PENDING, OrderStatus.IN_KITCHEN, OrderStatus.READY, OrderStatus.SERVED] } },
            take: 1,
            orderBy: { createdAt: 'desc' },
          },
        },
        orderBy: [{ section: 'asc' }, { tableNumber: 'asc' }],
      });

      return res.json({ tables });
    } catch (err) {
      next(err);
    }
  }

  static async createTable(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = createTableSchema.parse(req.body);

      const table = await prisma.diningTable.create({
        data: {
          organizationId: req.tenantId!,
          branchId: validated.branchId,
          tableNumber: validated.tableNumber,
          capacity: validated.capacity,
          section: validated.section,
          status: validated.status,
        },
      });

      return res.status(201).json({ table });
    } catch (err) {
      next(err);
    }
  }

  static async updateTableStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const updated = await prisma.diningTable.update({
        where: { id },
        data: { status: status as TableStatus },
      });

      return res.json({ table: updated });
    } catch (err) {
      next(err);
    }
  }

  // -----------------------------------------------------------
  // Menu Categories & Items
  // -----------------------------------------------------------
  static async listMenu(req: Request, res: Response, next: NextFunction) {
    try {
      const branchId = req.query.branchId as string;
      const where: Prisma.MenuCategoryWhereInput = {
        organizationId: req.tenantId,
        isActive: true,
      };
      if (branchId) where.branchId = branchId;

      const categories = await prisma.menuCategory.findMany({
        where,
        include: {
          menuItems: {
            where: { isAvailable: true },
            orderBy: { name: 'asc' },
          },
        },
        orderBy: { sortOrder: 'asc' },
      });

      return res.json({ categories });
    } catch (err) {
      next(err);
    }
  }

  static async createCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = createMenuCategorySchema.parse(req.body);

      const category = await prisma.menuCategory.create({
        data: {
          organizationId: req.tenantId!,
          branchId: validated.branchId,
          name: validated.name,
          nameAmharic: validated.nameAmharic,
          sortOrder: validated.sortOrder,
        },
      });

      return res.status(201).json({ category });
    } catch (err) {
      next(err);
    }
  }

  static async createMenuItem(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = createMenuItemSchema.parse(req.body);

      const category = await prisma.menuCategory.findFirst({
        where: { id: validated.categoryId, organizationId: req.tenantId },
      });
      if (!category) throw new AppError('Category not found', 404);

      const item = await prisma.menuItem.create({
        data: {
          organizationId: req.tenantId!,
          branchId: category.branchId,
          categoryId: validated.categoryId,
          name: validated.name,
          nameAmharic: validated.nameAmharic,
          description: validated.description,
          descriptionAmharic: validated.descriptionAmharic,
          price: new Prisma.Decimal(validated.price),
          imageUrl: validated.imageUrl,
          isAvailable: validated.isAvailable,
          preparationMinutes: validated.preparationMinutes,
        },
        include: { category: true },
      });

      return res.status(201).json({ menuItem: item });
    } catch (err) {
      next(err);
    }
  }

  static async toggleItemAvailability(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { isAvailable } = req.body;

      const item = await prisma.menuItem.findFirst({
        where: { id, organizationId: req.tenantId },
      });
      if (!item) throw new AppError('Menu item not found', 404);

      const updated = await prisma.menuItem.update({
        where: { id },
        data: { isAvailable: Boolean(isAvailable) },
      });

      return res.json({ menuItem: updated });
    } catch (err) {
      next(err);
    }
  }

  // -----------------------------------------------------------
  // Public QR Menu (no auth required)
  // -----------------------------------------------------------
  static async getPublicMenu(req: Request, res: Response, next: NextFunction) {
    try {
      const { branchId } = req.params;

      const branch = await prisma.branch.findFirst({
        where: { id: branchId, isActive: true },
        include: {
          organization: {
            select: { name: true, currency: true },
          },
        },
      });

      if (!branch) {
        throw new AppError('Branch not found or inactive', 404);
      }

      const categories = await prisma.menuCategory.findMany({
        where: { branchId, isActive: true },
        include: {
          menuItems: {
            where: { isAvailable: true },
            select: {
              id: true,
              name: true,
              nameAmharic: true,
              description: true,
              descriptionAmharic: true,
              price: true,
              imageUrl: true,
              preparationMinutes: true,
            },
            orderBy: { name: 'asc' },
          },
        },
        orderBy: { sortOrder: 'asc' },
      });

      return res.json({
        branch: {
          id: branch.id,
          name: branch.name,
          organizationName: branch.organization.name,
          currency: branch.organization.currency,
        },
        categories,
      });
    } catch (err) {
      next(err);
    }
  }

  // -----------------------------------------------------------
  // Orders
  // -----------------------------------------------------------
  static async listOrders(req: Request, res: Response, next: NextFunction) {
    try {
      const branchId = req.query.branchId as string;
      const status = req.query.status as OrderStatus;

      const where: Prisma.OrderWhereInput = {
        organizationId: req.tenantId,
      };
      if (branchId) where.branchId = branchId;
      if (status) where.status = status;

      const orders = await prisma.order.findMany({
        where,
        include: {
          table: true,
          waiter: { select: { id: true, fullName: true } },
          items: true,
          payments: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      return res.json({ orders });
    } catch (err) {
      next(err);
    }
  }

  static async createOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = createOrderSchema.parse(req.body);

      // Verify branch belongs to organization
      const branch = await prisma.branch.findFirst({
        where: { id: validated.branchId, organizationId: req.tenantId },
      });
      if (!branch) throw new AppError('Branch not found', 404);

      // Fetch items and compute prices
      const itemIds = validated.items.map((i) => i.menuItemId);
      const dbItems = await prisma.menuItem.findMany({
        where: { id: { in: itemIds }, organizationId: req.tenantId },
      });

      const dbItemMap = new Map(dbItems.map((item) => [item.id, item]));

      let subtotalDecimal = new Prisma.Decimal(0);
      const orderItemsData = validated.items.map((item) => {
        const dbItem = dbItemMap.get(item.menuItemId);
        if (!dbItem) {
          throw new AppError(`Menu item ${item.menuItemId} not found`, 400);
        }
        const unitPrice = dbItem.price;
        const lineTotal = unitPrice.mul(item.quantity);
        subtotalDecimal = subtotalDecimal.add(lineTotal);

        return {
          menuItemId: item.menuItemId,
          itemName: dbItem.name,
          quantity: item.quantity,
          unitPrice,
          totalPrice: lineTotal,
          notes: item.notes,
          status: KitchenItemStatus.PENDING,
        };
      });

      const discountDecimal = new Prisma.Decimal(validated.discountAmount || '0.00');
      const taxDecimal = new Prisma.Decimal(validated.taxAmount || '0.00');
      const totalAmount = subtotalDecimal.sub(discountDecimal).add(taxDecimal);

      const orderNumber = `ORD-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

      const createdOrder = await prisma.$transaction(async (tx) => {
        const order = await tx.order.create({
          data: {
            organizationId: req.tenantId!,
            branchId: validated.branchId,
            orderNumber,
            orderType: validated.orderType,
            status: OrderStatus.IN_KITCHEN,
            tableId: validated.tableId,
            waiterId: req.userSession?.userId,
            customerName: validated.customerName,
            customerPhone: validated.customerPhone,
            subtotal: subtotalDecimal,
            taxAmount: taxDecimal,
            discountAmount: discountDecimal,
            totalAmount,
            notes: validated.notes,
            items: {
              create: orderItemsData,
            },
          },
          include: { items: true, table: true },
        });

        // Create kitchen ticket
        await tx.kitchenTicket.create({
          data: {
            organizationId: req.tenantId!,
            branchId: validated.branchId,
            orderId: order.id,
            orderNumber: order.orderNumber,
            status: OrderStatus.IN_KITCHEN,
            notes: validated.notes,
          },
        });

        // If table assigned, mark table as OCCUPIED
        if (validated.tableId) {
          await tx.diningTable.update({
            where: { id: validated.tableId },
            data: { status: TableStatus.OCCUPIED },
          });
        }

        return order;
      });

      return res.status(201).json({ order: createdOrder });
    } catch (err) {
      next(err);
    }
  }

  static async updateOrderStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const validated = updateOrderStatusSchema.parse(req.body);

      const order = await prisma.order.findFirst({
        where: { id, organizationId: req.tenantId },
        include: { items: { include: { menuItem: { include: { recipe: true } } } }, table: true },
      });
      if (!order) throw new AppError('Order not found', 404);

      const updated = await prisma.$transaction(async (tx) => {
        const ord = await tx.order.update({
          where: { id },
          data: { status: validated.status },
          include: { items: true, table: true },
        });

        // Sync kitchen ticket
        await tx.kitchenTicket.updateMany({
          where: { orderId: id },
          data: { status: validated.status },
        });

        // If COMPLETED or CANCELLED, free up table if no other active orders
        if ((validated.status === OrderStatus.COMPLETED || validated.status === OrderStatus.CANCELLED) && order.tableId) {
          const otherActive = await tx.order.findFirst({
            where: {
              tableId: order.tableId,
              id: { not: id },
              status: { in: [OrderStatus.PENDING, OrderStatus.IN_KITCHEN, OrderStatus.READY, OrderStatus.SERVED] },
            },
          });
          if (!otherActive) {
            await tx.diningTable.update({
              where: { id: order.tableId },
              data: { status: TableStatus.AVAILABLE },
            });
          }
        }

        // Automatic Recipe Inventory Deduction on Order COMPLETED
        if (validated.status === OrderStatus.COMPLETED && order.status !== OrderStatus.COMPLETED) {
          for (const item of order.items) {
            for (const recipeItem of item.menuItem.recipe) {
              const totalRequired = recipeItem.quantityRequired.mul(item.quantity);

              const ing = await tx.ingredient.findUnique({
                where: { id: recipeItem.ingredientId },
              });

              if (ing) {
                const newStock = ing.currentStock.sub(totalRequired);
                await tx.ingredient.update({
                  where: { id: ing.id },
                  data: { currentStock: newStock },
                });

                await tx.inventoryMovement.create({
                  data: {
                    organizationId: req.tenantId!,
                    branchId: order.branchId,
                    ingredientId: ing.id,
                    type: MovementType.RECIPE_CONSUMPTION,
                    quantityDelta: totalRequired.negated(),
                    previousStock: ing.currentStock,
                    newStock,
                    reason: `Consumption for Order ${order.orderNumber} (${item.itemName} x${item.quantity})`,
                    performedByUserId: req.userSession?.userId || order.waiterId || 'system',
                  },
                });
              }
            }
          }
        }

        return ord;
      });

      return res.json({ order: updated });
    } catch (err) {
      next(err);
    }
  }

  // -----------------------------------------------------------
  // Kitchen Display
  // -----------------------------------------------------------
  static async listKitchenTickets(req: Request, res: Response, next: NextFunction) {
    try {
      const branchId = req.query.branchId as string;
      const where: Prisma.KitchenTicketWhereInput = {
        organizationId: req.tenantId,
        status: { in: [OrderStatus.IN_KITCHEN, OrderStatus.READY] },
      };
      if (branchId) where.branchId = branchId;

      const tickets = await prisma.kitchenTicket.findMany({
        where,
        include: {
          order: {
            include: {
              table: true,
              items: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      });

      return res.json({ tickets });
    } catch (err) {
      next(err);
    }
  }
}
