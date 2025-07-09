import "/styles/date-picker.css";
import "./globals.css";
//Font-awesome
import "@fortawesome/fontawesome-svg-core/styles.css";
import { config } from "@fortawesome/fontawesome-svg-core";
config.autoAddCss = false; // Tell Font Awesome to skip adding the CSS automatically since it's being imported above

export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: any;
}) {
  return (
    <html lang="it" className="dark" suppressHydrationWarning>
      <head />
      <body>{children}</body>
    </html>
  );
}
