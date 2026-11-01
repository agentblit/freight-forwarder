import Link from "next/link";

type AuthErrorPageProps = {
  searchParams: Promise<{ error?: string }>;
};

/** Shown when "Login with Agentblit" cannot start or the console rejected it. */
export default async function AuthErrorPage({
  searchParams,
}: AuthErrorPageProps) {
  const { error } = await searchParams;

  return (
    <div className="flex min-h-dvh items-center justify-center bg-[#0b1c24] px-4">
      <div className="w-full max-w-md rounded-lg border border-white/10 bg-[#122832] p-8 text-center text-white">
        <h1 className="mb-2 text-lg font-bold">Couldn&apos;t sign in</h1>
        <p className="mb-6 text-sm text-[#7eb8d0]">
          {error ?? "Agentblit sign-in failed. Please try again."}
        </p>
        <Link className="text-sm font-medium text-[#2a9dba] hover:underline" href="/login">
          Try again
        </Link>
      </div>
    </div>
  );
}
