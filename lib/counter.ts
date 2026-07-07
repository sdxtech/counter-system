export type MenuStatus = "available" | "low" | "empty";

export function getMenuStatus(qty: number): MenuStatus {
  if (qty <= 0) return "empty";
  if (qty <= 5) return "low";
  return "available";
}

export function getPhotoExpiryDate(hours = 12) {
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + hours);
  return expiresAt;
}
