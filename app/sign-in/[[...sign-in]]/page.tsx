import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <main className="flex flex-1 items-center justify-center bg-surface px-4 py-12">
      <SignIn signUpUrl="/sign-up" />
    </main>
  );
}
