import type { Metadata } from "next";
import "bootstrap/dist/css/bootstrap.min.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Форма обратной связи",
  description: "Оставьте заявку, и мы свяжемся с вами в удобное время",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
