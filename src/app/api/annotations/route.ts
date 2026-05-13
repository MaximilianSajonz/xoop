import { NextRequest, NextResponse } from "next/server";
import { sbAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  const { data, error } = await sbAdmin()
    .from("whoop_annotation")
    .select("*")
    .order("day", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ annotations: data ?? [] });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const day = String(body.day ?? "").slice(0, 10);
  const tag = String(body.tag ?? "").trim();
  if (!day || !tag) return NextResponse.json({ error: "day and tag required" }, { status: 400 });
  const { data, error } = await sbAdmin()
    .from("whoop_annotation")
    .insert({
      day,
      tag,
      value: body.value ?? null,
      note: body.note ?? null,
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ annotation: data });
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const { error } = await sbAdmin().from("whoop_annotation").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
