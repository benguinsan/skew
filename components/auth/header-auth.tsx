"use client";

import { Show, SignInButton, UserButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";

export function HeaderAuth() {
  return (
    <>
      <Button variant="primary" className="px-3 sm:px-4">
        Subscribe
      </Button>
      <Show when="signed-out">
        <SignInButton mode="redirect">
          <Button variant="outline" className="px-3 sm:px-4">
            Login
          </Button>
        </SignInButton>
      </Show>
      <Show when="signed-in">
        <UserButton
          appearance={{
            elements: {
              avatarBox: "h-10 w-10",
            },
          }}
        />
      </Show>
    </>
  );
}
