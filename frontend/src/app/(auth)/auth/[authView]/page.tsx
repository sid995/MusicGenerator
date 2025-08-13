import { authViewPaths } from "@daveyplate/better-auth-ui/server";
import { AuthView } from "@daveyplate/better-auth-ui";

export function generateStaticParams() {
  return Object.values(authViewPaths).map((authView) => ({ authView }));
}

export default async function AuthPage({
  params,
}: {
  params: Promise<{ authView: string }>;
}) {
  const { authView } = await params;
  return (
    <main className="container flex grow flex-col items-center justify-center gap-3 self-center p-4 md:p-6">
      <AuthView pathname={authView} />
    </main>
  );
}
