"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";

async function getAuthenticatedClient() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  return supabase;
}

async function updateEntryPaymentStatus(
  formData: FormData,
  paymentStatus: "pending" | "approved" | "rejected"
) {
  const supabase = await getAuthenticatedClient();

  const entryId = Number(formData.get("entry_id"));
  const competitionId = Number(
    formData.get("competition_id")
  );

  if (!entryId) {
    redirect(
      "/admin/entries?error=The entry could not be updated."
    );
  }

  const updatePayload =
    paymentStatus === "approved"
      ? {
          payment_status: "approved",
          approved_at: new Date().toISOString(),
          rejected_at: null,
        }
      : paymentStatus === "rejected"
      ? {
          payment_status: "rejected",
          approved_at: null,
          rejected_at: new Date().toISOString(),
        }
      : {
          payment_status: "pending",
          approved_at: null,
          rejected_at: null,
        };

  const { error } = await supabase
    .from("entries")
    .update(updatePayload)
    .eq("id", entryId);

  if (error) {
    redirect(
      `/admin/entries?error=${encodeURIComponent(
        error.message
      )}`
    );
  }

  if (competitionId) {
    await supabase.rpc("recalculate_competition_scores", {
      p_competition_id: competitionId,
    });
  }

  revalidatePath("/leaderboard");
  revalidatePath("/admin");
  revalidatePath("/admin/entries");

  redirect(
    `/admin/entries?success=${encodeURIComponent(
      `Entry marked as ${paymentStatus}.`
    )}`
  );
}

export async function approveEntry(formData: FormData) {
  await updateEntryPaymentStatus(formData, "approved");
}

export async function markEntryPending(formData: FormData) {
  await updateEntryPaymentStatus(formData, "pending");
}

export async function rejectEntry(formData: FormData) {
  await updateEntryPaymentStatus(formData, "rejected");
}

export async function deleteEntry(formData: FormData) {
  const supabase = await getAuthenticatedClient();

  const entryId = Number(formData.get("entry_id"));
  const competitionId = Number(
    formData.get("competition_id")
  );

  if (!entryId) {
    redirect(
      "/admin/entries?error=The entry could not be deleted."
    );
  }

  const { error } = await supabase
    .from("entries")
    .delete()
    .eq("id", entryId);

  if (error) {
    redirect(
      `/admin/entries?error=${encodeURIComponent(
        error.message
      )}`
    );
  }

  if (competitionId) {
    await supabase.rpc("recalculate_competition_scores", {
      p_competition_id: competitionId,
    });
  }

  revalidatePath("/leaderboard");
  revalidatePath("/admin");
  revalidatePath("/admin/entries");

  redirect("/admin/entries?success=Entry deleted.");
}