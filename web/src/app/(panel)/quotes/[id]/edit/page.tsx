"use client";

import { useParams } from "next/navigation";
import QuoteForm from "../../QuoteForm";

export default function EditQuotePage() {
  const params = useParams<{ id: string }>();
  return <QuoteForm id={Number(params.id)} />;
}
