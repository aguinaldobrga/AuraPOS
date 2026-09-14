import { APP_VERSION } from "@/config/app";

export function Footer() {
  return (
    <footer className="flex items-center justify-center gap-2 px-4 py-2 text-xs text-gray-500 select-none">
      {" "}
      <span>Aura POS</span>{" "}
      <span className="opacity-70">v{APP_VERSION}</span>{" "}
    </footer>
  );
}
