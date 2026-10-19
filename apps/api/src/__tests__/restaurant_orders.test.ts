import request from 'supertest';
import { createApp } from '../app.js';
import { prisma } from '../lib/prisma.js';

const app = createApp();

describe('Restaurant Operations & Recipe Inventory Deductions', () => {
  let token: string;
  let branchId: string;
  let tableId: string;
  let categoryId: string;
  let menuItemId: string;
  let ingredientId: string;
  let orderId: string;

  beforeAll(async () => {
    const regRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: `restaurant-ops-${Date.now()}@bistro.com`,
        password: 'Password123!',
        fullName: 'Bistro Owner',
        organizationName: 'Habesha Fusion Bistro',
        branchName: 'Main Bistro',
      });
    token = regRes.body.tokens.accessToken;
    branchId = regRes.body.user.branch.id;

    // Create Dining Table
    const tRes = await request(app)
      .post('/api/v1/restaurants/tables')
      .set('Authorization', `Bearer ${token}`)
      .send({
        branchId,
        tableNumber: 'Table 7',
        capacity: 4,
        section: 'VIP Lounge',
      });
    tableId = tRes.body.table.id;

    // Create Category
    const cRes = await request(app)
      .post('/api/v1/restaurants/menu/categories')
      .set('Authorization', `Bearer ${token}`)
      .send({
        branchId,
        name: 'Chef Specials',
        nameAmharic: 'የሼፍ ምርጥ ምግቦች',
      });
    categoryId = cRes.body.category.id;

    // Create Menu Item
    const mRes = await request(app)
      .post('/api/v1/restaurants/menu/items')
      .set('Authorization', `Bearer ${token}`)
      .send({
        categoryId,
        name: 'Tibs Firfir with Ribs',
        nameAmharic: 'ጥብስ ፍርፍር ከጎድን ጋር',
        price: '450.00',
        preparationMinutes: 15,
      });
    menuItemId = mRes.body.menuItem.id;

    // Create Ingredient with initial stock of 10.0 KG
    const iRes = await request(app)
      .post('/api/v1/inventory/ingredients')
      .set('Authorization', `Bearer ${token}`)
      .send({
        branchId,
        name: 'Rib Meat',
        unit: 'KG',
        currentStock: '10.000',
        minimumStock: '2.000',
        unitCost: '400.00',
      });
    ingredientId = iRes.body.ingredient.id;

    // Link Recipe: 1 portion uses 0.5 KG of Rib Meat
    await request(app)
      .post('/api/v1/inventory/recipes')
      .set('Authorization', `Bearer ${token}`)
      .send({
        menuItemId,
        ingredientId,
        quantityRequired: '0.500',
      });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should allow public access to the digital QR menu without authentication', async () => {
    const res = await request(app).get(`/api/v1/restaurants/public/menu/${branchId}`);

    expect(res.status).toBe(200);
    expect(res.body.branch).toBeDefined();
    expect(res.body.branch.name).toBe('Main Bistro');
    expect(res.body.categories).toBeDefined();
    expect(res.body.categories.length).toBeGreaterThan(0);
    expect(res.body.categories[0].menuItems[0].name).toBe('Tibs Firfir with Ribs');
  });

  it('should create an order, calculate total on server, and generate a kitchen ticket', async () => {
    const res = await request(app)
      .post('/api/v1/restaurants/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        branchId,
        orderType: 'DINE_IN',
        tableId,
        customerName: 'Ato Daniel',
        items: [
          {
            menuItemId,
            quantity: 2, // 2 portions * 450 = 900.00
            notes: 'Medium spicy',
          },
        ],
        taxAmount: '135.00', // 15% VAT on 900
      });

    expect(res.status).toBe(201);
    const ord = res.body.order;
    expect(parseFloat(ord.subtotal)).toBe(900);
    expect(parseFloat(ord.totalAmount)).toBe(1035);
    expect(ord.status).toBe('IN_KITCHEN');

    orderId = ord.id;

    // Verify Kitchen ticket was created
    const kt = await prisma.kitchenTicket.findUnique({
      where: { orderId },
    });
    expect(kt).toBeDefined();
    expect(kt?.orderNumber).toBe(ord.orderNumber);

    // Verify table is marked OCCUPIED
    const table = await prisma.diningTable.findUnique({ where: { id: tableId } });
    expect(table?.status).toBe('OCCUPIED');
  });

  it('should automatically deduct recipe ingredients when order is marked COMPLETED', async () => {
    // Current stock before completion: 10.000 KG
    // 2 portions ordered * 0.5 KG = 1.000 KG deduction -> expected 9.000 KG
    const res = await request(app)
      .patch(`/api/v1/restaurants/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'COMPLETED' });

    expect(res.status).toBe(200);
    expect(res.body.order.status).toBe('COMPLETED');

    // Verify Ingredient Stock
    const ingredient = await prisma.ingredient.findUnique({
      where: { id: ingredientId },
    });
    expect(ingredient?.currentStock.toString()).toBe('9');

    // Verify Inventory Movement ledger was recorded
    const movement = await prisma.inventoryMovement.findFirst({
      where: { ingredientId, type: 'RECIPE_CONSUMPTION' },
    });
    expect(movement).toBeDefined();
    expect(movement?.quantityDelta.toString()).toBe('-1');
    expect(movement?.previousStock.toString()).toBe('10');
    expect(movement?.newStock.toString()).toBe('9');

    // Verify Table is now AVAILABLE again
    const table = await prisma.diningTable.findUnique({ where: { id: tableId } });
    expect(table?.status).toBe('AVAILABLE');
  });
});
