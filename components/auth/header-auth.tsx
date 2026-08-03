"use client";

import { useEffect, useRef } from "react";
import { Show, SignInButton, UserButton, useUser } from "@clerk/nextjs";
import posthog from "posthog-js";
import { Button } from "@/components/ui/button";

export function HeaderAuth() {
  const { isLoaded, isSignedIn, user } = useUser();
  const identifiedUserId = useRef<string | null>(null);

  useEffect(() => {
    if (!isLoaded) return;

    if (isSignedIn && user) {
      if (identifiedUserId.current && identifiedUserId.current !== user.id) {
        posthog.reset();
      }

      if (identifiedUserId.current !== user.id) {
        posthog.identify(user.id, {
          email: user.primaryEmailAddress?.emailAddress,
          name: user.fullName ?? undefined,
        });
        identifiedUserId.current = user.id;
      }
      return;
    }

    if (identifiedUserId.current) {
      posthog.reset();
      identifiedUserId.current = null;
    }
  }, [isLoaded, isSignedIn, user]);

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
