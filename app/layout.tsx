import "./globals.css";

export const metadata = {
  title: "Trade Grid Global",
  description: "AI-powered global B2B food trade marketplace",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-white text-neutral-950 antialiased">
        {children}
      </body>
    </html>
  );
}
