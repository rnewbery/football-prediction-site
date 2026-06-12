"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function linkApiFixture(formData: FormData) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  const localFixtureId = Number(
    formData.get("local_fixture_id")
  );

  const externalFixtureId = Number(
    formData.get("external_fixture_id")
  );

  if (!localFixtureId || !externalFixtureId) {
    redirect(
      "/admin/fixture-search?error=The fixture could not be linked."
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
      `/admin/fixture-search?error=${encodeURIComponent(
        error.message
      )}`
    );
  }

  revalidatePath("/admin/fixture-search");
  revalidatePath("/admin/fixtures");

  redirect("/admin/fixture-search?success=Fixture linked.");
}