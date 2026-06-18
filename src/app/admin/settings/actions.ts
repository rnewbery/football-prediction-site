"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function updateCompetition(formData: FormData) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  const competitionId = Number(formData.get("competition_id"));
  const name = String(formData.get("name") ?? "").trim();

  const accessCode = String(
    formData.get("access_code") ?? ""
  ).trim();

  const entryCost = Number(formData.get("entry_cost") ?? 0);

  const closingDateText = String(
    formData.get("closing_date") ?? ""
  ).trim();

  const firstPrize = String(
    formData.get("first_prize") ?? ""
  ).trim();

  const secondPrize = String(
    formData.get("second_prize") ?? ""
  ).trim();

  const thirdPrize = String(
    formData.get("third_prize") ?? ""
  ).trim();

  const prizeNotes = String(
    formData.get("prize_notes") ?? ""
  ).trim();

  if (!competitionId || !name) {
    redirect(
      "/admin/settings?error=Enter a competition name."
    );
  }

  if (!accessCode) {
    redirect(
      "/admin/settings?error=Enter a competition access code."
    );
  }

  const closingDate = closingDateText
    ? new Date(closingDateText).toISOString()
    : null;

  const { error } = await supabase
    .from("competitions")
    .update({
      name,
      access_code: accessCode,
      entry_cost: entryCost,
      closing_date: closingDate,
      first_prize: firstPrize || null,
      second_prize: secondPrize || null,
      third_prize: thirdPrize || null,
      prize_notes: prizeNotes || null,
    })
    .eq("id", competitionId);

  if (error) {
    redirect(
      `/admin/settings?error=${encodeURIComponent(
        error.message
      )}`
    );
  }

  revalidatePath("/");
  revalidatePath("/predict");
  revalidatePath("/leaderboard");
  revalidatePath("/admin");
  revalidatePath("/admin/settings");
  revalidatePath("/admin/leaderboard");

  redirect(
    "/admin/settings?success=Competition settings updated."
  );
}