import { createSignal, Show } from "solid-js";
import { Link } from "@tanstack/solid-router";
import { Menu, X } from "lucide-solid";

export default function Header() {
  const [isOpen, setIsOpen] = createSignal(false);

  return (
    <>
      <header className="p-4 flex items-center bg-gray-800 text-white">
        <button
          onClick={() => setIsOpen(true)}
          className="p-2 hover:bg-gray-700 rounded"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>
        <Link to="/" className="ml-4 font-semibold">
          Taskmanager
        </Link>
      </header>

      <Show when={isOpen()}>
        <aside className="fixed top-0 left-0 h-full w-72 bg-gray-900 text-white z-50 p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Navigation</h2>
            <button onClick={() => setIsOpen(false)} aria-label="Close menu">
              <X size={20} />
            </button>
          </div>
          <nav className="flex flex-col gap-2">
            <Link to="/dashboard" onClick={() => setIsOpen(false)}>
              Dashboard
            </Link>
            <Link to="/aufgaben" onClick={() => setIsOpen(false)}>
              Aufgaben
            </Link>
            <Link to="/papierkorb" onClick={() => setIsOpen(false)}>
              Papierkorb
            </Link>
            <Link to="/admin/nutzer" onClick={() => setIsOpen(false)}>
              Admin Nutzer
            </Link>
          </nav>
        </aside>
      </Show>
    </>
  );
}
