import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from "firebase/firestore";
import { db } from "./firebase";

// --- CUSTOMERS ---
export async function getCustomers() {
  const snap = await getDocs(collection(db, "customers"));
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}
export async function addCustomer(data: any) {
  return await addDoc(collection(db, "customers"), { ...data, createdAt: new Date().toISOString() });
}
export async function updateCustomer(id: string, data: any) {
  return await updateDoc(doc(db, "customers", id), { ...data, updatedAt: new Date().toISOString() });
}
export async function deleteCustomer(id: string) {
  return await deleteDoc(doc(db, "customers", id));
}

// --- COLLECTIONS ---
export async function getCollections() {
  const q = query(collection(db, "collections"), orderBy("date", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// --- SALES ---
export async function getSales() {
  const q = query(collection(db, "sales"), orderBy("date", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}
export async function addSale(data: any) {
  return await addDoc(collection(db, "sales"), { ...data, createdAt: new Date().toISOString() });
}
export async function updateSale(id: string, data: any) {
  return await updateDoc(doc(db, "sales", id), { ...data, updatedAt: new Date().toISOString() });
}
export async function deleteSale(id: string) {
  return await deleteDoc(doc(db, "sales", id));
}

// --- PAYMENTS ---
export async function getPayments() {
  const q = query(collection(db, "payments"), orderBy("date", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}
export async function addPayment(data: any) {
  return await addDoc(collection(db, "payments"), { ...data, createdAt: new Date().toISOString() });
}
export async function deletePayment(id: string) {
  return await deleteDoc(doc(db, "payments", id));
}