import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";

export function NewsletterCta() {
  return (
    <section
      className="bg-bg-primary py-8 sm:py-10"
      aria-labelledby="newsletter-heading"
    >
      <Container>
        <div className="flex flex-col gap-5 rounded-lg bg-surface px-5 py-6 sm:flex-row sm:items-center sm:justify-between sm:gap-8 sm:px-8 sm:py-7">
          <div className="max-w-md">
            <h2
              id="newsletter-heading"
              className="text-h3 font-semibold leading-snug text-text-primary"
            >
              Stay Informed. Stay Balanced.
            </h2>
            <p className="mt-1 text-body-sm text-text-secondary">
              Get AI-estimated framing insights and top stories in your inbox.
            </p>
          </div>

          <form
            className="flex w-full max-w-md flex-col gap-2 sm:flex-row sm:items-center"
            action="#"
            method="get"
          >
            <label htmlFor="newsletter-email" className="sr-only">
              Email address
            </label>
            <input
              id="newsletter-email"
              name="email"
              type="email"
              placeholder="Enter your email"
              className="h-10 w-full min-w-0 flex-1 rounded-md border border-border bg-bg-primary px-3 text-body-md text-text-primary placeholder:text-text-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-primary"
            />
            <Button
              type="submit"
              variant="primary"
              className="shrink-0 sm:px-5"
            >
              Subscribe
            </Button>
          </form>
        </div>
      </Container>
    </section>
  );
}
