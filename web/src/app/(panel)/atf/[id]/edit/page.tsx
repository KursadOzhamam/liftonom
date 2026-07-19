"use client";

import { useParams } from "next/navigation";
import AtfForm from "../../AtfForm";

export default function EditAtfPage() {
  const params = useParams<{ id: string }>();
  return <AtfForm id={Number(params.id)} />;
}
