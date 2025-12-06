// src/lib/mockData.ts

export const mockOrders = [
    {
      orderId: "ORD-456",
      supplierId: "SUP-123",
      sku: "SKU-789",
      quantity: 10,
      deliveredAt: "2025-11-01",
    },
    {
      orderId: "ORD-999",
      supplierId: "SUP-999",
      sku: "SKU-999",
      quantity: 1,
      deliveredAt: "2025-11-20",
    },
  ];
  
  export const mockWarrantyTerms = [
    {
      sku: "SKU-789",
      warrantyDays: 365,
      coverage: "manufacturing_defects_only",
    },
    {
      sku: "SKU-999",
      warrantyDays: 30,
      coverage: "full_coverage",
    },
  ];
  
  // Order lookup tool
export function getOrder(orderId: string) {
    return mockOrders.find((order) => order.orderId === orderId) || null;
  }
  
  // Warranty lookup tool
  export function getWarrantyTerms(sku: string) {
    return mockWarrantyTerms.find((terms) => terms.sku === sku) || null;
  }
  