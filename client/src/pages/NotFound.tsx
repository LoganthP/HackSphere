import { ButtonLink } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md px-5 pt-24 text-center">
      <p className="font-display text-8xl font-extrabold text-violet">404</p>
      <h1 className="mt-4 text-2xl font-bold">This page doesn't exist</h1>
      <p className="mt-2 text-ink-soft">The link may be broken, or the hackathon may no longer be public.</p>
      <ButtonLink to="/hackathons" className="mt-8">
        Explore hackathons
      </ButtonLink>
    </div>
  );
}
