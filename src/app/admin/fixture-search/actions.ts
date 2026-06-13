"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";

function buildReturnUrl(
  messageType: "success" | "error",
  message: string,
  formData: FormData
) {
  const dateFrom = String(formData.get("date_from") ?? "").trim();
  const dateTo = String(formData.get("date_to") ?? "").trim();

  const competitionFilter = String(
    formData.get("competition_filter") ?? ""
  ).trim();

  const params = new URLSearchParams();

  if (dateFrom) {
    params.set("date_from", dateFrom);
  }

  if (dateTo) {
    params.set("date_to", dateTo);
  }

  if (competitionFilter) {
    params.set("competition_filter", competitionFilter);
  }

  params.set(messageType, message);

  return `/admin/fixture-search?${params.toString()}`;
}

export async function linkApiFixture(formData: FormData) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/admin/login");
  }

  const localFixtureId = Number(
    formData.get("local_fixture_id")
  );

  const externalFixtureId = Number(
    formData.get("external_fixture_id")
  );

  if (
    !Number.isFinite(localFixtureId) ||
    !Number.isFinite(externalFixtureId)
  ) {
    redirect(
      buildReturnUrl(
        "error",
        "The fixture could not be linked.",
        formData
      )
    );
  }

  const { error } = await supabase
    .from("fixtures")
    .update({
      external_fixture_id: externalFixtureId,
    })
    .eq("id", localFixtureId);

  if (error) {
    redirect(
      buildReturnUrl(
        "error",
        error.message,
        formData
      )
    );
  }

  revalidatePath("/admin/fixture-search");
  revalidatePath("/admin/fixtures");
  revalidatePath("/admin/score-sync");

  redirect(
    buildReturnUrl(
      "success",
      "Fixture linked.",
      formData
    )
  );
}