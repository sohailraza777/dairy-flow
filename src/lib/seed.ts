import { collection, writeBatch, doc } from "firebase/firestore";
import { db } from "./firebase";

export async function seedDatabase() {
  const batch = writeBatch(db);

  try {
    // 1. Create Customers (Suppliers & Buyers)
    const supplierData = [
      { name: "Ramesh Sharma", type: "supplier", phone: "9876543210", address: "North Farm", ratePerLitre: 45 },
      { name: "Anita Yadav", type: "supplier", phone: "9876543211", address: "East Valley", ratePerLitre: 50 },
      { name: "Suresh Dairy", type: "supplier", phone: "9876543212", address: "West Field", ratePerLitre: 42 },
    ];

    const buyerData = [
      { name: "City Supermarket", type: "buyer", phone: "9988776655", address: "Downtown", ratePerLitre: 60 },
      { name: "Local Cafe", type: "buyer", phone: "9988776656", address: "Main Street", ratePerLitre: 62 },
    ];

    const supplierRefs: any[] = [];
    const buyerRefs: any[] = [];

    // Push Suppliers
    for (const s of supplierData) {
      const ref = doc(collection(db, "customers"));
      batch.set(ref, { ...s, createdAt: new Date().toISOString() });
      supplierRefs.push({ id: ref.id, ...s });
    }

    // Push Buyers
    for (const b of buyerData) {
      const ref = doc(collection(db, "customers"));
      batch.set(ref, { ...b, createdAt: new Date().toISOString() });
      buyerRefs.push({ id: ref.id, ...b });
    }

    // 2. Generate 14 Days of Collections
    const today = new Date();
    for (let i = 14; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString();

      supplierRefs.forEach((supplier) => {
        // Morning Shift
        const morningRef = doc(collection(db, "collections"));
        const morningLitres = Math.floor(Math.random() * 20) + 15; // 15-35 Litres
        batch.set(morningRef, {
          customerId: supplier.id,
          customerName: supplier.name,
          date: dateStr,
          shift: "morning",
          milkType: "cow",
          litres: morningLitres,
          ratePerLitre: supplier.ratePerLitre,
          amount: morningLitres * supplier.ratePerLitre,
          createdAt: dateStr
        });

        // Evening Shift
        const eveningRef = doc(collection(db, "collections"));
        const eveningLitres = Math.floor(Math.random() * 15) + 10; // 10-25 Litres
        batch.set(eveningRef, {
          customerId: supplier.id,
          customerName: supplier.name,
          date: dateStr,
          shift: "evening",
          milkType: "buffalo",
          litres: eveningLitres,
          ratePerLitre: supplier.ratePerLitre + 5, // Buffalo milk slightly more expensive
          amount: eveningLitres * (supplier.ratePerLitre + 5),
          createdAt: dateStr
        });
      });
    }

    // 3. Generate 14 Days of Sales & Payments
    for (let i = 14; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString();

      buyerRefs.forEach((buyer, index) => {
        // Daily Sale
        const saleRef = doc(collection(db, "sales"));
        const litres = Math.floor(Math.random() * 50) + 30; // 30-80 Litres
        const total = litres * buyer.ratePerLitre;
        
        // Randomize payment status (older sales are paid, newer ones might be pending)
        let amountPaid = 0;
        let status = "pending";
        
        if (i > 5) {
          amountPaid = total;
          status = "paid";
        } else if (i > 2 && index === 0) {
          amountPaid = total * 0.5; // Half paid
          status = "partial";
        }

        batch.set(saleRef, {
          buyerId: buyer.id,
          buyerName: buyer.name,
          date: dateStr,
          product: "Fresh Milk",
          litres: litres,
          ratePerLitre: buyer.ratePerLitre,
          total: total,
          amountPaid: amountPaid,
          status: status,
          amount: total,
          createdAt: dateStr
        });

        // Generate a Payment record if they paid
        if (amountPaid > 0) {
          const paymentRef = doc(collection(db, "payments"));
          batch.set(paymentRef, {
            customerId: buyer.id,
            customerName: buyer.name,
            date: dateStr,
            amount: amountPaid,
            method: i % 2 === 0 ? "bank" : "cash",
            notes: "Invoice payment",
            createdAt: dateStr
          });
        }
      });
    }

    // Commit all changes to Firestore
    await batch.commit();
    console.log("Database successfully seeded!");
    return true;

  } catch (error) {
    console.error("Error seeding database:", error);
    throw error;
  }
}