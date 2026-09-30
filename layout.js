import "./globals.css";

export const metadata = {
  title: "SharedRide Bengaluru",
  description: "Find people going your way and share a cab fairly."
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}