"use client";

import { useParams } from "next/navigation";
import DtrForm from "../../DtrForm";

export default function EditDtrPage() {
  const params = useParams<{ id: string }>();
  return <DtrForm id={Number(params.id)} />;
}
