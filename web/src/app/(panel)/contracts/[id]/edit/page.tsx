"use client";

import { useParams } from "next/navigation";
import ContractForm from "../../ContractForm";

export default function EditContractPage() {
  const params = useParams<{ id: string }>();
  return <ContractForm id={Number(params.id)} />;
}
