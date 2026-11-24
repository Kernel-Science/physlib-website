import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Thank you",
  robots: { index: false },
};

export default function FeedbackThankYouPage() {
  return (
    <section className="page-frame-editorial">
      <h1 className="page-title-editorial">Thank you</h1>
      <p className="page-intro-editorial">We received your feedback.</p>
    </section>
  );
}
