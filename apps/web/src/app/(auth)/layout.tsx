// El CSP lleva un nonce distinto en cada petición (ver src/proxy.ts), así
// que estas páginas no pueden quedar prerenderizadas de forma estática:
// el nonce horneado en el HTML en build time nunca coincidiría con el de
// la cabecera de una petición real, y el navegador bloquearía los
// <script> inline de hidratación de Next.
export const dynamic = "force-dynamic";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return children;
}
