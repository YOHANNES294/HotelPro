import { PrismaClient, Role, RoomStatus, ReservationStatus, TableStatus, OrderType, OrderStatus, KitchenItemStatus, UnitOfMeasure, MovementType, PaymentMethod, PaymentTargetType, ShiftStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Seeding HotelPro Database ---');

  // Clear existing data in reverse dependency order
  await prisma.syncLog.deleteMany();
  await prisma.auditEvent.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.cashierShift.deleteMany();
  await prisma.inventoryMovement.deleteMany();
  await prisma.recipeItem.deleteMany();
  await prisma.ingredient.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.kitchenTicket.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.menuItem.deleteMany();
  await prisma.menuCategory.deleteMany();
  await prisma.tableReservation.deleteMany();
  await prisma.diningTable.deleteMany();
  await prisma.housekeepingTask.deleteMany();
  await prisma.maintenanceRequest.deleteMany();
  await prisma.reservation.deleteMany();
  await prisma.guest.deleteMany();
  await prisma.room.deleteMany();
  await prisma.roomType.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.userBranchAccess.deleteMany();
  await prisma.user.deleteMany();
  await prisma.branch.deleteMany();
  await prisma.organization.deleteMany();

  // 1. Organization
  const org = await prisma.organization.create({
    data: {
      name: 'Grand Addis Hospitality',
      slug: 'grand-addis',
      currency: 'ETB',
      timezone: 'Africa/Addis_Ababa',
    },
  });

  // 2. Branches
  const mainBranch = await prisma.branch.create({
    data: {
      organizationId: org.id,
      name: 'Downtown Flagship',
      code: 'MAIN',
      phone: '+251911223344',
      email: 'main@grandaddis.com',
      city: 'Addis Ababa',
      address: 'Churchill Avenue, Piazza',
      hasHotel: true,
      hasRestaurant: true,
    },
  });

  const boleBranch = await prisma.branch.create({
    data: {
      organizationId: org.id,
      name: 'Bole Airport Branch',
      code: 'BOLE',
      phone: '+251911556677',
      email: 'bole@grandaddis.com',
      city: 'Addis Ababa',
      address: 'Cameroon St, Bole Medhanialem',
      hasHotel: true,
      hasRestaurant: true,
    },
  });

  // 3. Users
  const passwordHash = await bcrypt.hash('Password123!', 10);

  const owner = await prisma.user.create({
    data: {
      organizationId: org.id,
      email: 'owner@grandaddis.com',
      passwordHash,
      fullName: 'Ato Yohannes Haile',
      role: Role.BUSINESS_OWNER,
    },
  });

  const manager = await prisma.user.create({
    data: {
      organizationId: org.id,
      email: 'manager@grandaddis.com',
      passwordHash,
      fullName: 'Selamawit Tadesse',
      role: Role.BRANCH_MANAGER,
    },
  });

  const frontdesk = await prisma.user.create({
    data: {
      organizationId: org.id,
      email: 'frontdesk@grandaddis.com',
      passwordHash,
      fullName: 'Dawit Getachew',
      role: Role.FRONT_DESK,
    },
  });

  const waiter = await prisma.user.create({
    data: {
      organizationId: org.id,
      email: 'waiter@grandaddis.com',
      passwordHash,
      fullName: 'Hanna Mengistu',
      role: Role.WAITER,
    },
  });

  const cashier = await prisma.user.create({
    data: {
      organizationId: org.id,
      email: 'cashier@grandaddis.com',
      passwordHash,
      fullName: 'Bereket Alemayehu',
      role: Role.CASHIER,
    },
  });

  const kitchen = await prisma.user.create({
    data: {
      organizationId: org.id,
      email: 'kitchen@grandaddis.com',
      passwordHash,
      fullName: 'Chef Tariku Tesfaye',
      role: Role.KITCHEN_STAFF,
    },
  });

  const housekeeper = await prisma.user.create({
    data: {
      organizationId: org.id,
      email: 'cleaner@grandaddis.com',
      passwordHash,
      fullName: 'Almaz Bekele',
      role: Role.HOUSEKEEPING,
    },
  });

  // Grant Branch Access
  for (const u of [owner, manager, frontdesk, waiter, cashier, kitchen, housekeeper]) {
    await prisma.userBranchAccess.create({
      data: { userId: u.id, branchId: mainBranch.id },
    });
  }

  // 4. Hotel Module: Room Types
  const deluxeSuite = await prisma.roomType.create({
    data: {
      organizationId: org.id,
      branchId: mainBranch.id,
      name: 'Deluxe Suite',
      code: 'DLX',
      description: 'Spacious suite with balcony, king bed, and city view',
      basePrice: 3500.00,
      maxAdults: 2,
      maxChildren: 2,
      amenities: ['Wi-Fi', 'Balcony', 'City View', 'Mini Bar', 'Breakfast Included'],
    },
  });

  const execKing = await prisma.roomType.create({
    data: {
      organizationId: org.id,
      branchId: mainBranch.id,
      name: 'Executive King',
      code: 'EXC',
      description: 'Comfortable room with dedicated working desk',
      basePrice: 2500.00,
      maxAdults: 2,
      maxChildren: 1,
      amenities: ['Wi-Fi', 'Desk', 'Smart TV', 'Coffee Maker'],
    },
  });

  const standardTwin = await prisma.roomType.create({
    data: {
      organizationId: org.id,
      branchId: mainBranch.id,
      name: 'Standard Twin',
      code: 'STD',
      description: 'Cozy room with two single beds',
      basePrice: 1800.00,
      maxAdults: 2,
      maxChildren: 0,
      amenities: ['Wi-Fi', 'Air Conditioning'],
    },
  });

  // 5. Rooms
  const room101 = await prisma.room.create({
    data: {
      organizationId: org.id,
      branchId: mainBranch.id,
      roomTypeId: standardTwin.id,
      roomNumber: '101',
      floor: 1,
      status: RoomStatus.AVAILABLE,
    },
  });

  const room102 = await prisma.room.create({
    data: {
      organizationId: org.id,
      branchId: mainBranch.id,
      roomTypeId: standardTwin.id,
      roomNumber: '102',
      floor: 1,
      status: RoomStatus.OCCUPIED,
    },
  });

  const room201 = await prisma.room.create({
    data: {
      organizationId: org.id,
      branchId: mainBranch.id,
      roomTypeId: execKing.id,
      roomNumber: '201',
      floor: 2,
      status: RoomStatus.AVAILABLE,
    },
  });

  const room202 = await prisma.room.create({
    data: {
      organizationId: org.id,
      branchId: mainBranch.id,
      roomTypeId: execKing.id,
      roomNumber: '202',
      floor: 2,
      status: RoomStatus.DIRTY,
    },
  });

  const room301 = await prisma.room.create({
    data: {
      organizationId: org.id,
      branchId: mainBranch.id,
      roomTypeId: deluxeSuite.id,
      roomNumber: '301',
      floor: 3,
      status: RoomStatus.AVAILABLE,
    },
  });

  // Housekeeping task for room 202
  await prisma.housekeepingTask.create({
    data: {
      organizationId: org.id,
      branchId: mainBranch.id,
      roomId: room202.id,
      assignedToUserId: housekeeper.id,
      status: 'PENDING',
      notes: 'Guest checked out at 10:30 AM. Full linen refresh required.',
    },
  });

  // 6. Guests & Reservations
  const guest1 = await prisma.guest.create({
    data: {
      organizationId: org.id,
      fullName: 'Abebe Bikila',
      email: 'abebe@ethio-telecom.net',
      phone: '+251911001122',
      idType: 'PASSPORT',
      idNumber: 'EP1234567',
      nationality: 'Ethiopian',
      notes: 'Prefers quiet corner room',
    },
  });

  const guest2 = await prisma.guest.create({
    data: {
      organizationId: org.id,
      fullName: 'Sarah Jenkins',
      email: 'sarah.j@african-union.org',
      phone: '+251922334455',
      idType: 'PASSPORT',
      idNumber: 'US8877665',
      nationality: 'American',
    },
  });

  // Reservation 1 (Checked-in into room 102)
  const today = new Date();
  const checkIn = new Date(today);
  checkIn.setDate(today.getDate() - 1);
  const checkOut = new Date(today);
  checkOut.setDate(today.getDate() + 2);

  const res1 = await prisma.reservation.create({
    data: {
      organizationId: org.id,
      branchId: mainBranch.id,
      reservationNumber: 'RES-100001',
      guestId: guest1.id,
      roomId: room102.id,
      roomTypeId: standardTwin.id,
      checkInDate: checkIn,
      checkOutDate: checkOut,
      status: ReservationStatus.CHECKED_IN,
      adultsCount: 2,
      childrenCount: 0,
      nightlyRate: 1800.00,
      totalNights: 3,
      subtotal: 5400.00,
      taxAmount: 810.00, // 15% VAT
      discountAmount: 0.00,
      totalAmount: 6210.00,
      paidAmount: 3000.00,
      balanceDue: 3210.00,
    },
  });

  // Payment for Reservation 1
  await prisma.payment.create({
    data: {
      organizationId: org.id,
      branchId: mainBranch.id,
      targetType: PaymentTargetType.RESERVATION,
      reservationId: res1.id,
      amount: 3000.00,
      currency: 'ETB',
      method: PaymentMethod.TELEBIRR,
      referenceNumber: 'TEL-99887711',
      processedByUserId: frontdesk.id,
      notes: 'Initial 50% deposit received via Telebirr',
    },
  });

  // 7. Restaurant Module: Dining Tables
  const t1 = await prisma.diningTable.create({
    data: {
      organizationId: org.id,
      branchId: mainBranch.id,
      tableNumber: 'Table 1',
      capacity: 4,
      section: 'Main Dining',
      status: TableStatus.OCCUPIED,
    },
  });

  const t2 = await prisma.diningTable.create({
    data: {
      organizationId: org.id,
      branchId: mainBranch.id,
      tableNumber: 'Table 2',
      capacity: 2,
      section: 'Main Dining',
      status: TableStatus.AVAILABLE,
    },
  });

  const t3 = await prisma.diningTable.create({
    data: {
      organizationId: org.id,
      branchId: mainBranch.id,
      tableNumber: 'Patio 1',
      capacity: 6,
      section: 'Terrace Garden',
      status: TableStatus.AVAILABLE,
    },
  });

  // 8. Menu Categories & Items
  const catTrad = await prisma.menuCategory.create({
    data: {
      organizationId: org.id,
      branchId: mainBranch.id,
      name: 'Traditional Ethiopian',
      nameAmharic: 'የባህል ምግቦች',
      sortOrder: 1,
    },
  });

  const catMains = await prisma.menuCategory.create({
    data: {
      organizationId: org.id,
      branchId: mainBranch.id,
      name: 'Grills & Steaks',
      nameAmharic: 'ጥብስ እና ስቴክ',
      sortOrder: 2,
    },
  });

  const catDrinks = await prisma.menuCategory.create({
    data: {
      organizationId: org.id,
      branchId: mainBranch.id,
      name: 'Beverages',
      nameAmharic: 'መጠጦች',
      sortOrder: 3,
    },
  });

  const doroWat = await prisma.menuItem.create({
    data: {
      organizationId: org.id,
      branchId: mainBranch.id,
      categoryId: catTrad.id,
      name: 'Special Doro Wat',
      nameAmharic: 'ልዩ የዶሮ ወጥ',
      description: 'Slow-cooked chicken stew with spicy berbere sauce and boiled egg',
      descriptionAmharic: 'በቅመም የታሸ የበለፀገ የዶሮ ወጥ ከእንቁላል ጋር',
      price: 750.00,
      preparationMinutes: 20,
    },
  });

  const kitfo = await prisma.menuItem.create({
    data: {
      organizationId: org.id,
      branchId: mainBranch.id,
      categoryId: catTrad.id,
      name: 'Special Kitfo',
      nameAmharic: 'ልዩ ክትፎ',
      description: 'Minced prime lean beef seasoned with spiced butter (niter kibbeh) and mitmita',
      descriptionAmharic: 'የተመረጠ የሰንጋ ሥጋ በቅቤ እና ሚጥሚጣ',
      price: 850.00,
      preparationMinutes: 15,
    },
  });

  const coffee = await prisma.menuItem.create({
    data: {
      organizationId: org.id,
      branchId: mainBranch.id,
      categoryId: catDrinks.id,
      name: 'Traditional Coffee Ceremony',
      nameAmharic: 'የኢትዮጵያ ባህላዊ ቡና',
      description: 'Freshly roasted organic Ethiopian mountain coffee served in jebena with popcorn',
      descriptionAmharic: 'በጀበና የተፈላ ትኩስ የሀበሻ ቡና ከፈንዲሻ ጋር',
      price: 180.00,
      preparationMinutes: 10,
    },
  });

  // 9. Inventory: Ingredients & Recipes
  const beef = await prisma.ingredient.create({
    data: {
      organizationId: org.id,
      branchId: mainBranch.id,
      name: 'Prime Beef',
      unit: UnitOfMeasure.KG,
      currentStock: 45.5,
      minimumStock: 10.0,
      unitCost: 650.00,
    },
  });

  const chicken = await prisma.ingredient.create({
    data: {
      organizationId: org.id,
      branchId: mainBranch.id,
      name: 'Whole Dressed Chicken',
      unit: UnitOfMeasure.PIECE,
      currentStock: 30,
      minimumStock: 8,
      unitCost: 350.00,
    },
  });

  const coffeeBeans = await prisma.ingredient.create({
    data: {
      organizationId: org.id,
      branchId: mainBranch.id,
      name: 'Yirgacheffe Coffee Beans',
      unit: UnitOfMeasure.KG,
      currentStock: 25.0,
      minimumStock: 5.0,
      unitCost: 400.00,
    },
  });

  // Link Recipe Items
  await prisma.recipeItem.create({
    data: {
      menuItemId: kitfo.id,
      ingredientId: beef.id,
      quantityRequired: 0.35, // 350 grams
    },
  });

  await prisma.recipeItem.create({
    data: {
      menuItemId: doroWat.id,
      ingredientId: chicken.id,
      quantityRequired: 0.25, // quarter chicken portion
    },
  });

  await prisma.recipeItem.create({
    data: {
      menuItemId: coffee.id,
      ingredientId: coffeeBeans.id,
      quantityRequired: 0.05, // 50 grams
    },
  });

  // 10. Active Orders & Kitchen Ticket
  const order1 = await prisma.order.create({
    data: {
      organizationId: org.id,
      branchId: mainBranch.id,
      orderNumber: 'ORD-200001',
      orderType: OrderType.DINE_IN,
      status: OrderStatus.IN_KITCHEN,
      tableId: t1.id,
      waiterId: waiter.id,
      customerName: 'Ato Solomon',
      subtotal: 1030.00,
      taxAmount: 154.50,
      discountAmount: 0.00,
      totalAmount: 1184.50,
      notes: 'Kitfo well done (leb-leb), extra kocho',
      items: {
        create: [
          {
            menuItemId: kitfo.id,
            itemName: kitfo.name,
            quantity: 1,
            unitPrice: kitfo.price,
            totalPrice: kitfo.price,
            notes: 'Leb-leb',
            status: KitchenItemStatus.PREPARING,
          },
          {
            menuItemId: coffee.id,
            itemName: coffee.name,
            quantity: 1,
            unitPrice: coffee.price,
            totalPrice: coffee.price,
            status: KitchenItemStatus.PREPARING,
          },
        ],
      },
    },
  });

  await prisma.kitchenTicket.create({
    data: {
      organizationId: org.id,
      branchId: mainBranch.id,
      orderId: order1.id,
      orderNumber: order1.orderNumber,
      status: OrderStatus.IN_KITCHEN,
      notes: order1.notes,
    },
  });

  // 11. Cashier Shift (Active)
  await prisma.cashierShift.create({
    data: {
      organizationId: org.id,
      branchId: mainBranch.id,
      cashierUserId: cashier.id,
      openedAt: new Date(),
      openingCash: 5000.00,
      status: ShiftStatus.OPEN,
      notes: 'Morning shift opening float verified',
    },
  });

  console.log('✅ HotelPro Database seeded successfully with realistic Ethiopian hospitality data!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
