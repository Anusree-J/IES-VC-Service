import { CredentialsList } from "@/components/credentials/credentials-list";

export default function CredentialsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        Issued Credentials
      </h1>
      <CredentialsList />
    </div>
  );
}
