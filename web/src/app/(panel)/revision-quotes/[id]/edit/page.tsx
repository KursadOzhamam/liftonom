"use client";

import { useParams } from "next/navigation";
import RevisionForm from "../../RevisionForm";

export default function EditRevisionQuotePage() {
  const params = useParams<{ id: string }>();
  return <RevisionForm id={Number(params.id)} />;
}
