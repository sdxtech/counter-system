import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./supabase/database.types";
import type { TakeMenuResult } from "./take-queue";

export async function takeMenuStock(supabase: SupabaseClient<Database>, id: string): Promise<TakeMenuResult> {
  const { data, error } = await supabase
    .rpc("take_menu_item", { p_menu_item_id: id })
    .single();

  if (error) {
    return {
      success: false,
      message: error.message.includes("qty cannot go below zero")
        ? "Qty menu sudah habis."
        : error.message,
    };
  }

  if (!data || !Number.isSafeInteger(data.qty) || data.qty < 0) {
    return { success: false, message: "Stok terbaru tidak dapat dibaca." };
  }

  // Read the stock returned by the atomic decrement, not a later SELECT.
  return { success: true, qty: data.qty };
}
